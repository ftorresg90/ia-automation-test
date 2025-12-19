
import { Router } from 'express';
import { validateVisual } from '../controllers/visual.controller';

const router = Router();

router.post('/visual', validateVisual);

export default router;
