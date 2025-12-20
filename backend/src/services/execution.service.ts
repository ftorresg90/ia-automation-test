import { exec, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import prisma from '../utils/prisma';
import { generateSelector } from './selector.service';
import { uploadArtifact } from './storage.service';

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
  const projectRoot = process.cwd();
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

  const playwrightPackagePath = path.join(projectRoot, 'node_modules/@playwright/test');
  const testFileContent = testSpec.replace(/from '@playwright\/test'/g, `from '${playwrightPackagePath}'`);

  const testFilePath = path.join(executionDir, `test-${executionId}.spec.ts`);
  fs.writeFileSync(testFilePath, testFileContent);

  // 2. Update Status
  await prisma.execution.update({
    where: { id: executionId },
    data: { status: 'RUNNING' },
  });

  // 3. Execute
  const reportPath = path.join(executionDir, 'test-report.json');

  // Create a local playwright config in the execution directory
  const localConfigPath = path.join(executionDir, 'playwright.config.ts');
  const localConfigContent = `
import { defineConfig } from '${playwrightPackagePath}';
export default defineConfig({
  testDir: './',
  testMatch: '**/*.spec.ts',
  use: {
    video: 'on',
    screenshot: 'on',
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
  },
  timeout: 60000,
  expect: { timeout: 10000 },
});
`;
  fs.writeFileSync(localConfigPath, localConfigContent);

  const env = {
    ...process.env,
    NODE_PATH: path.join(projectRoot, 'node_modules'),
    PLAYWRIGHT_JSON_OUTPUT_NAME: reportPath
  };

  const playwrightBin = path.join(projectRoot, 'node_modules/.bin/playwright');
  const command = `"${playwrightBin}" test "${testFilePath}" --config "${localConfigPath}" --output "${playwrightOutputDir}" --reporter=line --reporter=json`;

  console.log(`[Execution ${executionId}] Executing command: ${command}`);

  const runCommand = (): Promise<{ status: 'PASSED' | 'FAILED', stdout: string, stderr: string }> => {
    const projectRoot = process.cwd();
    return new Promise((resolve) => {
      const child = exec(command, { cwd: projectRoot, env }, (error, stdout, stderr) => {
        runningExecutions.delete(executionId);
        resolve({
          status: error ? 'FAILED' : 'PASSED',
          stdout,
          stderr
        });
      });
      runningExecutions.set(executionId, child);
    });
  };

  const { status, stdout, stderr } = await runCommand();
  const logs = stdout + '\n' + stderr;

  if (status === 'FAILED') {
    console.log(`[Execution ${executionId}] --- PLAYWRIGHT FAILURE LOGS ---`);
    console.log(logs);
    console.log(`[Execution ${executionId}] -----------------------------`);
  }

  console.log(`[Execution ${executionId}] Finished with status: ${status}`);

  // Wait a bit for file system to flush artifacts
  await new Promise(resolve => setTimeout(resolve, 3000));

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
        } else if (entry.isFile() && (fullPath.endsWith('.webm') || fullPath.endsWith('.mp4'))) {
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

  let cloudVideoUrl: string | null = null;
  let cloudScreenshotUrl: string | null = null;

  try {
    console.log(`[Execution ${executionId}] Searching for artifacts in: ${playwrightOutputDir} and ${executionDir}`);
    const videoSource = findVideoFile(playwrightOutputDir) || findVideoFile(executionDir);

    if (videoSource) {
      console.log(`[Execution ${executionId}] Found video source: ${videoSource}. Uploading...`);
      cloudVideoUrl = await uploadArtifact(videoSource);
    } else {
      console.warn(`[Execution ${executionId}] No video file found in output dir.`);
    }

    // Try to find a screenshot as well
    const findScreenshotFile = (dir: string): string | null => {
      try {
        if (!fs.existsSync(dir)) return null;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const nested = findScreenshotFile(fullPath);
            if (nested) return nested;
          } else if (entry.isFile() && fullPath.endsWith('.png')) {
            return fullPath;
          }
        }
      } catch (e) { return null; }
      return null;
    };

    const screenshotSource = findScreenshotFile(playwrightOutputDir) || findScreenshotFile(executionDir);
    if (screenshotSource) {
      console.log(`[Execution ${executionId}] Found screenshot source: ${screenshotSource}. Uploading...`);
      cloudScreenshotUrl = await uploadArtifact(screenshotSource);
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

  await (prisma.execution as any).update({
    where: { id: executionId },
    data: {
      status,
      logs,
      videoUrl: cloudVideoUrl,
      screenshotUrl: cloudScreenshotUrl,
      errorAnalysis
    },
  });

  // Cleanup temp files (optional - keeping for debug now)
  // try { fs.rmSync(executionDir, { recursive: true, force: true }); } catch (e) {}
};
