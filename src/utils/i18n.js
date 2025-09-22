import en from "../locales/en.json" with { type: "json" };
import de from "../locales/de.json" with { type: "json"};

const locales = {
    en,
    de
};

/**
 * Get translation for a key in a given locale, with optional variables.
 * @param {string} key - Dot-separated key (e.g., 'playing.currently_playing')
 * @param {string} [locale='en'] - Locale code
 * @param {Object} [vars={}] - Variables to interpolate (e.g., { username: 'Snoozeds' })
 * @returns {string} - Translated string with variables replaced
 */
export function t(key, locale = 'en', vars = {}) {
    const messages = locales[locale] || locales.en;
    const keys = key.split('.');
    let result = messages;

    for (const k of keys) {
        if (result[k] === undefined) return key; // fallback
        result = result[k];
    }

    // Replace placeholders
    return String(result).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, varName) => {
        return vars[varName] ?? '';
    });
}
