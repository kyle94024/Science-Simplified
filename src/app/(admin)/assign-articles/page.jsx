"use client";

import { withAuth } from "@/components/withAuth/withAuth";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Image from "next/image";
import { Loader2, Edit, Users, FileText, CheckCircle } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import SearchInput from "@/components/admin/SearchInput";
import EmptyState from "@/components/admin/EmptyState";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

const FallbackAuthorImage = ({ authorName, size = "md" }) => {
    const firstLetter = authorName ? authorName.charAt(0).toUpperCase() : "A";
    const sizeClasses = {
        sm: "w-8 h-8 text-[1.2rem]",
        md: "w-12 h-12 text-[1.6rem]",
        lg: "w-16 h-16 text-[2rem]",
    };

    return (
        <div
            className={`${sizeClasses[size]} flex items-center justify-center bg-[#4cb19f] rounded-full flex-shrink-0`}
        >
            <span className="text-white font-medium">{firstLetter}</span>
        </div>
    );
};

const EditorTag = ({ editor, articleId, onUnassign }) => {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1.5 bg-[#4cb19f] text-white px-3 py-1.5 rounded-full text-[1.3rem] font-medium hover:bg-[#3d9485] transition-colors">
                    <Edit size={12} />
                    <span>{editor.name}</span>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-4">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        <FallbackAuthorImage authorName={editor.name} size="md" />
                        <div>
                            <h4 className="text-[1.5rem] font-semibold text-gray-900">
                                {editor.name}
                            </h4>
                            <p className="text-[1.3rem] text-gray-500">{editor.email}</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => onUnassign(editor.id, articleId)}
                        variant="destructive"
                        className="w-full text-[1.4rem]"
                    >
                        Unassign Editor
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
};

