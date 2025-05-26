import { tenant } from "@/lib/config";
import { Outfit } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer/Footer";
import ThemeProvider from "@/components/ThemeProvider/ThemeProvider";

import { ToastContainer } from "react-toastify";

// Importing Outfit font from Google Fonts
const outfitFont = Outfit({
    subsets: ["latin"],
    variable: "--font-outfit",
    weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata = {
    title: `${tenant.name} Simplified`,
    description:
        `${tenant.name} Simplified - Get simplified information about ${tenant.name}`,
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className={`${outfitFont.variable} antialiased`}>
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
            </body>
        </html>
    );
}
