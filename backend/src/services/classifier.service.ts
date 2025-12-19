import { completeText } from './ai.service';

export const classifyFeature = async (title: string, steps: any[]): Promise<string> => {
    const stepText = steps.map(s => s.action || s.text).join('\n');
    const prompt = `
    Analyze the following test case and classify it into a functional module (e.g., Login, Cart, Checkout, Profile, Search, API, Database).
    Return ONLY the module name in CamelCase.
    
    Title: ${title}
    Steps:
    ${stepText}
  `;

    const aiResult = await completeText(prompt);
    const feature = aiResult.trim().replace(/[^a-zA-Z]/g, '');

    if (feature && feature.length < 20) {
        return feature;
    }

    // Fallback heuristics
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('login') || lowerTitle.includes('sign in')) return 'Login';
    if (lowerTitle.includes('cart') || lowerTitle.includes('basket')) return 'Cart';
    if (lowerTitle.includes('checkout') || lowerTitle.includes('pay')) return 'Checkout';

    return 'General';
};
