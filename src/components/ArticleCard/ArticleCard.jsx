"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { tenant } from "@/lib/config";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import "./ArticleCard.scss";

// Truncate helper
const truncateText = (text, maxLength) =>
    text.length > maxLength ? text.slice(0, maxLength) + "..." : text;

// Fallback Author Image
const FallbackAuthorImage = ({ authorName }) => {
    const firstLetter = authorName ? authorName.charAt(0).toUpperCase() : "A";
    return (
        <div className="fallback-author-image">
            <p className="body-small">{firstLetter}</p>
        </div>
    );
};

const articleThumbnailPlaceholder = `/assets/${tenant.pathName}/${tenant.articleThumbnailPlaceholder}`;

function ArticleCard({
    id,
    imageUrl,
    date,
    title,
    summary,
    authorImageUrl,
    authorName,
    authorCreds,
    authorInstitution,
    pageType,
}) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const displayName =
        authorName && authorName.trim() ? authorName : "Anonymous";

    const showDegree =
        authorCreds && authorCreds.trim() && authorCreds !== "No Degree";

    const articleUrl =
        pageType === "pending"
            ? `/pending-articles/${id}`
            : pageType === "assigned"
            ? `/assigned-articles/${id}`
            : `/articles/${id}`;

    const handleCardClick = () => {
        router.push(articleUrl);
    };

    const handleFeatureStatus = async (shouldBeFeatured) => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/articles/actions/feature", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ articleId: id, shouldBeFeatured }),
            });

            if (!response.ok)
                throw new Error("Failed to update featured status");

            toast.success("Featured status updated successfully!");
            window.location.reload();
        } catch (error) {
            console.error(error);
            toast.error("Error updating featured status");
        } finally {
            setIsLoading(false);
        }
    };

    const renderButton = () => {
        if (pageType === "featured" || pageType === "unfeatured") {
            return (
                <Button
                    className="article-card__button btn btn-primary-green"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleFeatureStatus(pageType === "unfeatured");
                    }}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                            Please wait
                        </>
                    ) : pageType === "featured" ? (
                        "Unfeature"
                    ) : (
                        "Feature"
                    )}
                </Button>
            );
        }

        if (pageType === "pending" || pageType === "assigned") {
            return (
                <Button
                    className="article-card__button btn btn-primary-green"
                    onClick={(e) => {
                        e.stopPropagation();
                        router.push(articleUrl);
                    }}
                >
                    Review
                </Button>
            );
        }

        return null;
    };

    return (
        <article className="article-card" onClick={handleCardClick}>
            <div className="article-card__image-container">
                <Image
                    src={imageUrl || articleThumbnailPlaceholder}
                    alt={`Article image for ${title}`}
                    className="article-card__image"
                    layout="responsive"
                    width={420}
                    height={290}
                    loading="lazy"
                />
                {renderButton()}
            </div>

            <div className="article-card__content">
                <time className="article-card__date">{date}</time>

                <h2 className="article-card__title">
                    {truncateText(title, 80)}
                </h2>

                <p className="article-card__summary">
                    <span
                        dangerouslySetInnerHTML={{
                            __html: truncateText(summary, 180),
                        }}
                    />
                    {pageType !== "pending" && pageType !== "assigned" && (
                        <span
                            className="article-card__read-more"
                            onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/articles/${id}`);
                            }}
                        >
                            read more
                        </span>
                    )}
                </p>

                <div className="article-card__author">
                    {authorImageUrl ? (
                        <Image
                            src={authorImageUrl}
                            alt={`Author image for ${displayName}`}
                            width={50}
                            height={50}
                            className="article-card__author-image"
                        />
                    ) : (
                        <FallbackAuthorImage authorName={displayName} />
                    )}

                    <div className="article-card__author-text">
                        <span className="article-card__author-name">
                            {displayName}
                            {showDegree ? `, ${authorCreds}` : ""}
                        </span>

                        {authorInstitution && (
                            <span className="article-card__author-institution">
                                {authorInstitution}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </article>
    );
}

export default ArticleCard;