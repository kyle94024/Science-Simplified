"use client";

import React, { useState, useEffect } from "react";
import "./create-editor-page.scss";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { tenant } from "@/lib/config";
import { withAuth } from "@/components/withAuth/withAuth";


export default withAuth(function CreateEditorPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "editor",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--auth-bg-top',
      `url(/assets/${tenant.pathName}/${tenant.loginBGTop})`
    );
    document.documentElement.style.setProperty(
      '--auth-bg-bottom',
      `url(/assets/${tenant.pathName}/${tenant.loginBGBottom})`
    );
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
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
      <Navbar />
      <ToastContainer />
      <div className="create-editor-page__body">
        <div className="create-editor">
          <h1 className="create-editor__title">Create Editor Account</h1>
          <form className="create-editor__form" onSubmit={handleSubmit}>
            <div className="create-editor__input-group create-editor__input-group--half">
              <div className="create-editor__input-wrapper">
                <label htmlFor="firstName" className="create-editor__label">
                  First Name
                </label>
                <Input
                  id="firstName"
                  name="firstName"
                  className="create-editor__input"
                  placeholder="First Name"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="create-editor__input-wrapper">
                <label htmlFor="lastName" className="create-editor__label">
                  Last Name
                </label>
                <Input
                  id="lastName"
                  name="lastName"
                  className="create-editor__input"
                  placeholder="Last Name"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="create-editor__input-group">
              <label htmlFor="email" className="create-editor__label">
                Email
              </label>
              <Input
                id="email"
                type="email"
                name="email"
                className="create-editor__input"
                placeholder="Enter Email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="create-editor__input-group">
              <label htmlFor="password" className="create-editor__label">
                Password
              </label>
              <div className="create-editor__password-input">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="create-editor__input"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="create-editor__password-toggle"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="create-editor__submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create Editor"
              )}
            </Button>
          </form>
        </div>
      </div>
      <Footer />
    </main>
  );
}, { adminOnly: true });
