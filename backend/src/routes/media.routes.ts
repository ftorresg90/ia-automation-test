import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

const buildExecutionPath = (...segments: string[]) => {
    return path.join(__dirname, '..', '..', 'execution-temp', ...segments);
};

router.get('/video/:executionId', (req: Request, res: Response) => {
    try {
        const { executionId } = req.params;
        const videoPath = buildExecutionPath(executionId, 'video.webm');

        if (fs.existsSync(videoPath)) {
            const stat = fs.statSync(videoPath);
            const fileSize = stat.size;
            const range = req.headers.range;

            if (range) {
                const parts = range.replace(/bytes=/, '').split('-');
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

                if (start >= fileSize || end >= fileSize) {
                    res.status(416).set({
                        'Content-Range': `bytes */${fileSize}`
                    }).end();
                    return;
                }

                const chunkSize = (end - start) + 1;
                const stream = fs.createReadStream(videoPath, { start, end });
                res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunkSize,
                    'Content-Type': 'video/webm'
                });
                stream.pipe(res);
            } else {
                res.writeHead(200, {
                    'Content-Length': fileSize,
                    'Content-Type': 'video/webm'
                });
                fs.createReadStream(videoPath).pipe(res);
            }
        } else {
            res.status(404).json({ error: 'Video not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error serving video' });
    }
});

router.get('/screenshot/:executionId', (req, res: Response) => {
    try {
        const { executionId } = req.params;
        const screenshotPath = buildExecutionPath(executionId, 'screenshot.png');

        if (fs.existsSync(screenshotPath)) {
            res.sendFile(screenshotPath);
        } else {
            res.status(404).json({ error: 'Screenshot not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error serving screenshot' });
    }
});

export default router;
