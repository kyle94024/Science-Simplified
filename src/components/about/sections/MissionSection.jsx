import Image from "next/image";

export default function MissionSection({ content }) {
  return (
    <section className="about-mission">
      <div className="about-mission__container">
        <div className="about-mission__content">
          <h2 className="about-section-title">{content.title}</h2>
          <div
            className="about-mission__body"
            dangerouslySetInnerHTML={{ __html: content.body }}
          />
        </div>
        {content.imageUrl && (
          <div className="about-mission__image-wrap">
            <Image
              src={content.imageUrl}
              alt={content.title || "Our mission"}
              width={480}
              height={480}
              className="about-mission__image"
            />
          </div>
        )}
      </div>
    </section>
  );
}
