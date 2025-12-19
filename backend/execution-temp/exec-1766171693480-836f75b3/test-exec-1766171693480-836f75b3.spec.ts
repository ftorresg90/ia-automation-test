import { test, expect } from '@playwright/test';
import { WikipediaPage } from './pages/WikipediaPage';

test.use({ video: 'on', trace: 'retain-on-failure' });

test.describe('BCH', () => {
  test('Artículo Python', async ({ page }) => {
    const wikipediaPage = new WikipediaPage(page);
    await wikipediaPage.goto();
    await wikipediaPage.searchCampoDeBusqueda('Python (lenguaje de programación)');
    await wikipediaPage.clickBotonDeBusqueda();
  });
});
