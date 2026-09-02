import { Router } from 'express';
import { listTrainers } from '../controllers/UserController';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';

const router = Router();

router.get('/trainers', authenticate, requireRole('admin', 'frontdesk', 'trainer'), listTrainers);

export default router;
