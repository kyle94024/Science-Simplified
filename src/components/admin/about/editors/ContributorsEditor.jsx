"use client";

export default function ContributorsEditor({ content, onChange }) {
  const update = (field, value) => onChange({ ...content, [field]: value });

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
          value={content.description || ""}
          onChange={(e) => update("description", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[1.4rem]"
        />
      </div>
      <p className="text-[1.2rem] text-gray-400 italic">
        Contributors are automatically populated from editors who have verified articles.
      </p>
    </div>
  );
}
