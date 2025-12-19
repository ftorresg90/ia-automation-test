import { type Locator, type Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { BasePage } from './BasePage';

export class SaucedemoPage extends BasePage {
    readonly usernameSelectors: string[] = ['#login_credentials', '#user-name', 'div.login_credentials_wrap-inner', 'div[id*="login_credentials"]', '#root', 'div.login_container', 'input[name="user-name"]', 'input[name*="user-name"]', 'input[id*="user-name"]', 'input[placeholder*="Username"]'];
    readonly username: Locator;
    readonly passwordSelectors: string[] = ['#password', 'input[name="password"]', 'input[name*="password"]', 'input[id*="password"]', 'input[placeholder*="Password"]', 'div.login_credentials_wrap-inner', 'div.login_password', 'xpath=//*[contains(translate(normalize-space(.), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), \'password\')]', '#root', 'div.login_container'];
    readonly password: Locator;
    readonly productsSeaVisibleSelectors: string[] = ['//*[contains(translate(normalize-space(.), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), 'products')]', 'xpath=//*[contains(translate(normalize-space(.), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), \'products\')]'];
    readonly productsSeaVisible: Locator;

    constructor(page: Page) {
        super(page);
        this.username = this.page.locator(this.usernameSelectors[0]);
        this.password = this.page.locator(this.passwordSelectors[0]);
        this.productsSeaVisible = this.page.locator(this.productsSeaVisibleSelectors[0]);
    }


    async goto() {
        await this.page.goto('https://www.saucedemo.com/');
        await this.page.waitForLoadState('domcontentloaded');
    }

    async fillUsername(value: string) {
        await this.smartFill(this.usernameSelectors, value);
    }

    async fillPassword(value: string) {
        await this.smartFill(this.passwordSelectors, value);
    }

    async clickLogin() {
        await this.smartClick(this.usernameSelectors);
    }

    async verifyProductsSeaVisible(expectedText: string) {
        await this.smartVerify(this.productsSeaVisibleSelectors, expectedText);
    }
}