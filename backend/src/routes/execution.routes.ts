import { Router, Response } from 'express';
import { triggerExecution, getExecutionStatus, clearExecutions, retryExecution } from '../controllers/execution.controller';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import prisma from '../utils/prisma'; // Assuming prisma client is initialized and exported from this path
import { stopExecutionProcess } from '../services/execution.service';

const router = Router();

router.post('/', authenticate, triggerExecution);

// Original get execution status route
// router.get('/:id', authenticate, getExecutionStatus);

// New/modified get execution status route from the provided snippet
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const exec = await prisma.execution.findUnique({
            where: { id },
            include: { project: true },
        });

        if (!exec) {
            return res.status(404).json({ error: 'Execution not found' });
        }

        res.json(exec);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to get execution' });
    }
});

router.post('/stop/:id', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const wasRunning = stopExecutionProcess(id);

        await prisma.execution.update({
            where: { id },
            data: {
                status: 'FAILED',
                logs: wasRunning ? 'Execution stopped by user' : 'Execution already finished'
            }
        });

        res.json({ message: wasRunning ? 'Execution stopped' : 'Execution had already finished', executionId: id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to stop execution' });
    }
});

router.delete('/project/:projectId', authenticate, clearExecutions);

router.post('/retry/:id', authenticate, retryExecution);

export default router;
