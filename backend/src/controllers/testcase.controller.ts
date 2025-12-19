import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const deleteTestCase = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const organizationId = req.user?.organizationId;

        const testCase = await prisma.testCase.findUnique({
            where: { id },
            include: { project: true }
        });

        if (!testCase) {
            return res.status(404).json({ error: 'Test case not found' });
        }

        if (!organizationId || testCase.project.organizationId !== organizationId) {
            return res.status(403).json({ error: 'Unauthorized to delete this test case' });
        }

        await prisma.testCase.delete({ where: { id } });

        res.json({ message: 'Test case deleted', testCaseId: id });
    } catch (error) {
        console.error('Error deleting test case', error);
        res.status(500).json({ error: 'Failed to delete test case' });
    }
};
