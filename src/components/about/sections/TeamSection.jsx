import Image from "next/image";

export default function TeamSection({ content }) {
  const members = content.members || [];

  return (
    <section className="about-team">
      <h2 className="about-section-title">{content.title}</h2>
      {content.description && (
        <p className="about-team__description">{content.description}</p>
      )}
      <h3 className="about-team__subtitle">Core Team</h3>
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
