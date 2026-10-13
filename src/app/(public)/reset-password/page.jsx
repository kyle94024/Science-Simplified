"use client";

import React, { useState, useEffect } from "react";
import "./ResetPassword.scss";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import { Button } from "@/components/ui/button";
import { tenant } from "@/lib/config";
import { useRouter } from "next/navigation";
import { useUiText } from "@/hooks/useUiText";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = useUiText();

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
      alert(t("Invalid or missing reset token"));
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
      alert(t("Password reset successful!"));

      //  redirect to login
      router.push("/login");

    } catch (err) {
      alert(t(err.message) || t("Something went wrong"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`login-page ${tenant.shortName === "RUNX1" ? "runx1-login" : ""}`}>
      <Navbar />

      <div className="login-page__body">
        <div className="login-form">
          <h1 className="login-form__title">{t("Reset Password")}</h1>

          <form className="login-form__form" onSubmit={handleReset}>
            <div className="login-form__input-group">
              <label className="login-form__label">
                {t("New Password")}
              </label>
              <input
                type="password"
                className="login-form__input"
                placeholder={t("Enter new password")}
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
              {loading ? t("Updating...") : t("Reset Password")}
            </Button>
          </form>

          <p className="login-form__signup">
            {t.rich("Back to {link}", {
              link: (
                <a href="/login" className="login-form__signup-link">
                  {t("Login")}
                </a>
              ),
            })}
          </p>
        </div>
      </div>

      <Footer />
    </main>
  );
}