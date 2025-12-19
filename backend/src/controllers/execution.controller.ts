import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { runPlaywright } from '../services/execution.service';

export const triggerExecution = async (req: Request, res: Response) => {
    try {
        const { projectId, testCaseIds } = req.body;

        if (!projectId) {
            return res.status(400).json({ error: 'projectId is required' });
        }

        if (testCaseIds && (!Array.isArray(testCaseIds) || testCaseIds.some((id: unknown) => typeof id !== 'string'))) {
            return res.status(400).json({ error: 'testCaseIds must be an array of strings' });
        }

        // Get test cases to execute
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { testCases: true }
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const casesToRun = testCaseIds && testCaseIds.length > 0
            ? project.testCases.filter(tc => testCaseIds.includes(tc.id))
            : project.testCases;

        if (casesToRun.length === 0) {
            return res.status(400).json({ error: 'No test cases to execute' });
        }

        // Create one execution per test case
        const executionPromises = casesToRun.map(async (testCase) => {
            const executionId = `exec-${Date.now()}-${testCase.id.slice(-8)}`;
            const videoUrl = `/media/video/${executionId}`;

            const execution = await prisma.execution.create({
                data: {
                    id: executionId,
                    projectId,
                    testCaseId: testCase.id, // NEW: Link to specific test case
                    status: 'RUNNING',
                    videoUrl,
                    testCaseIds: [testCase.id], // For backward compatibility
                },
            });

            // Trigger async execution for this single test case
            runPlaywright(execution.id, projectId, [testCase.id]).catch(console.error);

            return execution;
        });

        const executions = await Promise.all(executionPromises);

        res.json({
            message: `Started ${executions.length} execution(s)`,
            executions: executions.map(e => ({
                executionId: e.id,
                testCaseId: e.testCaseId,
                status: 'RUNNING',
                videoUrl: e.videoUrl
            }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error triggering execution' });
    }
};

export const getExecutionStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const execution = await prisma.execution.findUnique({ where: { id } });
        if (!execution) return res.status(404).json({ error: 'Execution not found' });
        res.json(execution);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching status' });
    }
};

export const clearExecutions = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;

        await prisma.execution.deleteMany({
            where: { projectId }
        });

        res.json({ message: 'Executions cleared', projectId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to clear executions' });
    }
};

export const retryExecution = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const existing = await prisma.execution.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Execution not found' });

        const executionId = `exec-${Date.now()}${existing.testCaseId ? '-' + existing.testCaseId.slice(-8) : ''}`;
        const videoUrl = `/media/video/${executionId}`;

        await prisma.execution.create({
            data: {
                id: executionId,
                projectId: existing.projectId,
                testCaseId: existing.testCaseId || null, // NEW: Preserve testCaseId
                status: 'RUNNING',
                videoUrl,
                testCaseIds: existing.testCaseIds || [],
            },
        });

        runPlaywright(executionId, existing.projectId, existing.testCaseIds).catch(console.error);

        res.json({ executionId, status: 'RUNNING', videoUrl });
    } catch (error) {
        console.error('Retry execution error', error);
        res.status(500).json({ error: 'Error retrying execution' });
    }
};
