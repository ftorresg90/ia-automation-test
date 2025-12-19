
import { Request, Response } from 'express';
import { performVisualCheck } from '../services/ai.service';

export const validateVisual = async (req: Request, res: Response) => {
    try {
        const { image, prompt } = req.body;

        if (!image || !prompt) {
            return res.status(400).json({ error: 'Missing image (base64) or prompt' });
        }

        // Remove header if present (data:image/png;base64,...)
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

        const result = await performVisualCheck(base64Data, prompt);

        res.json(result);
    } catch (error: any) {
        console.error('Visual validation error:', error);
        res.status(500).json({ error: error.message });
    }
};
