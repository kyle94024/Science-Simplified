import Image from "next/image";

export default function FounderStorySection({ content }) {
  const story = content.story || "";

  return (
    <section className="about-founder">
      <div className="about-founder__container">
        {content.photoUrl && (
          <div className="about-founder__photo-wrap">
            <Image
              src={content.photoUrl}
              alt={content.name || "Founder"}
              width={320}
              height={320}
              className="about-founder__photo"
            />
            <div className="about-founder__name-block">
              <h3 className="about-founder__name">{content.name}</h3>
              {content.role && (
                <p className="about-founder__role">{content.role}</p>
              )}
            </div>
          </div>
        )}
        <div className="about-founder__story">
          <h2 className="about-section-title">Our Story</h2>
          <div
            className="about-founder__story-text"
            dangerouslySetInnerHTML={{ __html: story }}
          />
        </div>
      </div>
    </section>
  );
}
