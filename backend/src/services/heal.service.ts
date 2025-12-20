
import fs from 'fs';
import path from 'path';
import { Project, SyntaxKind, QuoteKind } from 'ts-morph';
import { suggestFix } from './ai.service';
import { selectorRegistry } from './selector-registry.service';
import { domCache } from './dom-cache.service';
import { generateSelector } from './selector.service';

export const attemptHeal = async (entryTestPath: string, errorLog: string, artifactsDir?: string): Promise<boolean> => {
    console.log(`🚑 [Auto-Heal] analysis started...`);

    // 0. Load DOM Snapshot if available
    if (artifactsDir) {
        const domSnapshotPath = path.join(artifactsDir, 'failure-dom.json');
        if (fs.existsSync(domSnapshotPath)) {
            try {
                const snapshotData = JSON.parse(fs.readFileSync(domSnapshotPath, 'utf-8'));
                if (snapshotData.url && snapshotData.elementsByType) {
                    try {
                        const domain = new URL(snapshotData.url).hostname;
                        await domCache.save(domain, snapshotData.url, snapshotData.elementsByType);
                        console.log(`🚑 [Auto-Heal] Loaded failure DOM snapshot for ${domain}`);
                    } catch (urlError) {
                        console.warn('🚑 [Auto-Heal] Invalid URL in snapshot', urlError);
                    }
                }
            } catch (e) {
                console.error('🚑 [Auto-Heal] Failed to load DOM snapshot', e);
            }
        }
    }

    try {
        // 1. Determine which file failed from the stack trace
        // 1. Determine which file failed from the stack trace
        // We need to parse multiple lines because the first one might be BasePage.ts (which we want to skip)
        const stackLines = errorLog.split('\n');
        let targetFile = entryTestPath;
        let errorLineNo = -1;

        for (const line of stackLines) {
            const match = line.match(/at\s+([^\s()]*?\.ts):(\d+)/) || line.match(/\((.*?\.ts):(\d+)(:\d+)?\)/);
            if (match) {
                const potentialPath = match[1].trim();
                const lineNo = parseInt(match[2]);

                // SKIP: BasePage, node_modules, internal files
                if (potentialPath.includes('BasePage.ts') || potentialPath.includes('node_modules')) {
                    continue;
                }

                // Resolve path
                let resolvedPath = '';
                if (fs.existsSync(potentialPath)) {
                    resolvedPath = potentialPath;
                } else {
                    const testDir = path.dirname(entryTestPath);
                    const abs = path.resolve(testDir, potentialPath);
                    if (fs.existsSync(abs)) resolvedPath = abs;
                }

                if (resolvedPath) {
                    targetFile = resolvedPath;
                    errorLineNo = lineNo;
                    console.log(`stack trace selected: ${targetFile}:${errorLineNo}`);
                    break; // Found the first valid non-BasePage file (the Page Object)
                }
            }
        }

        console.log(`🚑 [Auto-Heal] Targeting file: ${targetFile}`);

        // Initialize ts-morph Project
        const project = new Project({
            manipulationSettings: {
                quoteKind: QuoteKind.Single,
            }
        });
        const sourceFile = project.addSourceFileAtPath(targetFile);
        const fileLines = sourceFile.getFullText().split('\n'); // Keep strictly for line referencing if needed

        // 1.5 Try Smart Selector Healing
        if (errorLineNo > 0 && fileLines.length >= errorLineNo) {
            // errorLineNo is 1-based, array is 0-based
            const failedLineIndex = errorLineNo - 1;
            const failedLine = fileLines[failedLineIndex];

            // Look for smartClick/smartFill usage
            const smartMatch = failedLine.match(/this\.smart(Click|Fill|Verify|Check|SelectOption)\(this\.(\w+)Selectors/);

            if (smartMatch) {
                const elementName = smartMatch[2]; // e.g. "botonDeBusqueda"
                console.log(`🚑 [Auto-Heal] Detected failed element: ${elementName}`);

                // Find context from previous lines (comments) or use name
                let context = elementName;
                // AST: Find the class property directly
                const classDec = sourceFile.getClasses()[0];
                const property = classDec?.getProperty(`${elementName}Selectors`);

                if (property) {
                    // Try to get comment from property
                    const ranges = property.getLeadingCommentRanges();
                    if (ranges.length > 0) {
                        context = ranges[0].getText().replace(/\/\//g, '').trim();
                    }
                }

                const logPath = path.join(path.dirname(entryTestPath), '../heal-debug.log');
                const log = (msg: string) => {
                    try { fs.appendFileSync(logPath, msg + '\n'); } catch (e) { }
                    console.log(msg);
                };

                log(`🚑 [Auto-Heal] Generating new selector for "${context}"...`);

                // Get URL from snapshot
                let pageUrl: string | undefined;
                if (artifactsDir) {
                    const domSnapshotPath = path.join(artifactsDir, 'failure-dom.json');
                    if (fs.existsSync(domSnapshotPath)) {
                        try {
                            const snapshotData = JSON.parse(fs.readFileSync(domSnapshotPath, 'utf-8'));
                            pageUrl = snapshotData.url;
                            log(`[Heal] Loaded DOM snapshot for URL: ${pageUrl}`);
                        } catch (e) { log(`[Heal] Error parsing snapshot: ${e}`); }
                    }
                }

                let excludedSelectors: string[] = [];
                if (property) {
                    const initializer = property.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);
                    if (initializer) {
                        excludedSelectors = initializer.getElements()
                            .map(e => {
                                if (e.getKind() === SyntaxKind.StringLiteral) return (e as any).getLiteralValue();
                                return e.getText().replace(/['"`]/g, '');
                            });
                        log(`[Heal] Excluding the following selectors: ${JSON.stringify(excludedSelectors)}`);
                    }
                }

                const result = await generateSelector(elementName, context, { pageUrl, excludeSelectors: excludedSelectors });
                if (result && result.best) {
                    const newSelector = result.best;
                    log(`🚑 [Auto-Heal] Found better selector: ${newSelector}`);

                    if (property) {
                        const initializer = property.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);
                        if (initializer) {
                            const currentElements = initializer.getElements()
                                .map(e => {
                                    if (e.getKind() === SyntaxKind.StringLiteral) {
                                        return (e as any).getLiteralValue();
                                    }
                                    return e.getText().replace(/['"`]/g, '');
                                });

                            if (!currentElements.includes(newSelector)) {
                                initializer.insertElement(0, `'${newSelector}'`);
                                sourceFile.saveSync();
                                log(`✅ [Auto-Heal] Applied fix to ${elementName}Selectors using AST`);

                                // Save to Registry
                                const isXpath = newSelector.startsWith('xpath=') || newSelector.startsWith('//');
                                await selectorRegistry.saveSelector(
                                    elementName,
                                    newSelector,
                                    isXpath ? 'xpath' : 'css',
                                    context
                                );

                                return true;
                            } else {
                                log(`🚑 [Auto-Heal] Generated selector already exists in the list.`);
                            }
                        }
                    }
                }
            }
        }


        // 2. Ask AI for a fix (Fallback for logic errors or non-selector issues)
        console.log('🚑 [Auto-Heal] Smart Selector approach didn\'t apply. Attempting general AI fix...');
        const fileContent = sourceFile.getFullText();
        const fix = await suggestFix(errorLog, fileContent);

        if (!fix || !fix.oldLine || !fix.newLine) {
            console.log('🚑 [Auto-Heal] AI could not determine a fix.');
            return false;
        }

        // 3. Apply Fix Logic
        // Normalize strings to ignore excessive whitespace differences
        const normalize = (s: string) => s.trim().replace(/\s+/g, ' ');
        const normalizedOld = normalize(fix.oldLine);

        // Try detailed text replacement first
        if (fileContent.includes(fix.oldLine)) {
            // Exact match
            const newContent = fileContent.replace(fix.oldLine, fix.newLine);
            fs.writeFileSync(targetFile, newContent);
            console.log(`✅ [Auto-Heal] Applied exact patch to file.`);
            return true;
        } else {
            // Fuzzy / AST statement match
            // Iterate statements in the class methods?
            // This is harder with just "oldLine" string. 
            // Fallback to line-by-line fuzzy scan.
            const lines = fileContent.split('\n');
            let foundIndex = -1;

            for (let i = 0; i < lines.length; i++) {
                if (normalize(lines[i]) === normalizedOld) {
                    foundIndex = i;
                    break;
                }
            }

            if (foundIndex !== -1) {
                lines[foundIndex] = fix.newLine;
                fs.writeFileSync(targetFile, lines.join('\n'));
                console.log(`✅ [Auto-Heal] Applied fuzzy patch to line ${foundIndex + 1}.`);
                return true;
            }

            console.log('🚑 [Auto-Heal] Could not find the line to replace even with fuzzy matching.');
            return false;
        }

    } catch (error: any) {
        console.error('🚑 [Auto-Heal] Healing failed:', error.message);
        return false;
    }
};
