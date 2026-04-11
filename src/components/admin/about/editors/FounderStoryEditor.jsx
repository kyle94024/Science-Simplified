"use client";
import dynamic from "next/dynamic";
const Editor = dynamic(() => import("@/components/ContentEditor/Editor").then(mod => mod.Editor), { ssr: false });

export default function FounderStoryEditor({ content, onChange }) {
  const update = (field, value) => onChange({ ...content, [field]: value });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[1.3rem] font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={content.name || ""}
            onChange={(e) => update("name", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[1.4rem]"
          />
        </div>
        <div>
          <label className="block text-[1.3rem] font-medium text-gray-700 mb-1">Role</label>
          <input
            type="text"
            value={content.role || ""}
            onChange={(e) => update("role", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[1.4rem]"
          />
        </div>
      </div>
      <div>
        <label className="block text-[1.3rem] font-medium text-gray-700 mb-1">Photo URL</label>
        <input
          type="text"
          value={content.photoUrl || ""}
          onChange={(e) => update("photoUrl", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[1.4rem]"
        />
        {content.photoUrl && (
          <img src={content.photoUrl} alt="Preview" className="mt-2 w-24 h-24 rounded-full object-cover" />
        )}
      </div>
      <div>
        <label className="block text-[1.3rem] font-medium text-gray-700 mb-1">Story</label>
        <Editor content={content.story || ""} onChange={(html) => update("story", html)} />
      </div>
    </div>
  );
}
