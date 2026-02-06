"use client";

import { useState, useEffect, useMemo } from "react";
import { tenant as defaultTenant } from "@/lib/config";
import { withAuth } from "@/components/withAuth/withAuth";
import { toast } from "react-toastify";
import { Copy, Trash2, Link2, Loader2, CheckCircle, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/admin/PageHeader";
import SearchInput from "@/components/admin/SearchInput";
import EmptyState from "@/components/admin/EmptyState";
import StatusBadge from "@/components/admin/StatusBadge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import StatsCard from "@/components/admin/StatsCard";

export default withAuth(function MagicLinksAdminPage() {
    const tenantName = defaultTenant.shortName;
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [links, setLinks] = useState([]);
    const [fetching, setFetching] = useState(true);
    const [newMagicUrl, setNewMagicUrl] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
    const [copied, setCopied] = useState(false);

    async function fetchLinks() {
        setFetching(true);
        const res = await fetch(`/api/magic-link/list`);
        const data = await res.json();
        setLinks(data.links || []);
        setFetching(false);
    }

    useEffect(() => {
        fetchLinks();
    }, []);

    // Filter links based on search
    const filteredLinks = useMemo(() => {
        if (!searchQuery) return links;
        const query = searchQuery.toLowerCase();
        return links.filter((link) =>
            link.email?.toLowerCase().includes(query)
        );
    }, [links, searchQuery]);

    // Calculate stats
    const stats = useMemo(() => {
        const total = links.length;
        const active = links.filter((l) => !l.used).length;
        const used = links.filter((l) => l.used).length;
        return { total, active, used };
    }, [links]);

    async function generateLink() {
        if (!email) {
            toast.error("Please enter an email address");
            return;
        }
        setLoading(true);
        const res = await fetch("/api/magic-link/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });

        const data = await res.json();
        setLoading(false);

        if (data.success) {
            setNewMagicUrl(data.magicUrl);
            await navigator.clipboard.writeText(data.magicUrl);
            toast.success("Magic link created & copied to clipboard!");
            setEmail("");
            fetchLinks();
        } else {
            toast.error(data.message || "Failed to create link");
        }
    }

    async function copyToClipboard(url) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success("Link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    }

    async function deleteLink(id) {
        await fetch(`/api/magic-link/delete?id=${id}`, {
            method: "DELETE",
        });
        toast.success("Magic link deleted");
        setDeleteConfirm({ open: false, id: null });
        fetchLinks();
    }

    return (
        <div className="animate-fadeIn">
            <PageHeader
                title="Magic Links"
                subtitle="Generate one-time login links for editors"
                backHref="/"
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <StatsCard
                    label="Total Links"
                    value={stats.total}
                    icon={Link2}
                />
                <StatsCard
                    label="Active Links"
                    value={stats.active}
                    icon={Clock}
                />
                <StatsCard
                    label="Used Links"
                    value={stats.used}
                    icon={CheckCircle}
                />
            </div>

            {/* Newly Created Link Alert */}
            {newMagicUrl && (
                <div className="mb-6 p-5 bg-green-50 border border-green-200 rounded-xl animate-slideInUp">
                    <div className="flex items-start gap-3">
                        <CheckCircle className="text-green-600 mt-0.5" size={20} />
                        <div className="flex-1">
                            <p className="text-[1.5rem] font-semibold text-green-800 mb-2">
                                Magic link created successfully!
                            </p>
                            <div className="flex items-center gap-3 bg-white border border-green-200 rounded-lg p-3">
                                <code className="text-[1.3rem] text-gray-700 flex-1 break-all">
                                    {newMagicUrl}
                                </code>
                                <Button
                                    size="sm"
                                    onClick={() => copyToClipboard(newMagicUrl)}
                                    className="btn btn-primary-green btn-sm flex-shrink-0"
                                >
                                    <Copy size={14} />
                                    Copy
                                </Button>
                            </div>
                            <button
                                onClick={() => setNewMagicUrl(null)}
                                className="text-[1.3rem] text-green-700 hover:underline mt-3"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Form */}
            <div className="admin-card mb-8">
                <div className="admin-card-header">
                    <h2 className="admin-card-title">Generate New Magic Link</h2>
                </div>
                <div className="admin-card-body">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="form-group mb-0">
                            <label className="form-label form-label-required">
                                Editor Email
                            </label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="editor@example.com"
                                className="form-input"
                            />
                            <p className="form-hint">
                                Enter the email address of the editor who will use this link
                            </p>
                        </div>
                        <div className="form-group mb-0">
                            <label className="form-label">Tenant</label>
                            <Input
                                value={tenantName}
                                disabled
                                className="form-input bg-gray-50"
                            />
                            <p className="form-hint">
                                Links are created for the current tenant
                            </p>
                        </div>
                    </div>
                </div>
                <div className="admin-card-footer">
                    <Button
                        onClick={generateLink}
                        disabled={loading || !email}
                        className="btn btn-primary-green"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Link2 size={18} />
                                Generate Magic Link
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Links Table */}
            <div className="admin-card">
                <div className="admin-card-header">
                    <div>
                        <h2 className="admin-card-title">Existing Links</h2>
                        <p className="admin-card-subtitle">
                            {filteredLinks.length} of {links.length} links
                        </p>
                    </div>
                </div>
                <div className="p-4 border-b border-gray-100">
                    <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search by email..."
                        className="max-w-sm"
                    />
                </div>
                <div className="admin-card-body p-0">
                    {fetching ? (
                        <div className="p-8">
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="skeleton h-16 rounded" />
                                ))}
                            </div>
                        </div>
                    ) : filteredLinks.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Email</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLinks.map((link) => (
                                        <tr key={link.id}>
                                            <td>
                                                <span className="font-medium">{link.email}</span>
                                            </td>
                                            <td>
                                                <StatusBadge
                                                    variant={link.used ? "neutral" : "success"}
                                                    label={link.used ? "Used" : "Active"}
                                                />
                                            </td>
                                            <td className="text-gray-500">
                                                {new Date(link.created_at).toLocaleDateString()}{" "}
                                                <span className="text-gray-400">
                                                    {new Date(link.created_at).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            setDeleteConfirm({
                                                                open: true,
                                                                id: link.id,
                                                            })
                                                        }
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <EmptyState
                            icon="inbox"
                            title={searchQuery ? "No matching links" : "No magic links yet"}
                            description={
                                searchQuery
                                    ? "Try a different search term"
                                    : "Generate your first magic link above"
                            }
                        />
                    )}
                </div>
            </div>

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={deleteConfirm.open}
                onOpenChange={(open) =>
                    setDeleteConfirm({ open, id: open ? deleteConfirm.id : null })
                }
                title="Delete Magic Link"
                description="Are you sure you want to delete this magic link? This action cannot be undone."
                confirmLabel="Delete"
                variant="destructive"
                onConfirm={() => deleteLink(deleteConfirm.id)}
            />
        </div>
    );
});
