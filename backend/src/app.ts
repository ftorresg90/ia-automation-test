import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import uploadRoutes from './routes/upload.routes';
import generatorRoutes from './routes/generator.routes';
import executionRoutes from './routes/execution.routes';
import projectRoutes from './routes/project.routes';
import testCaseRoutes from './routes/testcase.routes';
import mediaRoutes from './routes/media.routes';
import visualRoutes from './routes/visual.routes';

const app = express();

const corsOptions = {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', corsOptions.methods?.join(', ') || 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', corsOptions.allowedHeaders?.join(', ') || 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});
app.use(express.json({ limit: '50mb' })); // Increase limit for images

app.use('/auth', authRoutes);
app.use('/upload', uploadRoutes);
app.use('/generate', generatorRoutes);
app.use('/execution', executionRoutes);
app.use('/projects', projectRoutes);
app.use('/testcases', testCaseRoutes);
app.use('/media', mediaRoutes);
app.use('/validations', visualRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
