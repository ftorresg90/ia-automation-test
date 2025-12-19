
import { attemptHeal } from './services/heal.service';
import * as path from 'path';

const execId = 'exec-1766161120810';
const baseDir = path.join(__dirname, '../execution-temp', execId);
const testFile = path.join(baseDir, `test-${execId}.spec.ts`);
const log = `
Error: Failed to click element. Tried 1 strategies.

       at execution-temp/${execId}/pages/BasePage.ts:91

      89 |         }
      90 |         await this.saveDomSnapshot('failure-dom.json');
    > 91 |         throw new Error(\`Failed to click element. Tried \${selectors.length} strategies.\`);
         |               ^
      92 |     }
      93 |
      94 |     protected async smartFill(selectors: string[], value: string) {
        at WikipediaPage.smartClick (/Users/franciscotorres/Desktop/Proyectos Fran/ia-automation-test/backend/execution-temp/${execId}/pages/BasePage.ts:91:15)
        at WikipediaPage.clickBotonDeBusqueda (/Users/franciscotorres/Desktop/Proyectos Fran/ia-automation-test/backend/execution-temp/${execId}/pages/WikipediaPage.ts:33:9)
        at /Users/franciscotorres/Desktop/Proyectos Fran/ia-automation-test/backend/execution-temp/${execId}/test-${execId}.spec.ts:11:5
`;

console.log('--- STARTING DEBUG HEAL ---');
attemptHeal(testFile, log, path.join(baseDir, 'artifacts'))
    .then(res => console.log('DEBUG RESULT:', res))
    .catch(err => console.error('DEBUG ERROR:', err));
