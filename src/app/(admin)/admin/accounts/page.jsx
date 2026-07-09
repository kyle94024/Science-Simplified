"use client";

import { useEffect, useMemo, useState } from "react";
import { withAuth } from "@/components/withAuth/withAuth";
import PageHeader from "@/components/admin/PageHeader";
import SearchInput from "@/components/admin/SearchInput";
import EmptyState from "@/components/admin/EmptyState";
import ImageUpload from "@/components/ImageUpload/ImageUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
    Loader2,
    Shield,
    KeyRound,
    Save,
    UserCog,
    Eye,
    EyeOff,
    Info,
} from "lucide-react";

/**
 * Admin account editor: edit anyone's profile (name, degree, title,
 * university, bio, links, photo) and set their password — without logging
 * in as them. Searchable; deep-linkable via ?focus=<userId> (the green
 * hover-edit buttons across the admin UI land here).
 *
 * Saves send ONLY the fields that changed, and the API only writes fields
 * it receives — so a save can never blank out data it didn't touch.
 * Deleting accounts is deliberately impossible from this page (and the API
 * has no DELETE handler).
 */

const PROFILE_FIELDS = [
    { key: "name", label: "Name", placeholder: "Full name" },
    { key: "degree", label: "Degree", placeholder: "e.g. M.D., Ph.D." },
    { key: "title", label: "Title", placeholder: "Professional title" },
    { key: "university", label: "University / Affiliation", placeholder: "Institution" },
    { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/…" },
    { key: "lablink", label: "Lab / Website link", placeholder: "https://…" },
];

function initialsOf(name = "") {
    return (
        name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0].toUpperCase())
            .join("") || "?"
    );
}

function rolePill(account) {
    if (account.is_admin) return { label: "admin", cls: "bg-indigo-100 text-indigo-700" };
    if (account.role === "researcher") return { label: "expert", cls: "bg-emerald-100 text-emerald-700" };
    return { label: "editor", cls: "bg-blue-100 text-blue-700" };
}

