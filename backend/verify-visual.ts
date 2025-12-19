
import { performVisualCheck } from './src/services/ai.service';

const runTest = async () => {
    console.log('--- Testing Visual Validation Logic ---');

    // 1. Mock Data
    const mockImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    const prompt = "Verify the background is red";

    // 2. Call Service
    console.log(`👁️ Sending visual check: "${prompt}"`);
    const result = await performVisualCheck(mockImage, prompt);

    // 3. Verify
    console.log('Result:', result);

    if (result.passed === true || result.passed === false) {
        console.log('✅ Response structure is valid');
    } else {
        console.error('❌ Invalid response structure');
    }

    if (result.reason) {
        console.log(`✅ Reason provided: ${result.reason}`);
    }
};

runTest();
