"use client";
import "./FAQs.scss";
import Footer from "@/components/Footer/Footer";
import Navbar from "@/components/Navbar/Navbar";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Suspense } from "react";

import Loader from "@/app/loading";
import { tenant } from "@/lib/config";
import { useUiText } from "@/hooks/useUiText";
import { uiText } from "@/lib/uiText";

// Placeholders: {name} the site's name, {shortName} the condition's short name,
// {disease} the condition (translated where the language has a name for it).
const faqsData = [
    {
        question: uiText("What is {name}?"),
        answer: uiText("{name} is a platform dedicated to providing accessible, up-to-date, and comprehensive information about {disease} ({shortName}) for patients, families, and caregivers."),
    },
    {
        question: uiText("Who is {name} for?"),
        answer: uiText("Our website is designed for individuals affected by {shortName}, including patients, families, and caregivers, to help them access information and resources that aid in understanding and managing {shortName}."),
    },
    {
        question: uiText("What type of information does {name} provide?"),
        answer: uiText("We offer simplified articles and resources on {disease}, all reviewed by {shortName} experts, to ensure accuracy and accessibility for all users."),
    },
    {
        question: uiText("Who reviews the information on {name}?"),
        answer: uiText("All articles on our website are reviewed by {shortName} experts, ensuring that the information provided is accurate, reliable, and up-to-date. Please note that clinical trial summaries have not yet been verified by a researcher on the original study team."),
    },
    {
        question: uiText("How can {name} help those living with {shortName}?"),
        answer: uiText("We empower those affected by {shortName} with knowledge, offering educational articles and a supportive community to help navigate their journey with {disease}."),
    },
];

const FAQs = () => {
    const t = useUiText();
    const vars = { name: tenant.name, shortName: tenant.shortName, disease: t(tenant.disease) };

    return (
        <Suspense fallback={<Loader />}>
            <div className="faq">
                <Navbar />
                <main className="faq__content padding">
                    <h2 className="heading-secondary text-center">
                        {t("Frequently Asked Questions")}
                    </h2>

                    <div className="faq__container boxed">
                        <Accordion
                            type="single"
                            collapsible
                            className="faq__accordion"
                        >
                            {faqsData.map((faq, index) => (
                                <AccordionItem
                                    key={index}
                                    value={`item-${index}`}
                                    className="faq__item"
                                >
                                    <AccordionTrigger className="faq__question">
                                        {t(faq.question, vars)}
                                    </AccordionTrigger>
                                    <AccordionContent className="faq__answer">
                                        {t(faq.answer, vars)}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                </main>
                <Footer />
            </div>
        </Suspense>
    );
};

export default FAQs;
