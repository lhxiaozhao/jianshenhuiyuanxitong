import { Router } from 'express';
import authRoutes from './auth';
import storeRoutes from './store';
import memberRoutes from './member';
import cardTypeRoutes from './cardType';
import membershipRoutes from './membership';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/stores', storeRoutes);
router.use('/members', memberRoutes);
router.use('/card-types', cardTypeRoutes);
router.use(membershipRoutes);

export default router;
