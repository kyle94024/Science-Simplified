import "./ArticlesSection.scss";
import Link from "next/link";
import ArticleCard from "../ArticleCard/ArticleCard";
import { ArticleCardSkeleton } from "../ArticleCardSkeleton/ArticleCardSkeleton";
import { Unplug, ArrowRight } from "lucide-react";
import { resolveArticleCredit } from "@/lib/articleAuthor";

const ArticlesSection = ({
    articles,
    loading,
    error,
    sectionTitle,
    viewAllHref,
    moreHref,
    showMore = false,
}) => {
    return (
        <section className="articles-section padding">
            <div className="boxed">
                <div className="articles-section__header">
                    <h2 className="heading-tertiary">{sectionTitle}</h2>
                    {viewAllHref && (
                        <Link href={viewAllHref} className="articles-section__view-all">
                            Read more <ArrowRight size={16} />
                        </Link>
                    )}
                </div>
                {loading ? (
                    <div className="articles-section__list">
                        {/* Render 3 skeletons while loading */}
                        {[...Array(3)].map((_, index) => (
                            <ArticleCardSkeleton key={index} />
                        ))}
                    </div>
                ) : error ? (
                    <div className="articles-section__error">
                        <Unplug className="articles-section__error__icon" />
                        <p className="body-large">
                            Something went wrong. Please try again later.
                        </p>
                    </div>
                ) : (
                    <div className="articles-section__list">
                        {articles.map((article) => {
                            // Default to "Anonymous" if no name is found
                            let authorName = "Anonymous";

                            // Check if `certifiedby` is available and has a name
                            if (article.certifiedby) {
                                try {
                                    // Use the name from `certifiedby` if available
                                    authorName = article.name || "Anonymous";
                                } catch (err) {
                                    console.error(
                                        "Error parsing certifiedby:",
                                        err
                                    );
                                }
                            } else if (article.publisher_name) {
                                // Use `publisher_name` if available
                                authorName = article.publisher_name;
                            }

                            // Passthrough today (HSF partnership reinstated) — see articleAuthor.js.
                            const credit = resolveArticleCredit(article, authorName);

                            return (
                                <ArticleCard
                                    id={article.id}
                                    key={article.title}
                                    imageUrl={article.image_url}
                                    date={article.date}
                                    title={article.title}
                                    summary={article.summary}
                                    authorImageUrl={credit.replaced ? credit.avatarUrl : article.photo}
                                    authorName={credit.name}
                                    authorCreds={credit.replaced ? null : article.degree}
                                    authorInstitution={credit.replaced ? null : article.university}
                                />
                            );
                        })}
                    </div>
                )}

                {/* "More Articles" — only rendered when a further page exists
                    (the caller decides; see RecentArticlesSection). */}
                {showMore && moreHref && !loading && !error && (
                    <Link href={moreHref} className="articles-section__more">
                        More Articles <ArrowRight size={18} />
                    </Link>
                )}
            </div>
        </section>
    );
};

export default ArticlesSection;