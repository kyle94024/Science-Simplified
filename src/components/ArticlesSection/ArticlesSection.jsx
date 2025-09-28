import "./ArticlesSection.scss";
import ArticleCard from "../ArticleCard/ArticleCard";
import { ArticleCardSkeleton } from "../ArticleCardSkeleton/ArticleCardSkeleton";
import { Unplug } from "lucide-react";

const ArticlesSection = ({ articles, loading, error, sectionTitle }) => {
  return (
    <section className="articles-section padding">
      <div className="boxed">
        <h2 className="heading-tertiary">{sectionTitle}</h2>

        {loading ? (
          <div className="articles-section__list">
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
              // prefer joined profile name; fall back to publisher_name; else Anonymous
              const authorName =
                article.author_name || article.publisher_name || "Anonymous";

              return (
                <ArticleCard
                    id={article.id}
                    key={article.id}
                    imageUrl={article.image_url}
                    date={article.publication_date}
                    title={article.title}
                    summary={article.summary}
                    authorImageUrl={article.author_image_url}   // instead of article.photo
                    authorName={article.author_name}            // instead of authorName fallback
                    authorCreds={article.author_degree}
                    authorInstitution={article.author_university}
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
