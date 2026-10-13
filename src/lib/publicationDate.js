const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * An article's publication date for display. Dates are stored as citation
 * text — "2025 Jul 8", "2026 Sept 1", "2024 Mar", "27 March 2025". English
 * shows them exactly as stored; another language (`lang`, e.g. t.lang from
 * useUiText) gets recognisable ones written out in that language
 * ("8 de julio de 2025"). Anything else is shown as stored.
 */
export function formatPublicationDate(raw, lang) {
    if (!raw || !lang || lang === "en") return raw;
    const text = String(raw).trim();
    let year, mon, day, m;
    if ((m = /^(\d{4})\s+([A-Za-z]+)\.?(?:\s+(\d{1,2}))?$/.exec(text))) [, year, mon, day] = m;
    else if ((m = /^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})$/.exec(text))) [, day, mon, year] = m;
    else return raw;

    const month = MONTHS.indexOf(mon.slice(0, 3).toLowerCase());
    if (month < 0) return raw;
    const date = new Date(Date.UTC(Number(year), month, day ? Number(day) : 1));
    if (day && date.getUTCDate() !== Number(day)) return raw; // e.g. "Feb 31"
    try {
        return new Intl.DateTimeFormat(lang, {
            year: "numeric",
            month: "long",
            ...(day ? { day: "numeric" } : {}),
            timeZone: "UTC",
        }).format(date);
    } catch {
        return raw;
    }
}
