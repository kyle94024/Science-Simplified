import { Fragment, useMemo } from "react";
import {
    Bold,
    IndentDecrease,
    IndentIncrease,
    Italic,
    Link2,
    List,
    ListOrdered,
    Quote,
    Redo2,
    RemoveFormatting,
    Strikethrough,
    Underline,
    Undo2,
} from "lucide-react";

import { ToolbarButton } from "./ToolbarButton";
import { BlockStyleSelect } from "./BlockStyleSelect";
import { ImageButton } from "./ImageButton";
import { formatShortcut, isMac } from "./shortcuts";

/** Toolbar layout per variant; each inner array is a divider-separated group. */
const LAYOUT = {
    full: [
        ["undo", "redo"],
        ["block"],
        ["bold", "italic", "underline", "strike"],
        ["bulletList", "orderedList", "outdent", "indent"],
        ["link", "image"],
        ["blockquote"],
        ["clear"],
    ],
    simple: [
        ["undo", "redo"],
        ["bold", "italic", "underline"],
        ["bulletList", "orderedList", "outdent", "indent"],
        ["link"],
    ],
};

/**
 * Every plain button: icon, label, shortcut tokens (see shortcuts.js), the
 * command it runs, and how to derive its active/disabled state from the
 * toolbar snapshot that Editor.jsx builds with useEditorState.
 */
const BUTTONS = {
    undo: {
        icon: Undo2,
        label: "Undo",
        keys: ["Mod", "Z"],
        run: (editor) => editor.chain().focus().undo().run(),
        disabled: (s) => !s.canUndo,
    },
    redo: {
        icon: Redo2,
        label: "Redo",
        keys: (mac) => (mac ? ["Mod", "Shift", "Z"] : ["Mod", "Y"]),
        run: (editor) => editor.chain().focus().redo().run(),
        disabled: (s) => !s.canRedo,
    },
    bold: {
        icon: Bold,
        label: "Bold",
        keys: ["Mod", "B"],
        run: (editor) => editor.chain().focus().toggleBold().run(),
        active: (s) => s.bold,
    },
    italic: {
        icon: Italic,
        label: "Italic",
        keys: ["Mod", "I"],
        run: (editor) => editor.chain().focus().toggleItalic().run(),
        active: (s) => s.italic,
    },
    underline: {
        icon: Underline,
        label: "Underline",
        keys: ["Mod", "U"],
        run: (editor) => editor.chain().focus().toggleUnderline().run(),
        active: (s) => s.underline,
    },
    strike: {
        icon: Strikethrough,
        label: "Strikethrough",
        keys: ["Mod", "Shift", "S"],
        run: (editor) => editor.chain().focus().toggleStrike().run(),
        active: (s) => s.strike,
    },
    bulletList: {
        icon: List,
        label: "Bulleted list",
        keys: ["Mod", "Shift", "8"],
        run: (editor) => editor.chain().focus().toggleBulletList().run(),
        active: (s) => s.bulletList,
    },
    orderedList: {
        icon: ListOrdered,
        label: "Numbered list",
        keys: ["Mod", "Shift", "7"],
        run: (editor) => editor.chain().focus().toggleOrderedList().run(),
        active: (s) => s.orderedList,
    },
    outdent: {
        icon: IndentDecrease,
        label: "Decrease indent",
        keys: ["Shift", "Tab"],
        run: (editor) => editor.chain().focus().liftListItem("listItem").run(),
        disabled: (s) => !s.canOutdent,
    },
    indent: {
        icon: IndentIncrease,
        label: "Increase indent",
        keys: ["Tab"],
        run: (editor) => editor.chain().focus().sinkListItem("listItem").run(),
        disabled: (s) => !s.canIndent,
    },
    blockquote: {
        icon: Quote,
        label: "Quote",
        keys: ["Mod", "Shift", "B"],
        run: (editor) => editor.chain().focus().toggleBlockquote().run(),
        active: (s) => s.blockquote,
    },
    clear: {
        icon: RemoveFormatting,
        label: "Clear formatting",
        run: (editor) => editor.chain().focus().clearNodes().unsetAllMarks().run(),
    },
};

function onBlockStyleChange(editor, value) {
    if (value === "paragraph") {
        editor.chain().focus().setParagraph().run();
    } else {
        const level = Number(value);
        if (level >= 1 && level <= 6) editor.chain().focus().setHeading({ level }).run();
    }
}

/** Left/Right arrows move between controls, as in a native toolbar. */
function onToolbarKeyDown(e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (e.target.tagName === "SELECT") return; // arrows change a select's value
    const items = Array.from(
        e.currentTarget.querySelectorAll("button:not(:disabled), select:not(:disabled)")
    );
    const index = items.indexOf(e.target);
    if (index < 0) return;
    e.preventDefault();
    const step = e.key === "ArrowRight" ? 1 : items.length - 1;
    items[(index + step) % items.length].focus();
}

export function Toolbar({ editor, state, variant, uploading, onLink, onImages }) {
    const mac = useMemo(() => isMac(), []);
    const groups = LAYOUT[variant] || LAYOUT.full;

    return (
        <div
            className="content-editor__toolbar"
            role="toolbar"
            aria-label="Formatting"
            onKeyDown={onToolbarKeyDown}
        >
            {groups.map((group, groupIndex) => (
                <Fragment key={group.join("-")}>
                    {groupIndex > 0 && (
                        <span className="content-editor__divider" aria-hidden="true" />
                    )}
                    <div className="content-editor__group">
                        {group.map((id) => {
                            if (id === "block") {
                                return (
                                    <BlockStyleSelect
                                        key={id}
                                        value={state.block}
                                        onChange={(value) => onBlockStyleChange(editor, value)}
                                    />
                                );
                            }
                            if (id === "link") {
                                return (
                                    <ToolbarButton
                                        key={id}
                                        icon={Link2}
                                        label={state.link ? "Edit link" : "Insert link"}
                                        active={state.link}
                                        // The bubble menu re-evaluates on the editor's focus
                                        // event, so this button must let the editor blur.
                                        keepFocus={false}
                                        onClick={onLink}
                                    />
                                );
                            }
                            if (id === "image") {
                                return (
                                    <ImageButton
                                        key={id}
                                        uploading={uploading}
                                        onFiles={onImages}
                                    />
                                );
                            }
                            const button = BUTTONS[id];
                            const keys =
                                typeof button.keys === "function" ? button.keys(mac) : button.keys;
                            return (
                                <ToolbarButton
                                    key={id}
                                    icon={button.icon}
                                    label={button.label}
                                    shortcut={keys ? formatShortcut(keys, mac) : undefined}
                                    active={button.active ? button.active(state) : undefined}
                                    disabled={button.disabled ? button.disabled(state) : false}
                                    onClick={() => button.run(editor)}
                                />
                            );
                        })}
                    </div>
                </Fragment>
            ))}
        </div>
    );
}
