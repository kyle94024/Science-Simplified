import Image from "next/image";

/**
 * Partners section — people from a partner organization (e.g. the Scleroderma
 * Research Foundation). Visually mirrors the Team section but is a distinct,
 * separate group: the Team section is the Science Simplified team (e.g. Kyle),
 * while Partners are the partner org's representatives (e.g. Hannah Young + SRF).
 *
 * content: { title, description, subtitle?, partners: [{ name, title, bio, imageUrl }] }
 */
export default function PartnersSection({ content }) {
  const partners = content.partners || content.members || [];

  return (
    <section className="about-team about-partners">
      <h2 className="about-section-title">{content.title}</h2>
      {content.description && (
        <p className="about-team__description">{content.description}</p>
      )}
      {content.subtitle && (
        <h3 className="about-team__subtitle">{content.subtitle}</h3>
      )}
      <div className="about-team__grid">
        {partners.map((person) => (
          <div key={person.id || person.name} className="about-team__member">
            <div className="about-team__member-photo">
              {person.imageUrl ? (
                <Image
                  src={person.imageUrl}
                  alt={person.name}
                  width={200}
                  height={200}
                  className="about-team__member-image"
                />
              ) : (
                <div className="about-team__member-initial">
                  {person.name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </div>
            <div className="about-team__member-info">
              <h4 className="about-team__member-name">{person.name}</h4>
              {person.title && (
                <p className="about-team__member-title">{person.title}</p>
              )}
              {person.bio && (
                <p className="about-team__member-bio">{person.bio}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
