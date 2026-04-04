"use client";
import { Plus, Trash2 } from "lucide-react";

const ICON_OPTIONS = ["Search", "Cpu", "ShieldCheck", "BookOpen", "Users", "Microscope", "FileText", "Sparkles"];

export default function ProcessEditor({ content, onChange }) {
  const update = (field, value) => onChange({ ...content, [field]: value });
  const steps = content.steps || [];

  const updateStep = (index, field, value) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    update("steps", newSteps);
  };

  const addStep = () => {
    update("steps", [...steps, { icon: "FileText", title: "", description: "" }]);
  };

  const removeStep = (index) => {
    update("steps", steps.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[1.3rem] font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          value={content.title || ""}
          onChange={(e) => update("title", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[1.4rem]"
        />
      </div>
      <div>
        <label className="block text-[1.3rem] font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={content.description?.replace(/<\/?p>/g, "") || ""}
          onChange={(e) => update("description", `<p>${e.target.value}</p>`)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[1.4rem]"
        />
      </div>
      <div>
        <label className="block text-[1.3rem] font-medium text-gray-700 mb-2">Steps</label>
        {steps.map((step, i) => (
          <div key={i} className="p-3 bg-gray-50 rounded-lg mb-3 space-y-2">
            <div className="flex items-center gap-2">
              <select
                value={step.icon || "FileText"}
                onChange={(e) => updateStep(i, "icon", e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-[1.3rem]"
              >
                {ICON_OPTIONS.map((icon) => (
                  <option key={icon} value={icon}>{icon}</option>
                ))}
              </select>
              <input
                type="text"
                value={step.title || ""}
                onChange={(e) => updateStep(i, "title", e.target.value)}
                placeholder="Step title"
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-[1.3rem]"
              />
              <button onClick={() => removeStep(i)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                <Trash2 size={16} />
              </button>
            </div>
            <textarea
              value={step.description || ""}
              onChange={(e) => updateStep(i, "description", e.target.value)}
              placeholder="Step description"
              rows={2}
              className="w-full px-2 py-1 border border-gray-300 rounded text-[1.3rem]"
            />
          </div>
        ))}
        <button onClick={addStep} className="flex items-center gap-1 text-[1.3rem] text-[#4cb19f] hover:underline">
          <Plus size={16} /> Add Step
        </button>
      </div>
    </div>
  );
}
