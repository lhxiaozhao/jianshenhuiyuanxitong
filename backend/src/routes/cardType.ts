import { Router } from 'express';
import { listCardTypes, createCardType, updateCardType, updateCardTypeStatus } from '../controllers/CardTypeController';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';

const router = Router();

router.get('/', authenticate, listCardTypes);
router.post('/', authenticate, requireRole('admin'), createCardType);
router.put('/:id', authenticate, requireRole('admin'), updateCardType);
router.put('/:id/status', authenticate, requireRole('admin'), updateCardTypeStatus);

export default router;
