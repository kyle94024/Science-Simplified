import { uiText } from "@/lib/uiText";

// ClinicalTrials.gov ages read "18 Years", "6 Months", "1 Year", … — shown in
// the reader's language through these keys (English output is unchanged).
const UNIT_KEYS = {
    Year: uiText("{n} Year"),
    Years: uiText("{n} Years"),
    Month: uiText("{n} Month"),
    Months: uiText("{n} Months"),
    Week: uiText("{n} Week"),
    Weeks: uiText("{n} Weeks"),
    Day: uiText("{n} Day"),
    Days: uiText("{n} Days"),
};

/** A ClinicalTrials.gov age ("18 Years") in the reader's language (`t` from useUiText); other values unchanged. */
export function formatTrialAge(value, t) {
    const m = /^(\d+) (Years?|Months?|Weeks?|Days?)$/.exec(value ?? "");
    return m ? t(UNIT_KEYS[m[2]], { n: m[1] }) : value;
}
