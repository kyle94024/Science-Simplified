"use client";

export default function HeroEditor({ content, onChange }) {
  const update = (field, value) => onChange({ ...content, [field]: value });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[1.3rem] font-medium text-gray-700 mb-1">Heading</label>
        <input
          type="text"
          value={content.heading || ""}
          onChange={(e) => update("heading", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[1.4rem]"
        />
      </div>
      <div>
        <label className="block text-[1.3rem] font-medium text-gray-700 mb-1">Subheading</label>
        <input
          type="text"
          value={content.subheading || ""}
          onChange={(e) => update("subheading", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[1.4rem]"
        />
      </div>
      <div>
        <label className="block text-[1.3rem] font-medium text-gray-700 mb-1">Background Image URL</label>
        <input
          type="text"
          value={content.backgroundImageUrl || ""}
          onChange={(e) => update("backgroundImageUrl", e.target.value)}
          placeholder="Leave empty for no background"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[1.4rem]"
        />
        {content.backgroundImageUrl && (
          <img src={content.backgroundImageUrl} alt="Preview" className="mt-2 max-h-32 rounded-lg object-cover" />
        )}
      </div>
    </div>
  );
}
