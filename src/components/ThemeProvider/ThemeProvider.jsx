"use client";

import { tenant } from "@/lib/config";
import { useEffect } from "react";

export default function ThemeProvider({ children }) {
    useEffect(() => {
        // Set CSS variables based on tenant theme
        document.documentElement.style.setProperty('--color-primary', tenant.theme.primary);
        document.documentElement.style.setProperty('--color-primary-dark', tenant.theme.primaryDark);
        document.documentElement.style.setProperty('--color-light-grey', tenant.theme.lightGrey);
        document.documentElement.style.setProperty('--color-text', tenant.theme.text);
        document.documentElement.style.setProperty('--color-background', tenant.theme.background);
        document.documentElement.style.setProperty('--color-contactUsColor', tenant.theme.contactUsColor);
        document.documentElement.style.setProperty('--color-author-text-color', tenant.theme.authorTextColor);
        document.documentElement.style.setProperty('--color-footer-bg', tenant.theme.footerBGColor);
    }, []);

    return children;
} 