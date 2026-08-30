import { Router } from 'express';
import { listMembers, getMember, createMember, updateMember, updateMemberStatus } from '../controllers/MemberController';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';

const router = Router();

router.get('/', authenticate, requireRole('admin', 'frontdesk'), listMembers);
router.get('/:id', authenticate, requireRole('admin', 'frontdesk'), getMember);
router.post('/', authenticate, requireRole('admin', 'frontdesk'), createMember);
router.put('/:id', authenticate, requireRole('admin', 'frontdesk'), updateMember);
router.put('/:id/status', authenticate, requireRole('admin', 'frontdesk'), updateMemberStatus);

export default router;
