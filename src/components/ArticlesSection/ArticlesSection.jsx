import "./ArticlesSection.scss";
import ArticleCard from "../ArticleCard/ArticleCard";
import { ArticleCardSkeleton } from "../ArticleCardSkeleton/ArticleCardSkeleton";
import { Unplug } from "lucide-react";
import { resolveArticleCredit } from "@/lib/articleAuthor";

const ArticlesSection = ({ articles, loading, error, sectionTitle }) => {
    return (
        <section className="articles-section padding">
            <div className="boxed">
                <h2 className="heading-tertiary">{sectionTitle}</h2>
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

                            // HS: foundation-certified articles credit the paper's first author.
                            const credit = resolveArticleCredit(article, authorName);

                            return (
                                <ArticleCard
                                    id={article.id}
                                    key={article.title}
                                    imageUrl={article.image_url}
                                    date={article.date}
                                    title={article.title}
                                    summary={article.summary}
                                    authorImageUrl={credit.replaced ? null : article.photo}
                                    authorName={credit.name}
                                    authorCreds={credit.replaced ? null : article.degree}
                                    authorInstitution={credit.replaced ? null : article.university}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
};

export default ArticlesSection;