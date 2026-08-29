import { Request, Response, NextFunction } from 'express';
import { Store, Member, Course, Booking } from '../models';
import { ApiError } from '../utils/ApiError';
import { writeOperationLog } from '../middlewares/operationLog';
import { Op } from 'sequelize';

export async function listStores(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const where: Record<string, unknown> = {};
    if (user.role !== 'admin' && user.storeId) {
      where.id = user.storeId;
    }
    const stores = await Store.findAll({ where, order: [['id', 'ASC']] });
    res.json({ list: stores });
  } catch (err) {
    next(err);
  }
}

export async function getStore(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const store = await Store.findByPk(req.params.id);
    if (!store) {
      throw ApiError.notFound('门店不存在');
    }
    res.json(store);
  } catch (err) {
    next(err);
  }
}

export async function createStore(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, address, phone, businessHours } = req.body;
    if (!name) {
      throw ApiError.badRequest('门店名称不能为空');
    }
    const store = await Store.create({ name, address, phone, businessHours });
    await writeOperationLog(req.user, '创建门店', `创建门店 ${name}`);
    res.status(201).json(store);
  } catch (err) {
    next(err);
  }
}

export async function updateStore(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const store = await Store.findByPk(req.params.id);
    if (!store) {
      throw ApiError.notFound('门店不存在');
    }
    const { name, address, phone, businessHours, status } = req.body;
    await store.update({ name, address, phone, businessHours, status });
    await writeOperationLog(req.user, '修改门店', `修改门店 ${store.name}`);
    res.json(store);
  } catch (err) {
    next(err);
  }
}

export async function storeStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = Number(req.params.id);
    const store = await Store.findByPk(storeId);
    if (!store) {
      throw ApiError.notFound('门店不存在');
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [memberCount, newMemberCount, bookingCount] = await Promise.all([
      Member.count({ where: { storeId } }),
      Member.count({ where: { storeId, createdAt: { [Op.gte]: todayStart } } }),
      Booking.count({
        where: {
          status: { [Op.ne]: 'cancelled' },
        },
        include: [{ model: Course, as: 'course', where: { storeId } }],
      }),
    ]);

    res.json({ storeId, memberCount, newMemberCount, bookingCount });
  } catch (err) {
    next(err);
  }
}
