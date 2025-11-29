import "./AboutPage.scss";
import Link from "next/link";
import { Mail, ExternalLink } from "lucide-react";
import Footer from "@/components/Footer/Footer";
import Navbar from "@/components/Navbar/Navbar";
import Image from "next/image";
import Marquee from "react-fast-marquee";
import { tenant } from "@/lib/config";

import { query } from "@/lib/db";

// images
// const kyle = `/assets/${tenant.pathName}/about/kyle.png`;
// const vanessa = `/assets/${tenant.pathName}/about/vanessa.png`;
// const roxana = `/assets/${tenant.pathName}/about/roxana.png`;
// const nfNetwork = `/assets/${tenant.pathName}/about/nf-network.png`;
// const reins = `/assets/${tenant.pathName}/about/reins.png`;
const expertPlaceholder = `/assets/${tenant.pathName}/about/expert-placeholder.png`;
const joinUsIllustration = `/assets/${tenant.pathName}/about/our-mission.jpg`;
const getInvolvedIllustration = `/assets/${tenant.pathName}/about/get-involved.jpg`;

// Fetch editors from the DB who have at least one article assigned
async function fetchEditors() {
    const result = await query(`
      SELECT
        ec.id,
        p.name,
        p.photo,
        p.title,
        p.degree,
        p.university
      FROM email_credentials ec
      LEFT JOIN profile p
        ON ec.id = p.user_id
      WHERE ec.role = 'editor'
        AND EXISTS (
          SELECT 1
          FROM article_assignments aa
          WHERE aa.editor_id = ec.id
        )
      ORDER BY p.name
    `);
    return result.rows;
}

// Function to get the first initial from a name
function getInitial(name) {
    return name && name.length > 0 ? name[0].toUpperCase() : "N/A";
}

