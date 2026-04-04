import ParallaxBackground from "../ParallaxBackground";

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
          <h1 className="about-hero__heading">{content.heading}</h1>
          {content.subheading && (
            <p className="about-hero__subheading">{content.subheading}</p>
          )}
        </div>
      </ParallaxBackground>
    );
  }

  return (
    <section className="about-hero">
      <div className="about-hero__content">
        <h1 className="about-hero__heading">{content.heading}</h1>
        {content.subheading && (
          <p className="about-hero__subheading">{content.subheading}</p>
        )}
      </div>
    </section>
  );
}
