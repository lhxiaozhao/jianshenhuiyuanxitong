import { Router } from 'express';
import authRoutes from './auth';
import storeRoutes from './store';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/stores', storeRoutes);

export default router;
