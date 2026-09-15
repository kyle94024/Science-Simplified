"use client";

/**
 * The editor's React shell — toolbar, link bubble, image upload and content
 * sync — on top of the frozen document model in extensions.js. Mounted on five
 * pages (article add/edit ×3, the About admin) as
 *   <Editor content={html} onChange={setHtml} className="…" />
 * and persists whatever editor.getHTML() returns.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { BubbleMenu, EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { toast } from "react-toastify";

import { createExtensions } from "./extensions";
import { Toolbar } from "./Toolbar";
import { LinkEditor } from "./LinkEditor";
import { isImageFile, uploadImage } from "./uploadImage";

import "./Editor.scss";

/** Word/Outlook paste debris the schema can't see: comments and <o:p> wrappers. */
function cleanPastedHtml(html) {
    return html.replace(/<!--[\s\S]*?-->/g, "").replace(/<\/?o:p\b[^>]*>/gi, "");
}

function imageFilesOf(list) {
    return Array.from(list || []).filter(isImageFile);
}

/** Which entry of the block-style menu describes the current selection. */
function currentBlock(editor) {
    if (editor.isActive("heading")) {
        const level = editor.getAttributes("heading").level;
        return level <= 3 ? String(level) : "other";
    }
    return editor.isActive("paragraph") ? "paragraph" : "other";
}

/** A link draft stays open while the caret/selection is anywhere inside its range. */
const withinDraft = (selection, draft) =>
    selection.from >= draft.from && selection.to <= draft.to;

const EMPTY_STATE = {
    canUndo: false,
    canRedo: false,
    block: "paragraph",
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    bulletList: false,
    orderedList: false,
    blockquote: false,
    link: false,
    linkHref: null,
    canIndent: false,
    canOutdent: false,
};

