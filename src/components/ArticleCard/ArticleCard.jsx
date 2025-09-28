function ArticleCard({
    id,
    imageUrl,
    date,
    title,
    summary,
    authorImageUrl,
    authorName,
    authorCreds,        // optional
    authorInstitution,  // optional
    pageType,
    ...rest             // ← NEW: capture alternates like name, photo, author_name, etc.
  }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
  
    // ← NEW: normalize fields coming from different callers / API shapes
    const displayAuthorName =
      authorName ??
      rest.author_name ??
      rest.name ??
      rest.publisher_name ??
      "Anonymous";
  
    const displayAuthorImageUrl =
      authorImageUrl ??
      rest.author_image_url ??
      rest.photo ??
      null;
  
    const displayAuthorCreds =
      authorCreds ??
      rest.author_degree ??
      rest.degree ??
      null;
  
    const displayAuthorInstitution =
      authorInstitution ??
      rest.author_university ??
      rest.university ??
      null;
  
    // ...rest of your code unchanged...
  
    return (
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
          <h2 className="article-card__title">{truncateText(title, 80)}</h2>
  
          <p className="article-card__summary">
            <span
              dangerouslySetInnerHTML={{
                __html: truncateText(summary, 180),
              }}
            />
            {pageType !== "pending" && pageType !== "assigned" && (
              <a href={`/articles/${id}`} className="article-card__read-more">
                read more
              </a>
            )}
          </p>
  
          <div className="article-card__author">
            {displayAuthorImageUrl ? (
              <Image
                src={displayAuthorImageUrl}
                alt={`Author image for ${displayAuthorName}`}
                className="article-card__author-image"
                width={50}
                height={50}
                objectFit="cover"
                objectPosition="center"
                loading="lazy"
              />
            ) : (
              <FallbackAuthorImage authorName={displayAuthorName} />
            )}
  
            <span className="article-card__author-name">
              {displayAuthorName}
            </span>
  
            {(displayAuthorCreds || displayAuthorInstitution) && (
              <div className="article-card__author-meta">
                {displayAuthorCreds && (
                  <span className="article-card__author-creds">
                    {displayAuthorCreds}
                  </span>
                )}
                {displayAuthorInstitution && (
                  <span className="article-card__author-institution">
                    {displayAuthorCreds ? <><br /></> : null}
                    {displayAuthorInstitution}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </article>
    );
  }
  