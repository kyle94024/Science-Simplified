"use client";
import "./create-editor-page.scss";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Input } from "@/components/ui/input";


export default function CreateEditorPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "editor",
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/create-editor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setForm({ firstName: "", lastName: "", email: "", password: "", role: "editor" });
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Error creating editor:", error);
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="create-editor-page">
      <div className="create-editor-page__body">
        <div className="create-editor">
          <h1 className="create-editor__title">Create Editor Account</h1>
          <form className="create-editor__form" onSubmit={handleSubmit}>
            <div className="create-editor__input-group create-editor__input-group--half">
              <div>
                <label className="create-editor__label">First Name</label>
                <Input
                  className="create-editor__input"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="create-editor__label">Last Name</label>
                <Input
                  className="create-editor__input"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="create-editor__input-group">
              <label className="create-editor__label">Email</label>
              <Input
                className="create-editor__input"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="create-editor__input-group">
              <label className="create-editor__label">Password</label>
              <Input
                className="create-editor__input"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
              />
            </div>


            <button
              type="submit"
              className="create-editor__submit"
              disabled={loading}
            >
              {loading ? "Creating…" : "Create Editor"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
