import AdmZip from 'adm-zip';
import prisma from '../utils/prisma';
import { generateGherkinScenario } from './ai.service';
import { classifyFeature } from './classifier.service';
import { generateSelector } from './selector.service';
import {
    pomXmlTemplate,
    testRunnerTemplate,
    hooksTemplate,
    driverFactoryTemplate,
    buildGradleTemplate,
    settingsGradleTemplate,
    frameworkReadmeTemplate
} from '../generators/templates';
import {
    gradlewTemplate,
    gradlewBatTemplate,
    gradleWrapperPropertiesTemplate
} from '../generators/gradle-wrapper-templates';

const webBasePageTemplate = `package com.autogen.pages;

import org.openqa.selenium.*;
import org.openqa.selenium.interactions.Actions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.Select;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.apache.commons.io.FileUtils;

import java.io.File;
import java.io.IOException;
import java.time.Duration;
import java.util.Set;

public abstract class WebBasePage {
    protected final WebDriver driver;
    private final WebDriverWait wait;
    private static final long DEFAULT_TIMEOUT = 30;
    private String mainWindowHandle;

    protected WebBasePage(WebDriver driver) {
        this(driver, DEFAULT_TIMEOUT);
    }

    protected WebBasePage(WebDriver driver, long timeoutSeconds) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(timeoutSeconds));
        this.mainWindowHandle = driver.getWindowHandle();
    }

    protected WebDriver getDriver() {
        return driver;
    }

    // ==================== WAITS ====================
    
    protected void waitUntilElementIsVisible(WebElement element) {
        wait.until(ExpectedConditions.visibilityOf(element));
    }

    protected void waitUntilElementIsVisible(By locator) {
        wait.until(ExpectedConditions.visibilityOfElementLocated(locator));
    }

    protected void waitUntilElementIsVisibleNonThrow(WebElement element, long timeoutSeconds) {
        try {
            new WebDriverWait(driver, Duration.ofSeconds(timeoutSeconds))
                    .until(ExpectedConditions.visibilityOf(element));
        } catch (Exception ignored) {
        }
    }

    protected void waitUntilElementIsVisibleNonThrow(By locator, long timeoutSeconds) {
        try {
            new WebDriverWait(driver, Duration.ofSeconds(timeoutSeconds))
                    .until(ExpectedConditions.visibilityOfElementLocated(locator));
        } catch (Exception ignored) {
        }
    }

    protected void waitUntilClickable(WebElement element) {
        wait.until(ExpectedConditions.elementToBeClickable(element));
    }

    protected void waitUntilClickable(By locator) {
        wait.until(ExpectedConditions.elementToBeClickable(locator));
    }

    protected void waitUntilInvisible(WebElement element) {
        wait.until(ExpectedConditions.invisibilityOf(element));
    }

    protected void waitUntilInvisible(By locator) {
        wait.until(ExpectedConditions.invisibilityOfElementLocated(locator));
    }

    protected void waitForPageLoad() {
        wait.until(webDriver -> 
            ((JavascriptExecutor) webDriver).executeScript("return document.readyState").equals("complete")
        );
    }

    protected void waitForLoadingToComplete() {
        // Wait for common loading indicators to disappear
        try {
            waitUntilInvisible(By.cssSelector(".loading, .spinner, [class*='loading'], [class*='spinner']"));
        } catch (Exception ignored) {
            // No loading indicator found, continue
        }
    }

    protected void waitForTextChange(WebElement element, String expectedText) {
        wait.until(ExpectedConditions.textToBePresentInElement(element, expectedText));
    }

    // ==================== BASIC ACTIONS ====================

    protected void click(WebElement element) {
        element.click();
    }

    protected void doubleClick(WebElement element) {
        new Actions(driver).doubleClick(element).perform();
    }

    protected void hover(WebElement element) {
        new Actions(driver).moveToElement(element).perform();
    }

    protected void rightClick(WebElement element) {
        new Actions(driver).contextClick(element).perform();
    }

    protected void clear(WebElement element) {
        element.clear();
    }

    protected void sendKeys(WebElement element, String text) {
        clear(element);
        element.sendKeys(text);
    }

    protected void dragAndDrop(WebElement source, WebElement target) {
        new Actions(driver).dragAndDrop(source, target).perform();
    }

    // ==================== SCROLLING ====================

    protected void scrollIntoView(WebElement element) {
        ((JavascriptExecutor) driver).executeScript("arguments[0].scrollIntoView(true);", element);
    }

    protected void scrollToBottom() {
        ((JavascriptExecutor) driver).executeScript("window.scrollTo(0, document.body.scrollHeight);");
    }

    protected void scrollToTop() {
        ((JavascriptExecutor) driver).executeScript("window.scrollTo(0, 0);");
    }

    // ==================== JAVASCRIPT INTERACTIONS ====================

    protected void clickViaJS(WebElement element) {
        ((JavascriptExecutor) driver).executeScript("arguments[0].click();", element);
    }

    protected Object executeJS(String script, Object... args) {
        return ((JavascriptExecutor) driver).executeScript(script, args);
    }

    protected String getAttributeViaJS(WebElement element, String attribute) {
        return (String) executeJS("return arguments[0].getAttribute(arguments[1]);", element, attribute);
    }

    protected void highlightElement(WebElement element) {
        String originalStyle = element.getAttribute("style");
        executeJS("arguments[0].setAttribute('style', 'border: 3px solid red; background: yellow;');", element);
        try {
            Thread.sleep(500);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        executeJS("arguments[0].setAttribute('style', arguments[1]);", element, originalStyle);
    }

    // ==================== ELEMENT STATE CHECKS ====================

    protected boolean isVisible(WebElement element) {
        try {
            return element.isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    protected boolean isVisible(By locator) {
        try {
            return driver.findElement(locator).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    protected boolean isInvisible(WebElement element) {
        try {
            return !element.isDisplayed();
        } catch (NoSuchElementException | StaleElementReferenceException e) {
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    protected boolean isInvisible(By locator) {
        try {
            return !driver.findElement(locator).isDisplayed();
        } catch (NoSuchElementException | StaleElementReferenceException e) {
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    protected boolean isEnabled(WebElement element) {
        try {
            return element.isEnabled();
        } catch (Exception e) {
            return false;
        }
    }

    protected boolean isSelected(WebElement element) {
        try {
            return element.isSelected();
        } catch (Exception e) {
            return false;
        }
    }

    protected boolean elementExists(By locator) {
        try {
            driver.findElement(locator);
            return true;
        } catch (NoSuchElementException e) {
            return false;
        }
    }

    protected String getText(WebElement element) {
        return element.getText();
    }

    protected String getTextSafely(WebElement element) {
        try {
            return element.getText();
        } catch (Exception e) {
            return "";
        }
    }

    protected String getAttributeSafely(WebElement element, String attribute) {
        try {
            return element.getAttribute(attribute);
        } catch (Exception e) {
            return "";
        }
    }

    // ==================== ALERTS ====================

    protected void acceptAlertIfPresent() {
        try {
            Alert alert = driver.switchTo().alert();
            alert.accept();
        } catch (NoAlertPresentException ignored) {
        }
    }

    protected void dismissAlertIfPresent() {
        try {
            Alert alert = driver.switchTo().alert();
            alert.dismiss();
        } catch (NoAlertPresentException ignored) {
        }
    }

    protected String getAlertText() {
        try {
            return driver.switchTo().alert().getText();
        } catch (NoAlertPresentException e) {
            return "";
        }
    }

    protected void handlePrompt(String textToEnter) {
        try {
            Alert alert = driver.switchTo().alert();
            alert.sendKeys(textToEnter);
            alert.accept();
        } catch (NoAlertPresentException ignored) {
        }
    }

    // ==================== FRAMES & WINDOWS ====================

    protected void switchToFrame(int index) {
        driver.switchTo().frame(index);
    }

    protected void switchToFrame(String nameOrId) {
        driver.switchTo().frame(nameOrId);
    }

    protected void switchToFrame(WebElement frameElement) {
        driver.switchTo().frame(frameElement);
    }

    protected void switchToDefaultContent() {
        driver.switchTo().defaultContent();
    }

    protected void switchToNewWindow() {
        Set<String> windows = driver.getWindowHandles();
        for (String window : windows) {
            if (!window.equals(mainWindowHandle)) {
                driver.switchTo().window(window);
                break;
            }
        }
    }

    protected void closeCurrentAndSwitchToMain() {
        driver.close();
        driver.switchTo().window(mainWindowHandle);
    }

    // ==================== DROPDOWNS ====================

    protected void selectByText(WebElement dropdown, String text) {
        new Select(dropdown).selectByVisibleText(text);
    }

    protected void selectByValue(WebElement dropdown, String value) {
        new Select(dropdown).selectByValue(value);
    }

    protected void selectByIndex(WebElement dropdown, int index) {
        new Select(dropdown).selectByIndex(index);
    }

    // ==================== FILE UPLOAD ====================

    protected void uploadFile(WebElement fileInput, String filePath) {
        File file = new File(filePath);
        if (file.exists()) {
            fileInput.sendKeys(file.getAbsolutePath());
        } else {
            throw new RuntimeException("File not found: " + filePath);
        }
    }

    // ==================== SCREENSHOTS ====================

    protected String takeScreenshot(String testName) {
        try {
            TakesScreenshot screenshot = (TakesScreenshot) driver;
            File source = screenshot.getScreenshotAs(OutputType.FILE);
            String destination = "screenshots/" + testName + "_" + System.currentTimeMillis() + ".png";
            File finalDestination = new File(destination);
            FileUtils.copyFile(source, finalDestination);
            return finalDestination.getAbsolutePath();
        } catch (IOException e) {
            e.printStackTrace();
            return "";
        }
    }

    protected byte[] getScreenshotAsBytes() {
        TakesScreenshot screenshot = (TakesScreenshot) driver;
        return screenshot.getScreenshotAs(OutputType.BYTES);
    }
}
`;

