import { sql } from "@/lib/neon";
import { tenant } from "@/lib/config";

/**
 * Fetch about page config from DB, falling back to sites.js defaults.
 */
export async function getAboutPageConfig() {
  try {
    const rows = await sql`
      SELECT sections, updated_at
      FROM about_page_config
      LIMIT 1
    `;

    if (rows.length > 0 && rows[0].sections && rows[0].sections.length > 0) {
      return { sections: rows[0].sections, source: "db" };
    }
  } catch (error) {
    console.error("Error fetching about page config:", error);
  }

  // Fallback to sites.js defaults
  return { sections: buildDefaultSections(tenant), source: "defaults" };
}

/**
 * Transform sites.js tenant config into the structured sections array format.
 * Used as fallback when no DB config exists, and for the "Reset to Defaults" feature.
 */
export function buildDefaultSections(tenantConfig) {
  const t = tenantConfig;
  const assetBase = `/assets/${t.pathName}/about`;

  const sections = [];

  // Hero
  sections.push({
    id: "hero-default",
    type: "hero",
    visible: true,
    content: {
      heading: `About ${t.name}`,
      subheading: "",
      backgroundImageUrl: "",
    },
  });

  // Mission
  sections.push({
    id: "mission-default",
    type: "mission",
    visible: true,
    content: {
      title: "Our Mission",
      body: `<p>${t.about_mission1 || ""}</p><p>${t.about_mission2 || ""}</p>`,
      imageUrl: t.about_our_mission ? `${assetBase}/${t.about_our_mission}` : `${assetBase}/our-mission.jpg`,
    },
  });

  // Process (How It Works) - new section, no sites.js default
  sections.push({
    id: "process-default",
    type: "process",
    visible: true,
    content: {
      title: "How It Works",
      description: "<p>Every article on our platform goes through a rigorous process to ensure accuracy and accessibility.</p>",
      steps: [
        {
          icon: "Search",
          title: "Research Discovery",
          description: "We identify the latest published research relevant to our community.",
        },
        {
          icon: "Cpu",
          title: "AI Simplification",
          description: "Complex research papers are transformed into clear, readable summaries using advanced AI.",
        },
        {
          icon: "ShieldCheck",
          title: "Expert Verification",
          description: "Every summary is reviewed and certified by qualified scientists and clinicians.",
        },
      ],
    },
  });

  // Founder Story - new section
  sections.push({
    id: "founder-story-default",
    type: "founderStory",
    visible: true,
    content: {
      name: "Kyle Wan",
      role: "Founder",
      photoUrl: `${assetBase}/withgrandma.jpg`,
      story: "<p>In 2023, my grandma was diagnosed with pulmonary adenocarcinoma, more commonly known as lung cancer. However, she didn't fully understand her diagnosis, and that lack of understanding delayed her treatment. When I spoke with a family member living with Neurofibromatosis, I realized this wasn't just a one-off story — many patients struggle to keep up with the research that could shape their care, because research is hard to understand for many patients like my grandmother and uncle.</p><p>That moment set me on a journey to make scientific research more accessible, especially for smaller disease communities where clear, reliable information can be hard to find. I believe every patient and family deserves to understand and stay up-to-date with the science behind their condition, and that's why I started this platform.</p>",
    },
  });

  // Team
  const members = [];
  for (let i = 1; i <= 3; i++) {
    const name = t[`about_teamMember${i}Name`];
    if (!name) continue;
    members.push({
      id: `member-default-${i}`,
      name,
      title: t[`about_teamMember${i}Title`] || "",
      bio: t[`about_teamMember${i}Bio`] || "",
      imageUrl: t[`about_teamMember${i}Image`] ? `${assetBase}/${t[`about_teamMember${i}Image`]}` : "",
    });
  }

  sections.push({
    id: "team-default",
    type: "team",
    visible: true,
    content: {
      title: "Our Team",
      description: t.about_teamDescription || "",
      members,
    },
  });

  // Contributors (dynamic from DB - just stores title/description)
  sections.push({
    id: "contributors-default",
    type: "contributors",
    visible: true,
    content: {
      title: "Scientific Contributors",
      description: t.about_contributorsDescription || "",
    },
  });

  // Get Involved
  sections.push({
    id: "get-involved-default",
    type: "getInvolved",
    visible: true,
    content: {
      title: "Get Involved",
      description: `<p>${t.about_getInvolvedDescription || ""}</p>`,
      ctaText: "Contact Us",
      ctaLink: "/contact",
      imageUrl: `${assetBase}/get-involved.jpg`,
    },
  });

  // Supporters
  const supporters = [];
  for (let i = 1; i <= 8; i++) {
    const logo = t[`about_supporter${i}Logo`];
    if (!logo || t[`about_supporter${i}Hidden`]) continue;
    supporters.push({
      id: `supporter-default-${i}`,
      name: t[`about_supporter${i}Name`] || "",
      logoUrl: `${assetBase}/${logo}`,
      link: t[`about_supporter${i}Link`] || "",
      width: t[`about_supporter${i}Width`] || 200,
      height: t[`about_supporter${i}Height`] || 100,
    });
  }

  sections.push({
    id: "supporters-default",
    type: "supporters",
    visible: true,
    content: {
      title: "Community Supporters",
      description: t.about_supportersDescription || "",
      supporters,
    },
  });

  return sections;
}
