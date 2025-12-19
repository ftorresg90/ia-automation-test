import { chromium } from 'playwright';
import { completeText } from './ai.service';
import { domCache } from './dom-cache.service';

type ElementType = 'button' | 'input' | 'link' | 'text' | 'dropdown' | 'checkbox' | 'generic';

interface PageElement {
    tag: string;
    id?: string | null;
    name?: string | null;
    placeholder?: string | null;
    text?: string | null;
    classes: string[];
    dataTestId?: string | null;
    ariaLabel?: string | null;
    title?: string | null;
    href?: string | null;
    typeAttr?: string | null;
    labelText?: string[];
}

interface PageAnalysis {
    url: string;
    capturedAt: number;
    elementsByType: Record<ElementType, PageElement[]>;
}

const pageAnalysisCache = new Map<string, Promise<PageAnalysis | null>>();

const normalizeUrl = (url?: string): string | null => {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        return parsed.href;
    } catch {
        return null;
    }
};

const escapeCssIdentifier = (value: string): string => {
    return value.replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
};

const escapeAttributeValue = (value: string): string => {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
};

const normalizeText = (text?: string | null): string => {
    if (!text) return '';
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

// Selector quality scoring
interface SelectorScore {
    score: number;
    issues: string[];
    type: 'css' | 'xpath';
}

const validateSelector = (selector: string, type: 'css' | 'xpath'): SelectorScore => {
    let score = 0;
    const issues: string[] = [];

    if (type === 'css') {
        // Prefer stable attributes
        if (selector.includes('[id=')) score += 10;
        else if (selector.includes('[data-testid')) score += 9;
        else if (selector.includes('[data-test')) score += 9;
        else if (selector.includes('[name=')) score += 7;
        else if (selector.includes('[aria-label')) score += 8;
        else if (selector.includes('[placeholder')) score += 6;
        else if (selector.match(/\.[a-zA-Z][\w-]+/)) score += 5; // Class selector

        // Penalize brittle patterns
        if (selector.match(/\.[a-z0-9]{8,}/)) { // Long hash-like class
            score -= 5;
            issues.push('Contains generated hash-like class');
        }
        if (selector.split('.').length > 4) { // Too many chained classes
            score -= 3;
            issues.push('Too many chained classes');
        }
        if (selector.includes(':nth-child') || selector.includes(':nth-of-type')) {
            score -= 4;
            issues.push('Uses positional selector (brittle)');
        }

        // Bonus for semantic selectors
        if (selector.match(/button|input|a\[/)) score += 2;
    } else {
        // XPath scoring
        if (selector.includes('@id=')) score += 10;
        else if (selector.includes('@data-testid')) score += 9;
        else if (selector.includes('@name=')) score += 7;
        else if (selector.includes('contains(text()')) score += 6;
        else if (selector.includes('@aria-label')) score += 8;

        // Penalize complex XPath
        if (selector.length > 100) {
            score -= 3;
            issues.push('XPath too complex');
        }
        if ((selector.match(/\//g) || []).length > 5) {
            score -= 2;
            issues.push('Too many nested levels');
        }
    }

    return { score, issues, type };
};

// Selector templates for common elements
const selectorTemplates: Record<string, Array<{ css?: string; xpath?: string }>> = {
    searchInput: [
        { css: 'input[name*="search" i]' },
        { css: 'input[placeholder*="buscar" i]' },
        { css: 'input[aria-label*="search" i]' },
        { xpath: '//input[contains(translate(@placeholder, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "buscar")]' }
    ],
    searchButton: [
        { css: 'button[type="submit"]' },
        { css: 'button[aria-label*="buscar" i]' },
        { xpath: '//button[contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "buscar")]' },
        { xpath: '//button[@type="submit"]' }
    ],
    addToCart: [
        { css: 'button[aria-label*="carrito" i]' },
        { css: 'button[class*="add-to-cart"]' },
        { xpath: '//button[contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "agregar")]' }
    ],
    loginButton: [
        { css: 'button[type="submit"]' },
        { xpath: '//button[contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "ingresar") or contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "login")]' }
    ],
    priceElement: [
        { css: '[class*="price"]' },
        { css: '[data-testid*="price"]' },
        { xpath: '//*[contains(@class, "price")]' }
    ]
};

const findTemplateSelector = (elementName: string): { css?: string; xpath?: string } | null => {
    const normalized = elementName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Search button patterns
    if (normalized.match(/boton.*buscar|buscar.*boton|search.*button|button.*search/)) {
        return selectorTemplates.searchButton[0];
    }

    // Search input patterns
    if (normalized.match(/campo.*busqueda|input.*search|search.*input|campo.*buscar/)) {
        return selectorTemplates.searchInput[0];
    }

    // Add to cart patterns
    if (normalized.match(/agregar.*carrito|add.*cart|anadir.*carrito/)) {
        return selectorTemplates.addToCart[0];
    }

    // Login button patterns
    if (normalized.match(/boton.*login|login.*button|ingresar|iniciar.*sesion/)) {
        return selectorTemplates.loginButton[0];
    }

    // Price patterns
    if (normalized.match(/precio|price/)) {
        return selectorTemplates.priceElement[0];
    }

    return null;
};

const analyzePage = async (pageUrl: string): Promise<PageAnalysis | null> => {
    const normalizedUrl = normalizeUrl(pageUrl);
    if (!normalizedUrl) return null;

    // 1. Verificar cache en memoria (para esta sesión)
    if (pageAnalysisCache.has(normalizedUrl)) {
        return await pageAnalysisCache.get(normalizedUrl)!;
    }

    // 2. Extraer dominio
    const domain = new URL(normalizedUrl).hostname;

    // 3. Intentar cargar del cache persistente
    const cached = await domCache.load(domain);
    if (cached) {
        console.log(`[Selector] Using cached DOM for ${domain}`);
        const analysis: PageAnalysis = {
            url: normalizedUrl,
            capturedAt: cached.lastUpdatedAt,
            elementsByType: cached.elementsByType
        };

        // Guardar en memoria para esta sesión
        pageAnalysisCache.set(normalizedUrl, Promise.resolve(analysis));
        return analysis;
    }

    // 4. No hay cache - analizar página real
    const analysisPromise = (async (): Promise<PageAnalysis | null> => {
        let browser;
        try {
            console.log(`[Selector] Analyzing page ${pageUrl} (no cache available)`);
            browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
            await page.waitForTimeout(500);

            const pageData = await page.evaluate(() => {
                const serialize = (el: Element, extraType?: string) => {
                    const htmlEl = el as HTMLElement;
                    const base = {
                        tag: htmlEl.tagName.toLowerCase(),
                        id: htmlEl.id || null,
                        name: htmlEl.getAttribute('name'),
                        placeholder: htmlEl.getAttribute('placeholder'),
                        text: (htmlEl.textContent || '').trim(),
                        classes: Array.from((htmlEl.classList || []) as DOMTokenList),
                        dataTestId: htmlEl.getAttribute('data-testid'),
                        ariaLabel: htmlEl.getAttribute('aria-label'),
                        title: htmlEl.getAttribute('title'),
                        href: (htmlEl as HTMLAnchorElement).getAttribute ? (htmlEl as HTMLAnchorElement).getAttribute('href') : null,
                        typeAttr: htmlEl.getAttribute('type'),
                        labelText: 'labels' in htmlEl && (htmlEl as HTMLInputElement).labels
                            ? Array.from((htmlEl as HTMLInputElement).labels || []).map(label => (label.textContent || '').trim()).filter(Boolean)
                            : []
                    };

                    if (extraType === 'checkbox') {
                        (base as any).typeAttr = 'checkbox';
                    }
                    if (extraType === 'dropdown') {
                        (base as any).typeAttr = 'dropdown';
                    }

                    return base;
                };

                const unique = <T>(list: T[]) => list;

                return {
                    inputs: unique(
                        Array.from(document.querySelectorAll('input, textarea'))
                            .slice(0, 200)
                            .map(el => serialize(el))
                    ),
                    buttons: unique(
                        Array.from(document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]'))
                            .slice(0, 200)
                            .map(el => serialize(el))
                    ),
                    links: unique(
                        Array.from(document.querySelectorAll('a'))
                            .slice(0, 200)
                            .map(el => serialize(el))
                    ),
                    dropdowns: unique(
                        Array.from(document.querySelectorAll('select'))
                            .slice(0, 100)
                            .map(el => serialize(el, 'dropdown'))
                    ),
                    checkboxes: unique(
                        Array.from(document.querySelectorAll('input[type="checkbox"]'))
                            .slice(0, 100)
                            .map(el => serialize(el, 'checkbox'))
                    ),
                    generic: unique(
                        Array.from(document.querySelectorAll('[data-testid], [aria-label], [placeholder], h1, h2, h3, h4, h5, h6, p, span, div'))
                            .slice(0, 200)
                            .map(el => serialize(el))
                    )
                };
            });

            const analysis: PageAnalysis = {
                url: normalizedUrl,
                capturedAt: Date.now(),
                elementsByType: {
                    input: pageData.inputs,
                    button: pageData.buttons,
                    link: pageData.links,
                    dropdown: pageData.dropdowns,
                    checkbox: pageData.checkboxes,
                    generic: pageData.generic,
                    text: pageData.generic
                }
            };

            // 5. GUARDAR en cache persistente
            await domCache.save(domain, normalizedUrl, analysis.elementsByType);

            return analysis;
        } catch (error) {
            console.error('Error analyzing page for selectors', error);
            return null;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    })();

    pageAnalysisCache.set(normalizedUrl, analysisPromise);
    return await analysisPromise;
};

const escapeXPathLiteral = (value: string): string => {
    if (!value.includes("'")) {
        return `'${value}'`;
    }
    const parts = value.split("'");
    const quoted = parts.map(part => `'${part}'`);
    return `concat(${quoted.join(`, \"'\", `)})`;
};

const buildTextXPath = (text: string): string => {
    // Smart tokenization: extract meaningful tokens from camelCase/PascalCase names
    const splitCamelCase = (str: string): string[] => {
        return str
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
            .split(/[\s_\-]+/)
            .filter(Boolean)
            .map(token => normalizeText(token));
    };

    const tokens = splitCamelCase(text).filter(token => token.length > 1);

    // Filter out common words
    const commonWords = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'sea', 'be', 'is', 'visible']);
    const meaningfulTokens = tokens.filter(t => !commonWords.has(t) && t.length > 2);

    // Use the first meaningful token (e.g., "products" from "productsSeaVisible")
    const searchToken = meaningfulTokens.length > 0 ? meaningfulTokens[0] : (tokens[0] || text);

    const normalized = normalizeText(searchToken).slice(0, 60);
    if (!normalized) return "//*";
    const literal = escapeXPathLiteral(normalized);
    return `//*[contains(translate(normalize-space(.), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), ${literal})]`;
};

const isLikelyValidSelector = (selector: string): boolean => {
    if (!selector) return false;
    const trimmed = selector.trim();
    const lower = trimmed.toLowerCase();
    if (lower.includes('mock')) return false;
    if (trimmed.startsWith('/') || trimmed.startsWith('//')) return true;
    return /[#.\[\]=:]/.test(trimmed) || trimmed.startsWith('role=') || trimmed.startsWith('text=');
};

const escapeForSelectorText = (text: string): string => text.replace(/"/g, '\\"');
const normalizeWhitespace = (text: string): string => text.replace(/\s+/g, ' ').trim();

const buildSelectorFromElement = (element: PageElement): string | null => {
    if (!element) return null;
    if (element.id) {
        return `#${escapeCssIdentifier(element.id)}`;
    }
    if (element.dataTestId) {
        return `[data-testid="${escapeAttributeValue(element.dataTestId)}"]`;
    }
    if (element.name) {
        return `${element.tag}[name="${escapeAttributeValue(element.name)}"]`;
    }
    if (element.ariaLabel) {
        return `${element.tag}[aria-label="${escapeAttributeValue(element.ariaLabel)}"]`;
    }
    if (element.title) {
        return `${element.tag}[title="${escapeAttributeValue(element.title)}"]`;
    }
    if (element.placeholder) {
        const placeholderSnippet = element.placeholder.length > 25
            ? `${element.placeholder.slice(0, 25)}`
            : element.placeholder;
        return `${element.tag}[placeholder*="${escapeAttributeValue(placeholderSnippet)}"]`;
    }
    if (element.classes && element.classes.length > 0) {
        const safeClasses = element.classes
            .filter(Boolean)
            .slice(0, 3)
            .map(cls => escapeCssIdentifier(cls));
        if (safeClasses.length > 0) {
            return `${element.tag}.${safeClasses.join('.')}`;
        }
    }
    if (element.href) {
        return `${element.tag}[href="${escapeAttributeValue(element.href)}"]`;
    }
    return null;
};

export interface SelectorStrategies {
    best: string;
    alternatives: string[];
}

const matchElementsByRelevance = (
    elementName: string,
    context: string,
    elementType: ElementType | undefined,
    analysis: PageAnalysis
): SelectorStrategies | null => {
    // Smart tokenization: split camelCase/PascalCase BEFORE normalizing
    const splitCamelCase = (str: string): string[] => {
        // Insert space before uppercase letters and split by non-alphanumeric
        return str
            .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase -> camel Case
            .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2') // ABc -> A Bc
            .split(/[\s_\-]+/) // Split by space, underscore, dash
            .filter(Boolean)
            .map(token => normalizeText(token)); // Normalize AFTER splitting
    };

    // Split ORIGINAL elementName (preserves case) then normalize
    const nameTokens = splitCamelCase(elementName).filter(token => token.length > 1);
    const contextTokens = splitCamelCase(context).filter(token => token.length > 1);

    // Filter out common words that don't help matching
    const commonWords = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'campo', 'boton', 'button', 'input']);
    const meaningfulTokens = [...nameTokens, ...contextTokens].filter(t => !commonWords.has(t));

    // Spanish to English translation for common terms
    const translations: Record<string, string[]> = {
        'busqueda': ['search'],
        'buscar': ['search'],
        'carrito': ['cart'],
        'comprar': ['buy', 'purchase'],
        'precio': ['price'],
        'oferta': ['offer', 'deal'],
        'descuento': ['discount'],
        'agregar': ['add'],
        'eliminar': ['remove', 'delete'],
        'usuario': ['user'],
        'contrasena': ['password'],
        'iniciar': ['login', 'start'],
        'cerrar': ['close', 'logout']
    };

    // Expand tokens with translations
    const expandedTokens: string[] = [];
    for (const token of meaningfulTokens) {
        expandedTokens.push(token);
        if (translations[token]) {
            expandedTokens.push(...translations[token]);
        }
    }

    const searchTokens = Array.from(new Set(expandedTokens));

    console.log(`[matchElements] Element: "${elementName}", Tokens: [${searchTokens.join(', ')}]`);

    const typeCandidates: ElementType[] = elementType
        ? [elementType, 'generic']
        : ['button', 'input', 'link', 'dropdown', 'checkbox', 'generic'];

    const candidates: Array<{ score: number; selector: string }> = [];

    for (const candidateType of typeCandidates) {
        const elements = analysis.elementsByType[candidateType];
        if (!elements) continue;

        for (const element of elements) {
            let score = 0;
            const elementText = normalizeText(element.text);
            const placeholder = normalizeText(element.placeholder);
            const aria = normalizeText(element.ariaLabel);
            const nameAttr = normalizeText(element.name);
            const idAttr = normalizeText(element.id);
            const titleAttr = normalizeText(element.title);
            const labelText = (element.labelText || []).map(label => normalizeText(label));
            const classesText = element.classes.map(cls => normalizeText(cls));

            for (const token of searchTokens) {
                if (!token || token.length < 2) continue;
                if (elementText.includes(token)) score += 3;
                if (placeholder.includes(token)) score += 3;
                if (aria.includes(token)) score += 2;
                if (nameAttr.includes(token)) score += 1.5;
                if (idAttr.includes(token)) score += 1.5;
                if (titleAttr.includes(token)) score += 1;
                if (labelText.some(label => label.includes(token))) score += 2;
                if (classesText.some(cls => cls.includes(token))) score += 0.5;
            }

            // HEAVY boost for correct element type
            if (elementType === 'button' && (element.tag === 'button' || element.typeAttr === 'submit' || element.typeAttr === 'button')) {
                score += 10; // Major boost for actual buttons
            } else if (elementType === 'input' && (element.tag === 'input' || element.tag === 'textarea')) {
                score += 10; // Major boost for actual inputs
            } else if (elementType === 'link' && element.tag === 'a') {
                score += 5;
            }

            // Penalize generic containers if we are looking for specific interactive elements
            if ((elementType === 'button' || elementType === 'input') && candidateType === 'generic') {
                score -= 5;
            }

            // Bonus for ID exact match (if token matches exactly part of ID)
            if (searchTokens.some(t => idAttr === t || idAttr === t.replace(/-/g, '_'))) {
                score += 5;
            }

            if (score <= 0) continue;

            const selector = buildSelectorFromElement(element);
            if (selector) {
                candidates.push({ score, selector });
            }

            // Generate XPath based on text for buttons/links/labels
            if (element.text && element.text.length < 50) {
                const isClickable = element.tag === 'button' || element.tag === 'a' || element.tag === 'label' || element.classes.some(c => c.includes('btn') || c.includes('button'));
                if (isClickable || score > 3) { // Only if relevant match
                    const xpath = buildTextXPath(element.text);
                    candidates.push({ score: score - 0.2, selector: `xpath=${xpath}` });
                }
            }

            // Generate alternative strategies for the SAME element
            if (element.name && selector !== `${element.tag}[name="${escapeAttributeValue(element.name)}"]`) {
                candidates.push({ score: score - 1, selector: `${element.tag}[name="${escapeAttributeValue(element.name)}"]` });
            }
            if (element.name && score > 3) { // High relevance match
                candidates.push({ score: score - 1.5, selector: `${element.tag}[name*="${escapeAttributeValue(element.name)}"]` });
            }
            if (element.id && score > 3) {
                candidates.push({ score: score - 1.5, selector: `${element.tag}[id*="${escapeAttributeValue(element.id)}"]` });
            }
            if (element.placeholder && (!selector || !selector.includes('placeholder'))) {
                candidates.push({ score: score - 2, selector: `${element.tag}[placeholder*="${escapeAttributeValue(element.placeholder)}"]` });
            }
        }
    }

    if (candidates.length === 0) {
        console.log(`[matchElements] ❌ No candidates found`);
        return null;
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    console.log(`[matchElements] ✓ Found ${candidates.length} candidates. Top: "${candidates[0].selector}" (score: ${candidates[0].score})`);

    // Deduplicate selectors
    const uniqueSelectors = Array.from(new Set(candidates.map(c => c.selector)));

    return {
        best: uniqueSelectors[0],
        alternatives: uniqueSelectors.slice(1, 10)
    };
};

// Real selectors for common e-commerce elements (MercadoLibre específico)
const getEcommerceSelector = (elementName: string, context: string, pageUrl?: string): string | null => {
    const lower = elementName.toLowerCase();
    const domain = pageUrl ? new URL(pageUrl).hostname : '';
    const contextLower = `${context.toLowerCase()} ${domain.toLowerCase()}`;

    // MercadoLibre specific selectors
    if (contextLower.includes('mercadolibre') || contextLower.includes('mercado libre')) {
        // Campo de búsqueda
        if (lower.includes('búsqueda') || lower.includes('busqueda') || lower.includes('search')) {
            return 'input.nav-search-input, input[name="as_word"], #cb1-edit';
        }

        // Botón búsqueda
        if (lower.includes('buscar') && (lower.includes('botón') || lower.includes('boton'))) {
            return 'button.nav-search-btn, button[type="submit"].nav-icon-search';
        }

        // Acceso a Ofertas
        if (lower.includes('oferta')) {
            return 'a[href*="ofertas"], a[href*="deals"], a.nav-menu-item-link[href*="ofertas"]';
        }

        // Filtros
        if (lower.includes('precio') && lower.includes('filtro')) {
            return '.ui-search-filter-dl-price input';
        }

        if (lower.includes('categoría') || lower.includes('categoria')) {
            return '.ui-search-filter-dl-category a';
        }

        // Productos
        if (lower.includes('producto') || lower.includes('resultado')) {
            return '.ui-search-layout__item, .ui-search-result__content';
        }

        // Precio
        if (lower.includes('precio')) {
            return '.price-tag-fraction, .price-tag-amount';
        }

        if (lower.includes('descuento')) {
            return '.price-tag-percentage, .andes-money-amount__discount';
        }

        if (lower.includes('oferta')) {
            return 'a[href*="oferta"], [class*="offer"], [class*="oferta"]';
        }

        // Carrito
        if (lower.includes('carrito')) {
            return '.nav-cart-icon, a[href*="cart"]';
        }

        // Agregar al carrito
        if (lower.includes('comprar') || lower.includes('agregar')) {
            return 'button.ui-pdp-actions__buy-btn, button[id="buyButton"]';
        }
    }

    // Generic e-commerce selectors
    if (lower.includes('búsqueda') || lower.includes('busqueda') || lower.includes('search')) {
        return 'input[type="search"], input[name*="search"], input[placeholder*="buscar"]';
    }

    if (lower.includes('botón') || lower.includes('boton')) {
        if (lower.includes('buscar')) return 'button[type="submit"]';
        if (lower.includes('comprar')) return 'button[class*="buy"], button[class*="add-cart"]';
        return 'button';
    }

    if (lower.includes('precio')) {
        return '[class*="price"], span[class*="amount"]';
    }

    if (lower.includes('oferta')) {
        return 'a[href*="oferta"], [class*="offer"], [class*="oferta"]';
    }

    if (lower.includes('descuento')) {
        return '[class*="discount"], .price-tag-percentage';
    }

    return null;
};

import { selectorRegistry } from './selector-registry.service';

export const generateSelector = async (
    elementName: string,
    context: string,
    options?: { pageUrl?: string; elementType?: ElementType; excludeSelectors?: string[] }
): Promise<SelectorStrategies> => {

    const fallback: SelectorStrategies = {
        best: `body`,
        alternatives: []
    };

    let strategies: SelectorStrategies = { best: '', alternatives: [] };
    let strategiesFound = false;

    // -1. Check Registry for verified selectors (Phase 3)
    const verified = await selectorRegistry.getSelector(elementName);
    if (verified) {
        const verifiedSelector = verified.type === 'xpath' ? `xpath=${verified.selector}` : verified.selector;

        // CRITICAL: Check if verified selector is in the exclusion list
        const normalize = (s: string) => s.replace(/['"]/g, '').replace(/\s+/g, '').toLowerCase();
        const isVerifiedExcluded = options?.excludeSelectors && options.excludeSelectors.length > 0
            && options.excludeSelectors.some(ex => normalize(ex) === normalize(verifiedSelector));

        if (isVerifiedExcluded) {
            console.log(`[Selector] ⚠️ Verified selector "${verifiedSelector}" is EXCLUDED (failed previously). Skipping verified selector.`);
            // Don't use the verified selector - let it fall through to page analysis
        } else {
            console.log(`[Selector] Using VERIFIED selector for "${elementName}": ${verified.selector}`);
            strategies = {
                best: verifiedSelector,
                alternatives: []
            };
            strategiesFound = true;
        }
    }

    // 0. Try to analyze the real page if URL is available (PRIORITY)
    if (options?.pageUrl) {
        try {
            console.log(`[Selector] Analyzing page for "${elementName}"...`);
            const analysis = await analyzePage(options.pageUrl);
            if (analysis) {
                const results = matchElementsByRelevance(elementName, context, options.elementType, analysis);
                if (results) {
                    console.log(`[Selector] ✓ Found from page analysis: ${results.best}`);

                    // Filter excluded selectors from analysis results
                    if (options?.excludeSelectors && options.excludeSelectors.length > 0) {
                        const normalize = (s: string) => s.replace(/['"]/g, '').replace(/\s+/g, '').toLowerCase();
                        const excludedSet = new Set(options.excludeSelectors.map(normalize));

                        const isExcluded = (s: string) => excludedSet.has(normalize(s));

                        if (isExcluded(results.best)) {
                            console.log(`[Selector] ⚠️ Best result "${results.best}" is excluded. Demoting.`);
                            // Demote best if excluded
                            if (results.alternatives.length > 0) {
                                // Find first non-excluded alternative
                                const nextBest = results.alternatives.find(a => !isExcluded(a));
                                if (nextBest) {
                                    console.log(`[Selector] ✓ Using alternative: ${nextBest}`);
                                    results.best = nextBest;
                                    results.alternatives = results.alternatives.filter(a => a !== nextBest);
                                } else {
                                    console.log('[Selector] ⚠️ All alternatives also excluded.');
                                    // Only bad options left.
                                }
                            } else {
                                console.log('[Selector] ⚠️ Best analysis result excluded and no alternatives.');
                            }
                        }
                        results.alternatives = results.alternatives.filter(a => !isExcluded(a));
                    }

                    // Start with analyzed results
                    strategies = results;

                    // If we had a verified selector (not excluded), prioritize it over analysis
                    // Note: Exclusion check already happened earlier, so if strategiesFound is true,
                    // the verified selector is safe to use
                    if (strategiesFound && verified) {
                        console.log(`[Selector] Prioritizing verified selector over analysis`);
                        const verifiedSelector = verified.type === 'xpath' ? `xpath=${verified.selector}` : verified.selector;
                        const newAlternatives = results.best ? [results.best, ...results.alternatives] : results.alternatives;
                        strategies = {
                            best: verifiedSelector,
                            alternatives: newAlternatives.filter(s => s !== verifiedSelector)
                        };
                    }

                    console.log(`[Selector] ✓ Returning analyzed selector: ${strategies.best}`);
                    return strategies; // CRITICAL: Return immediately, don't fall through to templates
                } else {
                    console.log(`[Selector] No matching elements found in page analysis`);
                }
            } else {
                console.log(`[Selector] Page analysis returned null`);
            }
        } catch (error) {
            console.error('[Selector] Error getting selector from real page:', error);
        }
    }

    // If we got a verified selector, return it now before falling to templates
    if (strategiesFound) {
        console.log(`[Selector] ✓ Returning verified selector: ${strategies.best}`);
        return strategies;
    }

    // 1. Heuristics based on element name and context text
    const lowerName = elementName.toLowerCase();
    const lowerContext = (context || '').toLowerCase();

    if (lowerName.includes('id')) {
        return {
            best: `#${elementName.replace(/id/gi, '').trim()}`,
            alternatives: []
        };
    }

    if (lowerName.includes('nombre') || lowerName.includes('name')) {
        return {
            best: `input[name="${toCssClass(elementName)}"]`,
            alternatives: []
        };
    }

    if (lowerName.includes('email') || lowerName.includes('correo')) {
        return {
            best: 'input[type="email"]',
            alternatives: ['input[name*="email"]']
        };
    }

    if (lowerName.includes('password') || lowerName.includes('contraseña')) {
        return {
            best: 'input[type="password"]',
            alternatives: []
        };
    }

    // 2. Text-based selectors
    const quotedTextMatch = context.match(/['"“”‘’]([^'"“”‘’]+)['"“”‘’]/);
    if (quotedTextMatch) {
        const literalText = normalizeWhitespace(quotedTextMatch[1]);
        if (literalText) {
            const isInputAction = lowerContext.includes('ingresar') ||
                lowerContext.includes('escribir') ||
                lowerContext.includes('buscar') ||
                lowerContext.includes('search') ||
                lowerContext.includes('type') ||
                lowerContext.includes('fill');

            const isInputElement = lowerName.includes('campo') ||
                lowerName.includes('input') ||
                lowerName.includes('búsqueda') ||
                lowerName.includes('busqueda') ||
                lowerName.includes('search');

            if (!isInputAction && !isInputElement) {
                const escapedLiteral = escapeForSelectorText(literalText);
                const explicitRole = options?.elementType === 'button' ? 'button' : options?.elementType === 'link' ? 'link' : undefined;
                if (explicitRole) {
                    return {
                        best: `//${explicitRole}[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${escapedLiteral.toLowerCase()}')]`,
                        alternatives: [buildTextXPath(literalText)]
                    };
                }
                if (lowerContext.includes('click') || lowerContext.includes('verificar')) {
                    return {
                        best: buildTextXPath(literalText),
                        alternatives: []
                    };
                }
            }
        }
    }

    const clickIntent = lowerContext.includes('click') || lowerContext.includes('clic') || lowerContext.includes('seleccionar') || lowerContext.includes('presionar') || lowerContext.includes('ingresar');
    if (clickIntent && elementName) {
        const trimmedText = normalizeWhitespace(elementName);
        if (trimmedText) {
            const escaped = escapeForSelectorText(trimmedText);
            const explicitRole = options?.elementType === 'button' ? 'button' : options?.elementType === 'link' ? 'link' : undefined;
            if (explicitRole) {
                return {
                    best: `//${explicitRole}[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${escaped.toLowerCase()}')]`,
                    alternatives: [buildTextXPath(trimmedText)]
                };
            }
            return {
                best: buildTextXPath(trimmedText),
                alternatives: []
            };
        }
    }

    // 3. Templates (generic fallback)
    const templateSelector = findTemplateSelector(elementName);
    if (templateSelector) {
        console.log(`[Selector] Using TEMPLATE selector for "${elementName}": ${templateSelector.css || templateSelector.xpath}`);
        return {
            best: templateSelector.css || templateSelector.xpath || '',
            alternatives: []
        };
    }

    // 4. E-commerce
    const ecommerceSelector = getEcommerceSelector(elementName, context, options?.pageUrl);
    if (ecommerceSelector) {
        return {
            best: ecommerceSelector,
            alternatives: []
        };
    }

    // 5. AI Generation
    const aiSelector = await generateAISelectorWithRetry(elementName, context, options?.pageUrl);
    if (aiSelector) {
        return {
            best: aiSelector.css || aiSelector.xpath || '',
            alternatives: []
        };
    }

    // 6. Fallback Heuristics
    if (lowerName.includes('campo') || lowerName.includes('input')) {
        return {
            best: `input[placeholder*="${elementName}"]`,
            alternatives: [`input[name*="${toCssClass(elementName)}"]`]
        };
    }

    if (lowerName.includes('botón') || lowerName.includes('boton') || lowerName.includes('button')) {
        return {
            best: `button:has-text("${elementName}")`,
            alternatives: [`//button[contains(normalize-space(.), "${elementName}")]`]
        };
    }

    // Final fallback
    const textTarget = elementName || context;
    if (textTarget) {
        return {
            best: buildTextXPath(textTarget),
            alternatives: []
        };
    }

    return fallback;
};

// AI generation with retry and validation
const generateAISelectorWithRetry = async (
    elementName: string,
    context: string,
    pageUrl?: string
): Promise<{ css?: string; xpath?: string } | null> => {
    const strategies = [
        { type: 'css' as const, maxAttempts: 2 },
        { type: 'xpath' as const, maxAttempts: 1 }
    ];

    for (const strategy of strategies) {
        for (let attempt = 1; attempt <= strategy.maxAttempts; attempt++) {
            console.log(`[AI Selector] Attempt ${attempt}/${strategy.maxAttempts} for ${elementName} (${strategy.type})`);

            const result = await generateAISelector(elementName, context, pageUrl, strategy.type);
            if (result) {
                const validation = validateSelector(
                    result.css || result.xpath!,
                    result.css ? 'css' : 'xpath'
                );

                console.log(`[AI Selector] Score: ${validation.score}, Issues: ${validation.issues.join(', ')}`);

                // Accept if score is good enough
                if (validation.score >= 5) {
                    return result;
                }
            }
        }
    }

    return null;
};

// Improved AI prompt
const generateAISelector = async (
    elementName: string,
    context: string,
    pageUrl: string | undefined,
    preferredType: 'css' | 'xpath'
): Promise<{ css?: string; xpath?: string } | null> => {
    const siteContext = pageUrl ? `on ${pageUrl}` : 'for an e-commerce website';

    const prompt = preferredType === 'css'
        ? `Generate a robust CSS selector ${siteContext} for: "${elementName}" in context: "${context}".

REQUIREMENTS:
1. Prioritize stable attributes in this order:
   - id (best)
   - data-testid / data-test
   - name
   - aria-label
   - placeholder
   - class (avoid generated/hash-like classes)

2. Use semantic HTML tags when possible (button, input, a)
3. Avoid positional selectors (:nth-child)
4. Avoid long class chains
5. Make it Selenium-compatible

EXAMPLES:
- Search input: input[placeholder*="search" i]
- Search button: button[type="submit"]
- Login button: button[aria-label="Login"]
- Product title: a[class*="product-title"]

Return ONLY the CSS selector, no explanation.
Your selector:`
        : `Generate a robust XPath ${siteContext} for: "${elementName}" in context: "${context}".

REQUIREMENTS:
1. Prioritize stable attributes:
   - @id
   - @data-testid
   - @name
   - @aria-label
   - contains(text(), "...")

2. Use case-insensitive text matching when possible
3. Keep XPath concise and readable
4. Make it Selenium-compatible

EXAMPLES:
- Search button: //button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'buscar')]
- Input by placeholder: //input[contains(@placeholder, 'Email')]
- Button by aria-label: //button[@aria-label='Submit']

Return ONLY the XPath, no explanation.
Your XPath:`;

    try {
        const aiResponse = await completeText(prompt);
        const cleanedResponse = aiResponse.trim()
            .replace(/```.*?```/gs, '')
            .replace(/^[`'"]+|[`'"]+$/g, '')
            .trim();

        // Extract selector
        const selectorMatch = cleanedResponse.match(/([.#/][\w\-\[\]="':*@()\/\s]+)/);
        if (selectorMatch && selectorMatch[1]) {
            const candidate = selectorMatch[1].trim();
            if (isLikelyValidSelector(candidate)) {
                if (candidate.startsWith('//') || candidate.startsWith('/')) {
                    return { xpath: candidate };
                }
                return { css: candidate };
            }
        }
    } catch (e) {
        console.error('Error generating selector via AI', e);
    }

    return null;
};

// Helper to convert text to CSS class format
const toCssClass = (text: string): string => {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
};
