import { Router } from 'express';
import { generateFramework } from '../controllers/generator.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/:projectId', authenticate, generateFramework);

export default router;