const AssignArticles = () => {
    const [pendingArticles, setPendingArticles] = useState([]);
    const [editors, setEditors] = useState([]);
    const [selectedArticles, setSelectedArticles] = useState([]);
    const [selectedEditors, setSelectedEditors] = useState([]);
    const [loadingArticles, setLoadingArticles] = useState(true);
    const [loadingEditors, setLoadingEditors] = useState(true);
    const [assigningArticles, setAssigningArticles] = useState(false);
    const [articleSearch, setArticleSearch] = useState("");
    const [editorSearch, setEditorSearch] = useState("");
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    useEffect(() => {
        fetchPendingArticles();
        fetchEditors();
    }, []);

    const fetchPendingArticles = async () => {
        setLoadingArticles(true);
        try {
            const response = await fetch("/api/articles/pending-with-assignments");
            if (!response.ok) throw new Error("Failed to fetch articles");
            const data = await response.json();
            setPendingArticles(data);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoadingArticles(false);
        }
    };

    const fetchEditors = async () => {
        setLoadingEditors(true);
        try {
            const response = await fetch("/api/editors");
            if (!response.ok) throw new Error("Failed to fetch editors");
            const data = await response.json();
            setEditors(data);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoadingEditors(false);
        }
    };

    // Filtered lists
    const filteredArticles = useMemo(() => {
        if (!articleSearch) return pendingArticles;
        const query = articleSearch.toLowerCase();
        return pendingArticles.filter((article) =>
            article.title?.toLowerCase().includes(query)
        );
    }, [pendingArticles, articleSearch]);

    const filteredEditors = useMemo(() => {
        if (!editorSearch) return editors;
        const query = editorSearch.toLowerCase();
        return editors.filter(
            (editor) =>
                editor.name?.toLowerCase().includes(query) ||
                editor.email?.toLowerCase().includes(query)
        );
    }, [editors, editorSearch]);

    const handleArticleSelection = (articleId) => {
        setSelectedArticles((prev) =>
            prev.includes(articleId)
                ? prev.filter((id) => id !== articleId)
                : [...prev, articleId]
        );
    };

    const handleEditorSelection = (editorId) => {
        setSelectedEditors((prev) =>
            prev.includes(editorId)
                ? prev.filter((id) => id !== editorId)
                : [...prev, editorId]
        );
    };

    const handleSelectAllArticles = () => {
        if (selectedArticles.length === filteredArticles.length) {
            setSelectedArticles([]);
        } else {
            setSelectedArticles(filteredArticles.map((a) => a.id));
        }
    };

    const handleAssignment = async () => {
        try {
            setAssigningArticles(true);
            const response = await fetch("/api/articles/assign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    editorIds: selectedEditors,
                    articleIds: selectedArticles,
                }),
            });

            if (response.ok) {
                toast.success(
                    `Successfully assigned ${selectedArticles.length} article(s) to ${selectedEditors.length} editor(s)!`
                );
                setSelectedArticles([]);
                setSelectedEditors([]);
                setShowConfirmDialog(false);
                fetchPendingArticles();
            } else {
                const data = await response.json();
                throw new Error(data.message || "Failed to assign articles");
            }
        } catch (err) {
            toast.error(err.message);
        } finally {
            setAssigningArticles(false);
        }
    };

    const handleUnassign = async (editorId, articleId) => {
        try {
            const response = await fetch("/api/articles/unassign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ editorId, articleId }),
            });

            if (response.ok) {
                toast.success("Editor unassigned successfully!");
                fetchPendingArticles();
            } else {
                throw new Error("Failed to unassign editor");
            }
        } catch (err) {
            toast.error(err.message);
        }
    };

    const canAssign = selectedArticles.length > 0 && selectedEditors.length > 0;

    return (
        <div className="animate-fadeIn">
            <PageHeader
                title="Assign Articles"
                subtitle="Assign pending articles to editors for review"
                backHref="/"
            />

            {/* Selection Summary */}
            {canAssign && (
                <div className="mb-6 p-4 bg-[rgba(76,177,159,0.1)] rounded-xl border border-[rgba(76,177,159,0.2)] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-[1.4rem]">
                            <FileText size={18} className="text-[#4cb19f]" />
                            <span className="font-medium">{selectedArticles.length}</span>
                            <span className="text-gray-600">article(s)</span>
                        </div>
                        <span className="text-gray-400">to</span>
                        <div className="flex items-center gap-2 text-[1.4rem]">
                            <Users size={18} className="text-[#4cb19f]" />
                            <span className="font-medium">{selectedEditors.length}</span>
                            <span className="text-gray-600">editor(s)</span>
                        </div>
                    </div>
                    <Button
                        onClick={() => setShowConfirmDialog(true)}
                        className="btn btn-primary-green btn-sm"
                    >
                        <CheckCircle size={16} />
                        Assign Selected
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Articles Column */}
                <div className="lg:col-span-2 admin-card">
                    <div className="admin-card-header">
                        <div>
                            <h2 className="admin-card-title">Pending Articles</h2>
                            <p className="admin-card-subtitle">
                                {selectedArticles.length} of {pendingArticles.length} selected
                            </p>
                        </div>
                        {filteredArticles.length > 0 && (
                            <button
                                onClick={handleSelectAllArticles}
                                className="text-[1.3rem] text-[#4cb19f] hover:underline"
                            >
                                {selectedArticles.length === filteredArticles.length
                                    ? "Deselect All"
                                    : "Select All"}
                            </button>
                        )}
                    </div>
                    <div className="p-4 border-b border-gray-100">
                        <SearchInput
                            value={articleSearch}
                            onChange={setArticleSearch}
                            placeholder="Search articles..."
                        />
                    </div>
                    <div className="admin-card-body max-h-[60vh] overflow-y-auto space-y-3">
                        {loadingArticles ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="skeleton h-28 rounded-lg" />
                                ))}
                            </div>
                        ) : filteredArticles.length > 0 ? (
                            filteredArticles.map((article) => (
                                <ArticleItem
                                    key={article.id}
                                    article={article}
                                    isSelected={selectedArticles.includes(article.id)}
                                    onSelect={handleArticleSelection}
                                    onUnassign={handleUnassign}
                                />
                            ))
                        ) : (
                            <EmptyState
                                icon="articles"
                                title="No articles found"
                                description={
                                    articleSearch
                                        ? "Try a different search term"
                                        : "No pending articles to assign"
                                }
                            />
                        )}
                    </div>
                </div>

                {/* Editors Column */}
                <div className="admin-card">
                    <div className="admin-card-header">
                        <div>
                            <h2 className="admin-card-title">Editors</h2>
                            <p className="admin-card-subtitle">
                                {selectedEditors.length} selected
                            </p>
                        </div>
                    </div>
                    <div className="p-4 border-b border-gray-100">
                        <SearchInput
                            value={editorSearch}
                            onChange={setEditorSearch}
                            placeholder="Search editors..."
                        />
                    </div>
                    <div className="admin-card-body max-h-[60vh] overflow-y-auto space-y-2">
                        {loadingEditors ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="skeleton h-16 rounded-lg" />
                                ))}
                            </div>
                        ) : filteredEditors.length > 0 ? (
                            filteredEditors.map((editor) => (
                                <EditorItem
                                    key={editor.id}
                                    editor={editor}
                                    isSelected={selectedEditors.includes(editor.id)}
                                    onSelect={handleEditorSelection}
                                />
                            ))
                        ) : (
                            <EmptyState
                                icon="users"
                                title="No editors found"
                                description={
                                    editorSearch
                                        ? "Try a different search term"
                                        : "No editors available"
                                }
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Confirmation Dialog */}
            <ConfirmDialog
                open={showConfirmDialog}
                onOpenChange={setShowConfirmDialog}
                title="Confirm Assignment"
                description={`You are about to assign ${selectedArticles.length} article(s) to ${selectedEditors.length} editor(s). Each editor will receive a notification about their new assignments.`}
                confirmLabel="Assign Articles"
                onConfirm={handleAssignment}
                loading={assigningArticles}
            />
        </div>
    );
};

