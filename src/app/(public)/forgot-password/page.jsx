"use client";

import React, { useState } from "react";
import "./ForgotPassword.scss";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { tenant } from "@/lib/config";

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await requestPasswordReset(email);

      //  show reset link directly for testing
      alert("Reset link sent! Check your email.");
    //   console.log("RESET LINK:", res.resetLink);

    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`login-page ${tenant.shortName === "RUNX1" ? "runx1-login" : ""}`}>
      <Navbar />

      <div className="login-page__body">
        <div className="login-form">
          <h1 className="login-form__title">Forgot Password</h1>

          <form className="login-form__form" onSubmit={handleSubmit}>
            <div className="login-form__input-group">
              <label className="login-form__label">Email</label>
              <input
                type="email"
                className="login-form__input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="login-form__submit"
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>

          <p className="login-form__signup">
            Remember your password?{" "}
            <a href="/login" className="login-form__signup-link">
              Back to login
            </a>
          </p>
        </div>
      </div>

      <Footer />
    </main>
  );
}