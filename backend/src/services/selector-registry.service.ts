
import fs from 'fs';
import path from 'path';

export interface VerifiedSelector {
    elementName: string;
    selector: string; // The working selector (CSS or XPath)
    type: 'css' | 'xpath';
    context: string; // The text/context used to find it (for matching)
    url?: string;    // Page URL where it was verified
    verifiedAt: number;
}

const REGISTRY_PATH = path.join(__dirname, '../../verified_selectors.json');

class SelectorRegistryService {
    private cache: Map<string, VerifiedSelector> = new Map();
    private loaded = false;

    private load() {
        if (this.loaded) return;
        try {
            if (fs.existsSync(REGISTRY_PATH)) {
                const data = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
                if (Array.isArray(data)) {
                    data.forEach((item: VerifiedSelector) => {
                        this.cache.set(this.getKey(item.elementName, item.context), item);
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load selector registry', error);
        }
        this.loaded = true;
    }

    private save() {
        try {
            const data = Array.from(this.cache.values());
            fs.writeFileSync(REGISTRY_PATH, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Failed to save selector registry', error);
        }
    }

    private getKey(elementName: string, context?: string): string {
        // Normalize key to ensure hits
        const normName = elementName.toLowerCase().trim();
        // Context might be too variable, maybe just use name for now?
        // Or composite key if context is provided.
        // For now, let's use a simple key based on name. 
        // If we have collisions (e.g. "submit" button on two different pages), we might need URL.
        // Let's stick to name + simplistic context if available.
        return normName;
    }

    public getSelector(elementName: string): VerifiedSelector | undefined {
        this.load();
        return this.cache.get(this.getKey(elementName));
    }

    public saveSelector(elementName: string, selector: string, type: 'css' | 'xpath', context: string, url?: string) {
        this.load();
        const entry: VerifiedSelector = {
            elementName,
            selector,
            type,
            context,
            url,
            verifiedAt: Date.now()
        };
        this.cache.set(this.getKey(elementName, context), entry);
        this.save();
        console.log(`[Registry] Saved verified selector for "${elementName}": ${selector}`);
    }
}

export const selectorRegistry = new SelectorRegistryService();
