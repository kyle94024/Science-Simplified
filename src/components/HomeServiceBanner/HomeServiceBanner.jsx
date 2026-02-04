import React, { useEffect } from "react";
import "./HomeServiceBanner.scss";
import Link from "next/link";
import { tenant } from "@/lib/config";

function HomeServiceBanner() {
    useEffect(() => {
        document.documentElement.style.setProperty('--cta-background', `url(/assets/${tenant.pathName}/home/${tenant.homeExploreAllBG})`);
    }, []);

    return (
        <div className={`service-banner ${tenant.shortName === "HS" || tenant.shortName === "CF" || tenant.shortName === "Vitiligo" || tenant.shortName === "Canavan" || tenant.shortName === "Progeria" || tenant.shortName === "Huntington's" || tenant.shortName === "Rett" || tenant.shortName === "RYR1" || tenant.shortName === "ALS" || tenant.shortName === "NF" || tenant.shortName === "Asherman's" || tenant.shortName === "Aicardi" || tenant.shortName === "TS" ? "background-alt" : ""}`}>
            <div className="service-banner__content">
                <h2 className={`heading-quaternary ${tenant.shortName === "ALS" ? "invisible" : ""}`}>
                    {tenant.text_exploreAllTitle}{" "}
                </h2>
                <p className={`body-large color-light-grey w-300 ${tenant.shortName === "ALS" ? "invisible" : ""}`}>
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
