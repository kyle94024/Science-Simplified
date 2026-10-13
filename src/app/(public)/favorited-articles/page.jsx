"use client";
import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar/Navbar";
import Footer from "@/components/Footer/Footer";
import ArticlesListPaginated from "@/components/ArticlesListPaginated/ArticlesListPaginated";
import { Unplug } from "lucide-react";
import { ArticleCardSkeleton } from "@/components/ArticleCardSkeleton/ArticleCardSkeleton";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useAuthStore from "@/store/useAuthStore";
import { useUiText } from "@/hooks/useUiText";
import { UiText } from "@/components/UiText/UiText";
import { uiText } from "@/lib/uiText";
import "./FavoritedArticles.scss";

const FavoritedArticles = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const t = useUiText();

    const { user } = useAuthStore();
    const { userId } = user || {};

    const fetchFavoritedArticles = async () => {
        try {
            const response = await fetch(
                `/api/articles/liked?userId=${userId}`
            );
            if (!response.ok) {
                const { message } = await response.json();
                throw new Error(message);
            }
            const data = await response.json();
            setArticles(data);
        } catch (error) {
            console.error("Error fetching favorited articles:", error);
            setError(true);
            // Called from the effect below, whose `t` can predate the reader's
            // language loading; <UiText> uses the one on screen.
            toast.error(<UiText text={error.message || uiText("Failed to fetch favorited articles")} />);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (typeof userId === "undefined") {
            setLoading(true); // Wait for userId to resolve
        } else if (userId) {
            fetchFavoritedArticles();
        } else {
            setLoading(false);
            setError(true);
            toast.info(<UiText text="Please log in to view favorited articles." />);
        }
    }, [userId]);

    return (
        <div className="favorited-articles">
            <Navbar />
            <ToastContainer />
            <div className="favorited-articles__content padding">
                <div className="boxed">
                    <h1 className="favorited-articles__title heading-tertiary">
                        {t("Your Favorited Articles")}
                    </h1>
                    {loading ? (
                        <div className="favorited-articles__loading">
                            {[...Array(6)].map((_, index) => (
                                <ArticleCardSkeleton key={index} />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="favorited-articles__error">
                            <Unplug className="favorited-articles__error__icon" />
                            <p className="body-large">
                                {userId
                                    ? t("Something went wrong. Please try again later.")
                                    : t("Please log in to view your favorited articles.")}
                            </p>
                        </div>
                    ) : articles.length === 0 ? (
                        <div className="favorited-articles__error">
                            <Unplug className="favorited-articles__error__icon" />
                            <p className="body-large">
                                {t("You haven’t favorited any articles yet.")}
                            </p>
                        </div>
                    ) : (
                        <ArticlesListPaginated
                            articles={articles}
                            articlesPerPage={6}
                        />
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default FavoritedArticles;
