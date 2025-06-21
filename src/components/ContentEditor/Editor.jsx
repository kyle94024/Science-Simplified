import { useRef, useEffect } from "react";
import { EditorContent, useEditor, BubbleMenu, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
// import individual nodes to extend for class attributes
import Paragraph from "@tiptap/extension-paragraph";
import Heading from "@tiptap/extension-heading";
import Blockquote from "@tiptap/extension-blockquote";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";

import {
  Bold,
  ImageIcon,
  Italic,
  LinkIcon,
  List as ListIcon,
  ListOrdered,
  RemoveFormatting,
  Strikethrough,
  UnderlineIcon,
} from "lucide-react";

import { HeadingSelector } from "./HeadingSelector";
import { LinkEditor } from "./LinkEditor";
import { ImageInputButton } from "./ImageInputButton";

import "./utils.scss";
import "./Editor.scss";

const ToggleButton = ({ active, children, ...buttonProps }) => (
  <button
    type="button"
    aria-selected={active}
    className="editor-button"
    {...buttonProps}
  >
    {children}
  </button>
);

export const Editor = ({ content, onChange }) => {
  const oldSelection = useRef(null);

  const editor = useEditor({
    extensions: [
      Paragraph.extend({
        addAttributes() {
          return { class: { default: null } };
        },
      }),
      Heading.extend({
        levels: [1, 2, 3, 4, 5, 6],
        addAttributes() {
          return { class: { default: null } };
        },
      }),
      Blockquote.extend({
        addAttributes() {
          return { class: { default: null } };
        },
      }),
      BulletList.extend({
        addAttributes() {
          return { class: { default: null } };
        },
      }),
      OrderedList.extend({
        addAttributes() {
          return { class: { default: null } };
        },
      }),
      ListItem.extend({
        addAttributes() {
          return { class: { default: null } };
        },
      }),
      StarterKit.configure({
        paragraph: false,
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      Image.configure({
        HTMLAttributes: { class: "apicss-image" },
      }),
      Link.configure({
        HTMLAttributes: { class: "apicss-link", target: "_blank", rel: "noopener" },
      }),
      Underline,
    ],
    content,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    onTransaction: ({ editor, transaction }) => {
      let tr = transaction;
      const removingEmptyLink = tr.getMeta("removeEmptyLink");
      if (
        oldSelection.current &&
        !removingEmptyLink &&
        !tr.selection.eq(oldSelection.current)
      ) {
        const marks = oldSelection.current.$to.marks();
        const emptyLink = marks.find(
          (mark) => mark.type.name === "link" && mark.attrs.href === null
        );
        if (emptyLink) {
          const { to } = oldSelection.current;
          tr = editor.state.tr.removeMark(0, to, emptyLink);
          tr = tr.setMeta("removeEmptyLink", true);
          editor.view.dispatch(tr);
        }
      }
      oldSelection.current = editor.state.selection;
    },
  });

  // keep external "content" in sync
  useEffect(() => {
    if (!editor) return;
    if (content && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  const editorState = useEditorState({
    editor,
    selector: ({ editor }) => ({
      isBold: editor?.isActive("bold"),
      isItalic: editor?.isActive("italic"),
      isUnderline: editor?.isActive("underline"),
      isStrikethrough: editor?.isActive("strike"),
      isLink: editor?.isActive("link"),
      isList: editor?.isActive("bulletList"),
      isOrderedList: editor?.isActive("orderedList"),
    }),
  });

  if (!editor) return <p>Loading editor...</p>;

  return (
    <div className="editor">
      <div className="editor__toolbar">
        <HeadingSelector
          isActive={(type, props) => editor.isActive(type, props)}
          setNode={(type, props) => editor.chain().focus().setNode(type, props).run()}
        />
        <ToggleButton
          title="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editorState.isBold}
        ><Bold size={16} /></ToggleButton>
        <ToggleButton
          title="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editorState.isItalic}
        ><Italic size={16} /></ToggleButton>
        <ToggleButton
          title="Strikethrough"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editorState.isStrikethrough}
        ><Strikethrough size={16} /></ToggleButton>
        <ToggleButton
          title="Underline"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editorState.isUnderline}
        ><UnderlineIcon size={16} /></ToggleButton>
        <ToggleButton
          title="Ordered List"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editorState.isOrderedList}
        ><ListOrdered size={16} /></ToggleButton>
        <ToggleButton
          title="Bullet List"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editorState.isList}
        ><ListIcon size={16} /></ToggleButton>
        <ImageInputButton
          onChange={(url) => editor.chain().focus().setImage({ src: url }).run()}
        ><ImageIcon size={16} /></ImageInputButton>
        <ToggleButton
          title="Link"
          onClick={() => {
            if (editorState.isLink) {
              editor.chain().focus().unsetMark('link').run();
            } else {
              editor.chain().focus().toggleLink({ href: null }).run()
            }
          }}
          active={editorState.isLink}
        ><LinkIcon size={16} /></ToggleButton>
        <button
          type="button"
          className="editor-button"
          onClick={() => editor.chain().focus().unsetAllMarks().run()}
        ><RemoveFormatting size={16} /></button>
      </div>

      <BubbleMenu
        editor={editor}
        tippyOptions={{ placement: 'bottom' }}
        shouldShow={({ editor }) => editor.isActive("link")}
      >
        <LinkEditor
          href={editor.getAttributes("link").href}
          onChange={(href) => editor.chain().extendMarkRange("link").setLink({ href }).run()}
          onDelete={() => editor.chain().extendMarkRange("link").unsetLink().run()}
        />
      </BubbleMenu>

      <EditorContent className="editor__container" editor={editor} />
    </div>
  );
};
