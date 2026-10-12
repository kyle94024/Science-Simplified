"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import "./ArticlePage.scss";
import Footer from "@/components/Footer/Footer";
import Navbar from "@/components/Navbar/Navbar";
import SectionLoader from "@/components/SectionLoader/SectionLoader";
import { Button } from "@/components/ui/button";
import { Heart, Loader2, ChevronDown, ExternalLink, Pencil, Trash2, AlertTriangle, Globe, Volume2 } from "lucide-react";
import AudioPlayer from "@/components/AudioPlayer/AudioPlayer";
import Image from "next/image";
import Link from "next/link";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/useAuthStore";
import { HeartFilledIcon } from "@radix-ui/react-icons";
import { SUPPORTED_LANGUAGES, TRANSLATION_WARNINGS, TRANSLATION_LOADING_MESSAGES } from "@/lib/translationWarnings";
import { tenant } from "@/lib/config";
import { useArticleLanguage } from "@/hooks/useArticleLanguage";

import { format } from "date-fns";

const ArticlePage = ({ params }) => {
    const router = useRouter();
    const { id } = params;
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Favorite state
    const [isFavorited, setIsFavorited] = useState(false);
    const [favoriting, setFavoriting] = useState(false);
    const [authorsExpanded, setAuthorsExpanded] = useState(true);

    // Translation state
    const [selectedLanguage, setSelectedLanguage] = useState(null);
    const [translation, setTranslation] = useState(null);
    const [translating, setTranslating] = useState(false);
    // Site-wide article language (NF): this page follows the reader's choice and
    // its language buttons set it. Elsewhere the buttons work per page as before.
    const {
        enabled: siteLanguage,
        ready: siteLanguageReady,
        language: siteLang,
        setLanguage: setSiteLanguage,
    } = useArticleLanguage();
    const translationRequest = useRef(0); // newest request wins when switching quickly
    const selectedLanguageRef = useRef(null);
    const failedLanguages = useRef(new Set()); // don't auto-retry a failed one on this page

    // Audio state
    const [regeneratingAudio, setRegeneratingAudio] = useState(false);
    const [audioGenerating, setAudioGenerating] = useState(false);

    // Scroll progress
    const [scrollProgress, setScrollProgress] = useState(0);

    const { isAdmin, user } = useAuthStore(); // Access user and admin state from Zustand
    const { email, userId, name } = user || {};

    // Note: favorite status is fetched inline where the article is loaded

    // Toggle favorite/unfavorite with optimistic update
    const toggleFavoriteArticle = async () => {
        if (!userId) {
            toast.info("Please log in to favorite articles.");
            return;
        }

        // Store previous state for rollback
        const prevIsFavorited = isFavorited;
        const prevFavoriteCount = Number(article?.favorite_count || 0); // Ensure number

        // Optimistic update
        setFavoriting(true);
        setIsFavorited(!isFavorited);
        setArticle((prev) => ({
            ...prev,
            favorite_count: prevIsFavorited
                ? Number(prev.favorite_count) - 1
                : Number(prev.favorite_count) + 1, // Ensure numeric operation
        }));

        try {
            const method = prevIsFavorited ? "DELETE" : "POST";
            const res = await fetch(`/api/articles/${id}/like`, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });

            const { success, message } = await res.json();
            if (!success) throw new Error(message);

            // Optionally refetch article to sync with server
            const response = await fetch(`/api/articles/${id}`);
            const updatedArticle = await response.json();
            setArticle(updatedArticle);

                toast.success(prevIsFavorited ? "Article unfavorited!" : "Article favorited!");
        } catch (e) {
            // Revert optimistic update on error
            setIsFavorited(prevIsFavorited);
            setArticle((prev) => ({
                ...prev,
                favorite_count: prevFavoriteCount,
            }));
            toast.error(e.message || "Action failed");
        } finally {
            setFavoriting(false);
        }
    };

    useEffect(() => {
        const fetchArticle = async () => {
            try {
                const response = await fetch(`/api/articles/${id}`);
                if (!response.ok) throw new Error("Error fetching article");

                const data = await response.json();
                // Ensure favorite_count is a number
                setArticle({ ...data, favorite_count: Number(data.favorite_count) });
            } catch (err) {
                setError(err.message);
                toast.error(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchArticle();

        if (userId) {
            const fetchFavoriteStatus = async () => {
                try {
                    const res = await fetch(`/api/articles/${id}/like?userId=${userId}`, {
                        method: "GET",
                    });
                    const { success, data, message } = await res.json();
                    if (!success) throw new Error(message);
                    setIsFavorited(data.isFavorited || false);
                } catch (e) {
                    console.error("Error fetching favorite status:", e);
                }
            };
            fetchFavoriteStatus(); // Fetch favorite status when user is logged in
        }
    }, [id, userId]);

    // Scroll progress bar
    useEffect(() => {
        const onScroll = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            setScrollProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // Poll for audio generation status (admin only, when no audio yet)
    useEffect(() => {
        if (!isAdmin || !article || article.audio_url) return;

        setAudioGenerating(true);
        let attempts = 0;
        const maxAttempts = 12; // ~60 seconds

        const interval = setInterval(async () => {
            attempts++;
            try {
                const res = await fetch(`/api/articles/${id}/audio`);
                const data = await res.json();
                if (data.audioUrl) {
                    setArticle((prev) => ({ ...prev, audio_url: data.audioUrl }));
                    setAudioGenerating(false);
                    clearInterval(interval);
                }
            } catch (e) {
                // ignore polling errors
            }
            if (attempts >= maxAttempts) {
                setAudioGenerating(false);
                clearInterval(interval);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [isAdmin, article, id]);

    /**
     * Show the article in `langCode` (null = English). Stored translations come
     * back immediately; a first-time one is generated server-side (202 = another
     * request is already generating it — poll). The English text stays on screen
     * until the translation arrives, and a newer choice cancels an older one.
     */
    const loadTranslation = useCallback(async (langCode) => {
        const request = ++translationRequest.current;
        selectedLanguageRef.current = langCode;
        setSelectedLanguage(langCode);
        if (!langCode) {
            setTranslation(null);
            setTranslating(false);
            return;
        }
        setTranslating(true);
        try {
            const deadline = Date.now() + 90_000;
            for (;;) {
                const res = await fetch(`/api/articles/${id}/translate?lang=${langCode}`);
                if (request !== translationRequest.current) return;
                if (res.status === 202 && Date.now() < deadline) {
                    await new Promise((r) => setTimeout(r, 3000));
                    if (request !== translationRequest.current) return;
                    continue;
                }
                if (res.status === 404) {
                    // No such article — the page already shows its own error.
                    selectedLanguageRef.current = null;
                    setSelectedLanguage(null);
                    setTranslation(null);
                    return;
                }
                if (!res.ok) throw new Error(`Translation failed (${res.status})`);
                const data = await res.json();
                if (request !== translationRequest.current) return;
                setTranslation(data);
                break;
            }
        } catch (e) {
            if (request !== translationRequest.current) return;
            console.error("Translation error:", e);
            failedLanguages.current.add(langCode);
            toast.error("This translation isn't available right now. Showing the original English.");
            selectedLanguageRef.current = null;
            setSelectedLanguage(null);
            setTranslation(null);
        } finally {
            if (request === translationRequest.current) setTranslating(false);
        }
    }, [id]);

    // Follow the site-wide language (NF). The translation only needs the id, so it
    // loads in parallel with the English article rather than after it.
    useEffect(() => {
        if (!siteLanguage || !siteLanguageReady) return;
        const target = siteLang === "en" ? null : siteLang;
        if (target && failedLanguages.current.has(target)) return;
        if (target !== selectedLanguageRef.current) loadTranslation(target);
    }, [siteLanguage, siteLanguageReady, siteLang, loadTranslation]);

    // Language buttons: pick a language, or click the current one / "English" to go back.
    const handleTranslate = (langCode) => {
        const next = langCode && langCode !== selectedLanguage ? langCode : null;
        if (!siteLanguage) {
            loadTranslation(next);
            return;
        }
        if (next) failedLanguages.current.delete(next); // an explicit click retries
        const nextSite = next || "en";
        setSiteLanguage(nextSite); // persists; the effect above loads it…
        if (nextSite === siteLang) loadTranslation(next); // …unless it was already the site language
    };

    // The translation on screen (only once it matches the chosen language).
    const activeTranslation =
        selectedLanguage && translation && translation.language === selectedLanguage ? translation : null;

    // Reading in another language: hold the page loader briefly so the English
    // text doesn't flash first. A stored translation lands well within the hold;
    // a first-time one (generated now, ~15s) releases it and the English text
    // shows with the "translating" note instead of a long blank wait.
    const [translationSlow, setTranslationSlow] = useState(false);
    useEffect(() => {
        if (!translating) return;
        setTranslationSlow(false);
        const timer = setTimeout(() => setTranslationSlow(true), 1200);
        return () => clearTimeout(timer);
    }, [translating, selectedLanguage]);
    // Only on first load: switching languages mid-read keeps the article on screen.
    const [contentShown, setContentShown] = useState(false);
    const holdForTranslation =
        siteLanguage &&
        !contentShown &&
        (!siteLanguageReady || (!!selectedLanguage && translating && !activeTranslation && !translationSlow));
    useEffect(() => {
        if (!loading && article && !holdForTranslation) setContentShown(true);
    }, [loading, article, holdForTranslation]);

    const handleRegenerateAudio = async () => {
        setRegeneratingAudio(true);
        try {
            const res = await fetch(`/api/articles/${id}/audio`, { method: "POST" });
            const data = await res.json();
            if (data.success) {
                setArticle((prev) => ({ ...prev, audio_url: data.audioUrl }));
                toast.success("Audio regenerated!");
            } else {
                toast.error(data.message || "Failed to regenerate audio");
            }
        } catch (e) {
            toast.error("Failed to regenerate audio");
        } finally {
            setRegeneratingAudio(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const response = await fetch(`/api/articles/actions/delete`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            if (!response.ok) throw new Error("Failed to delete article");

            toast.success("Article deleted!");
            router.push("/articles");
        } catch (error) {
            toast.error("Error deleting article");
        } finally {
            setDeleting(false);
        }
    };

    // HSF partnership reinstated (July 2026) — the certifier shows as stored
    // (e.g. "HS Foundation" with its photo/degree/affiliation).
    const bylineName = article?.name;

    return (
        <div className="article-page">
            <div
                className="article-page__progress-bar"
                style={{ width: `${scrollProgress}%` }}
            />
            <Navbar />
            <ToastContainer />
            <div className="article-page__content padding">
                <div className="boxed">
                    {loading || holdForTranslation ? (
                        <div className="article-page__loader">
                            <SectionLoader />
                        </div>
                    ) : error ? (
                        <div className="article-page__error">{error}</div>
                    ) : (
                        <article className="article-page__article">
                            <div className="flex flex-col gap-16">
                                <div className="article-page__article-details">
                                    <h1
                                        className="article-page__title heading-tertiary"
                                        lang={activeTranslation ? selectedLanguage : undefined}
                                    >
                                        {activeTranslation
                                            ? activeTranslation.translated_title
                                            : article.title}
                                    </h1>
                                    <div className="mb-4">
                                        <div className="flex">
                                            <div className="article-page__meta hidden">
                                                <h3 className="body-lg w-700">
                                                    {tenant.shortName === "HS"
                                                        ? "Summary Prepared or Reviewed By:"
                                                        : "Summary Prepared By:"}
                                                </h3>
                                                {article.photo && (
                                                    <div className="article-page__photo">
                                                        <Image
                                                            src={article.photo}
                                                            alt={article.name}
                                                            width={50}
                                                            height={50}
                                                            objectFit="cover"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                )}
                                                <div className="article-page__meta__description">
                                                    <div className="flex items-center gap-[10px]">
                                                        {bylineName && (
                                                            <p className="article-page__name">
                                                                {bylineName},
                                                            </p>
                                                        )}
                                                        {article.degree && (
                                                            <p className="article-page__degree">
                                                                {article.degree}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {article.university && (
                                                        <p className="article-page__university">
                                                            {article.university}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="md:ml-auto flex items-center space-x-2">
                                            {user &&
                                                (favoriting ? (
                                                    <Loader2 className="h-10 w-10 animate-spin" />
                                                ) : isFavorited ? (
                                                    <HeartFilledIcon
                                                        className="article-page__heart-filled cursor-pointer w-10 h-10"
                                                        color="red"
                                                        onClick={
                                                            toggleFavoriteArticle
                                                        }
                                                        aria-label="Unfavorite article"
                                                    />
                                                ) : (
                                                    <Heart
                                                        className="article-page__heart cursor-pointer w-10 h-10"
                                                        onClick={
                                                            toggleFavoriteArticle
                                                        }
                                                        aria-label="Favorite article"
                                                    />
                                                ))}
                                            {user && (
                                                <span className="text-gray-600 text-2xl whitespace-nowrap">
                                                    {isFavorited ? "Saved to favorites" : "Save to favorites"}
                                                </span>
                                            )}

                                            </div>
                                        </div>
                                        {article.additional_editors && article.additional_editors.length > 0 && (
                                            <div className="mt-2 ml-0">
                                                {article.additional_editors.map((editor, index) => (
                                                    <p key={index} className="text-gray-600" style={{ fontSize: '1.44rem' }}>
                                                        {editor}
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-start w-full gap-2 mb-4">
                                        <h3 className="text-xl font-semibold text-gray-500 w-700">
                                            Original Paper Published:
                                        </h3>
                                        <p className="text-2xl font-bold text-gray-600">
                                            {article.publication_date || 'N/A'}{article.source_publication ? `, ${article.source_publication}` : ''}
                                        </p>
                                    </div>
                                    {article.authors && article.authors.length > 0 && (
                                        <div className="flex items-start justify-start w-full gap-2 mb-8">
                                            <h3 className="text-xl font-semibold text-gray-500 w-700 whitespace-nowrap pt-1">
                                                Original Paper Authors:
                                            </h3>
                                            <div className="flex-1">
                                                {article.authors.length <= 3 ? (
                                                    <p className="text-2xl font-bold text-gray-600">
                                                        {article.authors.join(', ')}
                                                    </p>
                                                ) : (
                                                    <div className="flex items-start gap-2">
                                                        <div className="flex-1">
                                                            <p className="text-2xl font-bold text-gray-600">
                                                                {authorsExpanded
                                                                    ? article.authors.join(', ')
                                                                    : `${article.authors.slice(0, 3).join(', ')}...`
                                                                }
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => setAuthorsExpanded(!authorsExpanded)}
                                                            className="p-1 hover:bg-gray-100 rounded transition-transform duration-200"
                                                            aria-label={authorsExpanded ? "Collapse authors" : "Expand authors"}
                                                        >
                                                            <ChevronDown
                                                                className={`w-6 h-6 text-gray-500 transition-transform duration-200 ${authorsExpanded ? 'rotate-180' : ''}`}
                                                            />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {article.image_url && (
                                    <div className="article-page__image-container">
                                        <Image
                                            className="article-page__image"
                                            src={article.image_url}
                                            alt={article.title}
                                            width={420}
                                            height={290}
                                            objectFit="contain"
                                            objectPosition="center"
                                            loading="lazy"
                                        />
                                        {article.image_credit && (
                                            <p className="article-page__image-credit">
                                                Image Credit: {article.image_credit}
                                            </p>
                                        )}
                                    </div>
                                )}
                                    <div className="article-page__tags">
                                        {article.tags &&
                                        article.tags.length > 0 ? (
                                            article.tags.map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="article-page__tag"
                                                >
                                                    {tag}
                                                </span>
                                            ))
                                        ) : (
                                            <div></div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Audio Player */}
                            {article.audio_url ? (
                                <AudioPlayer
                                    audioUrl={article.audio_url}
                                    title={article.title}
                                />
                            ) : isAdmin && audioGenerating ? (
                                <div className="article-page__audio-generating">
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Generating article audio...</span>
                                </div>
                            ) : null}

                            {/* Translation warning banner */}
                            {activeTranslation && (
                                <div className="article-page__translation-warning">
                                    <div className="article-page__translation-warning-header">
                                        <AlertTriangle className="w-8 h-8" />
                                        <span className="w-700">
                                            {SUPPORTED_LANGUAGES.find(
                                                (l) =>
                                                    l.code ===
                                                    selectedLanguage
                                            )?.nativeName || selectedLanguage}
                                        </span>
                                    </div>
                                    <p className="article-page__translation-warning-native">
                                        {
                                            TRANSLATION_WARNINGS[
                                                selectedLanguage
                                            ]?.native
                                        }
                                    </p>
                                    <p className="article-page__translation-warning-english">
                                        {
                                            TRANSLATION_WARNINGS[
                                                selectedLanguage
                                            ]?.english
                                        }
                                    </p>
                                </div>
                            )}

                            <div className="article-page__summary">
                                <h2 className="article-page__summary-title w-700">
                                    Summary
                                </h2>
                                <div
                                    lang={activeTranslation ? selectedLanguage : undefined}
                                    dangerouslySetInnerHTML={{
                                        __html: activeTranslation
                                            ? activeTranslation.translated_summary
                                            : article.summary,
                                    }}
                                ></div>
                            </div>

                            {/* While a translation loads, the current text stays readable;
                                the note only appears if it takes more than a moment. */}
                            {translating && translationSlow && (
                                <div className="article-page__translating" role="status">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                    <p>{TRANSLATION_LOADING_MESSAGES[selectedLanguage] || "The translation may take a moment. Thank you for your patience."}</p>
                                </div>
                            )}
                            <div
                                className="article-page__content-text apicss-body"
                                lang={activeTranslation ? selectedLanguage : undefined}
                                dangerouslySetInnerHTML={{
                                    __html: activeTranslation
                                        ? activeTranslation.translated_innertext
                                        : article.innertext,
                                }}
                            ></div>

                            {/* Language selector */}
                            <div className="article-page__translation-selector">
                                <div className="article-page__translation-selector-header">
                                    <Globe className="w-7 h-7" />
                                    <h3>Read in another language</h3>
                                </div>
                                <div className="article-page__language-buttons">
                                    {selectedLanguage && (
                                        <button
                                            className="article-page__lang-btn article-page__lang-btn--active"
                                            onClick={() => handleTranslate(null)}
                                        >
                                            English
                                        </button>
                                    )}
                                    {SUPPORTED_LANGUAGES.map((lang) => (
                                        <button
                                            key={lang.code}
                                            className={`article-page__lang-btn ${
                                                selectedLanguage === lang.code
                                                    ? "article-page__lang-btn--selected"
                                                    : ""
                                            }`}
                                            onClick={() =>
                                                handleTranslate(lang.code)
                                            }
                                            aria-pressed={selectedLanguage === lang.code}
                                        >
                                            {lang.nativeName}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="article-page__actions">
                                {article.article_link && (
                                    <Link
                                        href={article.article_link}
                                        className="btn btn-primary-green"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <ExternalLink className="w-7 h-7" />
                                        Read Original Paper
                                    </Link>
                                )}
                                {isAdmin && (
                                    <>
                                        <Link
                                            href={`/articles/edit/${article.id}`}
                                            className="btn btn-primary"
                                            rel="noopener noreferrer"
                                        >
                                            <Pencil className="w-7 h-7" />
                                            Edit Article
                                        </Link>
                                        <Button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={handleRegenerateAudio}
                                            disabled={regeneratingAudio}
                                        >
                                            {regeneratingAudio ? (
                                                <>
                                                    <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <Volume2 className="w-7 h-7" />
                                                    {article.audio_url ? "Regenerate Audio" : "Generate Audio"}
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            type="button"
                                            className="btn btn-primary-red"
                                            onClick={handleDelete}
                                            disabled={deleting}
                                        >
                                            {deleting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                                                    Deleting...
                                                </>
                                            ) : (
                                                <>
                                                    <Trash2 className="w-7 h-7" />
                                                    Delete
                                                </>
                                            )}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </article>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default ArticlePage;
