import { test, expect } from '@playwright/test';
import { WikipediaPage } from './pages/WikipediaPage';

test.use({ video: 'on', trace: 'retain-on-failure' });

test.describe('BCH', () => {
  test('Búsqueda Wikipedia', async ({ page }) => {
    const wikipediaPage = new WikipediaPage(page);
    await wikipediaPage.goto();
    await wikipediaPage.searchCampoDeBusqueda('Inteligencia Artificial');
    await wikipediaPage.clickBotonDeBusqueda();
    await wikipediaPage.verifyTituloContengaInteligencia('Inteligencia artificial');
  });
});
