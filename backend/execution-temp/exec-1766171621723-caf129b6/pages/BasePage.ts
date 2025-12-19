
import { type Locator, type Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export class BasePage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    // --- SMART AUTO-HEALING METHODS ---

    protected async saveDomSnapshot(name: string) {
        try {
            const snapshot = await this.page.evaluate(() => {
                const serialize = (el: Element, extraType?: string) => {
                    const htmlEl = el as HTMLElement;
                    return {
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
                        typeAttr: extraType === 'checkbox' ? 'checkbox' : extraType === 'dropdown' ? 'dropdown' : htmlEl.getAttribute('type'),
                        labelText: 'labels' in htmlEl && (htmlEl as HTMLInputElement).labels
                            ? Array.from((htmlEl as HTMLInputElement).labels || []).map(label => (label.textContent || '').trim()).filter(Boolean)
                            : []
                    };
                };

                const unique = <T>(list: T[]) => list;

                return {
                    inputs: unique(Array.from(document.querySelectorAll('input, textarea')).slice(0, 200).map(el => serialize(el))),
                    buttons: unique(Array.from(document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]')).slice(0, 200).map(el => serialize(el))),
                    links: unique(Array.from(document.querySelectorAll('a')).slice(0, 200).map(el => serialize(el))),
                    dropdowns: unique(Array.from(document.querySelectorAll('select')).slice(0, 100).map(el => serialize(el, 'dropdown'))),
                    checkboxes: unique(Array.from(document.querySelectorAll('input[type="checkbox"]')).slice(0, 100).map(el => serialize(el, 'checkbox'))),
                    generic: unique(Array.from(document.querySelectorAll('[data-testid], [aria-label], [placeholder], h1, h2, h3, h4, h5, h6, p, span, div')).slice(0, 200).map(el => serialize(el)))
                };
            });

            // Write to a specific known file that execution service can pick up.
            // Artifacts are in ../artifacts relative to pages directory
            const artifactPath = path.join(__dirname, '../artifacts', name);
            // Ensure directory exists
            if (!fs.existsSync(path.dirname(artifactPath))) {
                fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
            }

            fs.writeFileSync(artifactPath, JSON.stringify({
                url: this.page.url(),
                capturedAt: Date.now(),
                elementsByType: {
                    input: snapshot.inputs,
                    button: snapshot.buttons,
                    link: snapshot.links,
                    dropdown: snapshot.dropdowns,
                    checkbox: snapshot.checkboxes,
                    generic: snapshot.generic,
                    text: snapshot.generic
                }
            }, null, 2));

            console.log(`[Auto-Heal] DOM snapshot saved to ${name}`);
        } catch (e) {
            console.error('[Auto-Heal] Failed to save DOM snapshot', e);
        }
    }

    protected async smartClick(selectors: string[]) {
        for (let i = 0; i < selectors.length; i++) {
            const selector = selectors[i];
            try {
                // First selector gets standard stable execution time (5s), backups fail fast (2s)
                const timeout = i === 0 ? 5000 : 2000;
                await this.page.locator(selector).first().click({ timeout });
                return; // Success
            } catch (e) {
                console.log(`[Auto-Heal] Click failed on ${selector}. Trying backup...`);
            }
        }
        await this.saveDomSnapshot('failure-dom.json');
        throw new Error(`Failed to click element. Tried ${selectors.length} strategies.`);
    }

    protected async smartFill(selectors: string[], value: string) {
        for (const selector of selectors) {
            try {
                const timeout = 2000;
                await this.page.locator(selector).first().fill(value, { timeout });
                return;
            } catch (e) {
                console.log(`[Auto-Heal] Fill failed on ${selector}. Trying backup...`);
            }
        }
        await this.saveDomSnapshot('failure-dom.json');
        throw new Error(`Failed to fill element. Tried ${selectors.length} strategies.`);
    }

    protected async smartVerify(selectors: string[], expectedText: string) {
        // 1. Try structural selectors first (more specific)
        for (const selector of selectors) {
            try {
                await expect(this.page.locator(selector).first()).toContainText(expectedText, { timeout: 2000 });
                return;
            } catch (e) {
                console.log(`[Auto-Heal] Verify failed on ${selector}.`);
            }
        }

        // 2. Fallback: Search by text content directly (User Request)
        // This satisfies "using the text as a parameter for the selector"
        try {
            console.log(`[Auto-Heal] Trying to find text "${expectedText}" directly on page...`);
            await expect(this.page.getByText(expectedText).first()).toBeVisible({ timeout: 2000 });
            console.log(`[Auto-Heal] ✅ Found text "${expectedText}" using text-based locator.`);
            return;
        } catch (e) {
            console.log(`[Auto-Heal] Text-based search failed.`);
        }

        await this.saveDomSnapshot('failure-dom.json');
        throw new Error(`Failed to verify text "${expectedText}". Tried ${selectors.length} strategies + text search.`);
    }

    protected async smartCheck(selectors: string[], checked: boolean = true) {
        for (const selector of selectors) {
            try {
                const timeout = 2000;
                await this.page.locator(selector).first().setChecked(checked, { timeout });
                return;
            } catch (e) {
                console.log(`[Auto-Heal] Check failed on ${selector}.`);
            }
        }
        await this.saveDomSnapshot('failure-dom.json');
        throw new Error(`Failed to check element. Tried ${selectors.length} strategies.`);
    }

    protected async smartSelectOption(selectors: string[], value: string) {
        for (const selector of selectors) {
            try {
                const timeout = 2000;
                await this.page.locator(selector).first().selectOption(value, { timeout });
                return;
            } catch (e) {
                console.log(`[Auto-Heal] SelectOption failed on ${selector}.`);
            }
        }
        await this.saveDomSnapshot('failure-dom.json');
        throw new Error(`Failed to select option "${value}". Tried ${selectors.length} strategies.`);
    }
}
