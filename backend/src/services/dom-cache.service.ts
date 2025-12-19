
import fs from 'fs';
import path from 'path';

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

const CACHE_DIR = path.join(__dirname, '../../dom-cache');
const TTL_DAYS = 30; // Cache válido por 30 días

class DomCacheService {
    constructor() {
        // Crear directorio si no existe
        if (!fs.existsSync(CACHE_DIR)) {
            fs.mkdirSync(CACHE_DIR, { recursive: true });
            console.log(`[DOM Cache] Created cache directory: ${CACHE_DIR}`);
        }
    }

    private getCacheFilePath(domain: string): string {
        const safeDomain = domain.replace(/[^a-z0-9.-]/gi, '_');
        return path.join(CACHE_DIR, `${safeDomain}.json`);
    }

    private getElementKey(element: PageElement): string {
        // Generar clave única para identificar elementos
        if (element.id) return `id:${element.id}`;
        if (element.dataTestId) return `testid:${element.dataTestId}`;

        // Para elementos sin id/testid, usar combinación de atributos
        const textSnippet = (element.text || '').slice(0, 50).trim();
        const key = `${element.tag}:${element.name || ''}:${element.placeholder || ''}:${textSnippet}`;
        return key;
    }

    public load(domain: string): DomCacheEntry | null {
        const filepath = this.getCacheFilePath(domain);

        if (!fs.existsSync(filepath)) {
            console.log(`[DOM Cache] No cache found for ${domain}`);
            return null;
        }

        try {
            const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

            // Verificar TTL
            const age = Date.now() - data.lastUpdatedAt;
            const maxAge = TTL_DAYS * 24 * 60 * 60 * 1000;

            if (age > maxAge) {
                const daysOld = Math.floor(age / (24 * 60 * 60 * 1000));
                console.log(`[DOM Cache] Cache expired for ${domain} (${daysOld} days old, max ${TTL_DAYS} days)`);
                return null;
            }

            console.log(`[DOM Cache] ✓ Loaded cache for ${domain} (${data.metadata.totalElements} elements, ${data.analysisCount} analyses)`);
            return data;
        } catch (error) {
            console.error(`[DOM Cache] Error loading cache for ${domain}:`, error);
            return null;
        }
    }

    public save(domain: string, url: string, newElements: Record<string, PageElement[]>): void {
        const existing = this.load(domain);
        const now = Date.now();

        let merged: DomCacheEntry;

        if (existing) {
            // MERGE incremental
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
            let newElementsAdded = 0;
            for (const [type, newEls] of Object.entries(newElements)) {
                const existingEls = existing.elementsByType[type] || [];
                const beforeCount = existingEls.length;
                const mergedEls = this.mergeElements(existingEls, newEls);
                merged.elementsByType[type] = mergedEls;

                const addedCount = mergedEls.length - beforeCount;
                if (addedCount > 0) {
                    newElementsAdded += addedCount;
                    console.log(`[DOM Cache]   + ${addedCount} new ${type} elements`);
                }
            }

            // Actualizar total
            const oldTotal = existing.metadata.totalElements;
            merged.metadata.totalElements = Object.values(merged.elementsByType)
                .reduce((sum, els) => sum + els.length, 0);

            console.log(`[DOM Cache] Total elements: ${oldTotal} → ${merged.metadata.totalElements} (+${newElementsAdded})`);

        } else {
            // NUEVO cache
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

            console.log(`[DOM Cache] Saved ${totalElements} elements for ${domain}`);
        }

        // Guardar a disco
        const filepath = this.getCacheFilePath(domain);
        fs.writeFileSync(filepath, JSON.stringify(merged, null, 2));

        console.log(`[DOM Cache] ✓ Cache saved to ${path.basename(filepath)}`);
    }

    private mergeElements(existing: PageElement[], newElements: PageElement[]): PageElement[] {
        const elementMap = new Map<string, PageElement>();

        // Agregar elementos existentes
        existing.forEach(el => {
            elementMap.set(this.getElementKey(el), el);
        });

        // Agregar/actualizar con nuevos elementos
        newElements.forEach(el => {
            const key = this.getElementKey(el);
            // Si ya existe, lo sobrescribe (actualiza)
            // Si no existe, lo agrega
            elementMap.set(key, el);
        });

        return Array.from(elementMap.values());
    }

    public clear(domain?: string): void {
        if (domain) {
            const filepath = this.getCacheFilePath(domain);
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
                console.log(`[DOM Cache] ✓ Cleared cache for ${domain}`);
            } else {
                console.log(`[DOM Cache] No cache found for ${domain}`);
            }
        } else {
            // Limpiar todo
            if (fs.existsSync(CACHE_DIR)) {
                const files = fs.readdirSync(CACHE_DIR);
                files.forEach(file => {
                    fs.unlinkSync(path.join(CACHE_DIR, file));
                });
                console.log(`[DOM Cache] ✓ Cleared all caches (${files.length} files)`);
            }
        }
    }

    public listCaches(): Array<{ domain: string; elements: number; analyses: number; lastUpdated: Date }> {
        if (!fs.existsSync(CACHE_DIR)) {
            return [];
        }

        const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));

        return files.map(file => {
            try {
                const data = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, file), 'utf-8'));
                return {
                    domain: data.domain,
                    elements: data.metadata.totalElements,
                    analyses: data.analysisCount,
                    lastUpdated: new Date(data.lastUpdatedAt)
                };
            } catch {
                return null;
            }
        }).filter(Boolean) as Array<{ domain: string; elements: number; analyses: number; lastUpdated: Date }>;
    }
}

export const domCache = new DomCacheService();
