"use client";
import dynamic from "next/dynamic";
const Editor = dynamic(() => import("@/components/ContentEditor/Editor"), { ssr: false });

export default function GetInvolvedEditor({ content, onChange }) {
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
        <Editor content={content.description || ""} onChange={(html) => update("description", html)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[1.3rem] font-medium text-gray-700 mb-1">CTA Text</label>
          <input type="text" value={content.ctaText || ""} onChange={(e) => update("ctaText", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[1.4rem]" />
        </div>
        <div>
          <label className="block text-[1.3rem] font-medium text-gray-700 mb-1">CTA Link</label>
          <input type="text" value={content.ctaLink || ""} onChange={(e) => update("ctaLink", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[1.4rem]" />
        </div>
      </div>
      <div>
        <label className="block text-[1.3rem] font-medium text-gray-700 mb-1">Image URL</label>
        <input type="text" value={content.imageUrl || ""} onChange={(e) => update("imageUrl", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[1.4rem]" />
        {content.imageUrl && (
          <img src={content.imageUrl} alt="Preview" className="mt-2 max-h-32 rounded-lg object-cover" />
        )}
      </div>
    </div>
  );
}
