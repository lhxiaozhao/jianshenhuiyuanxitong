import { Router } from 'express';
import authRoutes from './auth';
import storeRoutes from './store';
import memberRoutes from './member';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/stores', storeRoutes);
router.use('/members', memberRoutes);

export default router;
