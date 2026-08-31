import { Router } from 'express';
import authRoutes from './auth';
import storeRoutes from './store';
import memberRoutes from './member';
import cardTypeRoutes from './cardType';
import membershipRoutes from './membership';
import courseRoutes from './course';
import bookingRoutes from './booking';
import walletRoutes from './wallet';
import pointsRoutes from './points';
import benefitRoutes from './benefit';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/stores', storeRoutes);
router.use('/members', memberRoutes);
router.use('/card-types', cardTypeRoutes);
router.use('/courses', courseRoutes);
router.use('/bookings', bookingRoutes);
router.use('/wallets', walletRoutes);
router.use('/points', pointsRoutes);
router.use('/benefits', benefitRoutes);
router.use(membershipRoutes);

export default router;
