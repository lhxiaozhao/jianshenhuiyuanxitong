import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { Member, Wallet, PointsAccount, Membership, Booking, sequelize } from '../models';
import { ApiError } from '../utils/ApiError';
import { writeOperationLog } from '../middlewares/operationLog';
import { Op } from 'sequelize';
import type { WhereOptions } from 'sequelize';

async function generateMemberNo(): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `M${dateStr}`;
  const count = await Member.count({ where: { memberNo: { [Op.like]: `${prefix}%` } } });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
}

export async function listMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const { keyword, status } = req.query;
    const baseWhere: Record<string, unknown> = {};

    if (user.role !== 'admin' && user.storeId) {
      baseWhere.storeId = user.storeId;
    }
    if (status !== undefined && status !== '') {
      baseWhere.status = Number(status);
    }
    const where: WhereOptions = keyword
      ? {
          ...baseWhere,
          [Op.or]: [
            { name: { [Op.like]: `%${keyword}%` } },
            { phone: { [Op.like]: `%${keyword}%` } },
            { memberNo: { [Op.like]: `%${keyword}%` } },
          ],
        }
      : baseWhere;

    const { rows, count } = await Member.findAndCountAll({
      where,
      include: [
        { model: Membership, as: 'memberships', required: false },
        { model: Wallet, as: 'wallet', required: false },
        { model: PointsAccount, as: 'pointsAccount', required: false },
      ],
      order: [['id', 'DESC']],
      distinct: true,
    });

    res.json({ list: rows, total: count });
  } catch (err) {
    next(err);
  }
}

export async function getMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = await Member.findByPk(req.params.id, {
      include: [
        { model: Membership, as: 'memberships', include: [{ association: 'cardType' }] },
        { model: Wallet, as: 'wallet' },
        { model: PointsAccount, as: 'pointsAccount' },
        { model: Booking, as: 'bookings', include: [{ association: 'course' }] },
      ],
    });
    if (!member) {
      throw ApiError.notFound('会员不存在');
    }
    res.json(member);
  } catch (err) {
    next(err);
  }
}

export async function createMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  const transaction = await sequelize.transaction();
  try {
    const user = req.user!;
    const { name, phone, gender, birthday, idCard, emergencyContact, emergencyPhone } = req.body;

    if (!name || !phone) {
      throw ApiError.badRequest('姓名和手机号不能为空');
    }
    if (!/^1\d{10}$/.test(phone)) {
      throw ApiError.badRequest('手机号格式不正确');
    }

    const exist = await Member.findOne({ where: { phone } });
    if (exist) {
      throw ApiError.conflict('该手机号已注册', 'PHONE_EXISTS');
    }

    const storeId = user.role === 'admin' ? Number(req.body.storeId) || null : user.storeId;
    if (!storeId) {
      throw ApiError.badRequest('缺少归属门店');
    }

    const memberNo = await generateMemberNo();
    const passwordHash = await bcrypt.hash(phone.slice(-6), 10);

    const member = await Member.create(
      { memberNo, name, phone, passwordHash, gender, birthday, idCard, emergencyContact, emergencyPhone, storeId },
      { transaction }
    );
    await Wallet.create({ memberId: member.id, balance: 0 }, { transaction });
    await PointsAccount.create({ memberId: member.id, balance: 0 }, { transaction });

    await transaction.commit();
    await writeOperationLog(req.user, '注册会员', `注册会员 ${name} (${phone})`);
    res.status(201).json(member);
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
}

export async function updateMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) {
      throw ApiError.notFound('会员不存在');
    }
    const { name, gender, birthday, idCard, emergencyContact, emergencyPhone } = req.body;
    await member.update({ name, gender, birthday, idCard, emergencyContact, emergencyPhone });
    await writeOperationLog(req.user, '修改会员资料', `修改会员 ${member.memberNo}`);
    res.json(member);
  } catch (err) {
    next(err);
  }
}

export async function updateMemberStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) {
      throw ApiError.notFound('会员不存在');
    }
    const { status } = req.body;
    if (status !== 0 && status !== 1) {
      throw ApiError.badRequest('状态值不合法');
    }
    await member.update({ status });
    await writeOperationLog(req.user, status === 1 ? '启用会员' : '停用会员', `会员 ${member.memberNo} 状态变更为 ${status}`);
    res.json(member);
  } catch (err) {
    next(err);
  }
}
