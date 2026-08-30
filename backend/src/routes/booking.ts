import { Router } from 'express';
import { listBookings, createBooking, cancelBooking, confirmBooking } from '../controllers/BookingController';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';

const router = Router();

router.get('/', authenticate, listBookings);
router.post('/', authenticate, requireRole('admin', 'frontdesk', 'trainer', 'member'), createBooking);
router.put('/:id/cancel', authenticate, requireRole('admin', 'frontdesk', 'trainer', 'member'), cancelBooking);
router.put('/:id/confirm', authenticate, requireRole('admin', 'trainer'), confirmBooking);

export default router;
