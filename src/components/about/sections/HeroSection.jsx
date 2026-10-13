import ParallaxBackground from "../ParallaxBackground";
import { UiText } from "@/components/UiText/UiText";

export default function HeroSection({ content }) {
  const hasBackground = content.backgroundImageUrl;

  if (hasBackground) {
    return (
      <ParallaxBackground
        imageUrl={content.backgroundImageUrl}
        alt="About page hero"
        speed={0.2}
        className="about-hero about-hero--with-bg"
      >
        <div className="about-hero__overlay" />
        <div className="about-hero__content">
          <h1 className="about-hero__heading"><UiText text={content.heading} /></h1>
          {content.subheading && (
            <p className="about-hero__subheading"><UiText text={content.subheading} /></p>
          )}
        </div>
      </ParallaxBackground>
    );
  }

  return (
    <section className="about-hero">
      <div className="about-hero__content">
        <h1 className="about-hero__heading"><UiText text={content.heading} /></h1>
        {content.subheading && (
          <p className="about-hero__subheading"><UiText text={content.subheading} /></p>
        )}
      </div>
    </section>
  );
}