function ArticleItem({ article, isSelected, onSelect, onUnassign }) {
    return (
        <div
            className={`p-4 rounded-lg border transition-all ${
                isSelected
                    ? "border-[#4cb19f] bg-[rgba(76,177,159,0.05)]"
                    : "border-gray-200 hover:border-gray-300"
            }`}
        >
            <div className="flex gap-4">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onSelect(article.id)}
                    className="mt-1 w-5 h-5"
                />
                <img
                    src={article.image_url || "/default-article-image.png"}
                    alt=""
                    className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                    <label
                        htmlFor={`article-${article.id}`}
                        className="text-[1.5rem] font-medium text-gray-900 line-clamp-2 cursor-pointer"
                        onClick={() => onSelect(article.id)}
                    >
                        {article.title}
                    </label>
                    <div className="mt-2">
                        <p className="text-[1.2rem] text-gray-500 mb-2">
                            Assigned Editors:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {article.assigned_editors?.length > 0 ? (
                                article.assigned_editors.map((editor) => (
                                    <EditorTag
                                        key={editor.id}
                                        editor={editor}
                                        articleId={article.id}
                                        onUnassign={onUnassign}
                                    />
                                ))
                            ) : (
                                <span className="text-[1.2rem] text-gray-400 italic">
                                    No editors assigned
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function EditorItem({ editor, isSelected, onSelect }) {
    return (
        <div
            onClick={() => onSelect(editor.id)}
            className={`p-4 rounded-lg border cursor-pointer transition-all ${
                isSelected
                    ? "border-[#4cb19f] bg-[rgba(76,177,159,0.05)]"
                    : "border-gray-200 hover:border-gray-300"
            }`}
        >
            <div className="flex items-center gap-3">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onSelect(editor.id)}
                    className="w-5 h-5"
                />
                {editor.image ? (
                    <Image
                        src={editor.image}
                        alt=""
                        width={40}
                        height={40}
                        className="rounded-full"
                    />
                ) : (
                    <FallbackAuthorImage authorName={editor.name} size="sm" />
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-[1.4rem] font-medium text-gray-900 truncate">
                        {editor.name}
                    </p>
                    <p className="text-[1.2rem] text-gray-500 truncate">
                        {editor.email}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default withAuth(AssignArticles);
