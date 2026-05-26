"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";

export default function CustomQuestionItem({ q, onChange, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: q.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="custom-question-item">
      <button
        type="button"
        className="custom-question-item__drag"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical size={18} />
      </button>

      <div className="custom-question-item__fields">
        <input
          type="text"
          className="custom-question-item__question"
          placeholder="Question..."
          value={q.question || ""}
          onChange={(e) => onChange({ ...q, question: e.target.value })}
        />
        <textarea
          rows={4}
          className="custom-question-item__answer"
          placeholder="Answer..."
          value={q.answer || ""}
          onChange={(e) => onChange({ ...q, answer: e.target.value })}
        />
      </div>

      <button
        type="button"
        className="custom-question-item__remove"
        onClick={onRemove}
        aria-label="Remove question"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
