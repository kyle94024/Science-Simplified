"use client";

import "./AssignedArticlesPage.scss";
import ArticlesListPaginated from "@/components/ArticlesListPaginated/ArticlesListPaginated";
import Navbar from "@/components/Navbar/Navbar";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { withEditorAuth } from "@/components/withEditorAuth/withEditorAuth";
import Footer from "@/components/Footer/Footer";
import useAuthStore from "@/store/useAuthStore";
import { useState, useEffect } from "react";

const EditorAssignedArticles = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const { user } = useAuthStore();

    // Fetch assigned articles from correct API route
    useEffect(() => {
        if (!user?.userId) return;

        const fetchAssigned = async () => {
            setLoading(true);
            setError(false);

            try {
                // Correct endpoint (exists in your API structure)
                const response = await fetch(
                    `/api/articles/pending?editorId=${user.userId}`
                );

                if (!response.ok) throw new Error("Failed to fetch assigned articles");

                const data = await response.json();
                setArticles(data);
            } catch (err) {
                console.error("Error fetching assigned articles:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchAssigned();
    }, [user?.userId]);

    return (
        <div className="assigned-articles">
            <Navbar />
            <div className="assigned-articles__content padding">
                <div className="boxed">
                    <Link
                        href="/"
                        className="flex items-center gap-2 font-bold mb-4"
                    >
                        <ArrowLeft />
                        <span> Back</span>
                    </Link>

                    <ArticlesListPaginated
                        articles={articles}
                        articlesPerPage={6}
                        loading={loading}
                        error={error}
                        pageType="assigned"
                    />
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default withEditorAuth(EditorAssignedArticles);