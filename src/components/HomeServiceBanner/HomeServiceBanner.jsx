import React, { useEffect } from "react";
import "./HomeServiceBanner.scss";
import Link from "next/link";
import { tenant } from "@/lib/config";

function HomeServiceBanner() {
    useEffect(() => {
        document.documentElement.style.setProperty('--cta-background', `url(/assets/${tenant.shortName}/home/${tenant.homeExploreAllBG})`);
    }, []);

    return (
        <div className={`service-banner ${tenant.shortName === "CF" ? "background-alt" : ""} ${tenant.shortName === "Ashermans" ? "background-alt" : ""}`}>
            <div className="service-banner__content">
                <h2 className="heading-quaternary">
                    {tenant.text_exploreAllTitle}{" "}
                </h2>
                <p className="body-large color-light-grey w-300">
                    {tenant.text_exploreAllDescription}
                </p>
            </div>
            <Link href="/articles" className="btn btn-primary-white">
                Explore All
            </Link>
        </div>
    );
}

export default HomeServiceBanner;
