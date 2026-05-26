"use client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import CustomQuestionItem from "./CustomQuestionItem";

let nextId = 0;
const generateId = () => `q-${Date.now()}-${++nextId}`;

export default function CustomQuestionsEditor({ questions, onChange }) {
  // Ensure every question has a stable id (for DnD)
  const normalized = (questions || []).map((q) =>
    q.id ? q : { ...q, id: generateId() }
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = normalized.findIndex((q) => q.id === active.id);
    const newIndex = normalized.findIndex((q) => q.id === over.id);
    onChange(arrayMove(normalized, oldIndex, newIndex));
  }

  function updateQuestion(updated) {
    onChange(normalized.map((q) => (q.id === updated.id ? updated : q)));
  }

  function removeQuestion(id) {
    onChange(normalized.filter((q) => q.id !== id));
  }

  function addQuestion() {
    onChange([...normalized, { id: generateId(), question: "", answer: "" }]);
  }

  return (
    <div className="custom-questions-editor">
      {normalized.length === 0 ? (
        <p className="custom-questions-editor__empty">
          No custom questions yet. Click below to add one.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={normalized.map((q) => q.id)} strategy={verticalListSortingStrategy}>
            <div className="custom-questions-editor__list">
              {normalized.map((q) => (
                <CustomQuestionItem
                  key={q.id}
                  q={q}
                  onChange={updateQuestion}
                  onRemove={() => removeQuestion(q.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <button type="button" className="custom-questions-editor__add" onClick={addQuestion}>
        <Plus size={16} /> Add custom question
      </button>
    </div>
  );
}
