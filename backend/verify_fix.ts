
const strategies = [
    `//*[contains(translate(normalize-space(.), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), 'products')]`,
    `//*[@id="foo"]`,
    `text="It's a wonderful day"`,
    `xpath=//*[text()='Say "Hello"']`
];

const strategiesCode = strategies.map(s => JSON.stringify(s)).join(', ');
const output = `readonly mySelectors: string[] = [${strategiesCode}];`;

console.log('Resulting Code:');
console.log(output);

// Validation: Try to eval the array part to see if it's valid JS
try {
    const arrayContent = `[${strategiesCode}]`;
    const evaled = eval(arrayContent);
    console.log('Valid JS Array:', evaled);
    console.log('Verification PASSED');
} catch (e) {
    console.error('Verification FAILED:', e);
    process.exit(1);
}
