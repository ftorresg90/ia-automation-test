
import { generateSelector } from './selector.service';
import { toPascalCase, toCamelCase, cleanElementName, extractQuotedText, escapeForTemplate } from '../utils/string.utils';

export interface PageObject {
    name: string;
    path: string;
    content: string;
}

export interface PlaywrightGenerationResult {
    testSpec: string;
    pageObjects: PageObject[];
}

// Enhanced Page Object structure with selector deduplication
interface EnhancedPageObject {
    methods: string[];
    locators: string[];
    imports: string[];
    locatorDefs: Map<string, string>; // locatorName -> selector definition (primary)
    elementStrategies: Map<string, string[]>; // locatorName -> all strategies
    selectorMap: Map<string, string>; // selector definition -> locatorName (for deduplication)
    url?: string;
}

const resolveSelectorStrategy = async (elementName: string, actionText: string, currentUrl?: string, elementType: 'input' | 'button' | 'text' | 'generic' = 'generic'): Promise<string[]> => {
    const selectorResult = await generateSelector(elementName, actionText, { pageUrl: currentUrl, elementType });

    // Format a single selector string to be Playwright-ready
    const formatSelector = (s: string) => {
        if (s.startsWith('xpath=') || s.startsWith('//') || s.startsWith('(')) {
            return s.startsWith('xpath=') ? s : `xpath=${s}`;
        }
        return s;
    };

    // Return array: [best, ...alternatives]
    // Filter duplicates and empty strings
    const strategies = [
        selectorResult.best,
        ...selectorResult.alternatives
    ].filter(Boolean).map(formatSelector);

    return Array.from(new Set(strategies));
};

// Normalized action structure
interface NormalizedAction {
    type: 'navigate' | 'search' | 'input' | 'click' | 'verify';
    value?: string;
    element: string;
}

