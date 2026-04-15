"use client";

import React, { useState, useEffect } from "react";
import "./ResetPassword.scss";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import { Button } from "@/components/ui/button";
import { tenant } from "@/lib/config";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--auth-bg-top",
      `url(/assets/${tenant.pathName}/${tenant.loginBGTop})`
    );
    document.documentElement.style.setProperty(
      "--auth-bg-bottom",
      `url(/assets/${tenant.pathName}/${tenant.loginBGBottom})`
    );
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();

    const token = new URLSearchParams(window.location.search).get("token");

    if (!token) {
      alert("Invalid or missing reset token");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          newPassword: password,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      //  SUCCESS FLOW
      alert("Password reset successful!");

      //  redirect to login
      router.push("/login");

    } catch (err) {
      alert(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`login-page ${tenant.shortName === "RUNX1" ? "runx1-login" : ""}`}>
      <Navbar />

      <div className="login-page__body">
        <div className="login-form">
          <h1 className="login-form__title">Reset Password</h1>

          <form className="login-form__form" onSubmit={handleReset}>
            <div className="login-form__input-group">
              <label className="login-form__label">
                New Password
              </label>
              <input
                type="password"
                className="login-form__input"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="login-form__submit"
              disabled={loading}
            >
              {loading ? "Updating..." : "Reset Password"}
            </Button>
          </form>

          <p className="login-form__signup">
            Back to{" "}
            <a href="/login" className="login-form__signup-link">
              Login
            </a>
          </p>
        </div>
      </div>

      <Footer />
    </main>
  );
}