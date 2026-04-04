"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { sectionLabels } from "./editors";

const defaultContent = {
  hero: { heading: "", subheading: "", backgroundImageUrl: "" },
  mission: { title: "Our Mission", body: "", imageUrl: "" },
  process: {
    title: "How It Works",
    description: "",
    steps: [{ icon: "Search", title: "", description: "" }],
  },
  founderStory: { name: "", role: "", photoUrl: "", story: "" },
  team: { title: "Our Team", description: "", members: [] },
  contributors: { title: "Scientific Contributors", description: "" },
  getInvolved: { title: "Get Involved", description: "", ctaText: "Contact Us", ctaLink: "/contact", imageUrl: "" },
  supporters: { title: "Community Supporters", description: "", supporters: [] },
};

export default function AddSectionDialog({ onAdd }) {
  const [open, setOpen] = useState(false);

  const handleAdd = (type) => {
    onAdd({
      id: `${type}-${Date.now()}`,
      type,
      visible: true,
      content: { ...defaultContent[type] },
    });
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl
          text-[1.4rem] text-gray-500 hover:border-[#4cb19f] hover:text-[#4cb19f]
          transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={18} /> Add Section
      </button>
    );
  }

  return (
    <div className="border-2 border-dashed border-[#4cb19f] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[1.3rem] font-medium text-gray-700">Choose a section type:</p>
        <button
          onClick={() => setOpen(false)}
          className="text-[1.2rem] text-gray-400 hover:text-gray-600"
        >
          Cancel
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {Object.entries(sectionLabels).map(([type, label]) => (
          <button
            key={type}
            onClick={() => handleAdd(type)}
            className="px-3 py-2 bg-gray-50 hover:bg-[rgba(76,177,159,0.1)]
              rounded-lg text-[1.3rem] text-gray-700 hover:text-[#4cb19f]
              transition-colors text-center"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