// Normalize raw action text to standardized action type
const normalizeAction = (rawAction: string): NormalizedAction => {
    const lower = rawAction.toLowerCase();
    const textMatch = rawAction.match(/['"""'']([^'""'']+)['''""'']/);
    const value = textMatch ? textMatch[1] : '';

    // NAVEGACIÓN
    if (lower.includes('navegar') || lower.includes('visitar') || lower.includes('go to')) {
        const urlMatch = rawAction.match(/https?:\/\/[^\s"'""'']+/);
        return {
            type: 'navigate',
            value: urlMatch ? urlMatch[0] : '',
            element: 'page'
        };
    }

    // CLICK - Check BEFORE search to avoid "Hacer click en buscar" being classified as search
    if (lower.includes('click') || lower.includes('presionar') || lower.includes('hacer click')) {
        let element = rawAction
            .replace(/(hacer\s+)?(click|presionar)\s+(en\s+|on\s+|el\s+|la\s+|botón\s+|button\s+)*/i, '')
            .trim();

        console.log(`[normalizeAction] CLICK - Raw after regex: "${element}"`);
        element = cleanElementName(element);
        console.log(`[normalizeAction] CLICK - After cleanElementName: "${element}"`);

        // Detectar si es botón de búsqueda
        if (lower.includes('buscar') || lower.includes('búsqueda') || lower.includes('busqueda') || lower.includes('search')) {
            element = 'boton de busqueda';
        }

        if (!element || element.length < 2) {
            console.log(`[normalizeAction] CLICK - Element too short, using fallback 'boton'`);
            element = 'boton';
        }

        console.log(`[normalizeAction] CLICK - Final element: "${element}"`);
        return { type: 'click', element };
    }

    // BÚSQUEDA - Normalizar múltiples variantes
    // "Buscar 'X'", "Ingresar 'X' en el campo de búsqueda", "Escribir 'X' en búsqueda"
    if (lower.includes('buscar') ||
        ((lower.includes('ingresar') || lower.includes('escribir') || lower.includes('enter') || lower.includes('type')) &&
            (lower.includes('búsqueda') || lower.includes('busqueda') || lower.includes('search')))) {
        return {
            type: 'search',
            value,
            element: 'campo de busqueda'
        };
    }

    // INPUT genérico
    if (lower.includes('ingresar') || lower.includes('escribir') || lower.includes('enter') || lower.includes('type')) {
        let element = rawAction
            .replace(/['\"""'']([^'""'']+)['\"""'']/, '') // Remove quoted text
            .replace(/(ingresar|escribir|enter|type)/i, '')
            .replace(/(en|in|into|el campo|el|la)/i, '')
            .trim();
        element = cleanElementName(element);
        if (!element || element === 'element' || element.length < 2) element = 'campo';
        return { type: 'input', value, element };
    }

    // VERIFICACIÓN
    if (lower.includes('verificar') || lower.includes('verify') || lower.includes('check')) {
        let element = rawAction
            .replace(/(verificar|verify|check)\s+(que\s+)?/i, '')
            .trim();
        element = cleanElementName(element);
        if (!element || element.length < 2) element = 'elemento';
        return { type: 'verify', value, element };
    }

    // Fallback
    return { type: 'click', element: 'element' };
};

// Compare selector quality - returns true if newSelector is better than existingSelector
const isBetterSelector = (newSelector: string, existingSelector: string): boolean => {
    // Scoring system for selector quality
    const getScore = (selector: string): number => {
        let score = 0;

        // Prefer CSS over XPath
        if (!selector.startsWith('xpath=') && !selector.startsWith('//')) {
            score += 10;
        }

        // Prefer ID selectors (highest priority)
        if (selector.includes('#') || selector.includes('[id=')) {
            score += 20;
        }

        // Prefer data-testid
        if (selector.includes('data-testid')) {
            score += 15;
        }

        // Prefer name attribute
        if (selector.includes('[name')) {
            score += 12;
        }

        // Prefer aria-label
        if (selector.includes('aria-label')) {
            score += 10;
        }

        // Prefer placeholder
        if (selector.includes('placeholder')) {
            score += 8;
        }

        // Penalize text-based XPath heavily
        if (selector.includes('contains(translate(normalize-space')) {
            score -= 50;
        }

        // Penalize generic XPath
        if (selector.startsWith('xpath=//*[') || selector.startsWith('//*[')) {
            score -= 20;
        }

        return score;
    };

    const newScore = getScore(newSelector);
    const existingScore = getScore(existingSelector);

    return newScore > existingScore;
};

// Helper to extract domain name from URL for Page Object naming
const extractPageNameFromUrl = (url: string): string => {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace(/^www\./, ''); // Remove www.
        const parts = hostname.split('.');
        const mainDomain = parts.length > 1 ? parts[parts.length - 2] : parts[0];
        return toPascalCase(mainDomain) + 'Page';
    } catch {
        return 'DefaultPage';
    }
};

export const generatePlaywrightPOM = async (
    projectData: { name: string; testCases: any[] },
    executionId: string
): Promise<PlaywrightGenerationResult> => {
    const pageObjects: Map<string, EnhancedPageObject> = new Map();
    const testSteps: string[] = [];

    // Phase 1: Pre-scan to detect URLs and map test cases to Page Objects
    const testCaseToPageMap = new Map<string, { pageName: string; pageVarName: string; url: string }>();

    for (const tc of projectData.testCases) {
        const navStep = (tc.steps || []).find((s: any) => {
            const action = (s.action || s.text || '').toLowerCase();
            return action.includes('navegar') || action.includes('visitar') || action.includes('go to');
        });

        let targetUrl = 'https://example.com';
        if (navStep) {
            const urlMatch = (navStep.action || navStep.text || '').match(/https?:\/\/[^\s"'""'']+/);
            if (urlMatch) {
                targetUrl = urlMatch[0];
            }
        }

        const pageName = extractPageNameFromUrl(targetUrl);
        const pageVarName = toCamelCase(pageName.replace('Page', '')) + 'Page';

        testCaseToPageMap.set(tc.title, { pageName, pageVarName, url: targetUrl });

        if (!pageObjects.has(pageName)) {
            pageObjects.set(pageName, {
                methods: [],
                locators: [],
                imports: [
                    "import { type Locator, type Page, expect } from '@playwright/test';",
                    "import * as fs from 'fs';",
                    "import * as path from 'path';"
                ],
                locatorDefs: new Map(),
                elementStrategies: new Map(),
                selectorMap: new Map(),
                url: targetUrl
            });
        }
    }

    // Phase 2: Process each test case and build Page Objects with deduplication
    for (const tc of projectData.testCases) {
        const pageInfo = testCaseToPageMap.get(tc.title)!;
        const { pageName, pageVarName } = pageInfo;
        const currentPO = pageObjects.get(pageName)!;

        const testBodyLines: string[] = [];
        testBodyLines.push(`    const ${pageVarName} = new ${pageName}(page);`);

        let currentUrl = currentPO.url;

        for (const step of (tc.steps || [])) {
            const action = (step.action || step.text || '').trim();
            if (!action) continue;

            const normalized = normalizeAction(action);

            // 1. Navigation
            if (normalized.type === 'navigate') {
                const targetUrl = normalized.value || currentUrl || 'https://example.com';
                currentUrl = targetUrl;
                const methodName = `goto`;
                if (!currentPO.methods.some(m => m.includes(`async ${methodName}()`))) {
                    currentPO.methods.push(`
    async ${methodName}() {
        await this.page.goto('${targetUrl}');
        await this.page.waitForLoadState('domcontentloaded');
    }`);
                }
                testBodyLines.push(`    await ${pageVarName}.${methodName}();`);
                continue;
            }

            // 2. Process other action types
            const cleanName = normalized.element;
            const elementPascal = toPascalCase(cleanName) || 'Element';

            console.log(`[generatePOM] Processing element: "${cleanName}", action type: ${normalized.type}`);

            // Determine element type based on action
            let elementType: 'input' | 'button' | 'text' | 'generic' = 'generic';
            if (normalized.type === 'input' || normalized.type === 'search') {
                elementType = 'input';
            } else if (normalized.type === 'click') {
                elementType = 'button';
            } else if (normalized.type === 'verify') {
                elementType = 'text';
            }

            // Generate strategies
            // Use CamelCase name for selector generation to ensure registry cache hits (which are saved by variable name)
            const lookupName = toCamelCase(cleanName) || 'element';
            // Pass derived elementType to resolveSelectorStrategy
            const strategies = await resolveSelectorStrategy(lookupName, action, currentUrl, elementType);
            const bestSelector = strategies[0] || 'body';

            console.log(`[generatePOM] Generated selector for "${lookupName}" (type: ${elementType}): ${bestSelector}`);

            // ENHANCED DEDUPLICATION
            let locatorName = currentPO.selectorMap.get(bestSelector);

            // Special check: prevent "login" (button) from reusing "username" (input) selector
            // This happens if both resolve to a generic container like #login_credentials
            if (locatorName) {
                const isFormAction = ['login', 'submit', 'send', 'search'].some(k => cleanName.toLowerCase().includes(k));
                const existingIsInput = ['username', 'password', 'email', 'input'].some(k => locatorName!.toLowerCase().includes(k));

                if (isFormAction && existingIsInput) {
                    console.log(`[generatePOM] PREVENTED DEDUPLICATION: '${cleanName}' tried to use '${locatorName}'. Forcing new locator.`);
                    locatorName = undefined; // Force creation of new locator
                }
            }

            if (!locatorName) {
                const proposedName = toCamelCase(cleanName) || 'element';
                console.log(`[generatePOM] No existing locator for selector (or forced new). Proposed name: "${proposedName}"`);

                if (currentPO.locatorDefs.has(proposedName)) {
                    // Existing element with potentially different selector
                    // For auto-healing, duplicate locator names are tricky.
                    // But we can update strategies if we find better ones?
                    // For simplicity, if exists, reuse the name.
                    console.log(`[generatePOM] Locator "${proposedName}" already exists, reusing`);
                    locatorName = proposedName;

                    // TODO: Merging strategies would be ideal here.
                } else {
                    locatorName = proposedName;
                    console.log(`[generatePOM] Creating new locator: "${locatorName}"`);

                    // define array property
                    const strategiesCode = strategies.map(s => JSON.stringify(s)).join(', ');
                    currentPO.locators.push(`readonly ${locatorName}Selectors: string[] = [${strategiesCode}];`);
                    currentPO.locators.push(`readonly ${locatorName}: Locator;`); // Keep standard locator for simple cases? No, let's rely on strategies.

                    // Actually, to keep backward compat and simple usage, let's expose the BEST as a standard locator too?
                    // "readonly searchInput: Locator;" -> "this.searchInput = page.locator(selectors[0])"

                    currentPO.elementStrategies.set(locatorName, strategies);
                    currentPO.locatorDefs.set(locatorName, bestSelector);
                    currentPO.selectorMap.set(bestSelector, locatorName);
                }
            } else {
                console.log(`[generatePOM] Found existing locator "${locatorName}" for selector "${bestSelector}"`);
            }

            // 3. Generate methods based on normalized action type

            // SEARCH or INPUT
            if (normalized.type === 'search' || normalized.type === 'input') {
                const value = normalized.value || '';
                const methodName = normalized.type === 'search'
                    ? `search${elementPascal}`
                    : `fill${elementPascal}`;
                const paramName = 'value';

                // Add method (avoid duplicates)
                if (!currentPO.methods.some(m => m.includes(`async ${methodName}(`))) {
                    let methodBody = `
    async ${methodName}(${paramName}: string) {
        await this.smartFill(this.${locatorName}Selectors, ${paramName});`;

                    if (normalized.type === 'search') {
                        methodBody += `\n        await this.page.keyboard.press('Enter');`;
                    }
                    methodBody += `\n    }`;

                    currentPO.methods.push(methodBody);
                }

                testBodyLines.push(`    await ${pageVarName}.${methodName}('${value}');`);
            }

            // CLICK
            else if (normalized.type === 'click') {
                const methodName = `click${elementPascal}`;
                if (!currentPO.methods.some(m => m.includes(`async ${methodName}()`))) {
                    currentPO.methods.push(`
    async ${methodName}() {
        await this.smartClick(this.${locatorName}Selectors);
    }`);
                }
                testBodyLines.push(`    await ${pageVarName}.${methodName}();`);
            }

            // VERIFY
            // VERIFY
            else if (normalized.type === 'verify') {
                const expectedText = normalized.value;
                const methodName = `verify${elementPascal}`;

                // Add method for smart text verification
                if (expectedText) {
                    if (!currentPO.methods.some(m => m.includes(`async ${methodName}(`))) {
                        currentPO.methods.push(`
    async ${methodName}(expectedText: string) {
        await this.smartVerify(this.${locatorName}Selectors, expectedText);
    }`);
                    }
                    testBodyLines.push(`    await ${pageVarName}.${methodName}('${expectedText}');`);
                } else {
                    // Fallback for visibility check (not yet in smartVerify, just use expect for now)
                    // Or we could implement smartVisible?
                    testBodyLines.push(`    await expect(page.locator(${pageVarName}.${locatorName}Selectors[0])).toBeVisible();`);
                }
            }
        }

        testSteps.push(`  test('${escapeForTemplate(tc.title)}', async ({ page }) => {
${testBodyLines.join('\n')}
  });`);
    }

    // Phase 3: Build Page Object Files
    const generatedPages: PageObject[] = [];

    for (const [className, data] of pageObjects.entries()) {
        const locatorInits: string[] = [];
        data.locatorDefs.forEach((def, name) => {
            locatorInits.push(`        this.${name} = this.page.locator(this.${name}Selectors[0]);`);
        });

        const fileContent = `${data.imports.join('\n')}
import { BasePage } from './BasePage';

export class ${className} extends BasePage {
    ${data.locators.join('\n    ')}

    constructor(page: Page) {
        super(page);
${locatorInits.join('\n')}
    }

${data.methods.join('\n')}
}`;
        generatedPages.push({
            name: className,
            path: `pages/${className}.ts`,
            content: fileContent
        });
    }

    // Phase 4: Build Test Spec
    const imports = generatedPages.map(p => `import { ${p.name} } from './pages/${p.name}';`).join('\n');

    const specContent = `import { test, expect } from '@playwright/test';
${imports}

test.use({ video: 'on', trace: 'retain-on-failure' });

test.describe('${escapeForTemplate(projectData.name)}', () => {
${testSteps.join('\n\n')}
});
`;

    return {
        testSpec: specContent,
        pageObjects: generatedPages
    };
};
