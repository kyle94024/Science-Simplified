"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css"; // Import toast styles
import { tenant } from "@/lib/config";
import { Loader2, User } from "lucide-react";
import { Button } from "../ui/button";
import "./ArticleCard.scss";

// Truncate helper function
const truncateText = (text, maxLength) => {
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
};

// Fallback Author Image Component
const FallbackAuthorImage = ({ authorName }) => {
    const firstLetter = authorName ? authorName.charAt(0).toUpperCase() : "A"; // Default to "A" if name is not provided
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

    const handleFeatureStatus = async (shouldBeFeatured) => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/articles/actions/feature", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ articleId: id, shouldBeFeatured }),
            });

            if (!response.ok)
                throw new Error("Failed to update featured status");

            toast.success("Featured status updated successfully!");
            window.location.reload();
        } catch (error) {
            console.error("Error updating featured status:", error);
            toast.error("Error updating featured status");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePendingArticle = () => {
        router.push(`/pending-articles/${id}`);
    };

    const handleAssignedArticles = () => {
        router.push(`/assigned-articles/${id}`);
    };

    const renderButton = () => {
        if (pageType === "featured") {
            return (
                <Button
                    className="article-card__button btn btn-primary-green"
                    onClick={() => handleFeatureStatus(false)}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                            Please wait
                        </>
                    ) : (
                        "Unfeature"
                    )}
                </Button>
            );
        }
        if (pageType === "unfeatured") {
            return (
                <Button
                    className="article-card__button btn btn-primary-green"
                    onClick={() => handleFeatureStatus(true)}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                            Please wait
                        </>
                    ) : (
                        "Feature"
                    )}
                </Button>
            );
        }
        if (pageType === "pending") {
            return (
                <Button
                    className="article-card__button btn btn-primary-green"
                    onClick={handlePendingArticle}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                            Please wait
                        </>
                    ) : (
                        "Review"
                    )}
                </Button>
            );
        }
        if (pageType === "assigned") {
            return (
                <Button
                    className="article-card__button btn btn-primary-green"
                    onClick={handleAssignedArticles}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                            Please wait
                        </>
                    ) : (
                        "Review"
                    )}
                </Button>
            );
        }
        return null;
    };

    return (
        <>
            {pageType !== "pending" && pageType !== "assigned" && (
                <a href={`/articles/${id}`}>
                    <article className="article-card">
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
                                ></span>
                                {pageType !== "pending" &&
                                    pageType !== "assigned" && (
                                        <a
                                            href={`/articles/${id}`}
                                            className="article-card__read-more"
                                        >
                                            read more
                                        </a>
                                    )}
                            </p>

                            <div className="article-card__author">
                                {authorImageUrl ? (
                                    <Image
                                        src={authorImageUrl}
                                        alt={`Author image for ${displayName}`}
                                        className="article-card__author-image"
                                        width={50}
                                        height={50}
                                        objectFit="cover"
                                        objectPosition="center"
                                        loading="lazy"
                                    />
                                ) : (
                                    <FallbackAuthorImage
                                        authorName={displayName}
                                    />
                                )}

                                <div className="article-card__author-text">
                                    {/* name + inline degree */}
                                    <span className="article-card__author-name">
                                        {displayName}
                                        {showDegree ? `, ${authorCreds}` : ""}
                                    </span>

                                    {/* university on the next line */}
                                    {authorInstitution && (
                                        <span className="article-card__author-institution">
                                            {authorInstitution}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </article>
                </a>
            )}
        </>
    );
}

export default ArticleCard;
