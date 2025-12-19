import { exec, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import prisma from '../utils/prisma';
import { generateSelector } from './selector.service';

const EXECUTION_DIR = path.join(os.tmpdir(), 'execution-temp');

if (!fs.existsSync(EXECUTION_DIR)) {
  fs.mkdirSync(EXECUTION_DIR, { recursive: true });
}

const runningExecutions = new Map<string, ChildProcess>();

export const stopExecutionProcess = (executionId: string): boolean => {
  const process = runningExecutions.get(executionId);
  if (process) {
    try {
      process.kill('SIGTERM');
    } catch (error) {
      console.warn(`Failed to terminate execution ${executionId}`, error);
    }
    runningExecutions.delete(executionId);
    return true;
  }
  return false;
};

export const createExecution = async (projectId: string) => {
  const executionId = `exec-${Date.now()}`;
  const videoUrl = `/media/video/${executionId}`;

  const exec = await prisma.execution.create({
    data: {
      id: executionId,
      projectId,
      status: 'PENDING',
      videoUrl, // Always set videoUrl from the start
    },
  });

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { testCases: true },
  });

  return exec;
};

// Old helper functions removed as they are replaced by playwright-generator.service.ts


export const runPlaywright = async (executionId: string, projectId: string, testCaseIds?: string[]) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { testCases: true },
  });

  if (!project) throw new Error('Project not found');

  const casesToRun = testCaseIds && testCaseIds.length > 0
    ? project.testCases.filter(tc => testCaseIds.includes(tc.id))
    : project.testCases;

  if (!casesToRun.length) {
    await prisma.execution.update({
      where: { id: executionId },
      data: {
        status: 'FAILED',
        logs: 'No test cases selected for execution',
      },
    });
    return;
  }

  const executionDir = path.join(EXECUTION_DIR, executionId);
  const artifactsDir = path.join(executionDir, 'artifacts');
  const playwrightOutputDir = path.join(executionDir, 'test-results');
  const traceDir = path.join(executionDir, 'traces');
  fs.mkdirSync(executionDir, { recursive: true });
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.mkdirSync(playwrightOutputDir, { recursive: true });
  fs.mkdirSync(traceDir, { recursive: true });

  // Create Pages directory
  const pagesDir = path.join(executionDir, 'pages');
  fs.mkdirSync(pagesDir, { recursive: true });

  // Copy BasePage.ts template
  const basePageTemplatePath = path.join(__dirname, '../templates/BasePage.ts');
  if (fs.existsSync(basePageTemplatePath)) {
    fs.copyFileSync(basePageTemplatePath, path.join(pagesDir, 'BasePage.ts'));
  } else {
    console.warn('BasePage.ts template not found at', basePageTemplatePath);
  }

  const { generatePlaywrightPOM } = await import('./playwright-generator.service');

  // Transform project data for the generator if needed, but the generator accepts { name, testCases } which matches project structure mostly.
  const { testSpec, pageObjects } = await generatePlaywrightPOM(
    { name: project.name, testCases: casesToRun },
    executionId
  );

  // Write Page Objects
  for (const po of pageObjects) {
    fs.writeFileSync(path.join(executionDir, po.path), po.content);
  }

  console.log('---------------------------------------------------');
  console.log(`[Execution ${executionId}] Starting Playwright Execution (POM)`);
  console.log('---------------------------------------------------');

  const testFileContent = testSpec;


  const testFilePath = path.join(executionDir, `test-${executionId}.spec.ts`);
  fs.writeFileSync(testFilePath, testFileContent);

  // 2. Update Status
  await prisma.execution.update({
    where: { id: executionId },
    data: { status: 'RUNNING' },
  });

  // 3. Execute
  const reportPath = path.join(executionDir, 'test-report.json');
  const env = {
    ...process.env,
    PLAYWRIGHT_JSON_OUTPUT_NAME: reportPath
  };
  // Explicitly use the config file
  const projectRoot = process.cwd();
  const configPath = './playwright.config.ts'; // Use relative path since we run from projectRoot
  const relativeTestPath = path.relative(projectRoot, testFilePath);

  const command = `npx playwright test "${relativeTestPath}" --config "${configPath}" --output "${playwrightOutputDir}" --reporter=line --reporter=json`;

  console.log(`[Execution ${executionId}] Executing command: ${command}`);

  const childProcess = exec(command, { cwd: projectRoot, env }, async (error, stdout, stderr) => {
    runningExecutions.delete(executionId);
    const status = error ? 'FAILED' : 'PASSED';
    const logs = stdout + '\n' + stderr;

    console.log(`[Execution ${executionId}] Finished with status: ${status}`);
    console.log(`[Execution ${executionId}] Playwright output dir: ${playwrightOutputDir}`);

    try {
      fs.writeFileSync(path.join(executionDir, 'playwright.log'), logs);
    } catch (logError) {
      console.error('Failed to write execution log file', logError);
    }
    const videoUrl = `/media/video/${executionId}`;

    // DEBUG: List all files in output dir
    console.log(`[Execution ${executionId}] Debugging Playwright artifacts in: ${playwrightOutputDir}`);
    const logFiles = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            logFiles(full);
          } else {
            console.log(`[Execution ${executionId}] Found file: ${full}`);
          }
        }
      } catch (e) { console.log(`[Execution ${executionId}] failed to read dir ${dir}`); }
    };
    logFiles(playwrightOutputDir);

    const findVideoFile = (dir: string): string | null => {
      try {
        if (!fs.existsSync(dir)) return null;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const nested = findVideoFile(fullPath);
            if (nested) return nested;
          } else if (entry.isFile() && fullPath.endsWith('.webm')) {
            return fullPath;
          }
        }
      } catch (e) {
        console.error(`[Execution ${executionId}] Error reading dir ${dir}`, e);
      }
      return null;
    };

    const findTraceFile = (dir: string): string | null => {
      // ... same logic for trace
      try {
        if (!fs.existsSync(dir)) return null;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const nested = findTraceFile(fullPath);
            if (nested) return nested;
          } else if (entry.isFile() && entry.name.endsWith('trace.zip')) {
            return fullPath;
          }
        }
      } catch (e) { return null; }
      return null;
    };

    try {
      console.log(`[Execution ${executionId}] Searching for video in: ${playwrightOutputDir}`);
      const videoSource = findVideoFile(playwrightOutputDir);
      console.log(`[Execution ${executionId}] Found video source: ${videoSource}`);

      if (videoSource) {
        const videoDest = path.join(executionDir, 'video.webm');
        fs.copyFileSync(videoSource, videoDest);
        console.log(`[Execution ${executionId}] Copied video to: ${videoDest}`);
        try {
          fs.unlinkSync(videoSource);
        } catch (cleanupError) {
          console.warn('Could not remove original video file', cleanupError);
        }
      } else {
        console.warn(`[Execution ${executionId}] No video file found!`);
      }

      const traceSource = findTraceFile(playwrightOutputDir);
      if (traceSource) {
        const traceDest = path.join(executionDir, 'trace.zip');
        fs.copyFileSync(traceSource, traceDest);
      }
    } catch (artifactError) {
      console.error('Error processing execution artifacts', artifactError);
    }

    let errorAnalysis: string | null = null;
    if (status === 'FAILED') {
      try {
        console.log(`[Execution ${executionId}] analyzing failure with AI...`);
        // Find a screenshot
        const files = fs.readdirSync(artifactsDir);
        const screenshot = files.find(f => f.endsWith('.png'));
        const screenshotPath = screenshot ? path.join(artifactsDir, screenshot) : undefined;

        // Clean logs to keep them within token limits (last 2000 chars approx)
        const cleanedLogs = logs.length > 2000 ? logs.slice(-2000) : logs;

        const fromAiService = await import('./ai.service');
        errorAnalysis = await fromAiService.analyzeFailure(cleanedLogs, screenshotPath);
        console.log(`[Execution ${executionId}] AI Analysis complete.`);

        // --- AUTO-HEALING START ---
        const fromHealService = await import('./heal.service');
        const healed = await fromHealService.attemptHeal(testFilePath, cleanedLogs, artifactsDir);

        if (healed) {
          errorAnalysis += "\n\n🚑 AUTO-HEAL: The system detected a fixable error and patched the test code automatically. Please re-run the test to verify.";
          // Optional: We could automatically trigger re-run here, but for safety in MVP we just notify.
          console.log(`[Execution ${executionId}] Test patched. Ready for re-run.`);
        }
        // --- AUTO-HEALING END ---

      } catch (aiError) {
        console.error('Error running AI analysis / Auto-Heal', aiError);
      }
    }

    await prisma.execution.update({
      where: { id: executionId },
      data: {
        status,
        logs,
        videoUrl: videoUrl, // Ensure this is sent
        errorAnalysis
      },
    });

    // Cleanup
    // fs.unlinkSync(testFilePath);
  });

  runningExecutions.set(executionId, childProcess);
  childProcess.on('exit', () => {
    runningExecutions.delete(executionId);
  });
};
