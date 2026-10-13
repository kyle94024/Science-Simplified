"use client";

import "./ContactPage.scss";
import { useState, Suspense } from "react";
import Link from "next/link";
import { Bug, Mail, Send, Upload, Loader2 } from "lucide-react";
import Footer from "@/components/Footer/Footer";
import Navbar from "@/components/Navbar/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Loader from "@/app/loading";
import useAuthStore from "@/store/useAuthStore";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useUiText } from "@/hooks/useUiText";

export default function ContactPage() {
    const [articleLink, setArticleLink] = useState("");
    const [sendArticleAnonymously, setSendArticleAnonymously] = useState(false);
    const [bugName, setBugName] = useState("");
    const [bugEmail, setBugEmail] = useState("");
    const [bugDescription, setBugDescription] = useState("");
    const [bugImage, setBugImage] = useState(null);
    const [sendBugAnonymously, setSendBugAnonymously] = useState(false);
    const [isArticleLoading, setIsArticleLoading] = useState(false);
    const [isBugLoading, setIsBugLoading] = useState(false);
    const t = useUiText();

    const handleArticleSubmit = async (e) => {
        e.preventDefault();
        setIsArticleLoading(true);

        const user = useAuthStore.getState().user; // Access user from Zustand store

        try {
            console.log(articleLink, sendArticleAnonymously, user?.userId);
            const response = await fetch("/api/contact/article-request", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    article_link: articleLink,
                    submitted_by:
                        sendArticleAnonymously || !user ? null : user.userId, // Check if user is logged in
                    anonymous: sendArticleAnonymously, // Pass the anonymity status
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(t("Article request submitted successfully!"));
            } else {
                toast.error(t(data.error) || t("Failed to submit article request."));
            }
        } catch (error) {
            console.error("Error submitting article request:", error);
            toast.error(t("An error occurred while submitting the request."));
        } finally {
            setArticleLink("");
            setSendArticleAnonymously(false);
            setIsArticleLoading(false); // Ensure loading state ends
        }
    };

    const handleBugSubmit = async (e) => {
        e.preventDefault();
        setIsBugLoading(true);

        const user = useAuthStore.getState().user; // Access user from Zustand store

        try {
            const response = await fetch("/api/contact/bug-report", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    report: {
                        name: sendBugAnonymously ? "Anonymous" : bugName,
                        email: sendBugAnonymously ? "Anonymous" : bugEmail,
                        description: bugDescription,
                    },
                    submitted_by:
                        sendBugAnonymously || !user ? null : user.userId, // Check if user is logged in
                    anonymous: sendBugAnonymously, // Pass the anonymity status
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(t("Bug report submitted successfully!"));
                // Optionally, you can add further processing with `data`
            } else {
                toast.error(t(data.error) || t("Failed to submit bug report."));
            }
        } catch (error) {
            console.error("Error submitting bug report:", error);
            toast.error(t("An error occurred while submitting the report."));
        } finally {
            setBugName("");
            setBugEmail("");
            setBugDescription("");
            setBugImage(null);
            setSendBugAnonymously(false);
            setIsBugLoading(false); // Ensure loading state ends
        }
    };

    return (
        <Suspense fallback={<Loader />}>
            <div className="contact-page">
                <Navbar />
                <main className="contact-page__content padding">
                    <div className="contact-page__container boxed">
                        <section className="contact-page__hero">
                            <h1 className="contact-page__title">{t("Contact Us")}</h1>
                            <p className="contact-page__subtitle">
                                {t("We're here to help and listen to your feedback")}
                            </p>
                        </section>

                        <div className="contact-page__forms">
                            <div className="contact-page__forms__set">
                                <div className="contact-page__email-section contact-page__section">
                                    <h2 className="contact-page__section-title">
                                        {t("Email Us")}
                                    </h2>
                                    <p className="contact-page__section-description">
                                        {t("Get in touch via email")}
                                    </p>
                                    <p className="contact-page__section-description">
                                        {t("Please leave a message with your inquiry, and we'll get back to you as soon as possible.")}
                                    </p>
                                    <a
                                        href="mailto:kyle94024@gmail.com"
                                        className="btn btn-primary"
                                    >
                                        <Mail className="contact-page__email-icon" />
                                        <span>{t("Send us an Email")}</span>
                                    </a>
                                </div>

                                <div className="contact-page__article-section contact-page__section">
                                    <h2 className="contact-page__section-title">
                                        {t("Request an Article")}
                                    </h2>
                                    <p className="contact-page__section-description">
                                        {t("Please submit an article link")}
                                    </p>
                                    <form
                                        onSubmit={handleArticleSubmit}
                                        className="contact-page__form"
                                    >
                                        <div className="contact-page__field">
                                            <Label
                                                htmlFor="articleLink"
                                                className="contact-page__label"
                                            >
                                                {t("Article Link")}
                                            </Label>
                                            <Input
                                                id="articleLink"
                                                type="url"
                                                className="contact-page__input"
                                                placeholder={t("Enter article link")}
                                                value={articleLink}
                                                onChange={(e) =>
                                                    setArticleLink(
                                                        e.target.value
                                                    )
                                                }
                                                required
                                            />
                                        </div>
                                        <div className="contact-page__field">
                                            <Label className="contact-page__label !flex items-center justify-start">
                                                <Input
                                                    type="checkbox"
                                                    checked={
                                                        sendArticleAnonymously
                                                    }
                                                    onChange={() =>
                                                        setSendArticleAnonymously(
                                                            (prev) => !prev
                                                        )
                                                    }
                                                    className="contact-page__checkbox"
                                                />
                                                <span className="text">
                                                    {" "}
                                                    {t("Send request anonymously")}
                                                </span>
                                            </Label>
                                        </div>
                                        <Button
                                            type="submit"
                                            className="btn btn-primary-green"
                                            disabled={isArticleLoading}
                                        >
                                            {isArticleLoading ? (
                                                <>
                                                    <Loader2 className="contact-page__button-icon animate-spin" />
                                                    {t("Please wait")}
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="contact-page__button-icon" />
                                                    {t("Submit Request")}
                                                </>
                                            )}
                                        </Button>
                                    </form>
                                </div>
                            </div>

                            <div className="contact-page__bug-section contact-page__section">
                                <h2 className="contact-page__section-title">
                                    {t("Report a Bug")}
                                </h2>
                                <p className="contact-page__section-description">
                                    {t("Help us improve by reporting issues")}
                                </p>
                                <form
                                    onSubmit={handleBugSubmit}
                                    className="contact-page__form"
                                >
                                    <div className="contact-page__field">
                                        <Label
                                            htmlFor="bugName"
                                            className="contact-page__label"
                                        >
                                            {t("Your Name")}
                                        </Label>
                                        <Input
                                            id="bugName"
                                            type="text"
                                            className="contact-page__input"
                                            placeholder={t("Your Name")}
                                            value={bugName}
                                            onChange={(e) =>
                                                setBugName(e.target.value)
                                            }
                                            required={!sendBugAnonymously}
                                            disabled={sendBugAnonymously}
                                        />
                                    </div>
                                    <div className="contact-page__field">
                                        <Label
                                            htmlFor="bugEmail"
                                            className="contact-page__label"
                                        >
                                            {t("Your Email")}
                                        </Label>
                                        <Input
                                            id="bugEmail"
                                            type="email"
                                            className="contact-page__input"
                                            placeholder={t("Your Email")}
                                            value={bugEmail}
                                            onChange={(e) =>
                                                setBugEmail(e.target.value)
                                            }
                                            required={!sendBugAnonymously}
                                            disabled={sendBugAnonymously}
                                        />
                                    </div>
                                    <div className="contact-page__field">
                                        <Label
                                            htmlFor="bugDescription"
                                            className="contact-page__label"
                                        >
                                            {t("Bug Description")}
                                        </Label>
                                        <Textarea
                                            id="bugDescription"
                                            className="contact-page__input contact-page__textarea"
                                            placeholder={t("Describe the bug")}
                                            value={bugDescription}
                                            onChange={(e) =>
                                                setBugDescription(
                                                    e.target.value
                                                )
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="contact-page__field">
                                        <Label className="contact-page__label !flex items-center justify-start">
                                            <Input
                                                type="checkbox"
                                                checked={sendBugAnonymously}
                                                onChange={() => {
                                                    setSendBugAnonymously(
                                                        !sendBugAnonymously
                                                    );
                                                    if (!sendBugAnonymously) {
                                                        setBugName("");
                                                        setBugEmail("");
                                                    }
                                                }}
                                                className="contact-page__checkbox"
                                            />
                                            <span className="text">
                                                {" "}
                                                {t("Send report anonymously")}
                                            </span>
                                        </Label>
                                    </div>
                                    <Button
                                        type="submit"
                                        className="btn btn-primary-green"
                                        disabled={isBugLoading}
                                    >
                                        {isBugLoading ? (
                                            <>
                                                <Loader2 className="contact-page__button-icon animate-spin" />
                                                {t("Please wait")}
                                            </>
                                        ) : (
                                            <>
                                                <Bug className="contact-page__button-icon" />
                                                {t("Report Bug")}
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </div>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        </Suspense>
    );
}
