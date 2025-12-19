import prisma from '../utils/prisma';

export interface VerifiedSelector {
    elementName: string;
    selector: string; // The working selector (CSS or XPath)
    type: 'css' | 'xpath';
    context: string; // The text/context used to find it (for matching)
    url?: string;    // Page URL where it was verified
    verifiedAt: number;
}

class SelectorRegistryService {
    private cache: Map<string, VerifiedSelector> = new Map();
    private loaded = false;

    private async load() {
        if (this.loaded) return;
        try {
            const selectors = await prisma.verifiedSelector.findMany();
            selectors.forEach(item => {
                this.cache.set(this.getKey(item.elementName), {
                    elementName: item.elementName,
                    selector: item.selector,
                    type: item.type as 'css' | 'xpath',
                    context: item.context,
                    url: item.url || undefined,
                    verifiedAt: item.verifiedAt.getTime()
                });
            });
            console.log(`[Registry] Loaded ${selectors.length} selectors from DB`);
        } catch (error) {
            console.error('Failed to load selector registry from DB', error);
        }
        this.loaded = true;
    }

    private getKey(elementName: string): string {
        return elementName.toLowerCase().trim();
    }

    public async getSelector(elementName: string): Promise<VerifiedSelector | undefined> {
        await this.load();
        return this.cache.get(this.getKey(elementName));
    }

    public async saveSelector(elementName: string, selector: string, type: 'css' | 'xpath', context: string, url?: string) {
        await this.load();
        const entry: VerifiedSelector = {
            elementName,
            selector,
            type,
            context,
            url,
            verifiedAt: Date.now()
        };

        const key = this.getKey(elementName);
        this.cache.set(key, entry);

        try {
            await prisma.verifiedSelector.upsert({
                where: { elementName },
                update: {
                    selector,
                    type,
                    context,
                    url,
                    verifiedAt: new Date()
                },
                create: {
                    elementName,
                    selector,
                    type,
                    context,
                    url,
                    verifiedAt: new Date()
                }
            });
            console.log(`[Registry] Saved-to-DB verified selector for "${elementName}": ${selector}`);
        } catch (error) {
            console.error('Failed to save selector to DB', error);
        }
    }
}

export const selectorRegistry = new SelectorRegistryService();
