import { test, expect } from '@playwright/test';
import { SaucedemoPage } from './pages/SaucedemoPage';

test.use({ video: 'on', trace: 'retain-on-failure' });

test.describe('BCH', () => {
  test('Login SauceDemo', async ({ page }) => {
    const saucedemoPage = new SaucedemoPage(page);
    await saucedemoPage.goto();
    await saucedemoPage.fillUsername('standard_user');
    await saucedemoPage.fillPassword('secret_sauce');
    await saucedemoPage.clickLogin();
    await saucedemoPage.verifyProductsSeaVisible('Products');
  });
});
