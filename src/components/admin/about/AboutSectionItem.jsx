"use client";
import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { sectionEditors, sectionLabels } from "./editors";

export default function AboutSectionItem({
  section,
  onToggleVisibility,
  onContentChange,
  onRemove,
}) {
  const [expanded, setExpanded] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const EditorComponent = sectionEditors[section.type];
  const label = sectionLabels[section.type] || section.type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl border ${
        section.visible ? "border-gray-200" : "border-gray-200 opacity-60"
      } ${isDragging ? "shadow-lg" : "shadow-sm"}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600"
          aria-label="Drag to reorder"
        >
          <GripVertical size={18} />
        </button>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown size={16} className="text-gray-400" />
          ) : (
            <ChevronRight size={16} className="text-gray-400" />
          )}
          <span className="text-[1.4rem] font-medium text-gray-800">
            {label}
          </span>
          {!section.visible && (
            <span className="text-[1.1rem] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              Hidden
            </span>
          )}
        </button>

        <button
          onClick={onToggleVisibility}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          title={section.visible ? "Hide section" : "Show section"}
        >
          {section.visible ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>

        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
          title="Remove section"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Editor (collapsible) */}
      {expanded && EditorComponent && (
        <div className="px-6 pb-5 pt-2 border-t border-gray-100">
          <EditorComponent
            content={section.content}
            onChange={onContentChange}
          />
        </div>
      )}
    </div>
  );
}
