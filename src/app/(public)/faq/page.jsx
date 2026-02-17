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

const faqsData = [
    {
        question: `What is ${tenant.name}?`,
        answer: `${tenant.name} is a platform dedicated to providing accessible, up-to-date, and comprehensive information about ${tenant.disease} (${tenant.shortName}) for patients, families, and caregivers.`,
    },
    {
        question: `Who is ${tenant.name} for?`,
        answer: `Our website is designed for individuals affected by ${tenant.shortName}, including patients, families, and caregivers, to help them access information and resources that aid in understanding and managing ${tenant.shortName}.`,
    },
    {
        question: `What type of information does ${tenant.name} provide?`,
        answer: `We offer simplified articles and resources on ${tenant.disease}, all reviewed by ${tenant.shortName} experts, to ensure accuracy and accessibility for all users.`,
    },
    {
        question: `Who reviews the information on ${tenant.name}?`,
        answer: `All articles on our website are reviewed by ${tenant.shortName} experts, ensuring that the information provided is accurate, reliable, and up-to-date. Please note that clinical trial summaries are AI-generated and have not been reviewed by medical experts—always consult your healthcare provider before considering participation in any clinical trial.`,
    },
    {
        question: `How can ${tenant.name} help those living with ${tenant.shortName}?`,
        answer: `We empower those affected by ${tenant.shortName} with knowledge, offering educational articles and a supportive community to help navigate their journey with ${tenant.disease}.`,
    },
];

const FAQs = () => {
    return (
        <Suspense fallback={<Loader />}>
            <div className="faq">
                <Navbar />
                <main className="faq__content padding">
                    <h2 className="heading-secondary text-center">
                        Frequently Asked Questions
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
                                        {faq.question}
                                    </AccordionTrigger>
                                    <AccordionContent className="faq__answer">
                                        {faq.answer}
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
