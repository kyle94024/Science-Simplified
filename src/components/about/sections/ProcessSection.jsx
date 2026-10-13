import { Search, Cpu, ShieldCheck, BookOpen, Users, Microscope, FileText, Sparkles } from "lucide-react";
import { UiText, UiHtml } from "@/components/UiText/UiText";

const iconMap = {
  Search,
  Cpu,
  ShieldCheck,
  BookOpen,
  Users,
  Microscope,
  FileText,
  Sparkles,
};

export default function ProcessSection({ content }) {
  const steps = content.steps || [];

  return (
    <section className="about-process">
      <h2 className="about-section-title"><UiText text={content.title} /></h2>
      {content.description && (
        <UiHtml className="about-process__description" html={content.description} />
      )}
      <div className="about-process__steps">
        {steps.map((step, i) => {
          const Icon = iconMap[step.icon] || FileText;
          return (
            <div key={i} className="about-process__step">
              {i > 0 && <div className="about-process__connector" />}
              <div className="about-process__icon-wrap">
                <Icon size={28} />
              </div>
              <h3 className="about-process__step-title"><UiText text={step.title} /></h3>
              <p className="about-process__step-desc"><UiText text={step.description} /></p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
