import Image from "next/image";
import DraggableCarousel from "@/components/DraggableCarousel/DraggableCarousel";

function getInitial(name) {
  return name && name.length > 0 ? name[0].toUpperCase() : "?";
}

export default function ContributorsSection({ content, experts = [] }) {
  return (
    <section className="about-contributors">
      <h2 className="about-section-title">{content.title}</h2>
      {content.description && (
        <p className="about-contributors__description">{content.description}</p>
      )}
      <div className="about-contributors__container">
        {experts.length > 0 ? (
          <DraggableCarousel className="about-contributors__carousel">
            {experts.map((expert) => (
              <div key={expert.id} className="about-contributors__expert">
                <div className="about-contributors__expert-photo">
                  {expert.image && !expert.image.includes("placeholder") ? (
                    <Image
                      src={expert.image}
                      alt={expert.name}
                      width={120}
                      height={120}
                      className="about-contributors__expert-image"
                    />
                  ) : (
                    <div className="about-contributors__expert-initial">
                      {getInitial(expert.name)}
                    </div>
                  )}
                </div>
                <div className="about-contributors__expert-info">
                  <h4 className="about-contributors__expert-name">
                    {expert.name}
                  </h4>
                  <p className="about-contributors__expert-title">
                    {expert.title}
                    {expert.degree !== "N/A" ? `, ${expert.degree}` : ""}
                    {expert.university !== "N/A" ? `, ${expert.university}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </DraggableCarousel>
        ) : (
          <p className="about-contributors__empty">No contributors yet.</p>
        )}
      </div>
    </section>
  );
}
