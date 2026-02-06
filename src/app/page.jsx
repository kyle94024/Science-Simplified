"use client";

import { tenant } from "@/lib/config";
import "./Home.scss";
import Navbar from "@/components/Navbar/Navbar";

import HomeServiceBanner from "@/components/HomeServiceBanner/HomeServiceBanner";

import { useRouter, useSearchParams } from "next/navigation";

import useAuthStore from "@/store/useAuthStore";
import { useEffect, Suspense } from "react";

// custom components
import SubscriptionBanner from "@/components/SubscriptionBanner/SubscriptionBanner";
import SearchArticles from "@/components/SearchArticles/SearchArticles";
import RecentArticlesSection from "@/components/RecentArticlesSection/RecentArticlesSection";
import FeaturedArticlesSection from "@/components/FeaturedArticlesSection/FeaturedArticlesSection";
import Footer from "@/components/Footer/Footer";

// HSF redirect mapping (for HS Foundation external links)
import { getArticleIdFromHsfId } from "@/lib/hsfRedirects";

// Inner component that uses useSearchParams (needs Suspense boundary for SSR)
function HomeContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const { role } = useAuthStore();
    console.log("User: ", role);

    const handleSearchSubmit = (query) => {
        // Navigate to the article search page with the query
        router.push(`/articles}`);
    };

    // Handle HSF redirect (e.g., ?hsf-id=100941 -> /articles/126)
    // Only active for HS (Hidradenitis Suppurativa) tenant
    useEffect(() => {
        if (tenant.shortName !== "HS") return; // Only for HS Foundation links

        const hsfId = searchParams.get("hsf-id");
        if (hsfId) {
            const articleId = getArticleIdFromHsfId(hsfId);
            if (articleId) {
                router.replace(`/articles/${articleId}`);
                return;
            }
        }
    }, [searchParams, router]);

    useEffect(() => {
        document.documentElement.style.setProperty(
            "--hero-illustration",
            `url(/assets/${tenant.pathName}/home/${tenant.homeBG})`
        );
    }, []);

    return (
        <main className="home" suppressHydrationWarning>
            <section
                className={`home__header ${
                    tenant.shortName === "HS" ||
                    tenant.shortName === "CF" ||
                    tenant.shortName === "Vitiligo" ||
                    tenant.shortName === "Canavan" ||
                    tenant.shortName === "Progeria" ||
                    tenant.shortName === "Huntington's" ||
                    tenant.shortName === "Rett" ||
                    tenant.shortName === "RYR1" ||
                    tenant.shortName === "ALS" ||
                    tenant.shortName === "Asherman's" ||
                    tenant.shortName === "Aicardi" ||
                    tenant.shortName === "TS"
                        ? "background-alt"
                        : ""
                }`}
            >
                <Navbar />

                <section className="home__hero padding">
                    <div className="boxed">
                        <div className="home__hero__content">
                            <div className="flex flex-col gap-1">
                                <h1 className="heading-primary">
                                    {tenant.disease}
                                </h1>
                                <h2 className="heading-tertiary w-400 color-green">
                                    Information Made Simple
                                </h2>
                            </div>
                            <p className="body-large">
                                {tenant.text_homeTitleDescription}{" "}
                                {/* <span className="w-700 color-green-dark">
                                    Powered by Innovation.
                                </span> */}
                            </p>
                            <SearchArticles
                                setSearchQuery={handleSearchSubmit}
                            />
                        </div>
                    </div>
                </section>
            </section>

            {/* Featured articles section */}
            {/* <FeaturedArticlesSection /> */}

            {/* <section className="home__cta-1 padding">
                <div className="boxed">
                    <HomeServiceBanner />
                </div>
            </section> */}

            {/* Recent articles section */}
            <RecentArticlesSection />

            <section className="home__cta-1 padding">
                <div className="boxed">
                    <HomeServiceBanner />
                </div>
            </section>

            {/* <section className="home__subscription-cta padding">
                <div className="boxed">
                    <SubscriptionBanner />
                </div>
            </section> */}

            <Footer />
        </main>
    );
}

// Wrapper component with Suspense boundary for useSearchParams
export default function Home() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <HomeContent />
        </Suspense>
    );
}
