import { Router } from 'express';
import { listCourses, getCourse, createCourse, updateCourse } from '../controllers/CourseController';
import { authenticate } from '../middlewares/auth';
import { requireRole } from '../middlewares/rbac';

const router = Router();

router.get('/', authenticate, listCourses);
router.get('/:id', authenticate, getCourse);
router.post('/', authenticate, requireRole('admin', 'trainer'), createCourse);
router.put('/:id', authenticate, requireRole('admin', 'trainer'), updateCourse);

export default router;
