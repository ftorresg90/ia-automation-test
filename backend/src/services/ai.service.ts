import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

const apiKey = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(apiKey || 'mock-key');

export const generateEmbedding = async (text: string): Promise<number[]> => {
    if (!apiKey || apiKey === 'sk-placeholder') {
        // Mock embedding for testing
        return Array(768).fill(0).map(() => Math.random());
    }

    try {
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await model.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.error('Error generating embedding:', error);
        return [];
    }
};

const normalizeStep = (rawStep: string): string => {
    let clean = rawStep.replace(/^\d+\.\s*/, '').trim();
    const lower = clean.toLowerCase();

    // 1. Navigation
    if (lower.match(/^(navegar|ir|go|navigate|open)\s+(a\s+|to\s+)?(http.+)/i)) {
        const url = clean.match(/http[^\s]+/)?.[0] || 'url';
        return `Given I navigate to "${url}"`;
    }

    // 2. Search / Input Normalization
    const textMatch = clean.match(/['"“”‘’]([^'“”‘’]+)['"“”‘’]/);
    const textValue = textMatch ? textMatch[1] : null;

    if (textValue) {
        // "Buscar 'X'", "Ingresar 'X' en el campo de búsqueda" -> When I search for 'X'
        if (lower.includes('buscar') || ((lower.includes('ingresar') || lower.includes('escribir')) && (lower.includes('búsqueda') || lower.includes('search')))) {
            return `When I search for "${textValue}"`;
        }

        // "Ingresar 'standard_user' en 'Username'" -> When I enter 'standard_user' into 'Username'
        if (lower.includes('ingresar') || lower.includes('enter') || lower.includes('type') || lower.includes('escribir')) {
            let target = clean.replace(/['"“”‘’]([^'“”‘’]+)['"“”‘’]/, '').replace(/(ingresar|enter|type|escribir)/i, '').replace(/(en|in|into|el campo)/i, '').trim();
            // Clean extra quotes from target if present
            target = target.replace(/^['"]|['"]$/g, '');
            if (!target || target.length < 2) target = "field";
            return `When I enter "${textValue}" into "${target}"`;
        }
    }

    // 3. Click Normalization
    // "Click en buscar", "Hacer click en el botón de búsqueda", "Hacer click en 'Ir'"
    if (lower.includes('click') || lower.includes('presionar') || (lower.includes('buscar') && !textValue)) {
        if (lower.includes('buscar') || lower.includes('búsqueda') || lower.includes('search') || lower.includes('ir')) {
            return `When I click the search button`;
        }
        const target = clean.replace(/(hacer\s+)?(click|presionar)\s+(en\s+|on\s+|el\s+|la\s+|botón\s+|button\s+)*/i, '').trim();
        return `When I click "${target}"`;
    }

    // 4. Verification
    if (lower.includes('verificar') || lower.includes('verify') || lower.includes('check') || lower.includes('asegurar')) {
        const condition = clean.replace(/(verificar|verify|check|asegurar)\s+(que\s+|that\s+)?/i, '').trim();
        return `Then I verify that ${condition}`;
    }

    // Fallback
    return `When ${clean}`;
};

const enforceGherkinStructure = (lines: string[]): string => {
    let previousKeyword = '';

    return lines.map((line, index) => {
        const match = line.match(/^\s*(Given|When|Then)(\s+.+)$/);
        if (!match) return line; // Fallback for unmatched lines

        const currentKeyword = match[1];
        const content = match[2];

        if (index > 0 && currentKeyword === previousKeyword) {
            return `    And${content}`;
        }

        previousKeyword = currentKeyword;
        return `    ${currentKeyword}${content}`;
    }).join('\n');
};

export const generateGherkinScenario = async (
    title: string,
    rawSteps: string[],
    existingSteps: string[]
): Promise<string> => {
    if (!apiKey || apiKey === 'sk-placeholder') {
        // Fallback mock using normalization
        const normalized = rawSteps.map(s => normalizeStep(s));
        return enforceGherkinStructure(normalized);
    }

    // Heuristic Fallback if key is invalid but not placeholder (e.g. 404 state)
    // We try to use the model, if it fails we catch it.

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-exp-1206" });

        const prompt = `
        You are a generic Gherkin generator for a Test Automation framework.
        
        GOAL: Convert a raw test case into a high-quality, declarative Gherkin Scenario.
        
        INPUTS:
        1. Title: "${title}"
        2. Raw Steps:
        ${rawSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}
        
        3. EXISTING STEPS (REUSE LIST):
        ${existingSteps.length ? existingSteps.join('\n') : '(None yet)'}
        
        INSTRUCTIONS:
        1. Reuse Strategy: Check the "EXISTING STEPS" list. If a step there matches the INTENT of a raw step, USE THE EXISTING STEP EXACTLY. Do not create synonyms.
           - Example: If "Given user is on login page" exists, use it. Don't write "Given I open the login page".
           
        2. Style: Prefer DECLARATIVE/High-Level steps over generic clicks.
           - FAIL: "When I type 'user' in field", "And I type 'pass' in field", "And I click login".
           - PASS: "When I Iogin with credentials 'user' and 'pass'".
           
        3. Structure:
           - Start with 'Given' for setup/navigation.
           - Use 'When' for actions.
           - Use 'Then' for verifications.
           - Use 'And' to chain.
           
        4. Output: Return ONLY the raw Gherkin lines (starting with Given/When/Then), indented with 4 spaces. Do NOT include "Scenario:" or markdown.
        
        Your Gherkin Scenario:
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        let text = response.text();

        return text.replace(/```gherkin/g, '').replace(/```/g, '').trim();

    } catch (error: any) {
        console.error('AI Gherkin Generation Failed:', error.message);
        // Fallback to simple mapping if AI fails
        const normalized = rawSteps.map(s => normalizeStep(s));
        return enforceGherkinStructure(normalized);
    }
};

export const completeText = async (prompt: string): Promise<string> => {
    if (!apiKey || apiKey === 'sk-placeholder') {
        return 'Mock AI response';
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-exp-1206" });
        const result = await model.generateContent(prompt);
        const response = result.response;
        return response.text();
    } catch (error: any) {
        console.warn('Warning: AI text completion failed:', error.message);
        return 'AI completion unavailable.';
    }
};

export const analyzeFailure = async (logs: string, imagePath?: string): Promise<string> => {
    if (!apiKey || apiKey === 'sk-placeholder') {
        return 'Mock analysis: Failure looks like a timeout.';
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-exp-1206" });

        let prompt = `Analyze this test failure. Here are the logs:\n${logs}\n\n`;
        const parts: any[] = [prompt];

        if (imagePath && fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            const imageBase64 = imageBuffer.toString('base64');
            parts.push({
                inlineData: {
                    data: imageBase64,
                    mimeType: "image/png"
                }
            });
            prompt += "I have attached a screenshot of the state when it failed.\n";
        }

        prompt += "Explain why the test failed and suggest a fix. Be concise.";

        const result = await model.generateContent(parts);
        const response = result.response;
        return response.text();
    } catch (error: any) {
        console.warn('Warning: AI failure analysis failed:', error.message);
        return 'AI Analysis unavailable. Please check API key setup.';
    }
};

export const convertNaturalLanguageSteps = async (text: string): Promise<any[]> => {
    if (!apiKey || apiKey === 'sk-placeholder') {
        return [{ action: "Mock step", value: text }];
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-exp-1206" });

        const prompt = `
        You are a QA Automation expert.
        Convert the following natural language test steps into a strictly valid JSON array of objects.
        Each object MUST have:
        1. "type": One of "Given", "When", "Then".
        2. "action": The step description (e.g., "Navigate to...", "Click on...").

        RULES:
        - If the input is a numbered list (e.g., "1. Go to... 2. Click..."), SPLIT it into separate objects. Do NOT combine them.
        - Translate English steps to Spanish keywords if possible (e.g., "Go to" -> "Navegar a", "Click" -> "Hacer click en").
        - "Given" is for initial setup or navigation.
        - "When" is for actions (clicking, typing).
        - "Then" is for verifications.
        - OUTPUT ONLY RAW JSON. DO NOT USE MARKDOWN BLOCK (\`\`\`json).

        Example Input:
        "1. Go to Google 2. Search 'cats' 3. Verify results"

        Example Output:
        [
            { "type": "Given", "action": "Navegar a https://google.com" },
            { "type": "When", "action": "Escribir 'cats' en la barra de búsqueda" },
            { "type": "When", "action": "Hacer click en Buscar" },
            { "type": "Then", "action": "Verificar que aparecen resultados" }
        ]

        Input text to convert:
        ${text}
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        let jsonString = response.text();

        // Cleanup markdown if present
        jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(jsonString);
        return JSON.parse(jsonString);
    } catch (error: any) {
        console.error('Error converting natural language steps with AI:', error.message);

        // HEURISTIC FALLBACK
        // If AI fails, try to parse numbered lists using regex
        const numberedStepRegex = /(\d+)\.\s+(.*?)(?=(?:\d+\.)|$)/gs;
        const matches = [...text.matchAll(numberedStepRegex)];

        if (matches.length > 0) {
            return matches.map(match => {
                const action = match[2].trim();
                let type = 'When';
                const lowerAction = action.toLowerCase();

                if (lowerAction.includes('navegar') || lowerAction.includes('go to') || lowerAction.includes('open')) {
                    type = 'Given';
                } else if (lowerAction.includes('verificar') || lowerAction.includes('verify') || lowerAction.includes('assert')) {
                    type = 'Then';
                }

                return { type, action };
            });
        }

        // If bullet points
        if (text.match(/(?:^|[\r\n]+)\s*[-*]\s+/)) {
            return text.split(/(?:^|[\r\n]+)\s*[-*]\s+/).filter(line => line.trim().length > 0).map(line => {
                const action = line.trim();
                let type = 'When';
                const lowerAction = action.toLowerCase();
                if (lowerAction.includes('navegar') || lowerAction.includes('go to')) type = 'Given';
                else if (lowerAction.includes('verificar') || lowerAction.includes('verify')) type = 'Then';
                return { type, action };
            });
        }

        return [{ type: 'When', action: text }]; // Ultimate Fallback
    }
};

export const suggestFix = async (
    errorLog: string,
    fileContent: string
): Promise<{ oldLine: string; newLine: string } | null> => {
    if (!apiKey || apiKey === 'sk-placeholder') {
        // Mock Fix for validation
        if (errorLog.includes("Timeout") && fileContent.includes("page.click('#login-button')")) {
            return {
                oldLine: "page.click('#login-button')",
                newLine: "page.click('#login-btn-v2') // Healed"
            };
        }
        return null; // Cannot heal without AI
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-exp-1206" });
        const prompt = `
        You are an AI Test Surgeon. A Playwright test has failed.
        Your job is to FIX the code.

        ERROR LOG:
        ${errorLog.substring(0, 1000)}...

        FILE CONTENT:
        ${fileContent.substring(0, 2000)}...

        INSTRUCTIONS:
        1. Identify the specific line causing the error.
        2. Propose a replacement line (e.g., correct the selector).
        3. Return strictly valid JSON: { "oldLine": "exact string to find", "newLine": "replacement string" }
        `;

        const result = await model.generateContent(prompt);
        let text = result.response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);

    } catch (error) {
        console.error("AI Fix failed:", error);
        return null;
    }
};

export const performVisualCheck = async (
    imageBase64: string,
    prompt: string
): Promise<{ passed: boolean; reason: string }> => {
    if (!apiKey || apiKey === 'sk-placeholder') {
        // Mock Vision
        console.log('🔮 [Mock Vision] Checking image with prompt:', prompt);
        return { passed: true, reason: "Mock: Visual check passed." };
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-exp-1206" });

        const imagePart = {
            inlineData: {
                data: imageBase64,
                mimeType: "image/png",
            },
        };

        const fullPrompt = `
        You are an AI Automated Tester performing a Visual Verification.
        
        TASK: "${prompt}"
        
        Look at the provided screenshot.
        Does the image satisfy the task/condition?
        
        Return strictly valid JSON:
        {
            "passed": boolean,
            "reason": "A short explanation of why it passed or failed."
        }
        `;

        const result = await model.generateContent([fullPrompt, imagePart]);
        let text = result.response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (error) {
        console.error("AI Vision Check failed:", error);
        return { passed: false, reason: "AI Service Error: " + error };
    }
};
