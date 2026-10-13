import Image from "next/image";
import { UiText, UiHtml } from "@/components/UiText/UiText";

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
                <p className="about-founder__role"><UiText text={content.role} /></p>
              )}
            </div>
          </div>
        )}
        <div className="about-founder__story">
          <h2 className="about-section-title"><UiText text="Our Story" /></h2>
          <UiHtml className="about-founder__story-text" html={story} />
        </div>
      </div>
    </section>
  );
}