const removeDiacritics = (text: string): string => {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const splitIntoWords = (text: string): string[] => {
    return removeDiacritics(text)
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
};

// Convert text to camelCase
const toCamelCase = (text: string): string => {
    const words = splitIntoWords(text);
    if (words.length === 0) return '';

    const [first, ...rest] = words;
    const firstWord = first.toLowerCase();
    const restWords = rest.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
    return firstWord + restWords.join('');
};

// Convert text to PascalCase
const toPascalCase = (text: string): string => {
    const camel = toCamelCase(text);
    if (!camel) return '';
    return camel.charAt(0).toUpperCase() + camel.slice(1);
};

const slugify = (text: string): string => {
    return removeDiacritics(text)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'feature';
};

// Helper to format Gherkin steps with proper Given/When/Then/And and quote URLs
const formatGherkinSteps = (steps: any[]): string => {
    if (!steps || steps.length === 0) return '';

    return steps.map((s: any, index: number) => {
        let keyword = 'And';

        if (index === 0) {
            keyword = 'Given';
        } else if (index === steps.length - 1) {
            keyword = 'Then';
        } else if (index === 1 && steps.length >= 3) {
            keyword = 'When';
        } else {
            keyword = 'And';
        }

        // Wrap URLs in double quotes for Cucumber Expressions
        let actionText = s.action || s.text;
        actionText = actionText.replace(/(https?:\/\/[^\s"']+)/gi, '"$1"');

        return `    ${keyword} ${actionText}`;
    }).join('\n');
};

// Clean element name from action text
const cleanElementName = (text: string): string => {
    // Remove common phrases
    let cleaned = text
        .replace(/ingresar\s+['"'].*?['"']\s+en\s+/gi, '')
        .replace(/hacer\s+click\s+en\s+(el\s+)?/gi, '')
        .replace(/verificar\s+(que\s+)?/gi, '')
        .replace(/en\s+el\s+/gi, '')
        .replace(/el\s+/gi, '')
        .replace(/la\s+/gi, '')
        .replace(/los\s+/gi, '')
        .replace(/las\s+/gi, '')
        .replace(/de\s+/gi, '')
        .trim();

    cleaned = removeDiacritics(cleaned);

    // Take only meaningful keywords (max 3 words)
    const words = cleaned.split(/\s+/).filter(w => w.length > 2);
    if (words.length === 0) return 'element';
    return words.slice(0, 3).join(' ');
};

// Extract page actions from steps with element type detection
const extractPageActions = (testCases: any[]) => {
    const actions: Array<{
        name: string;
        type: 'click' | 'input' | 'verify';
        element: string;
        originalText: string;
        elementType: 'button' | 'input' | 'link' | 'text' | 'dropdown' | 'checkbox' | 'generic';
        pageUrl?: string;
    }> = [];

    testCases.forEach(tc => {
        let currentUrl: string | undefined;
        (tc.steps as any[]).forEach(step => {
            const rawText = step.action || step.text;
            const action = rawText.toLowerCase();
            const originalText = step.action || step.text;

            const urlMatch = rawText.match(/https?:\/\/[^\s'"]+/);
            if (urlMatch) {
                currentUrl = urlMatch[0];
            }

            if (action.includes('click') || action.includes('hacer click')) {
                const rawElement = action.replace(/(hacer\s)?click\s(en|on|el)\s?/gi, '').trim();
                const element = cleanElementName(rawElement);

                if (element) {
                    let elementType: 'button' | 'link' | 'checkbox' | 'generic' = 'generic';
                    if (element.includes('botón') || element.includes('button') || element.includes('buscar') || element.includes('submit')) {
                        elementType = 'button';
                    } else if (element.includes('link') || element.includes('enlace') || element.includes('opción')) {
                        elementType = 'link';
                    } else if (element.includes('checkbox') || element.includes('check')) {
                        elementType = 'checkbox';
                    }

                    const safeBase = toPascalCase(element) || 'Element';
                    const prefix = elementType === 'button' ? 'btn' :
                        elementType === 'link' ? 'link' :
                            elementType === 'checkbox' ? 'chk' : 'elem';

                    actions.push({
                        name: prefix + safeBase,
                        type: 'click',
                        element: element,
                        originalText,
                        elementType,
                        pageUrl: currentUrl
                    });
                }
            } else if (action.includes('ingresar') || action.includes('enter') || action.includes('type') || action.includes('escribir')) {
                const rawElement = action.replace(/(ingresar|enter|type|escribir)\s+['"'].*?['"']\s+en\s+/gi, '').replace(/['"'].*?['"']/g, '').trim();
                const element = cleanElementName(rawElement);

                if (element) {
                    let elementType: 'input' | 'dropdown' = 'input';
                    if (element.includes('seleccionar') || element.includes('dropdown') || element.includes('lista')) {
                        elementType = 'dropdown';
                    }

                    const safeBase = toPascalCase(element) || 'Element';
                    const prefix = elementType === 'dropdown' ? 'ddl' : 'input';

                    actions.push({
                        name: prefix + safeBase,
                        type: 'input',
                        element: element,
                        originalText,
                        elementType,
                        pageUrl: currentUrl
                    });
                }
            } else if (action.includes('verificar') || action.includes('verify')) {
                const rawElement = action.replace(/(verificar|verify)\s(que\s)?/gi, '').trim();
                const element = cleanElementName(rawElement);

                if (element) {
                    const safeBase = toPascalCase(element) || 'Element';
                    const prefix = 'txt';

                    actions.push({
                        name: prefix + safeBase,
                        type: 'verify',
                        element: element,
                        originalText,
                        elementType: 'text',
                        pageUrl: currentUrl
                    });
                }
            }
        });
    });

    // Remove duplicates
    const unique = Array.from(new Map(actions.map(a => [a.name, a])).values());
    return unique;
};

// Generate Page Object with real selectors and proper naming
const generatePageObject = async (featureName: string, testCases: any[]): Promise<string> => {
    const actions = extractPageActions(testCases);
    const className = toPascalCase(featureName) + 'Page';

    const locatorsWithSelectors = await Promise.all(actions.map(async action => {
        // Generate real selector using AI/heuristics
        const selectorResult = await generateSelector(action.element, action.originalText, {
            pageUrl: action.pageUrl,
            elementType: action.elementType
        });

        let findByAnnotation = '';
        const selector = selectorResult.best;

        if (selector.startsWith('xpath=') || selector.startsWith('//') || selector.startsWith('(')) {
            const cleanXpath = selector.replace(/^xpath=/, '');
            findByAnnotation = `@FindBy(xpath = "${cleanXpath.replace(/"/g, '\\"')}")`;
        } else {
            findByAnnotation = `@FindBy(css = "${selector.replace(/"/g, '\\"')}")`;
        }

        return `    // ${action.originalText}
    ${findByAnnotation}
    private WebElement ${action.name};`;
    }));

    const locators = locatorsWithSelectors.join('\n\n');

    const methods = actions.map(action => {
        const baseName = toPascalCase(action.element) || 'Element';
        const waitTimeout = '5';

        switch (action.type) {
            case 'click':
                return `    public void click${baseName}() {
        waitUntilElementIsVisible(${action.name});
        click(${action.name});
    }`;
            case 'input': {
                const parameterName = action.elementType === 'dropdown' ? 'option' : 'text';
                return `    public void sendKeysTo${baseName}(String ${parameterName}) {
        waitUntilElementIsVisible(${action.name});
        sendKeys(${action.name}, ${parameterName});
    }`;
            }
            case 'verify':
                return `    public boolean is${baseName}Visible() {
        waitUntilElementIsVisibleNonThrow(${action.name}, ${waitTimeout});
        return isVisible(${action.name});
    }
    
    public String get${baseName}Text() {
        waitUntilElementIsVisible(${action.name});
        return getText(${action.name});
    }`;
            default:
                return `    public void interact${baseName}() {
        waitUntilElementIsVisible(${action.name});
        click(${action.name});
    }`;
        }
    }).join('\n\n');

    return `package com.autogen.pages;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.FindBy;
import org.openqa.selenium.support.PageFactory;

public class ${className} extends WebBasePage {

${locators}

    public ${className}(WebDriver driver) {
        super(driver);
        PageFactory.initElements(driver, this);
    }

${methods}

    public void navigateToUrl(String url) {
        getDriver().get(url);
    }

}`;
};

type StepParameter = { name: string; kind: 'string' | 'url' };

const PARAMETER_HINTS: Array<{ keywords: string[]; name: string }> = [
    { keywords: ['url', 'http', 'https', 'pagina', 'sitio'], name: 'url' },
    { keywords: ['usuario', 'email', 'correo', 'user'], name: 'usuario' },
    { keywords: ['password', 'contraseña', 'clave', 'pass'], name: 'password' },
    { keywords: ['buscar', 'producto', 'articulo', 'item', 'search'], name: 'producto' },
    { keywords: ['mensaje', 'texto', 'comentario'], name: 'mensaje' },
    { keywords: ['codigo', 'token'], name: 'codigo' },
    { keywords: ['monto', 'valor', 'cantidad', 'numero'], name: 'valor' }
];

const guessParameterName = (stepText: string, index: number): string => {
    const normalized = removeDiacritics((stepText || '').toLowerCase());
    for (const hint of PARAMETER_HINTS) {
        if (hint.keywords.some(keyword => normalized.includes(keyword))) {
            return hint.name;
        }
    }
    return `valor${index + 1}`;
};

const ensureUniqueParamName = (base: string, used: Set<string>): string => {
    let candidate = base;
    let counter = 2;
    while (used.has(candidate)) {
        candidate = `${base}${counter}`;
        counter += 1;
    }
    used.add(candidate);
    return candidate;
};

const escapeRegexText = (text: string): string => {
    return text.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
};

const escapeForJavaString = (text: string): string => {
    return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
};

const buildStepPattern = (stepText: string): { pattern: string; parameters: StepParameter[] } => {
    // For Cucumber Expressions, we'll use {string} instead of regex
    const urlRegex = /(https?:\/\/[^\s"']+)/gi;
    const quotedTextRegex = /'([^']+)'|"([^"]+)"/gi;

    let pattern = stepText;
    const parameters: StepParameter[] = [];
    let stringCount = 0;
    let urlCount = 0;
    const usedNames = new Set<string>();

    // First, replace URLs with {string}
    pattern = pattern.replace(urlRegex, (match) => {
        urlCount += 1;
        const base = urlCount === 1 ? 'url' : `url${urlCount}`;
        const paramName = ensureUniqueParamName(base, usedNames);
        parameters.push({ name: paramName, kind: 'url' });
        return '{string}';
    });

    // Then, replace quoted text with {string}
    pattern = pattern.replace(quotedTextRegex, (match, singleQuoted, doubleQuoted) => {
        const content = singleQuoted || doubleQuoted;
        const isUrl = /^https?:\/\//i.test(content);

        if (isUrl) {
            // Already handled above, skip
            return match;
        }

        stringCount += 1;
        const hint = guessParameterName(stepText, stringCount - 1);
        const base = toCamelCase(hint) || `valor${stringCount}`;
        const paramName = ensureUniqueParamName(base, usedNames);
        parameters.push({ name: paramName, kind: 'string' });
        return '{string}';
    });

    return { pattern, parameters };
};

const buildStepImplementation = (
    stepAction: string,
    pageVarName: string,
    parameters: StepParameter[]
): string => {
    const actionLower = stepAction.toLowerCase();
    const urlParam = parameters.find(p => p.kind === 'url')?.name;
    const valueParam = parameters.find(p => p.kind === 'string')?.name;

    if (actionLower.includes('navegar') || actionLower.includes('navigate')) {
        const urlMatch = stepAction.match(/https?:\/\/[^\s]+/);
        const url = urlMatch ? urlMatch[0] : 'https://example.com';
        const arg = urlParam || `"${url}"`;
        return `        ${pageVarName}.navigateToUrl(${arg});`;
    } else if (actionLower.includes('click') || actionLower.includes('hacer click')) {
        const rawElement = stepAction.replace(/(hacer\s)?click\s(en|on|el)\s?/gi, '').trim();
        const cleanedElement = cleanElementName(rawElement) || rawElement;
        return `        ${pageVarName}.click${toPascalCase(cleanedElement) || 'Element'}();`;
    } else if (actionLower.includes('ingresar') || actionLower.includes('enter') || actionLower.includes('type') || actionLower.includes('escribir')) {
        const rawElement = stepAction
            .replace(/(ingresar|enter|type|escribir)\s+['"'].*?['"']\s+en\s+/gi, '')
            .replace(/['"'].*?['"']/g, '')
            .trim();
        const textMatch = stepAction.match(/'([^']+)'|"([^"]+)"/);
        const literalText = textMatch ? (textMatch[1] || textMatch[2]) : 'text';
        const valueArg = valueParam || `"${literalText}"`;
        const cleanedElement = cleanElementName(rawElement) || rawElement;
        return `        ${pageVarName}.sendKeysTo${toPascalCase(cleanedElement) || 'Element'}(${valueArg});`;
    } else if (actionLower.includes('verificar') || actionLower.includes('verify')) {
        const rawElement = stepAction.replace(/(verificar|verify)\s(que\s)?/gi, '').trim();
        const cleanedElement = cleanElementName(rawElement) || rawElement;
        return `        Assert.assertTrue(${pageVarName}.is${toPascalCase(cleanedElement) || 'Element'}Visible());`;
    }

    return `        // TODO: Implement ${stepAction}`;
};

// Generate Step Definitions connected to Page Objects
const generateStepDefinitions = (
    featureName: string,
    testCases: any[],
    sharedSteps: Map<string, boolean>
): { content: string; hasSteps: boolean } => {
    const uniqueSteps = new Map<string, { type: string; action: string }>();
    const className = toPascalCase(featureName) + 'Steps';
    const pageClassName = toPascalCase(featureName) + 'Page';
    const pageVarName = toCamelCase(featureName) + 'Page';

    testCases.forEach(tc => {
        (tc.steps as any[]).forEach(step => {
            const action = step.action || step.text;
            const { pattern } = buildStepPattern(action);

            // Check if this pattern (or very similar) is already handled
            if (!uniqueSteps.has(pattern)) {
                uniqueSteps.set(pattern, { type: step.type || 'When', action });
            }
        });
    });

    const stepMethodList = Array.from(uniqueSteps.values()).map(step => {
        if (sharedSteps.has(step.action)) {
            return null;
        }

        sharedSteps.set(step.action, true);

        const methodName = toCamelCase(step.action);
        const annotation = step.type === 'Given' ? '@Given' :
            step.type === 'Then' ? '@Then' : '@When';

        const { pattern, parameters } = buildStepPattern(step.action);
        const javaPattern = escapeForJavaString(pattern);
        const methodParams = parameters.length ? parameters.map(p => `String ${p.name}`).join(', ') : '';
        const methodSignature = parameters.length ? `(${methodParams})` : '()';
        const implementation = buildStepImplementation(step.action, pageVarName, parameters);

        return `    ${annotation}("${javaPattern}")
    public void ${methodName}${methodSignature} {
${implementation}
    }`;
    }).filter((method): method is string => Boolean(method));

    if (stepMethodList.length === 0) {
        return { content: '', hasSteps: false };
    }

    const stepMethods = stepMethodList.join('\n\n');

    const imports = [
        'io.cucumber.java.en.*',
        'org.openqa.selenium.WebDriver',
        'com.autogen.hooks.Hooks',
        `com.autogen.pages.${pageClassName}`
    ];
    const usesAssertions = stepMethodList.some(method => method.includes('Assert.'));
    if (usesAssertions) {
        imports.splice(1, 0, 'org.testng.Assert');
    }
    const importBlock = imports.map(imp => `import ${imp};`).join('\n');

    const content = `package com.autogen.steps;

${importBlock}

public class ${className} {

    private final WebDriver driver;
    private final ${pageClassName} ${pageVarName};

    public ${className}() {
        this.driver = Hooks.getDriver();
        this.${pageVarName} = new ${pageClassName}(this.driver);
    }

${stepMethods}

}`;
    return { content, hasSteps: true };
};

export const generateProjectZip = async (projectId: string, buildTool: 'maven' | 'gradle' = 'maven') => {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { testCases: true },
    });

    if (!project) throw new Error('Project not found');

    const zip = new AdmZip();
    const projectName = project.name;
    const javaBaseDir = 'generator/src/test/java';
    const resourcesBaseDir = 'generator/src/test/resources';

    // 1. Base Structure - Build files based on choice
    if (buildTool === 'maven') {
        zip.addFile('pom.xml', Buffer.from(pomXmlTemplate(projectName)));
    } else {
        zip.addFile('build.gradle', Buffer.from(buildGradleTemplate));
        zip.addFile('settings.gradle', Buffer.from(settingsGradleTemplate(projectName)));
        // Add Gradle wrapper files
        zip.addFile('gradlew', Buffer.from(gradlewTemplate));
        zip.addFile('gradlew.bat', Buffer.from(gradlewBatTemplate));
        zip.addFile('gradle/wrapper/gradle-wrapper.properties', Buffer.from(gradleWrapperPropertiesTemplate));
        zip.addFile('gradle/wrapper/gradle-wrapper.jar', Buffer.from('')); // Empty for now, can add real jar later
    }

    zip.addFile('README.md', Buffer.from(frameworkReadmeTemplate(projectName, buildTool)));
    zip.addFile(`${javaBaseDir}/com/autogen/runners/RunCukesTest.java`, Buffer.from(testRunnerTemplate));
    zip.addFile(`${javaBaseDir}/com/autogen/hooks/Hooks.java`, Buffer.from(hooksTemplate));
    zip.addFile(`${javaBaseDir}/com/autogen/utils/DriverFactory.java`, Buffer.from(driverFactoryTemplate));
    zip.addFile(`${javaBaseDir}/com/autogen/pages/WebBasePage.java`, Buffer.from(webBasePageTemplate));

    // 2. Group Test Cases by Feature
    const features: Record<string, any[]> = {};

    for (const testCase of project.testCases) {
        let featureName = testCase.feature;
        if (!featureName || featureName === 'General') {
            featureName = await classifyFeature(testCase.title, testCase.steps as any[]);
        }
        if (!features[featureName]) features[featureName] = [];
        features[featureName].push(testCase);
    }

    const sharedSteps = new Map<string, boolean>();

    // 3. Generate Features, Steps & Page Objects
    const allKnownSteps = new Set<string>();

    for (const [featureName, cases] of Object.entries(features)) {
        // Generate Feature File with AI (Scenario by Scenario with reuse)
        const scenarios: string[] = [];

        for (const c of cases) {
            const rawSteps = (c.steps as any[]).map(s => s.action || s.text);
            // Call AI to generate concise Gherkin, reusing steps if possible
            const gherkinBlock = await generateGherkinScenario(
                c.title,
                rawSteps,
                Array.from(allKnownSteps)
            );

            // Extract generated steps to add to knownSteps for future reuse
            const lines = gherkinBlock.split('\n');
            lines.forEach(line => {
                const match = line.trim().match(/^(Given|When|Then|And)\s+(.+)$/);
                if (match) {
                    allKnownSteps.add(match[2].trim());
                }
            });

            scenarios.push(`  Scenario: ${c.title}\n${gherkinBlock}`);
        }

        const featureFileContent = `Feature: ${featureName}\n\n` + scenarios.join('\n\n') + '\n';

        const featureSlug = slugify(featureName);
        zip.addFile(`${resourcesBaseDir}/features/${featureSlug}.feature`, Buffer.from(featureFileContent));

        // Generate Step Definitions (connected to Page Objects)
        const { content: stepDefContent, hasSteps } = generateStepDefinitions(featureName, cases, sharedSteps);
        if (hasSteps) {
            zip.addFile(`${javaBaseDir}/com/autogen/steps/${toPascalCase(featureName)}Steps.java`, Buffer.from(stepDefContent));
        }

        // Generate Page Object with real selectors (await because it's async)
        const pageObjectContent = await generatePageObject(featureName, cases);
        zip.addFile(`${javaBaseDir}/com/autogen/pages/${toPascalCase(featureName)}Page.java`, Buffer.from(pageObjectContent));
    }

    return zip.toBuffer();
};