export default async function AboutPage() {
    const aboutPageClass = "about-page";
    const sectionClass = `${aboutPageClass}__section`;
    const sectionTitleClass = `${aboutPageClass}__section-title`;
    const textClass = `${aboutPageClass}__text`;

    // Fetch editors data
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
            .filter((expert) => expert.name !== "N/A" && expert.name); // Skip experts with no name

        // Log experts for verification (server-side log)
        console.log("AboutPage – experts with at least one article:", experts);
    } catch (error) {
        console.error("Error fetching editors:", error);
        experts = [];
    }

    return (
        <div className={aboutPageClass}>
            <Navbar />
            <main className={`${aboutPageClass}__content padding`}>
                <div className="boxed">
                    {/* Hero Section */}
                    <section
                        className={`${sectionClass} ${sectionClass}--hero`}
                    >
                        <h1 className="heading-secondary text-center">
                            About {tenant.name}
                        </h1>
                        <div className={`${aboutPageClass}__mission-container`}>
                            <div
                                className={`${aboutPageClass}__mission-content`}
                            >
                                <h2 className={sectionTitleClass}>
                                    Our Mission
                                </h2>
                                <p className="body-large">
                                    {tenant.about_mission1}
                                </p>
                                <p className="body-regular">
                                    {tenant.about_mission2}
                                </p>
                            </div>
                            <div
                                className={`${aboutPageClass}__mission-illustration`}
                            >
                                <Image
                                    src={`/assets/${tenant.pathName}/about/${tenant.about_our_mission}`}
                                    alt="Mission illustration"
                                    width={400}
                                    height={400}
                                    className={`${aboutPageClass}__illustration`}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Team Section */}
                    <section
                        className={`${sectionClass} ${sectionClass}--team`}
                    >
                        <h2 className={sectionTitleClass}>Our Team</h2>
                        <p className={textClass}>
                            {tenant.about_teamDescription}
                        </p>

                        <h3 className={`${aboutPageClass}__team-subtitle`}>
                            Core Team
                        </h3>
                        <div className={`${aboutPageClass}__team-grid`}>
                            {/* Team Member 1 */}
                            <div className={`${aboutPageClass}__team-member`}>
                                <div
                                    className={`${aboutPageClass}__team-member-photo`}
                                >
                                    <Image
                                        src={`/assets/${tenant.pathName}/about/${tenant.about_teamMember1Image}`}
                                        alt={tenant.about_teamMember1Name}
                                        width={200}
                                        height={200}
                                        className={`${aboutPageClass}__team-image`}
                                    />
                                </div>
                                <div
                                    className={`${aboutPageClass}__team-member-info`}
                                >
                                    <h4
                                        className={`${aboutPageClass}__team-member-name`}
                                    >
                                        {tenant.about_teamMember1Name}
                                    </h4>
                                    <p
                                        className={`${aboutPageClass}__team-member-title`}
                                    >
                                        {tenant.about_teamMember1Title}
                                    </p>
                                    <p
                                        className={`${aboutPageClass}__team-member-bio`}
                                    >
                                        {tenant.about_teamMember1Bio}
                                    </p>
                                </div>
                            </div>

                            {/* Team Member 2 */}
                            <div className={`${aboutPageClass}__team-member`}>
                                <div
                                    className={`${aboutPageClass}__team-member-photo`}
                                >
                                    <Image
                                        src={`/assets/${tenant.pathName}/about/${tenant.about_teamMember2Image}`}
                                        alt={tenant.about_teamMember2Name}
                                        width={200}
                                        height={200}
                                        className={`${aboutPageClass}__team-image`}
                                    />
                                </div>
                                <div
                                    className={`${aboutPageClass}__team-member-info`}
                                >
                                    <h4
                                        className={`${aboutPageClass}__team-member-name`}
                                    >
                                        {tenant.about_teamMember2Name}
                                    </h4>
                                    <p
                                        className={`${aboutPageClass}__team-member-title`}
                                    >
                                        {tenant.about_teamMember2Title}
                                    </p>
                                    <p
                                        className={`${aboutPageClass}__team-member-bio`}
                                    >
                                        {tenant.about_teamMember2Bio}
                                    </p>
                                </div>
                            </div>

                            {/* Team Member 3 */}
                            <div className={`${aboutPageClass}__team-member`}>
                                <div
                                    className={`${aboutPageClass}__team-member-photo`}
                                >
                                    <Image
                                        src={`/assets/${tenant.pathName}/about/${tenant.about_teamMember3Image}`}
                                        alt={tenant.about_teamMember3Name}
                                        width={200}
                                        height={200}
                                        className={`${aboutPageClass}__team-image`}
                                    />
                                </div>
                                <div
                                    className={`${aboutPageClass}__team-member-info`}
                                >
                                    <h4
                                        className={`${aboutPageClass}__team-member-name`}
                                    >
                                        {tenant.about_teamMember3Name}
                                    </h4>
                                    <p
                                        className={`${aboutPageClass}__team-member-title`}
                                    >
                                        {tenant.about_teamMember3Title}
                                    </p>
                                    <p
                                        className={`${aboutPageClass}__team-member-bio`}
                                    >
                                        {tenant.about_teamMember3Bio}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Scientific Experts Section */}
                    <section
                        className={`${sectionClass} ${sectionClass}--experts`}
                    >
                        <h3 className={sectionTitleClass}>
                            Scientific Contributors
                        </h3>
                        <p className={textClass}>
                            {tenant.about_contributorsDescription}
                        </p>
                        <div className={`${aboutPageClass}__experts-container`}>
                            <Marquee
                                pauseOnHover={true}
                                speed={40}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    display: "flex",
                                    alignItems: "flex-start",
                                }}
                                autoFill={true}
                                gradient={false}
                                className={`${aboutPageClass}__experts-marquee`}
                            >
                                {experts.length > 0 ? (
                                    experts.map((expert) => (
                                        <div
                                            key={expert.id}
                                            className={`${aboutPageClass}__expert`}
                                        >
                                            <div
                                                className={`${aboutPageClass}__expert-photo`}
                                            >
                                                {expert.image ===
                                                expertPlaceholder ? (
                                                    <div
                                                        className={`${aboutPageClass}__expert-initial`}
                                                        style={{
                                                            width: "120px",
                                                            height: "120px",
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "center",
                                                            backgroundColor:
                                                                "#e0e0e0",
                                                            borderRadius: "50%",
                                                            fontSize: "48px",
                                                            fontWeight: "bold",
                                                            color: "#333",
                                                        }}
                                                    >
                                                        {getInitial(
                                                            expert.name
                                                        )}
                                                    </div>
                                                ) : (
                                                    <Image
                                                        src={expert.image}
                                                        alt={expert.name}
                                                        width={120}
                                                        height={120}
                                                        className={`${aboutPageClass}__expert-image`}
                                                    />
                                                )}
                                            </div>
                                            <div
                                                className={`${aboutPageClass}__expert-info`}
                                            >
                                                <h4
                                                    className={`${aboutPageClass}__expert-name`}
                                                >
                                                    {expert.name}
                                                </h4>
                                                <p
                                                    className={`${aboutPageClass}__expert-title`}
                                                >
                                                    {expert.title}
                                                    {expert.degree !== "N/A"
                                                        ? `, ${expert.degree}`
                                                        : ""}
                                                    {expert.university !== "N/A"
                                                        ? `, ${expert.university}`
                                                        : ""}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p>No editors available at this time.</p>
                                )}
                            </Marquee>
                        </div>
                    </section>

                    {/* Get Involved Section */}
                    <section
                        className={`${sectionClass} ${sectionClass}--involved`}
                    >
                        <div
                            className={`${aboutPageClass}__involved-container`}
                        >
                            <div
                                className={`${aboutPageClass}__involved-content`}
                            >
                                <h3 className={sectionTitleClass}>
                                    Get Involved
                                </h3>
                                <p className={textClass}>
                                    {tenant.about_getInvolvedDescription}
                                </p>
                                <Link
                                    href="/contact"
                                    className="btn btn-primary"
                                >
                                    <Mail size={20} />
                                    <span className="text">Contact Us</span>
                                </Link>
                            </div>
                            <div
                                className={`${aboutPageClass}__involved-illustration`}
                            >
                                <Image
                                    src={getInvolvedIllustration}
                                    alt="Get involved illustration"
                                    width={600}
                                    height={600}
                                    className={`${aboutPageClass}__illustration`}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Community Supporters Section */}
                    <section
                        className={`${sectionClass} ${aboutPageClass}__supporters`}
                    >
                        <div
                            className={`${aboutPageClass}__supporters-container`}
                        >
                            <h3 className={sectionTitleClass}>
                                Community Supporters
                            </h3>
                            <p className={textClass}>
                                {tenant.about_supportersDescription}
                            </p>
                        </div>
                        <div className={`${aboutPageClass}__supporters-logos`}>
                            <Link
                                href={tenant.about_supporter1Link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${aboutPageClass}__supporter-logo ${tenant.shortName.toLowerCase()}-network`}
                            >
                                <Image
                                    src={`/assets/${tenant.pathName}/about/${tenant.about_supporter1Logo}`}
                                    alt={tenant.about_supporter1Name}
                                    width={tenant.about_supporter1Width}
                                    height={tenant.about_supporter1Height}
                                    className={`${aboutPageClass}__logo-image`}
                                />

                                <div className={`${aboutPageClass}__logo-link`}>
                                    <p
                                        className={`${aboutPageClass}__logo-name`}
                                    >
                                        {tenant.about_supporter1Name}
                                    </p>
                                    <ExternalLink
                                        size={16}
                                        className={`${aboutPageClass}__external-icon`}
                                    />
                                </div>
                            </Link>
                            {!tenant.about_supporter2Hidden && (
                                <Link
                                    href={tenant.about_supporter2Link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`${aboutPageClass}__supporter-logo`}
                                >
                                    <Image
                                        src={`/assets/${tenant.pathName}/about/${tenant.about_supporter2Logo}`}
                                        alt={tenant.about_supporter2Name}
                                        width={tenant.about_supporter2Width}
                                        height={tenant.about_supporter2Height}
                                        className={`${aboutPageClass}__logo-image`}
                                    />
                                    <div
                                        className={`${aboutPageClass}__logo-link`}
                                    >
                                        <p
                                            className={`${aboutPageClass}__logo-name`}
                                        >
                                            {tenant.about_supporter2Name}
                                        </p>
                                        <ExternalLink
                                            size={16}
                                            className={`${aboutPageClass}__external-icon`}
                                        />
                                    </div>
                                </Link>
                            )}
                        </div>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
