"use client";
import React, { useState } from "react";
import "./UpdatePassword.scss";

import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import useAuthStore from "@/store/useAuthStore";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useUiText } from "@/hooks/useUiText";

const UpdatePassword = ({ isEditing }) => {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [open, setOpen] = useState(false);

    const { user } = useAuthStore();
    const t = useUiText();

    const resetFields = () => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setError("");
        setShowPasswords({ current: false, new: false, confirm: false });
    };

    // Reset the form whenever the dialog closes, so it never reopens with old
    // (or half-typed) values still in the boxes.
    const handleOpenChange = (next) => {
        setOpen(next);
        if (!next) resetFields();
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords((prev) => ({
            ...prev,
            [field]: !prev[field],
        }));
    };

    const handleSubmit = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            setError(t("Please fill in all fields."));
            return;
        }
        if (newPassword.length < 8) {
            setError(t("New password must be at least 8 characters."));
            return;
        }
        if (newPassword !== confirmPassword) {
            setError(t("New passwords do not match."));
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/update-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    email: user.email,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                setError(t(data.message) || t("An error occurred."));
                return;
            }

            // Success: clear the fields and close the dialog so it's obvious the
            // change went through (in addition to the toast).
            toast.success(t("Password updated successfully!"));
            resetFields();
            setOpen(false);
        } catch (err) {
            setError(t("An error occurred. Please try again."));
            toast.error(t("An error occurred. Please try again."));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="update-password">
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                    <Button
                        disabled={!isEditing}
                        className="btn btn-primary-red"
                    >
                        {t("Change Password")}
                    </Button>
                </DialogTrigger>
                <DialogContent className="update-password__dialog">
                    <DialogHeader>
                        <DialogTitle className="update-password__title">
                            {t("Change Password")}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="update-password__form">
                        {error && (
                            <div className="update-password__error">
                                {error}
                            </div>
                        )}
                        <div className="update-password__input-group">
                            <label
                                htmlFor="currentPassword"
                                className="update-password__label"
                            >
                                {t("Current Password")}
                            </label>
                            <div className="update-password__password-input">
                                <input
                                    type={
                                        showPasswords.current
                                            ? "text"
                                            : "password"
                                    }
                                    id="currentPassword"
                                    className="update-password__input"
                                    placeholder={t("Current Password")}
                                    value={currentPassword}
                                    onChange={(e) =>
                                        setCurrentPassword(e.target.value)
                                    }
                                    required
                                />
                                <button
                                    type="button"
                                    className="update-password__password-toggle"
                                    onClick={() =>
                                        togglePasswordVisibility("current")
                                    }
                                >
                                    {showPasswords.current ? (
                                        <Eye />
                                    ) : (
                                        <EyeOff />
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="update-password__input-group">
                            <label
                                htmlFor="newPassword"
                                className="update-password__label"
                            >
                                {t("New Password")}
                            </label>
                            <div className="update-password__password-input">
                                <input
                                    type={
                                        showPasswords.new ? "text" : "password"
                                    }
                                    id="newPassword"
                                    className="update-password__input"
                                    placeholder={t("New Password")}
                                    value={newPassword}
                                    onChange={(e) =>
                                        setNewPassword(e.target.value)
                                    }
                                    required
                                />
                                <button
                                    type="button"
                                    className="update-password__password-toggle"
                                    onClick={() =>
                                        togglePasswordVisibility("new")
                                    }
                                >
                                    {showPasswords.new ? <Eye /> : <EyeOff />}
                                </button>
                            </div>
                        </div>
                        <div className="update-password__input-group">
                            <label
                                htmlFor="confirmPassword"
                                className="update-password__label"
                            >
                                {t("Confirm New Password")}
                            </label>
                            <div className="update-password__password-input">
                                <input
                                    type={
                                        showPasswords.confirm
                                            ? "text"
                                            : "password"
                                    }
                                    id="confirmPassword"
                                    className="update-password__input"
                                    placeholder={t("Confirm New Password")}
                                    value={confirmPassword}
                                    onChange={(e) =>
                                        setConfirmPassword(e.target.value)
                                    }
                                    required
                                />
                                <button
                                    type="button"
                                    className="update-password__password-toggle"
                                    onClick={() =>
                                        togglePasswordVisibility("confirm")
                                    }
                                >
                                    {showPasswords.confirm ? (
                                        <Eye />
                                    ) : (
                                        <EyeOff />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            className="btn btn-primary"
                            onClick={handleSubmit}
                            disabled={isLoading}
                        >
                            {isLoading ? t("Updating...") : t("Update Password")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default UpdatePassword;
