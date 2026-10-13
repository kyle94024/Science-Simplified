/**
 * Inline <head> script + style for tenants with the language picker, rendered
 * by src/app/layout.js so they run before the first paint.
 *
 * The server always renders English — it can't see the reader's saved choice
 * (localStorage) — so for a returning reader who picked another language the
 * page stays hidden until its text has switched (LanguageBoot reveals it),
 * rather than flashing English first. <html lang> is set straight away. If
 * anything goes wrong the page shows anyway after REVEAL_AFTER_MS.
 */
import { LANGUAGE_STORAGE_KEY } from "@/store/useLanguageStore";
import { SUPPORTED_LANGUAGES } from "@/lib/translationWarnings";

export const PENDING_CLASS = "ss-lang-pending";
const REVEAL_AFTER_MS = 3000;
const CODES = SUPPORTED_LANGUAGES.map((l) => l.code);

export const languageBootScript =
    `(function(){try{` +
    `var v=JSON.parse(localStorage.getItem(${JSON.stringify(LANGUAGE_STORAGE_KEY)})),l=v&&v.state&&v.state.language;` +
    `if(${JSON.stringify(CODES)}.indexOf(l)<0)return;` +
    `var h=document.documentElement;h.lang=l;h.classList.add(${JSON.stringify(PENDING_CLASS)});` +
    `setTimeout(function(){h.classList.remove(${JSON.stringify(PENDING_CLASS)})},${REVEAL_AFTER_MS})` +
    `}catch(e){}})();`;

export const languageBootStyle = `html.${PENDING_CLASS} body{visibility:hidden}`;
