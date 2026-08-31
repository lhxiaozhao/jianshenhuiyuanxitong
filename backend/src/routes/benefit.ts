import { Router } from 'express';
import { listBenefits, createBenefit, updateBenefit, updateBenefitStatus } from '../controllers/BenefitController';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';

const router = Router();

router.get('/', authenticate, requireRole('admin', 'frontdesk', 'trainer', 'member'), listBenefits);
router.post('/', authenticate, requireRole('admin'), createBenefit);
router.put('/:id', authenticate, requireRole('admin'), updateBenefit);
router.put('/:id/status', authenticate, requireRole('admin'), updateBenefitStatus);

export default router;
