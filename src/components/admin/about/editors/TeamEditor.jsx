"use client";
import { Plus, Trash2 } from "lucide-react";

export default function TeamEditor({ content, onChange }) {
  const update = (field, value) => onChange({ ...content, [field]: value });
  const members = content.members || [];

  const updateMember = (index, field, value) => {
    const newMembers = [...members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    update("members", newMembers);
  };

  const addMember = () => {
    update("members", [
      ...members,
      { id: `member-${Date.now()}`, name: "", title: "", bio: "", imageUrl: "" },
    ]);
  };

  const removeMember = (index) => {
    update("members", members.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[1.3rem] font-medium text-gray-700 mb-1">Section Title</label>
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
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[1.4rem]"
        />
      </div>
      <div>
        <label className="block text-[1.3rem] font-medium text-gray-700 mb-2">Team Members</label>
        {members.map((member, i) => (
          <div key={member.id || i} className="p-4 bg-gray-50 rounded-lg mb-3 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {member.imageUrl ? (
                  <img src={member.imageUrl} alt={member.name} className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-500">
                    {member.name?.[0] || "?"}
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input type="text" value={member.name || ""} onChange={(e) => updateMember(i, "name", e.target.value)} placeholder="Name" className="w-full px-2 py-1 border border-gray-300 rounded text-[1.3rem]" />
                <input type="text" value={member.title || ""} onChange={(e) => updateMember(i, "title", e.target.value)} placeholder="Title" className="w-full px-2 py-1 border border-gray-300 rounded text-[1.3rem]" />
                <textarea value={member.bio || ""} onChange={(e) => updateMember(i, "bio", e.target.value)} placeholder="Bio" rows={2} className="w-full px-2 py-1 border border-gray-300 rounded text-[1.3rem]" />
                <input type="text" value={member.imageUrl || ""} onChange={(e) => updateMember(i, "imageUrl", e.target.value)} placeholder="Image URL" className="w-full px-2 py-1 border border-gray-300 rounded text-[1.3rem]" />
              </div>
              <button onClick={() => removeMember(i)} className="p-1 text-red-500 hover:bg-red-50 rounded flex-shrink-0">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        <button onClick={addMember} className="flex items-center gap-1 text-[1.3rem] text-[#4cb19f] hover:underline">
          <Plus size={16} /> Add Team Member
        </button>
      </div>
    </div>
  );
}
