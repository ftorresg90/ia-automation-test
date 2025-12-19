import { type Locator, type Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { BasePage } from './BasePage';

export class SaucedemoPage extends BasePage {
    readonly usernameSelectors: string[] = ['#user-name', 'input[name="user-name"]', 'input[name*="user-name"]', 'input[id*="user-name"]', 'input[placeholder*="Username"]', '#password', '#login-button', 'input[name="password"]', 'input[name="login-button"]', 'input[name*="password"]'];
    readonly username: Locator;
    readonly passwordSelectors: string[] = ['#password', 'input[name="password"]', 'input[name*="password"]', 'input[id*="password"]', 'input[placeholder*="Password"]', '#user-name', '#login-button', 'input[name="user-name"]', 'input[name="login-button"]', 'input[name*="user-name"]'];
    readonly password: Locator;
    readonly loginSelectors: string[] = ['#login-button', 'input[name="login-button"]', 'input[name*="login-button"]', 'input[id*="login-button"]'];
    readonly login: Locator;
    readonly productsSeaVisibleSelectors: string[] = ['xpath=//*[contains(translate(normalize-space(.), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), \'products\')]'];
    readonly productsSeaVisible: Locator;

    constructor(page: Page) {
        super(page);
        this.username = this.page.locator(this.usernameSelectors[0]);
        this.password = this.page.locator(this.passwordSelectors[0]);
        this.login = this.page.locator(this.loginSelectors[0]);
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
        await this.smartClick(this.loginSelectors);
    }

    async verifyProductsSeaVisible(expectedText: string) {
        await this.smartVerify(this.productsSeaVisibleSelectors, expectedText);
    }
}