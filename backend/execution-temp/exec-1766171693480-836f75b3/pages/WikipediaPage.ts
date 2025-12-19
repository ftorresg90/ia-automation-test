import { type Locator, type Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { BasePage } from './BasePage';

export class WikipediaPage extends BasePage {
    readonly campoDeBusquedaSelectors: string[] = ['input[name*="search" i]', '#searchInput', 'input[name="search"]', 'input[name*="search"]', 'input[id*="searchInput"]', 'input[name="family"]', 'input[name="go"]', 'input[name="amount"]', 'input[name="monthly"]', 'input[name*="family"]', 'input[name*="go"]'];
    readonly campoDeBusqueda: Locator;
    readonly botonDeBusquedaSelectors: string[] = ['button.pure-button.pure-button-primary-progressive', 'xpath=//*[contains(translate(normalize-space(.), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), \'search\')]', 'button.button-center.button-collapse.overlay-banner-toggle', 'xpath=//*[contains(translate(normalize-space(.), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), \'collapse\')]', '#js-lang-list-button', 'button[aria-label="minimize"]', 'button.frb-iad-dialog-close.frb-dialog-back.skin-invert', 'button.frb-dialog-action', 'button.frb-iad-dialog-close', 'xpath=//*[contains(translate(normalize-space(.), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), \'read\')]'];
    readonly botonDeBusqueda: Locator;

    constructor(page: Page) {
        super(page);
        this.campoDeBusqueda = this.page.locator(this.campoDeBusquedaSelectors[0]);
        this.botonDeBusqueda = this.page.locator(this.botonDeBusquedaSelectors[0]);
    }


    async goto() {
        await this.page.goto('https://www.wikipedia.org');
        await this.page.waitForLoadState('domcontentloaded');
    }

    async searchCampoDeBusqueda(value: string) {
        await this.smartFill(this.campoDeBusquedaSelectors, value);
        await this.page.keyboard.press('Enter');
    }

    async clickBotonDeBusqueda() {
        await this.smartClick(this.botonDeBusquedaSelectors);
    }
}