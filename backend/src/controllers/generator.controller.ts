import { Request, Response } from 'express';
import { generateProjectZip } from '../services/generator.service';

export const generateFramework = async (req: Request, res: Response) => {
    try {
        const { projectId } = req.params;
        const buildTool = (req.query.buildTool as 'maven' | 'gradle') || 'maven';

        console.log(`[Generator] Generating framework for project ${projectId} with ${buildTool}`);

        const zipBuffer = await generateProjectZip(projectId, buildTool);

        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', `attachment; filename=framework-${projectId}.zip`);
        res.send(zipBuffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error generating framework' });
    }
};
