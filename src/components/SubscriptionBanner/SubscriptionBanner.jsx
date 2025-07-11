import "./SubscriptionBanner.scss";
import Link from "next/link";
import { MessageSquare } from "lucide-react"; // Importing icon from Lucide
import { useEffect } from "react";
import { tenant } from "@/lib/config";

const SubscriptionBanner = () => {
    useEffect(() => {
        document.documentElement.style.setProperty('--subscription-bg-left', `url(/assets/${tenant.pathName}/${tenant.contactUsBGLeft})`);
        document.documentElement.style.setProperty('--subscription-bg-right', `url(/assets/${tenant.pathName}/${tenant.contactUsBGRight})`);
        document.documentElement.style.setProperty('--color-contactUsColor', tenant.theme.contactUsColor);
    }, []);

    return (
        <div className={`subscription-banner ${tenant.shortName === "CF" || tenant.shortName === "Vitiligo" || tenant.shortName === "Canavan" || tenant.shortName === "Progeria" || tenant.shortName === "Huntington's" || tenant.shortName === "Rett" || tenant.shortName === "RYR1" || tenant.shortName === "ALS" || tenant.shortName === "Asherman's" || tenant.shortName === "Aicardi" ? "background-alt" : ""}`}>
            <h2 className={`heading-tertiary w-800 ${tenant.shortName === "ALS" ? "invisible" : ""}`}>Get in Touch</h2>
            <p className={`body-large color-light-grey ${tenant.shortName === "ALS" ? "invisible" : ""}`}>
                Reach out to us for any questions, partnerships, or support.
                We&apos;re here to help!
            </p>

            <Link href="/contact" className="btn btn-primary-white">
                <MessageSquare className="icon" />
                <span className="text">Contact Us</span>
            </Link>
        </div>
    );
};

export default SubscriptionBanner;