export const Editor = ({
    content,
    onChange,
    className,
    variant = "full",
    minHeight,
}) => {
    // Content sync without cursor resets: remember the last HTML we handed to
    // the parent so its echo never re-renders the document under the caret.
    const lastEmittedRef = useRef(content ?? "");
    const onChangeRef = useRef(onChange);
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    // A new link being created from the toolbar: { id, from, to }. The bubble
    // menu's shouldShow is captured once at mount, hence the ref twin.
    const [linkDraft, setLinkDraft] = useState(null);
    const linkDraftRef = useRef(null);
    // True while openLinkEditor nudges the selection to wake the bubble menu.
    const nudgingRef = useRef(false);

    const uploadsRef = useRef(0);
    const [uploading, setUploading] = useState(false);
    const insertImagesRef = useRef(null);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: createExtensions(),
        content: content ?? "",
        editorProps: {
            attributes: {
                role: "textbox",
                "aria-multiline": "true",
                "aria-label": variant === "simple" ? "Summary" : "Article text",
            },
            transformPastedHTML: cleanPastedHtml,
            handlePaste: (view, event) => {
                const files = imageFilesOf(event.clipboardData?.files);
                // Text alongside the file (a Word selection) is a normal paste.
                if (!files.length || event.clipboardData.getData("text/plain").trim()) {
                    return false;
                }
                insertImagesRef.current?.(files);
                return true;
            },
            handleDrop: (view, event, slice, moved) => {
                if (moved) return false;
                const files = imageFilesOf(event.dataTransfer?.files);
                if (!files.length) return false;
                const drop = view.posAtCoords({ left: event.clientX, top: event.clientY });
                insertImagesRef.current?.(files, drop?.pos);
                return true;
            },
        },
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            lastEmittedRef.current = html;
            onChangeRef.current?.(html);
            if (linkDraftRef.current) {
                // The document changed under an unfinished link draft (applyLink
                // closes the draft itself before it edits).
                linkDraftRef.current = null;
                setLinkDraft(null);
            }
        },
        onSelectionUpdate: ({ editor }) => {
            if (nudgingRef.current) return;
            const draft = linkDraftRef.current;
            if (draft && !withinDraft(editor.state.selection, draft)) {
                linkDraftRef.current = null;
                setLinkDraft(null);
            }
        },
    });

    // External changes (docx import, the About page switching sections) still
    // land; our own echoes are ignored.
    useEffect(() => {
        if (!editor) return;
        const next = content ?? "";
        if (next !== lastEmittedRef.current && next !== editor.getHTML()) {
            lastEmittedRef.current = next;
            editor.commands.setContent(next, false);
        }
    }, [content, editor]);

    const state = useEditorState({
        editor,
        selector: ({ editor }) => {
            if (!editor) return EMPTY_STATE;
            const inLink = editor.isActive("link");
            return {
                canUndo: editor.can().undo(),
                canRedo: editor.can().redo(),
                block: currentBlock(editor),
                bold: editor.isActive("bold"),
                italic: editor.isActive("italic"),
                underline: editor.isActive("underline"),
                strike: editor.isActive("strike"),
                bulletList: editor.isActive("bulletList"),
                orderedList: editor.isActive("orderedList"),
                blockquote: editor.isActive("blockquote"),
                link: inLink,
                linkHref: inLink ? editor.getAttributes("link").href ?? null : null,
                canIndent: editor.can().sinkListItem("listItem"),
                canOutdent:
                    editor.isActive("listItem") && editor.can().liftListItem("listItem"),
            };
        },
    });

    // ---- images -----------------------------------------------------------

    const insertImages = useCallback(
        async (files, pos) => {
            if (!editor) return;
            for (const file of files) {
                uploadsRef.current += 1;
                setUploading(true);
                try {
                    const { src, alt } = await uploadImage(file);
                    if (editor.isDestroyed) return;
                    const chain = editor.chain().focus();
                    if (typeof pos === "number") {
                        const at = Math.min(pos, editor.state.doc.content.size);
                        chain.insertContentAt(at, { type: "image", attrs: { src, alt } });
                    } else {
                        chain.setImage({ src, alt });
                    }
                    chain.run();
                } catch (err) {
                    toast.error(err?.message || "Image upload failed.");
                } finally {
                    uploadsRef.current -= 1;
                    setUploading(uploadsRef.current > 0);
                }
            }
        },
        [editor]
    );
    useEffect(() => {
        insertImagesRef.current = insertImages;
    }, [insertImages]);

    // ---- links ------------------------------------------------------------

    const openLinkEditor = useCallback(() => {
        if (!editor) return;
        const { from, to } = editor.state.selection;
        const draft = { id: Date.now(), from, to, existing: editor.isActive("link") };
        linkDraftRef.current = draft;
        setLinkDraft(draft);
        // The bubble-menu plugin only re-evaluates shouldShow on a selection or
        // document change, or on a focus event — and focus events are not
        // dispatched in every situation (a background window, some assistive
        // tech). Nudging the selection (collapse, then restore) is a real
        // selection change, so the bubble opens deterministically; the draft
        // tolerates the caret anywhere inside its range, so it survives the nudge.
        editor.view.focus();
        nudgingRef.current = true;
        try {
            if (from === to) {
                // Collapsed caret: briefly select the neighbouring character,
                // then collapse back — the caret ends up exactly where it was.
                const size = editor.state.doc.content.size;
                const alt = from > 1 ? from - 1 : Math.min(from + 1, size);
                editor.commands.setTextSelection({
                    from: Math.min(alt, from),
                    to: Math.max(alt, from),
                });
                editor.commands.setTextSelection(from);
            } else {
                editor.commands.setTextSelection(from);
                editor.commands.setTextSelection({ from, to });
            }
        } finally {
            nudgingRef.current = false;
        }
    }, [editor]);

    const shouldShowLinkMenu = useCallback(({ editor, state }) => {
        if (editor.isActive("link")) return true;
        const draft = linkDraftRef.current;
        return !!draft && withinDraft(state.selection, draft);
    }, []);

    const closeLinkDraft = useCallback(() => {
        linkDraftRef.current = null;
        setLinkDraft(null);
    }, []);

    const applyLink = useCallback(
        (href) => {
            const draft = linkDraftRef.current;
            closeLinkDraft();
            const chain = editor.chain().focus();
            if (draft && !draft.existing && draft.from === draft.to) {
                // Nothing selected: the address itself becomes the link text.
                chain.insertContentAt(draft.from, {
                    type: "text",
                    text: href,
                    marks: [{ type: "link", attrs: { href } }],
                });
            } else if (draft && !draft.existing) {
                chain.setTextSelection({ from: draft.from, to: draft.to }).setLink({ href });
            } else {
                chain.extendMarkRange("link").setLink({ href });
            }
            chain.run();
        },
        [editor, closeLinkDraft]
    );

    const removeLink = useCallback(() => {
        closeLinkDraft();
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }, [editor, closeLinkDraft]);

    const cancelLink = useCallback(() => {
        closeLinkDraft();
        editor.commands.focus();
    }, [editor, closeLinkDraft]);

    // ---- render -----------------------------------------------------------

    const rootClass = ["content-editor", `content-editor--${variant}`, className]
        .filter(Boolean)
        .join(" ");
    const style = minHeight ? { "--content-editor-min-height": minHeight } : undefined;

    // A draft on an existing link opens straight into the input; a draft on
    // plain text has no href yet.
    const linkHref = linkDraft ? (linkDraft.existing ? state.linkHref : null) : state.linkHref;
    const showLinkEditor = !!linkDraft || state.linkHref != null;

    return (
        <div className={rootClass} style={style} aria-busy={uploading || undefined}>
            {editor && (
                <Toolbar
                    editor={editor}
                    state={state}
                    variant={variant}
                    uploading={uploading}
                    onLink={openLinkEditor}
                    onImages={insertImages}
                />
            )}

            {editor && (
                <BubbleMenu
                    editor={editor}
                    pluginKey="linkBubble"
                    updateDelay={0}
                    shouldShow={shouldShowLinkMenu}
                    tippyOptions={{
                        placement: "bottom-start",
                        maxWidth: "none",
                        // The menu's DOM is detached until tippy shows it, so a
                        // fresh link's input can only take focus once mounted.
                        onMount: (instance) => instance.popper.querySelector("input")?.focus(),
                        onShown: (instance) => instance.popper.querySelector("input")?.focus(),
                    }}
                >
                    {showLinkEditor && (
                        <LinkEditor
                            key={linkDraft ? `draft-${linkDraft.id}` : linkHref}
                            href={linkDraft && !linkDraft.existing ? null : linkHref}
                            autoEdit={!!linkDraft?.existing}
                            onSubmit={applyLink}
                            onRemove={removeLink}
                            onCancel={cancelLink}
                        />
                    )}
                </BubbleMenu>
            )}

            <div
                className="content-editor__body"
                onMouseDown={(e) => {
                    // Clicking the empty space below the text puts the caret at the end.
                    if (e.target === e.currentTarget && editor) {
                        e.preventDefault();
                        editor.chain().focus("end").run();
                    }
                }}
            >
                <EditorContent editor={editor} />
            </div>
        </div>
    );
};

export default Editor;
