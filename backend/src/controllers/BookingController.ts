import { Request, Response, NextFunction } from 'express';
import { Booking, Course, Member, Membership, User, sequelize } from '../models';
import { ApiError } from '../utils/ApiError';
import { writeOperationLog } from '../middlewares/operationLog';
import { Op } from 'sequelize';

const PRIVATE_CANCEL_LEAD_HOURS = 2;

async function hasActiveMembership(memberId: number): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const count = await Membership.count({
    where: { memberId, status: 'active', endDate: { [Op.gte]: today } },
  });
  return count > 0;
}

function isTimeConflict(existingStart: Date, existingDuration: number, newStart: Date, newDuration: number): boolean {
  const existingEnd = new Date(existingStart.getTime() + existingDuration * 60000);
  const newEnd = new Date(newStart.getTime() + newDuration * 60000);
  return existingStart < newEnd && existingEnd > newStart;
}

export async function listBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { memberId, status } = req.query;
    const where: Record<string, unknown> = {};

    if (user.role === 'member') {
      where.memberId = user.id;
    } else if (memberId) {
      where.memberId = Number(memberId);
    }
    if (status) {
      where.status = String(status);
    }

    const include: unknown[] = [
      { model: Member, as: 'member', attributes: ['id', 'memberNo', 'name', 'phone'] },
      { model: Course, as: 'course', include: [{ model: User, as: 'trainer', attributes: ['id', 'name'] }] },
    ];

    if (user.role !== 'admin' && user.role !== 'member' && user.storeId) {
      include.push({
        model: Course,
        as: 'course',
        where: { storeId: user.storeId },
      });
    }

    const bookings = await Booking.findAll({ where, include: include as never[], order: [['bookedAt', 'DESC']] });
    res.json({ list: bookings });
  } catch (err) {
    next(err);
  }
}

export async function createBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  const transaction = await sequelize.transaction();
  try {
    const user = req.user!;
    const memberId = user.role === 'member' ? user.id : Number(req.body.memberId);
    const { courseId } = req.body;
    if (!memberId || !courseId) {
      throw ApiError.badRequest('缺少会员或课程');
    }

    const member = await Member.findByPk(memberId, { transaction });
    if (!member) {
      throw ApiError.notFound('会员不存在');
    }
    if (member.status !== 1) {
      throw ApiError.forbidden('会员已被停用，无法预约');
    }

    const course = await Course.findByPk(courseId, {
      include: [{ model: User, as: 'trainer' }],
      transaction,
    });
    if (!course) {
      throw ApiError.notFound('课程不存在');
    }
    if (course.status === 'closed') {
      throw ApiError.conflict('该课程已关闭', 'COURSE_CLOSED');
    }

    const hasMembership = await hasActiveMembership(memberId);
    if (!hasMembership) {
      throw ApiError.forbidden('会员无有效会籍，无法预约', 'NO_ACTIVE_MEMBERSHIP');
    }

    const newStart = new Date(course.startTime);
    const existingBookings = await Booking.findAll({
      where: { memberId, status: { [Op.in]: ['booked', 'waiting'] } },
      include: [{ model: Course, as: 'course' }],
      transaction,
    });
    for (const booking of existingBookings) {
      if (isTimeConflict(booking.course!.startTime, booking.course!.durationMinutes, newStart, course.durationMinutes)) {
        throw ApiError.conflict('预约时间与已预约课程冲突', 'TIME_CONFLICT');
      }
    }

    const bookedCount = await Booking.count({
      where: { courseId: course.id, status: { [Op.in]: ['booked', 'waiting'] } },
      transaction,
    });
    const capacity = course.type === 'group' ? course.capacity ?? 0 : 1;

    let status: 'booked' | 'waiting' = 'booked';
    if (bookedCount >= capacity) {
      if (course.type === 'group') {
        status = 'waiting';
      } else {
        throw ApiError.conflict('该课程已约满', 'COURSE_FULL');
      }
    }

    const booking = await Booking.create(
      { memberId, courseId, status, bookedAt: new Date() },
      { transaction }
    );

    if (status === 'booked' && course.type === 'group' && course.status !== 'full') {
      await course.update({ status: 'full' }, { transaction });
    }

    await transaction.commit();
    await writeOperationLog(req.user, status === 'waiting' ? '加入候补' : '预约课程', `会员 ${member.memberNo} 预约 ${course.name}`);
    res.status(201).json({ booking, status: booking.status });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
}

export async function cancelBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  const transaction = await sequelize.transaction();
  try {
    const user = req.user!;
    const booking = await Booking.findByPk(req.params.id, {
      include: [{ model: Course, as: 'course' }],
      transaction,
    });
    if (!booking) {
      throw ApiError.notFound('预约不存在');
    }
    if (user.role === 'member' && booking.memberId !== user.id) {
      throw ApiError.forbidden('只能取消自己的预约');
    }
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      throw ApiError.conflict('该预约已取消或已完成', 'BOOKING_FINALIZED');
    }

    if (booking.course!.type === 'private') {
      const start = new Date(booking.course!.startTime);
      const now = Date.now();
      if (start.getTime() - now < PRIVATE_CANCEL_LEAD_HOURS * 60 * 60 * 1000) {
        throw ApiError.conflict('私教课需提前 2 小时取消', 'CANCEL_TOO_LATE');
      }
    }

    const originalStatus = booking.status;
    await booking.update({ status: 'cancelled', cancelledAt: new Date() }, { transaction });

    if (originalStatus === 'waiting') {
      await transaction.commit();
      await writeOperationLog(req.user, '取消预约', `取消候补预约 #${booking.id}`);
      res.json(booking);
      return;
    }

    if (booking.course!.type === 'group') {
      const waitingBooking = await Booking.findOne({
        where: { courseId: booking.courseId, status: 'waiting' },
        order: [['bookedAt', 'ASC']],
        transaction,
      });
      if (waitingBooking) {
        await waitingBooking.update({ status: 'booked' }, { transaction });
        void writeOperationLog(user, '候补转正', `候补预约 #${waitingBooking.id} 转正`);
      }
      const newBookedCount = await Booking.count({
        where: { courseId: booking.courseId, status: { [Op.in]: ['booked', 'waiting'] } },
        transaction,
      });
      const capacity = booking.course!.capacity ?? 0;
      if (newBookedCount < capacity) {
        await booking.course!.update({ status: 'open' }, { transaction });
      }
    }

    await transaction.commit();
    await writeOperationLog(req.user, '取消预约', `取消预约 #${booking.id}`);
    res.json(booking);
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
}

export async function confirmBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const booking = await Booking.findByPk(req.params.id, {
      include: [{ model: Course, as: 'course' }],
    });
    if (!booking) {
      throw ApiError.notFound('预约不存在');
    }
    if (booking.status !== 'booked') {
      throw ApiError.conflict('只有已预约状态可以消课', 'BOOKING_NOT_BOOKED');
    }
    if (user.role === 'trainer' && booking.course!.trainerId !== user.id) {
      throw ApiError.forbidden('只能确认自己课程的消课');
    }

    await booking.update({ status: 'completed' });
    await writeOperationLog(req.user, '消课确认', `确认预约 #${booking.id} 已完成`);
    res.json(booking);
  } catch (err) {
    next(err);
  }
}
