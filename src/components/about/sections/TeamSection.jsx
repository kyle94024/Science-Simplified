import Image from "next/image";
import { tenant } from "@/lib/config";

// The Scleroderma site's saved CMS config still lists SRF representatives and a
// placeholder in the Team section. We don't mutate their DB — instead we hide
// those rows at render time so the Team section shows only the Science
// Simplified team (Kyle). Drops anyone whose title references SRF, plus any
// "placeholder" rows.
function hideSclerodermaNonTeam(members) {
  return members.filter((m) => {
    const name = (m.name || "").toLowerCase();
    const title = (m.title || "").toLowerCase();
    if (name.includes("placeholder") || title.includes("placeholder")) return false;
    if (title.includes("scleroderma research foundation") || /\bsrf\b/.test(title)) return false;
    return true;
  });
}

export default function TeamSection({ content }) {
  let members = content.members || [];
  if (tenant.shortName === "Scleroderma") {
    members = hideSclerodermaNonTeam(members);
  }
  if (tenant.shortName === "HS") {
    // HS is now independent of the HS Foundation — show only the founder (Kyle),
    // not the HSF CEO or advisors.
    members = members.filter((m) => /founder/i.test(m.title || ""));
  }
  // Secondary heading under the section title. Defaults to "Core Team";
  // an explicit content.subtitle (including "") from the CMS overrides it.
  const subtitle = content.subtitle ?? "Core Team";

  return (
    <section className="about-team">
      <h2 className="about-section-title">{content.title}</h2>
      {content.description && (
        <p className="about-team__description">{content.description}</p>
      )}
      {subtitle && <h3 className="about-team__subtitle">{subtitle}</h3>}
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
