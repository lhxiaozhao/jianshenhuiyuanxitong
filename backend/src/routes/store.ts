import { Router } from 'express';
import { listStores, getStore, createStore, updateStore, storeStats } from '../controllers/StoreController';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';

const router = Router();

router.get('/', authenticate, listStores);
router.get('/:id', authenticate, getStore);
router.get('/:id/stats', authenticate, requireRole('admin', 'frontdesk'), storeStats);
router.post('/', authenticate, requireRole('admin'), createStore);
router.put('/:id', authenticate, requireRole('admin'), updateStore);

export default router;
