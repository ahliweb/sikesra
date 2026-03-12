/**
 * Safely strips HTML tags from a string using browser-native DOMParser.
 * This is more secure than regex-based stripping against XSS vectors.
 * 
 * @param {string} html - The HTML string to sanitize.
 * @returns {string} - The plain text content.
 */
export function stripHtml(html) {
    if (!html) return '';
    try {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    } catch (e) {
        console.warn('DOMParser failed', e);
        return "";
    }
}
