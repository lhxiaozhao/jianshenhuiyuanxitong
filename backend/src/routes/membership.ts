import { Router } from 'express';
import { listExpiringMemberships } from '../controllers/MembershipController';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';

const router = Router();

router.get('/memberships/expiring', authenticate, requireRole('admin', 'frontdesk'), listExpiringMemberships);

export default router;
