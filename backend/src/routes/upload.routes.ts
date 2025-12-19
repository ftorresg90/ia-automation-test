import { Router } from 'express';
import { upload } from '../middleware/upload.middleware';
import { uploadFile } from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, upload.single('file'), uploadFile);

export default router;
