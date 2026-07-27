import Link from "next/link";
import Image from "next/image";
import { ExternalLink } from "lucide-react";

export default function SupportersSection({ content }) {
  // Hide placeholder supporter rows across all tenants (same rule as the Team
  // section) — no site should show a "placeholder" logo/name.
  const supporters = (content.supporters || []).filter(
    (s) => !/placeholder/i.test(`${s.name || ""} ${s.logoUrl || ""}`)
  );

  return (
    <section className="about-supporters">
      <div className="about-supporters__header">
        <h2 className="about-section-title">{content.title}</h2>
        {content.description && (
          <p className="about-supporters__description">{content.description}</p>
        )}
      </div>
      <div className="about-supporters__logos">
        {supporters.map((supporter) => (
          <Link
            key={supporter.id || supporter.name}
            href={supporter.link || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="about-supporters__logo-card"
          >
            {supporter.logoUrl && (
              <Image
                src={supporter.logoUrl}
                alt={supporter.name}
                width={supporter.width || 200}
                height={supporter.height || 100}
                className="about-supporters__logo-image"
              />
            )}
            <div className="about-supporters__logo-link">
              <p className="about-supporters__logo-name">{supporter.name}</p>
              <ExternalLink size={16} className="about-supporters__external-icon" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
