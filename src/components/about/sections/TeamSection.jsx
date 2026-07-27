import Image from "next/image";
import { tenant } from "@/lib/config";

// Placeholder rows ("Expert Advisor Placeholder", "Placeholder Bio", the
// expert-placeholder.png image) ship in several tenants' defaults and in the
// Scleroderma CMS config. Hide them everywhere at render time — no tenant
// should show a placeholder person. Data is left untouched, so filling one in
// makes it appear again automatically.
function isPlaceholder(m) {
  const blob = `${m.name || ""} ${m.title || ""} ${m.bio || ""} ${m.imageUrl || ""}`;
  return /placeholder/i.test(blob);
}

// The Scleroderma site's saved CMS config still lists SRF representatives in the
// Team section. We don't mutate their DB — hide anyone whose title references
// SRF so the Team section shows only the Science Simplified team.
function isSclerodermaNonTeam(m) {
  const title = (m.title || "").toLowerCase();
  return title.includes("scleroderma research foundation") || /\bsrf\b/.test(title);
}

// The founder's headshot is the same file in every tenant's assets. Scleroderma's
// saved CMS config points his Team photo at the casual "Our Story" image, so
// force the headshot here. ("Our Story" keeps its own image — this only affects
// the Team section.)
const FOUNDER_NAME = "kyle wan";
const founderTeamPhoto = `/assets/${tenant.pathName}/about/kyleheadshot.jpg`;

function withFounderHeadshot(m) {
  if ((m.name || "").trim().toLowerCase() !== FOUNDER_NAME) return m;
  return { ...m, imageUrl: founderTeamPhoto };
}

export default function TeamSection({ content }) {
  let members = (content.members || []).filter((m) => !isPlaceholder(m));
  if (tenant.shortName === "Scleroderma") {
    members = members.filter((m) => !isSclerodermaNonTeam(m));
  }
  members = members.map(withFounderHeadshot);
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
