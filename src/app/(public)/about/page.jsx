import "./AboutPage.scss";
import Footer from "@/components/Footer/Footer";
import Navbar from "@/components/Navbar/Navbar";
import ScrollRevealSection from "@/components/about/ScrollRevealSection";
import { sectionRegistry } from "@/components/about/sections";
import { getAboutPageConfig } from "@/lib/about-config";
import { tenant } from "@/lib/config";
import { query } from "@/lib/db";

// The contributors carousel is built from a live DB query. Without this the
// page is statically prerendered at build time (the query uses `pg`, not
// `fetch`, so Next can't tell it's dynamic) and newly-certifying experts don't
// appear until the next deploy. Re-render at most every 5 minutes.
export const revalidate = 300;

const expertPlaceholder = `/assets/${tenant.pathName}/about/expert-placeholder.png`;

// The founder is featured in "Our Team" (and "Our Story") — he shouldn't also
// be listed among the scientific contributors, even though he certifies
// articles. Applies to every tenant.
const EXCLUDED_CONTRIBUTOR_NAMES = ["kyle wan"];

async function fetchEditors() {
  const result = await query(`
    SELECT DISTINCT
      p.user_id AS id,
      p.name,
      p.photo,
      p.title,
      p.degree,
      p.university
    FROM article a
    JOIN profile p
      ON (a.certifiedby->>'userId')::INT = p.user_id
    WHERE a.certifiedby IS NOT NULL
    ORDER BY p.name
  `);
  return result.rows;
}

export default async function AboutPage() {
  let experts = [];
  try {
    const editorsData = await fetchEditors();
    experts = editorsData
      .map((editor) => ({
        id: editor.id,
        name: editor.name || "N/A",
        title: editor.title || "N/A",
        image: editor.photo || expertPlaceholder,
        degree: editor.degree || "N/A",
        university: editor.university || "N/A",
      }))
      .filter((expert) => expert.name !== "N/A" && expert.name)
      .filter(
        (expert) =>
          !EXCLUDED_CONTRIBUTOR_NAMES.includes(expert.name.trim().toLowerCase())
      );
  } catch (error) {
    console.error("Error fetching editors:", error);
  }

  const { sections } = await getAboutPageConfig();
  const visibleSections = sections.filter((s) => s.visible !== false);

  return (
    <div className="about-page">
      <Navbar />
      <main className="about-page__content padding">
        <div className="boxed">
          {visibleSections.map((section, index) => {
            const SectionComponent = sectionRegistry[section.type];
            if (!SectionComponent) return null;

            return (
              <ScrollRevealSection key={section.id} delay={index * 80}>
                <SectionComponent
                  content={section.content}
                  experts={
                    section.type === "contributors" ? experts : undefined
                  }
                />
              </ScrollRevealSection>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
