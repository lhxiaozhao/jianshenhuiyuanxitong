import { Router } from 'express';
import { getPointsAccount, exchange, getRules, updateRules, expireRun } from '../controllers/PointsController';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';

const router = Router();

router.get('/rules', authenticate, requireRole('admin', 'frontdesk', 'member'), getRules);
router.put('/rules', authenticate, requireRole('admin'), updateRules);
router.post('/expire-run', authenticate, requireRole('admin'), expireRun);
router.get('/:memberId', authenticate, requireRole('admin', 'frontdesk', 'trainer', 'member'), getPointsAccount);
router.post('/:memberId/exchange', authenticate, requireRole('admin', 'frontdesk', 'member'), exchange);

export default router;
