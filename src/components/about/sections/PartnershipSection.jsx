import Image from "next/image";

/**
 * Partnership section — explains that Science Simplified is an independent
 * platform collaborating with a partner organization (e.g. the Scleroderma
 * Research Foundation). Content:
 *   - title:    section heading
 *   - body:     HTML paragraph(s)
 *   - logoUrl:  optional partner logo
 *   - logoAlt:  alt text for the logo
 *   - ctaText:  optional outbound link label
 *   - ctaLink:  optional outbound link (partner website)
 */
export default function PartnershipSection({ content }) {
  return (
    <section className="about-partnership">
      <div className="about-partnership__container">
        <div className="about-partnership__content">
          <h2 className="about-section-title">{content.title}</h2>
          {content.body && (
            <div
              className="about-partnership__body"
              dangerouslySetInnerHTML={{ __html: content.body }}
            />
          )}
          {content.ctaLink && (
            <a
              href={content.ctaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary about-partnership__cta"
            >
              <span className="text">{content.ctaText || "Learn more"}</span>
            </a>
          )}
        </div>
        {content.logoUrl && (
          <div className="about-partnership__logo-wrap">
            <Image
              src={content.logoUrl}
              alt={content.logoAlt || "Partner organization"}
              width={content.logoWidth || 320}
              height={content.logoHeight || 160}
              className="about-partnership__logo"
            />
          </div>
        )}
      </div>
    </section>
  );
}
