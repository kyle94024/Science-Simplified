import Image from "next/image";
import { tenant } from "@/lib/config";

export default function TeamSection({ content }) {
  const members = content.members || [];
  // Scleroderma is framed as a partnership, so the team subtitle reads "Partners".
  // An explicit content.subtitle (set via the CMS) always wins.
  const subtitle =
    content.subtitle ||
    (tenant.shortName === "Scleroderma" ? "Partners" : "Core Team");

  return (
    <section className="about-team">
      <h2 className="about-section-title">{content.title}</h2>
      {content.description && (
        <p className="about-team__description">{content.description}</p>
      )}
      <h3 className="about-team__subtitle">{subtitle}</h3>
      <div className="about-team__grid">
        {members.map((member) => (
          <div key={member.id || member.name} className="about-team__member">
            <div className="about-team__member-photo">
              {member.imageUrl ? (
                <Image
                  src={member.imageUrl}
                  alt={member.name}
                  width={200}
                  height={200}
                  className="about-team__member-image"
                />
              ) : (
                <div className="about-team__member-initial">
                  {member.name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </div>
            <div className="about-team__member-info">
              <h4 className="about-team__member-name">{member.name}</h4>
              {member.title && (
                <p className="about-team__member-title">{member.title}</p>
              )}
              {member.bio && (
                <p className="about-team__member-bio">{member.bio}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
