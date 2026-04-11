import Link from "next/link";
import Image from "next/image";
import { Mail } from "lucide-react";

export default function GetInvolvedSection({ content }) {
  return (
    <section className="about-involved">
      <div className="about-involved__container">
        <div className="about-involved__content">
          <h2 className="about-section-title">{content.title}</h2>
          <div
            className="about-involved__description"
            dangerouslySetInnerHTML={{ __html: content.description }}
          />
          {content.ctaLink && (
            <Link href={content.ctaLink} className="btn btn-primary">
              <Mail size={20} />
              <span className="text">{content.ctaText || "Contact Us"}</span>
            </Link>
          )}
        </div>
        {content.imageUrl && (
          <div className="about-involved__image-wrap">
            <Image
              src={content.imageUrl}
              alt="Get involved"
              width={600}
              height={600}
              className="about-involved__image"
            />
          </div>
        )}
      </div>
    </section>
  );
}
