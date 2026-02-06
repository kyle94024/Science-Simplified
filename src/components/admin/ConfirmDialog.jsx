"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

/**
 * Confirmation dialog using shadcn AlertDialog
 * @param {Object} props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {function} props.onOpenChange - Open state change handler
 * @param {string} props.title - Dialog title
 * @param {string} props.description - Dialog description
 * @param {string} [props.confirmLabel] - Confirm button text
 * @param {string} [props.cancelLabel] - Cancel button text
 * @param {'default' | 'destructive'} [props.variant] - Button variant
 * @param {function} props.onConfirm - Confirm action handler
 * @param {boolean} [props.loading] - Loading state
 */
export default function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "default",
    onConfirm,
    loading = false
}) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-[400px]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-[1.8rem]">
                        {title}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-[1.4rem]">
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel
                        className="text-[1.4rem] px-6 py-3"
                        disabled={loading}
                    >
                        {cancelLabel}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            onConfirm();
                        }}
                        className={`text-[1.4rem] px-6 py-3 ${
                            variant === "destructive"
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : "bg-primary hover:bg-primary/90"
                        }`}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading...
                            </>
                        ) : (
                            confirmLabel
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
