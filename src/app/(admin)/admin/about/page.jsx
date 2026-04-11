"use client";
import { useState, useEffect } from "react";
import { Save, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { withAuth } from "@/components/withAuth/withAuth";
import { PageHeader } from "@/components/admin";
import AboutSectionList from "@/components/admin/about/AboutSectionList";
import AddSectionDialog from "@/components/admin/about/AddSectionDialog";

function AdminAboutPage() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/about-config");
      const data = await res.json();
      setSections(data.sections || []);
      setSource(data.source || "defaults");
    } catch (error) {
      console.error("Error loading about config:", error);
      toast.error("Failed to load about page configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/about-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections }),
      });

      if (!res.ok) throw new Error("Save failed");

      setSource("db");
      setHasChanges(false);
      toast.success("About page saved successfully");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to save about page configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (!confirm("Reset all sections to default values? This will discard your custom changes.")) {
      return;
    }

    try {
      const res = await fetch("/api/about-config/defaults");
      const data = await res.json();
      setSections(data.sections || []);
      setHasChanges(true);
      toast.info("Reset to defaults. Save to apply.");
    } catch (error) {
      toast.error("Failed to load defaults");
    }
  };

  const handleSectionsChange = (newSections) => {
    setSections(newSections);
    setHasChanges(true);
  };

  const handleAddSection = (newSection) => {
    setSections((prev) => [...prev, newSection]);
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="animate-fadeIn">
        <PageHeader
          title="About Page Editor"
          subtitle="Customize your about page content and layout"
        />
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-gray-400" />
          <span className="ml-2 text-[1.4rem] text-gray-500">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <PageHeader
          title="About Page Editor"
          subtitle="Drag to reorder sections. Click to expand and edit content."
        />
        <div className="flex items-center gap-3">
          <button
            onClick={handleResetToDefaults}
            className="flex items-center gap-2 px-4 py-2 text-[1.3rem]
              text-gray-600 bg-white border border-gray-300 rounded-lg
              hover:bg-gray-50 transition-colors"
          >
            <RotateCcw size={16} />
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`flex items-center gap-2 px-5 py-2 text-[1.3rem]
              rounded-lg transition-colors font-medium
              ${
                hasChanges
                  ? "bg-[#4cb19f] text-white hover:bg-[#3d9485]"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {source === "defaults" && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-[1.3rem] text-amber-800">
          Showing default configuration. Make changes and save to customize your about page.
        </div>
      )}

      <AboutSectionList sections={sections} onChange={handleSectionsChange} />

      <div className="mt-4">
        <AddSectionDialog onAdd={handleAddSection} />
      </div>
    </div>
  );
}

export default withAuth(AdminAboutPage);
