"use client";

import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2, UserPlus, CheckCircle, Users } from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { withAuth } from "@/components/withAuth/withAuth";
import PageHeader from "@/components/admin/PageHeader";
import EmptyState from "@/components/admin/EmptyState";
import StatsCard from "@/components/admin/StatsCard";

export default withAuth(function CreateEditorPage() {
    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "editor",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [editors, setEditors] = useState([]);
    const [loadingEditors, setLoadingEditors] = useState(true);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        fetchEditors();
    }, []);

    const fetchEditors = async () => {
        setLoadingEditors(true);
        try {
            const res = await fetch("/api/editors");
            const data = await res.json();
            setEditors(data || []);
        } catch (error) {
            console.error("Error fetching editors:", error);
        } finally {
            setLoadingEditors(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
    };

    const getPasswordStrength = () => {
        const { password } = form;
        if (!password) return { score: 0, label: "", color: "" };

        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        if (score <= 2) return { score, label: "Weak", color: "bg-red-500" };
        if (score <= 3) return { score, label: "Fair", color: "bg-yellow-500" };
        if (score <= 4) return { score, label: "Good", color: "bg-green-400" };
        return { score, label: "Strong", color: "bg-green-600" };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch("/api/auth/create-editor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message);
                setShowSuccess(true);
                setForm({
                    firstName: "",
                    lastName: "",
                    email: "",
                    password: "",
                    role: "editor",
                });
                fetchEditors();
                setTimeout(() => setShowSuccess(false), 5000);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error("Error creating editor:", error);
            toast.error("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const passwordStrength = getPasswordStrength();

    return (
        <div className="animate-fadeIn">
            <PageHeader
                title="Create Editor"
                subtitle="Add new editors to your team"
                backHref="/"
            />

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <StatsCard
                    label="Total Editors"
                    value={loadingEditors ? "..." : editors.length}
                    icon={Users}
                />
            </div>

            {/* Success Message */}
            {showSuccess && (
                <div className="mb-6 p-5 bg-green-50 border border-green-200 rounded-xl animate-slideInUp">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="text-green-600" size={24} />
                        <div>
                            <p className="text-[1.5rem] font-semibold text-green-800">
                                Editor created successfully!
                            </p>
                            <p className="text-[1.3rem] text-green-700">
                                They can now log in with their credentials.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Create Form */}
                <div className="admin-card">
                    <div className="admin-card-header">
                        <h2 className="admin-card-title">New Editor Account</h2>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="admin-card-body">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="form-group mb-0">
                                    <label
                                        htmlFor="firstName"
                                        className="form-label form-label-required"
                                    >
                                        First Name
                                    </label>
                                    <Input
                                        id="firstName"
                                        name="firstName"
                                        placeholder="John"
                                        value={form.firstName}
                                        onChange={handleChange}
                                        required
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group mb-0">
                                    <label
                                        htmlFor="lastName"
                                        className="form-label form-label-required"
                                    >
                                        Last Name
                                    </label>
                                    <Input
                                        id="lastName"
                                        name="lastName"
                                        placeholder="Doe"
                                        value={form.lastName}
                                        onChange={handleChange}
                                        required
                                        className="form-input"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label
                                    htmlFor="email"
                                    className="form-label form-label-required"
                                >
                                    Email Address
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    placeholder="john.doe@example.com"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group mb-0">
                                <label
                                    htmlFor="password"
                                    className="form-label form-label-required"
                                >
                                    Password
                                </label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        placeholder="Enter a secure password"
                                        value={form.password}
                                        onChange={handleChange}
                                        required
                                        className="form-input pr-12"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? (
                                            <EyeOff size={18} />
                                        ) : (
                                            <Eye size={18} />
                                        )}
                                    </button>
                                </div>

                                {/* Password Strength Indicator */}
                                {form.password && (
                                    <div className="mt-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all ${passwordStrength.color}`}
                                                    style={{
                                                        width: `${
                                                            (passwordStrength.score / 5) * 100
                                                        }%`,
                                                    }}
                                                />
                                            </div>
                                            <span
                                                className={`text-[1.2rem] font-medium ${
                                                    passwordStrength.score <= 2
                                                        ? "text-red-600"
                                                        : passwordStrength.score <= 3
                                                        ? "text-yellow-600"
                                                        : "text-green-600"
                                                }`}
                                            >
                                                {passwordStrength.label}
                                            </span>
                                        </div>
                                        <p className="form-hint">
                                            Use 8+ characters with uppercase, numbers, and symbols
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="admin-card-footer">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary-green"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus size={18} />
                                        Create Editor
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Existing Editors */}
                <div className="admin-card">
                    <div className="admin-card-header">
                        <h2 className="admin-card-title">Existing Editors</h2>
                        <span className="text-[1.3rem] text-gray-500">
                            {editors.length} total
                        </span>
                    </div>
                    <div className="admin-card-body max-h-[500px] overflow-y-auto">
                        {loadingEditors ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="skeleton h-16 rounded-lg" />
                                ))}
                            </div>
                        ) : editors.length > 0 ? (
                            <div className="space-y-3">
                                {editors.map((editor) => (
                                    <div
                                        key={editor.id}
                                        className="flex items-center gap-4 p-4 rounded-lg bg-gray-50"
                                    >
                                        <div className="w-10 h-10 bg-[#4cb19f] rounded-full flex items-center justify-center flex-shrink-0">
                                            <span className="text-white font-medium">
                                                {editor.name?.charAt(0).toUpperCase() || "E"}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[1.4rem] font-medium text-gray-900 truncate">
                                                {editor.name}
                                            </p>
                                            <p className="text-[1.2rem] text-gray-500 truncate">
                                                {editor.email}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                icon="users"
                                title="No editors yet"
                                description="Create your first editor using the form"
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});
