
import fs from 'fs';
import { attemptHeal } from './src/services/heal.service';

const TEST_FILE = './temp-broken-test.spec.ts';

const runTest = async () => {
    console.log('--- Testing Auto-Healing Logic ---');

    // 1. Create a broken test file
    const initialContent = `
    test('Broken Login', async ({ page }) => {
        await page.goto('https://saucedemo.com');
        await page.click('#login-button'); // This selector is old
    });
    `;
    fs.writeFileSync(TEST_FILE, initialContent);
    console.log('✅ Created broken test file');

    // 2. Simulate Error Log
    const mockError = "TimeoutError: page.click: Timeout 30000ms exceeded. Element with selector #login-button not found.";

    // 3. Attempt Heal
    console.log('🚑 Invoking attemptHeal...');
    const result = await attemptHeal(TEST_FILE, mockError);

    // 4. Verify
    if (result) {
        console.log('✅ attemptHeal returned true');
        const newContent = fs.readFileSync(TEST_FILE, 'utf-8');
        if (newContent.includes('#login-btn-v2')) {
            console.log('✅ File patched correctly with new selector');
        } else {
            console.error('❌ File content was not updated as expected');
            console.log(newContent);
        }
    } else {
        console.error('❌ attemptHeal returned false');
    }

    // Cleanup
    if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
};

runTest();
