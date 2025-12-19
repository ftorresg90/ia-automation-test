import { type Locator, type Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { BasePage } from './BasePage';

export class AmazonPage extends BasePage {
    readonly campoDeBusquedaSelectors: string[] = ['input[name*="search" i]', '#twotabsearchtextbox', 'input[name="field-keywords"]', 'input[name*="field-keywords"]', 'input[id*="twotabsearchtextbox"]', 'input[placeholder*="Search Amazon.es"]', '#glowValidationToken', 'input[name="glow-validation-token"]', 'input[name*="glow-validation-token"]', 'input[id*="glowValidationToken"]', '#nav-search-submit-button'];
    readonly campoDeBusqueda: Locator;
    readonly irSelectors: string[] = ['#nav-assist-show-shortcuts', '#nav-search-submit-button', 'button[aria-label="Expand to Change Language or Country"]', 'input.a-button-input', '#sp-cc-accept', '#sp-cc-rejectall-link', 'button[id*="nav-assist-show-shortcuts"]', 'input[name="action"]', 'input[id*="nav-search-submit-button"]', 'input[name*="action"]'];
    readonly ir: Locator;
    readonly textoAppleIphoneSelectors: string[] = ['#a-page', 'div[id*="a-page"]', 'div.nav-search-scope.nav-sprite', '#sp-cc-wrapper', 'div.a-section.a-spacing-none.sp-cc-text', 'a[aria-label="¿Es la primera vez que utilizas Amazon? Empieza aquí creando una cuenta"]', 'xpath=//*[contains(translate(normalize-space(.), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), \'empieza\')]'];
    readonly textoAppleIphone: Locator;

    constructor(page: Page) {
        super(page);
        this.campoDeBusqueda = this.page.locator(this.campoDeBusquedaSelectors[0]);
        this.ir = this.page.locator(this.irSelectors[0]);
        this.textoAppleIphone = this.page.locator(this.textoAppleIphoneSelectors[0]);
    }


    async goto() {
        await this.page.goto('https://www.amazon.es');
        await this.page.waitForLoadState('domcontentloaded');
    }

    async searchCampoDeBusqueda(value: string) {
        await this.smartFill(this.campoDeBusquedaSelectors, value);
        await this.page.keyboard.press('Enter');
    }

    async clickIr() {
        await this.smartClick(this.irSelectors);
    }

    async verifyTextoAppleIphone(expectedText: string) {
        await this.smartVerify(this.textoAppleIphoneSelectors, expectedText);
    }
}