import { test, expect } from '@playwright/test';
import { AmazonPage } from './pages/AmazonPage';

test.use({ video: 'on', trace: 'retain-on-failure' });

test.describe('BCH', () => {
  test('Búsqueda Amazon', async ({ page }) => {
    const amazonPage = new AmazonPage(page);
    await amazonPage.goto();
    await amazonPage.searchCampoDeBusqueda('iPhone 15');
    await amazonPage.clickIr();
    await amazonPage.verifyTextoAppleIphone('Apple iPhone 15');
  });
});
