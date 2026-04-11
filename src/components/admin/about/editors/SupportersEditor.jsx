"use client";
import { Plus, Trash2 } from "lucide-react";

export default function SupportersEditor({ content, onChange }) {
  const update = (field, value) => onChange({ ...content, [field]: value });
  const supporters = content.supporters || [];

  const updateSupporter = (index, field, value) => {
    const newSupporters = [...supporters];
    newSupporters[index] = { ...newSupporters[index], [field]: value };
    update("supporters", newSupporters);
  };

  const addSupporter = () => {
    update("supporters", [
      ...supporters,
      { id: `supporter-${Date.now()}`, name: "", logoUrl: "", link: "", width: 200, height: 100 },
    ]);
  };

  const removeSupporter = (index) => {
    update("supporters", supporters.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[1.3rem] font-medium text-gray-700 mb-1">Title</label>
        <input type="text" value={content.title || ""} onChange={(e) => update("title", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[1.4rem]" />
      </div>
      <div>
        <label className="block text-[1.3rem] font-medium text-gray-700 mb-1">Description</label>
        <textarea value={content.description || ""} onChange={(e) => update("description", e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[1.4rem]" />
      </div>
      <div>
        <label className="block text-[1.3rem] font-medium text-gray-700 mb-2">Supporters</label>
        {supporters.map((supporter, i) => (
          <div key={supporter.id || i} className="p-3 bg-gray-50 rounded-lg mb-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-12 h-12 bg-white rounded border flex items-center justify-center overflow-hidden">
                {supporter.logoUrl ? (
                  <img src={supporter.logoUrl} alt={supporter.name} className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-[1rem] text-gray-400">Logo</span>
                )}
              </div>
              <input type="text" value={supporter.name || ""} onChange={(e) => updateSupporter(i, "name", e.target.value)} placeholder="Name" className="flex-1 px-2 py-1 border border-gray-300 rounded text-[1.3rem]" />
              <button onClick={() => removeSupporter(i)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                <Trash2 size={16} />
              </button>
            </div>
            <input type="text" value={supporter.logoUrl || ""} onChange={(e) => updateSupporter(i, "logoUrl", e.target.value)} placeholder="Logo URL" className="w-full px-2 py-1 border border-gray-300 rounded text-[1.3rem]" />
            <input type="text" value={supporter.link || ""} onChange={(e) => updateSupporter(i, "link", e.target.value)} placeholder="Website URL" className="w-full px-2 py-1 border border-gray-300 rounded text-[1.3rem]" />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[1.1rem] text-gray-500">Width</label>
                <input type="number" value={supporter.width || 200} onChange={(e) => updateSupporter(i, "width", parseInt(e.target.value) || 200)} className="w-full px-2 py-1 border border-gray-300 rounded text-[1.3rem]" />
              </div>
              <div className="flex-1">
                <label className="text-[1.1rem] text-gray-500">Height</label>
                <input type="number" value={supporter.height || 100} onChange={(e) => updateSupporter(i, "height", parseInt(e.target.value) || 100)} className="w-full px-2 py-1 border border-gray-300 rounded text-[1.3rem]" />
              </div>
            </div>
          </div>
        ))}
        <button onClick={addSupporter} className="flex items-center gap-1 text-[1.3rem] text-[#4cb19f] hover:underline">
          <Plus size={16} /> Add Supporter
        </button>
      </div>
    </div>
  );
}
