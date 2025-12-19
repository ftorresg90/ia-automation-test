import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const createProject = async (req: AuthRequest, res: Response) => {
    try {
        const { name, description } = req.body;
        const organizationId = req.user?.organizationId;

        if (!organizationId) {
            return res.status(400).json({ error: 'User not in organization' });
        }

        const project = await prisma.project.create({
            data: {
                name,
                description,
                organizationId,
            },
        });

        res.json(project);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creating project' });
    }
};

export const getProjects = async (req: AuthRequest, res: Response) => {
    try {
        const organizationId = req.user?.organizationId;
        const projects = await prisma.project.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { testCases: true, executions: true },
                },
            },
        });
        res.json(projects);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching projects' });
    }
};

export const getProject = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        console.log('Fetching project:', id);

        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                testCases: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        executions: {
                            orderBy: { createdAt: 'desc' },
                            take: 1, // Get only the latest execution per test case
                        }
                    }
                },
                executions: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });

        if (!project) {
            console.log('Project not found:', id);
            return res.status(404).json({ error: 'Project not found' });
        }

        // Transform test cases to include latestExecution
        const testCasesWithLatestExecution = project.testCases.map(tc => ({
            ...tc,
            latestExecution: tc.executions[0] || null,
            executions: undefined // Remove executions array from response
        }));

        console.log('Project fetched successfully:', project.id, 'with', project.executions.length, 'executions');
        res.json({
            ...project,
            testCases: testCasesWithLatestExecution
        });
    } catch (error: any) {
        console.error('Error fetching project:', error);
        console.error('Error details:', error.message, error.stack);
        res.status(500).json({ error: 'Error fetching project', details: error.message });
    }
};

export const deleteProject = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const organizationId = req.user?.organizationId;

        if (!organizationId) {
            return res.status(400).json({ error: 'User not in organization' });
        }

        const project = await prisma.project.findFirst({
            where: { id, organizationId },
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        await prisma.$transaction([
            prisma.execution.deleteMany({ where: { projectId: id } }),
            prisma.testCase.deleteMany({ where: { projectId: id } }),
            prisma.project.delete({ where: { id } }),
        ]);

        res.json({ message: 'Project deleted', projectId: id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error deleting project' });
    }
};
