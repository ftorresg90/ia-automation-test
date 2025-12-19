import prisma from '../utils/prisma';

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

interface DomCacheEntry {
    url: string;
    domain: string;
    firstCapturedAt: number;
    lastUpdatedAt: number;
    analysisCount: number;
    elementsByType: Record<string, PageElement[]>;
    metadata: {
        totalElements: number;
        pageTitle?: string;
        lastUrl: string;
    };
}

const TTL_DAYS = 30; // Cache válido por 30 días

class DomCacheService {
    constructor() {
        console.log('[DOM Cache] Using database storage');
    }

    private getElementKey(element: PageElement): string {
        // Generar clave única para identificar elementos
        if (element.id) return `id:${element.id}`;
        if (element.dataTestId) return `testid:${element.dataTestId}`;

        // Para elementos sin id/testid, usar combinación de atributos
        const textSnippet = (element.text || '').slice(0, 50).trim();
        return `${element.tag}:${element.name || ''}:${element.placeholder || ''}:${textSnippet}`;
    }

    public async load(domain: string): Promise<DomCacheEntry | null> {
        try {
            const entry = await prisma.domCache.findUnique({
                where: { domain }
            });

            if (!entry) {
                console.log(`[DOM Cache] No cache found in DB for ${domain}`);
                return null;
            }

            const data = entry.data as unknown as DomCacheEntry;
            const lastUpdated = entry.lastUpdatedAt.getTime();

            // Verificar TTL
            const age = Date.now() - lastUpdated;
            const maxAge = TTL_DAYS * 24 * 60 * 60 * 1000;

            if (age > maxAge) {
                const daysOld = Math.floor(age / (24 * 60 * 60 * 1000));
                console.log(`[DOM Cache] Cache expired for ${domain} (${daysOld} days old, max ${TTL_DAYS} days)`);
                return null;
            }

            console.log(`[DOM Cache] ✓ Loaded cache from DB for ${domain} (${data.metadata.totalElements} elements)`);
            return data;
        } catch (error) {
            console.error(`[DOM Cache] Error loading cache for ${domain}:`, error);
            return null;
        }
    }

    public async save(domain: string, url: string, newElements: Record<string, PageElement[]>): Promise<void> {
        try {
            const existing = await this.load(domain);
            const now = Date.now();

            let merged: DomCacheEntry;

            if (existing) {
                console.log(`[DOM Cache] Merging new elements into existing cache for ${domain}`);

                merged = {
                    ...existing,
                    lastUpdatedAt: now,
                    analysisCount: existing.analysisCount + 1,
                    metadata: {
                        ...existing.metadata,
                        lastUrl: url
                    }
                };

                // Merge elementos por tipo
                for (const [type, newEls] of Object.entries(newElements)) {
                    const existingEls = existing.elementsByType[type] || [];
                    merged.elementsByType[type] = this.mergeElements(existingEls, newEls);
                }

                merged.metadata.totalElements = Object.values(merged.elementsByType)
                    .reduce((sum, els) => sum + els.length, 0);

            } else {
                console.log(`[DOM Cache] Creating new cache for ${domain}`);
                const totalElements = Object.values(newElements).reduce((sum, els) => sum + els.length, 0);

                merged = {
                    url,
                    domain,
                    firstCapturedAt: now,
                    lastUpdatedAt: now,
                    analysisCount: 1,
                    elementsByType: newElements,
                    metadata: {
                        totalElements,
                        lastUrl: url
                    }
                };
            }

            // Guardar a DB
            await prisma.domCache.upsert({
                where: { domain },
                update: {
                    url,
                    data: merged as any,
                    lastUpdatedAt: new Date()
                },
                create: {
                    domain,
                    url,
                    data: merged as any,
                    lastUpdatedAt: new Date()
                }
            });

            console.log(`[DOM Cache] ✓ Cache saved to DB for ${domain}`);
        } catch (error) {
            console.error(`[DOM Cache] Error saving cache for ${domain}:`, error);
        }
    }

    private mergeElements(existing: PageElement[], newElements: PageElement[]): PageElement[] {
        const elementMap = new Map<string, PageElement>();
        existing.forEach(el => elementMap.set(this.getElementKey(el), el));
        newElements.forEach(el => elementMap.set(this.getElementKey(el), el));
        return Array.from(elementMap.values());
    }

    public async clear(domain?: string): Promise<void> {
        try {
            if (domain) {
                await prisma.domCache.deleteMany({ where: { domain } });
                console.log(`[DOM Cache] ✓ Cleared cache for ${domain}`);
            } else {
                await prisma.domCache.deleteMany({});
                console.log(`[DOM Cache] ✓ Cleared all caches`);
            }
        } catch (error) {
            console.error(`[DOM Cache] Error clearing cache:`, error);
        }
    }

    public async listCaches(): Promise<Array<{ domain: string; elements: number; analyses: number; lastUpdated: Date }>> {
        try {
            const caches = await prisma.domCache.findMany();
            return caches.map(c => {
                const data = c.data as unknown as DomCacheEntry;
                return {
                    domain: c.domain,
                    elements: data.metadata.totalElements,
                    analyses: data.analysisCount,
                    lastUpdated: c.lastUpdatedAt
                };
            });
        } catch (error) {
            console.error(`[DOM Cache] Error listing caches:`, error);
            return [];
        }
    }
}

export const domCache = new DomCacheService();
