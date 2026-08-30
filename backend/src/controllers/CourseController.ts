import { Request, Response, NextFunction } from 'express';
import { Course, User, Booking } from '../models';
import { ApiError } from '../utils/ApiError';
import { writeOperationLog } from '../middlewares/operationLog';
import { Op } from 'sequelize';

export async function listCourses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const where: Record<string, unknown> = {};
    if (user.role !== 'admin' && user.role !== 'member' && user.storeId) {
      where.storeId = user.storeId;
    }

    const courses = await Course.findAll({
      where,
      include: [
        { model: User, as: 'trainer', attributes: ['id', 'name'] },
      ],
      order: [['startTime', 'ASC']],
    });

    const list = await Promise.all(
      courses.map(async (course) => {
        const bookedCount = await Booking.count({
          where: { courseId: course.id, status: { [Op.in]: ['booked', 'waiting'] } },
        });
        const capacity = course.type === 'group' ? course.capacity ?? 0 : 1;
        return {
          ...course.toJSON(),
          bookedCount,
          remaining: Math.max(capacity - bookedCount, 0),
        };
      })
    );

    res.json({ list });
  } catch (err) {
    next(err);
  }
}

export async function getCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const course = await Course.findByPk(req.params.id, {
      include: [{ model: User, as: 'trainer', attributes: ['id', 'name'] }],
    });
    if (!course) {
      throw ApiError.notFound('课程不存在');
    }
    const bookedCount = await Booking.count({
      where: { courseId: course.id, status: { [Op.in]: ['booked', 'waiting'] } },
    });
    const capacity = course.type === 'group' ? course.capacity ?? 0 : 1;
    res.json({ ...course.toJSON(), bookedCount, remaining: Math.max(capacity - bookedCount, 0) });
  } catch (err) {
    next(err);
  }
}

export async function createCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { name, type, durationMinutes, capacity, startTime, price, storeId } = req.body;
    if (!name || !type || !durationMinutes || !startTime) {
      throw ApiError.badRequest('课程名称、类型、时长、上课时间不能为空');
    }

    const trainerId = req.body.trainerId || (user.role === 'trainer' ? user.id : null);
    if (!trainerId) {
      throw ApiError.badRequest('缺少教练');
    }
    const courseStoreId = user.role === 'admin' ? storeId || user.storeId : user.storeId;
    if (!courseStoreId) {
      throw ApiError.badRequest('缺少门店');
    }

    const course = await Course.create({
      name,
      type,
      trainerId,
      storeId: courseStoreId,
      durationMinutes,
      capacity: type === 'group' ? capacity ?? 10 : null,
      startTime,
      price: type === 'private' ? price ?? 0 : null,
    });
    await writeOperationLog(req.user, '创建课程', `创建课程 ${name}`);
    res.status(201).json(course);
  } catch (err) {
    next(err);
  }
}

export async function updateCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) {
      throw ApiError.notFound('课程不存在');
    }
    const { name, type, durationMinutes, capacity, startTime, price, status } = req.body;
    await course.update({ name, type, durationMinutes, capacity, startTime, price, status });
    await writeOperationLog(req.user, '修改课程', `修改课程 ${course.name}`);
    res.json(course);
  } catch (err) {
    next(err);
  }
}
