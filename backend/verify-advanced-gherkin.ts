
import { generateGherkinScenario } from './src/services/ai.service';

const runTest = async () => {
    console.log('--- Testing Advanced Gherkin Generation (And Keyword) ---');

    const title = "Login Test";
    const rawSteps = [
        "Navigate to https://saucedemo.com",
        "Type 'standard_user' in username",
        "Type 'secret_sauce' in password",
        "Click login"
    ];
    const existingSteps: string[] = [];

    console.log('Invoking generateGherkinScenario...');
    const gherkin = await generateGherkinScenario(title, rawSteps, existingSteps);

    console.log('\nResulting Gherkin:');
    console.log(gherkin);

    // Checks
    if (gherkin.includes('When I enter "standard_user"')) {
        console.log('✅ Found first When step');
    }
    if (gherkin.includes('And I enter "secret_sauce"')) {
        console.log('✅ Found second "And" step (was duplicate "When")');
    } else {
        console.error('❌ Failed to use "And" for second input');
    }

    if (gherkin.includes('And I click "login"')) {
        console.log('✅ Found third "And" step (was duplicate "When")');
    } else {
        console.error('❌ Failed to use "And" for Click');
    }
};

runTest();
