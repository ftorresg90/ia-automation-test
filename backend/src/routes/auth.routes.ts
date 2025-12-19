import { Router } from 'express';
import { setupAccount, login } from '../controllers/auth.controller';

const router = Router();

router.post('/setup-account', setupAccount);
// router.post('/login', login); // Login is now client-side only


export default router;
