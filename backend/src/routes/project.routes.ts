import { Router } from 'express';
import { createProject, getProjects, getProject, deleteProject } from '../controllers/project.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validationMiddleware';
import { createProjectSchema } from '../schemas/project.schema';

const router = Router();

router.post('/', authenticate, validateRequest(createProjectSchema), createProject);
router.get('/', authenticate, getProjects);
router.get('/:id', authenticate, getProject);
router.delete('/:id', authenticate, deleteProject);

export default router;
