import { tenant } from "@/lib/config";
import { Outfit } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer/Footer";
import ThemeProvider from "@/components/ThemeProvider/ThemeProvider";
import LanguageBoot from "@/components/LanguageBoot/LanguageBoot";
import { languageBootScript, languageBootStyle } from "@/lib/uiText/boot";

import { ToastContainer } from "react-toastify";
import { Analytics } from "@vercel/analytics/react";

// Importing Outfit font from Google Fonts
const outfitFont = Outfit({
    subsets: ["latin"],
    variable: "--font-outfit",
    weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata = {
    title: `${tenant.name}`,
    description:
        `${tenant.name} - Get simplified information about ${tenant.diseaseLower || tenant.disease}`,
};

// Tenants with the site-wide language picker (NF): the reader's saved language
// is applied before the first paint — see src/lib/uiText/boot.js.
const languagePicker = !!tenant.articleTranslations;

export default function RootLayout({ children }) {
    return (
        // The boot script may set lang (and a class) on <html> before hydration.
        <html lang="en" suppressHydrationWarning={languagePicker || undefined}>
            {languagePicker && (
                <head>
                    <script dangerouslySetInnerHTML={{ __html: languageBootScript }} />
                    <style dangerouslySetInnerHTML={{ __html: languageBootStyle }} />
                </head>
            )}
            <body className={`${outfitFont.variable} antialiased`}>

                <Analytics />

                <ThemeProvider>
                    <ToastContainer
                        position="top-right"
                        autoClose={2000}
                        hideProgressBar={true}
                        closeOnClick
                        pauseOnHover
                        draggable
                    />

                    {children}
                </ThemeProvider>

                {languagePicker && <LanguageBoot />}
            </body>
        </html>
    );
}
