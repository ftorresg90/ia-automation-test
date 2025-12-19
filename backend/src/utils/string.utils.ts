
export const removeDiacritics = (text: string): string => {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const splitIntoWords = (text: string): string[] => {
    return removeDiacritics(text)
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
};

// Convert text to camelCase
export const toCamelCase = (text: string): string => {
    const words = splitIntoWords(text);
    if (words.length === 0) return '';

    const [first, ...rest] = words;
    const firstWord = first.toLowerCase();
    const restWords = rest.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
    return firstWord + restWords.join('');
};

// Convert text to PascalCase
export const toPascalCase = (text: string): string => {
    const camel = toCamelCase(text);
    if (!camel) return '';
    return camel.charAt(0).toUpperCase() + camel.slice(1);
};

export const escapeForTemplate = (text: string): string => {
    return text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');
};

export const extractQuotedText = (text: string): string | null => {
    const match = text.match(/["'“”‘’]([^"'“”‘’]+)["'“”‘’]/);
    return match ? match[1] : null;
};

export const cleanElementName = (text: string): string => {
    if (!text) return 'element';
    let cleaned = text
        .replace(/ingresar\s+['"“”‘’]?.+?['"“”‘’]?\s+en\s+/gi, '')
        .replace(/hacer\s+click\s+(en|sobre)\s+/gi, '')
        .replace(/click\s+(en|sobre)\s+/gi, '')
        .replace(/verificar\s+(que\s+)?/gi, '')
        .replace(/seleccionar\s+/gi, '')
        .replace(/haga\s+clic\s+en\s+/gi, '')
        .replace(/el\s+/gi, '')
        .replace(/la\s+/gi, '')
        .replace(/los\s+/gi, '')
        .replace(/las\s+/gi, '')
        .replace(/de\s+/gi, '')
        .trim();

    cleaned = removeDiacritics(cleaned);
    const words = cleaned.split(/\s+/).filter(w => w.length > 2);
    if (!words.length) return 'element';
    return words.slice(0, 3).join(' ');
};
