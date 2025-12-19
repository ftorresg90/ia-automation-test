import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { deleteTestCase } from '../controllers/testcase.controller';

const router = Router();

router.delete('/:id', authenticate, deleteTestCase);

export default router;
