import "./SubscriptionBanner.scss";
import Link from "next/link";
import { MessageSquare } from "lucide-react"; // Importing icon from Lucide
import { useEffect } from "react";
import { tenant } from "@/lib/config";

const SubscriptionBanner = () => {
    useEffect(() => {
        document.documentElement.style.setProperty('--subscription-bg-left', `url(/assets/${tenant.shortName}/${tenant.contactUsBGLeft})`);
        document.documentElement.style.setProperty('--subscription-bg-right', `url(/assets/${tenant.shortName}/${tenant.contactUsBGRight})`);
        document.documentElement.style.setProperty('--color-contactUsColor', tenant.theme.contactUsColor);
    }, []);

    return (
        <div className={`subscription-banner ${tenant.shortName === "CF" ? "background-alt" : ""} ${tenant.shortName === "Ashermans" ? "background-alt" : ""}`}>
            <h2 className="heading-tertiary w-800">Get in Touch</h2>
            <p className="body-large color-light-grey">
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
