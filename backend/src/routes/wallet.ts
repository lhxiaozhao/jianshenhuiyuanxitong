import { Router } from 'express';
import { getWallet, recharge, pay, refund, listTransactions } from '../controllers/WalletController';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';

const router = Router();

router.get('/:memberId', authenticate, requireRole('admin', 'frontdesk', 'trainer', 'member'), getWallet);
router.get('/:memberId/transactions', authenticate, requireRole('admin', 'frontdesk', 'trainer', 'member'), listTransactions);
router.post('/:memberId/recharge', authenticate, requireRole('admin', 'frontdesk', 'member'), recharge);
router.post('/:memberId/pay', authenticate, requireRole('admin', 'frontdesk'), pay);
router.post('/:memberId/refund', authenticate, requireRole('admin', 'frontdesk'), refund);

export default router;
