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
import AboutSectionItem from "./AboutSectionItem";

export default function AboutSectionList({ sections, onChange }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    onChange(arrayMove(sections, oldIndex, newIndex));
  };

  const updateSection = (id, updates) => {
    onChange(
      sections.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const updateSectionContent = (id, newContent) => {
    onChange(
      sections.map((s) =>
        s.id === id ? { ...s, content: newContent } : s
      )
    );
  };

  const removeSection = (id) => {
    onChange(sections.filter((s) => s.id !== id));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sections.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {sections.map((section) => (
            <AboutSectionItem
              key={section.id}
              section={section}
              onToggleVisibility={() =>
                updateSection(section.id, { visible: !section.visible })
              }
              onContentChange={(newContent) =>
                updateSectionContent(section.id, newContent)
              }
              onRemove={() => removeSection(section.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