function ManageAccountsPage() {
    const [accounts, setAccounts] = useState(null);
    const [search, setSearch] = useState("");
    const [selectedId, setSelectedId] = useState(null);
    const [form, setForm] = useState({});
    const [baseline, setBaseline] = useState({});
    const [saving, setSaving] = useState(false);

    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [settingPassword, setSettingPassword] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/admin/accounts", { cache: "no-store" });
                if (!res.ok) throw new Error(`Failed to load accounts (${res.status})`);
                const data = await res.json();
                setAccounts(data.accounts || []);
                // Deep link: /admin/accounts?focus=<id>
                const focus = new URLSearchParams(window.location.search).get("focus");
                if (focus && (data.accounts || []).some((a) => String(a.id) === focus)) {
                    selectAccount((data.accounts || []).find((a) => String(a.id) === focus));
                }
            } catch (e) {
                toast.error(e.message);
                setAccounts([]);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function selectAccount(account) {
        if (!account) return;
        setSelectedId(account.id);
        const snapshot = {
            name: account.name || "",
            degree: account.degree || "",
            title: account.title || "",
            university: account.university || "",
            bio: account.bio || "",
            linkedin: account.linkedin || "",
            lablink: account.lablink || "",
            photo: account.photo || "",
        };
        setForm(snapshot);
        setBaseline(snapshot);
        setNewPassword("");
        setShowPassword(false);
    }

    const selected = useMemo(
        () => (accounts || []).find((a) => a.id === selectedId) || null,
        [accounts, selectedId]
    );

    const filtered = useMemo(() => {
        if (!accounts) return [];
        if (!search) return accounts;
        const q = search.toLowerCase();
        return accounts.filter(
            (a) =>
                a.name?.toLowerCase().includes(q) ||
                a.email?.toLowerCase().includes(q) ||
                a.title?.toLowerCase().includes(q) ||
                a.university?.toLowerCase().includes(q)
        );
    }, [accounts, search]);

    // Only the fields that actually changed get sent (the API also only
    // writes what it receives — belt and suspenders).
    const dirtyFields = useMemo(() => {
        const diff = {};
        for (const key of Object.keys(form)) {
            if (form[key] !== baseline[key]) diff[key] = form[key];
        }
        return diff;
    }, [form, baseline]);

    async function applyPatch(patch) {
        const res = await fetch(`/api/admin/accounts/${selectedId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || "Save failed");
        // Sync local state from the server's row
        setAccounts((prev) =>
            (prev || []).map((a) => (a.id === selectedId ? { ...a, ...data.account } : a))
        );
        const acct = data.account;
        const snapshot = {
            name: acct.name || "",
            degree: acct.degree || "",
            title: acct.title || "",
            university: acct.university || "",
            bio: acct.bio || "",
            linkedin: acct.linkedin || "",
            lablink: acct.lablink || "",
            photo: acct.photo || "",
        };
        setForm(snapshot);
        setBaseline(snapshot);
    }

    async function handleSave(e) {
        e.preventDefault();
        if (Object.keys(dirtyFields).length === 0) return;
        setSaving(true);
        try {
            await applyPatch(dirtyFields);
            toast.success("Profile updated.");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handlePhoto(url) {
        try {
            await applyPatch({ photo: url || "" });
            toast.success(url ? "Photo updated." : "Photo removed.");
        } catch (err) {
            toast.error(err.message);
        }
    }

    async function handleSetPassword() {
        if (newPassword.length < 8) {
            toast.error("Password must be at least 8 characters.");
            return;
        }
        setSettingPassword(true);
        try {
            const res = await fetch(`/api/admin/accounts/${selectedId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newPassword }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "Failed to set password");
            toast.success(`Password updated for ${selected?.name || selected?.email}.`);
            setNewPassword("");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSettingPassword(false);
        }
    }

    return (
        <div className="animate-fadeIn">
            <ToastContainer position="bottom-right" autoClose={2500} />
            <PageHeader
                title="Manage Accounts"
                subtitle="Edit editor & expert profiles and set passwords — accounts can never be deleted here"
                backHref="/"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* People list */}
                <div className="admin-card">
                    <div className="admin-card-header">
                        <div>
                            <h2 className="admin-card-title">People</h2>
                            <p className="admin-card-subtitle">
                                {accounts ? `${accounts.length} accounts` : "Loading…"}
                            </p>
                        </div>
                    </div>
                    <div className="p-4 border-b border-gray-100">
                        <SearchInput
                            value={search}
                            onChange={setSearch}
                            placeholder="Search by name, email, title…"
                        />
                    </div>
                    <div className="admin-card-body max-h-[65vh] overflow-y-auto space-y-2">
                        {accounts === null ? (
                            [1, 2, 3, 4].map((i) => (
                                <div key={i} className="skeleton h-16 rounded-lg" />
                            ))
                        ) : filtered.length === 0 ? (
                            <EmptyState
                                icon="users"
                                title="No accounts found"
                                description={search ? "Try a different search" : "No editors or experts yet"}
                            />
                        ) : (
                            filtered.map((a) => {
                                const pill = rolePill(a);
                                const isSel = a.id === selectedId;
                                return (
                                    <button
                                        type="button"
                                        key={a.id}
                                        onClick={() => selectAccount(a)}
                                        className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${
                                            isSel
                                                ? "border-[#4cb19f] bg-[rgba(76,177,159,0.05)]"
                                                : "border-gray-200 hover:border-gray-300"
                                        }`}
                                    >
                                        {a.photo ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={a.photo}
                                                alt=""
                                                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                            />
                                        ) : (
                                            <span className="w-10 h-10 rounded-full bg-[#4cb19f] text-white flex items-center justify-center text-[1.3rem] font-semibold flex-shrink-0">
                                                {initialsOf(a.name || a.email)}
                                            </span>
                                        )}
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center gap-2">
                                                <span className="text-[1.4rem] font-medium text-gray-900 truncate">
                                                    {a.name || a.email}
                                                </span>
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[1rem] font-bold uppercase tracking-wide ${pill.cls}`}
                                                >
                                                    {a.is_admin ? (
                                                        <span className="inline-flex items-center gap-1">
                                                            <Shield size={9} /> {pill.label}
                                                        </span>
                                                    ) : (
                                                        pill.label
                                                    )}
                                                </span>
                                            </span>
                                            <span className="block text-[1.2rem] text-gray-500 truncate">
                                                {a.email}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Editor panel */}
                <div className="lg:col-span-2 admin-card">
                    {!selected ? (
                        <div className="admin-card-body py-24">
                            <EmptyState
                                icon="users"
                                title="Pick someone to edit"
                                description="Select a person on the left (or arrive via a green edit button) to edit their profile or set a new password."
                            />
                        </div>
                    ) : (
                        <>
                            <div className="admin-card-header">
                                <div>
                                    <h2 className="admin-card-title flex items-center gap-2">
                                        <UserCog size={20} className="text-[#4cb19f]" />
                                        {selected.name || selected.email}
                                    </h2>
                                    <p className="admin-card-subtitle">
                                        {selected.email} — changes save only the fields you edit
                                    </p>
                                </div>
                            </div>

                            <div className="admin-card-body space-y-8">
                                {/* Photo */}
                                <div className="flex items-start gap-6">
                                    {form.photo ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={form.photo}
                                            alt=""
                                            className="w-24 h-24 rounded-full object-cover border border-gray-200"
                                        />
                                    ) : (
                                        <span className="w-24 h-24 rounded-full bg-[#4cb19f] text-white flex items-center justify-center text-[2.2rem] font-semibold">
                                            {initialsOf(form.name || selected.email)}
                                        </span>
                                    )}
                                    <div className="flex-1">
                                        <p className="text-[1.3rem] font-semibold text-gray-700 mb-2">
                                            Profile photo
                                        </p>
                                        <ImageUpload
                                            onImageUpload={handlePhoto}
                                            initialImageUrl={form.photo || null}
                                            uploadUrl="/api/profile/upload-image"
                                            deleteUrl="/api/profile/delete-image"
                                            imageType="profile"
                                            autoUpload
                                        />
                                    </div>
                                </div>

                                {/* Profile fields */}
                                <form onSubmit={handleSave} className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {PROFILE_FIELDS.map((f) => (
                                            <div key={f.key}>
                                                <label
                                                    htmlFor={`acct-${f.key}`}
                                                    className="block text-[1.3rem] font-semibold text-gray-700 mb-1.5"
                                                >
                                                    {f.label}
                                                </label>
                                                <Input
                                                    id={`acct-${f.key}`}
                                                    value={form[f.key] || ""}
                                                    placeholder={f.placeholder}
                                                    onChange={(e) =>
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            [f.key]: e.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="acct-bio"
                                            className="block text-[1.3rem] font-semibold text-gray-700 mb-1.5"
                                        >
                                            Bio
                                        </label>
                                        <Textarea
                                            id="acct-bio"
                                            rows={3}
                                            value={form.bio || ""}
                                            placeholder="Short bio"
                                            onChange={(e) =>
                                                setForm((prev) => ({ ...prev, bio: e.target.value }))
                                            }
                                        />
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Button
                                            type="submit"
                                            className="btn btn-primary-green"
                                            disabled={saving || Object.keys(dirtyFields).length === 0}
                                        >
                                            {saving ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" /> Saving…
                                                </>
                                            ) : (
                                                <>
                                                    <Save size={16} /> Save changes
                                                </>
                                            )}
                                        </Button>
                                        {Object.keys(dirtyFields).length > 0 && (
                                            <span className="text-[1.2rem] text-gray-500">
                                                {Object.keys(dirtyFields).length} field
                                                {Object.keys(dirtyFields).length === 1 ? "" : "s"} changed
                                            </span>
                                        )}
                                    </div>
                                </form>

                                {/* Password */}
                                <div className="border-t border-gray-100 pt-6">
                                    <p className="flex items-center gap-2 text-[1.4rem] font-semibold text-gray-800 mb-1">
                                        <KeyRound size={16} className="text-[#4cb19f]" /> Set a new password
                                    </p>
                                    <p className="text-[1.2rem] text-gray-500 mb-3">
                                        Immediately replaces {selected.name || "this user"}&apos;s password
                                        (min 8 characters). They can change it themselves afterwards.
                                    </p>
                                    <div className="flex items-center gap-3 max-w-[480px]">
                                        <div className="relative flex-1">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                value={newPassword}
                                                placeholder="New password"
                                                onChange={(e) => setNewPassword(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                onClick={() => setShowPassword((s) => !s)}
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                            >
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        <Button
                                            type="button"
                                            className="btn btn-primary"
                                            disabled={settingPassword || newPassword.length < 8}
                                            onClick={handleSetPassword}
                                        >
                                            {settingPassword ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                "Set password"
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <p className="flex items-center gap-2 text-[1.2rem] text-gray-400">
                                    <Info size={13} />
                                    Email, role, and admin status can&apos;t be changed here, and accounts
                                    can&apos;t be deleted.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default withAuth(ManageAccountsPage);
