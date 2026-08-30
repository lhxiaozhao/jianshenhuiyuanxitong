import { Request, Response, NextFunction } from 'express';
import { Member, CardType, Membership, Order, sequelize } from '../models';
import { ApiError } from '../utils/ApiError';
import { writeOperationLog } from '../middlewares/operationLog';
import { Op } from 'sequelize';

const EXPIRING_SOON_DAYS = 7;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function expireOverdueMemberships(): Promise<number> {
  const today = todayStr();
  const [affected] = await Membership.update(
    { status: 'expired' },
    { where: { status: 'active', endDate: { [Op.lt]: today } } }
  );
  return affected;
}

export async function listMemberships(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await expireOverdueMemberships();
    const memberId = req.params.id;
    const memberships = await Membership.findAll({
      where: { memberId },
      include: [{ association: 'cardType' }],
      order: [['id', 'DESC']],
    });
    res.json({ list: memberships });
  } catch (err) {
    next(err);
  }
}

export async function listExpiringMemberships(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await expireOverdueMemberships();
    const today = todayStr();
    const limitDate = addDays(new Date(), EXPIRING_SOON_DAYS).toISOString().slice(0, 10);
    const memberships = await Membership.findAll({
      where: {
        status: 'active',
        endDate: { [Op.between]: [today, limitDate] },
      },
      include: [
        { association: 'cardType' },
        { association: 'member' },
      ],
      order: [['endDate', 'ASC']],
    });
    res.json({ list: memberships });
  } catch (err) {
    next(err);
  }
}

export async function purchaseCard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const transaction = await sequelize.transaction();
  try {
    const member = await Member.findByPk(req.params.id, { transaction });
    if (!member) {
      throw ApiError.notFound('会员不存在');
    }
    if (member.status !== 1) {
      throw ApiError.forbidden('会员已被停用，无法购卡');
    }

    const { cardTypeId, payMethod } = req.body;
    if (!cardTypeId) {
      throw ApiError.badRequest('缺少卡类型');
    }
    const cardType = await CardType.findByPk(cardTypeId, { transaction });
    if (!cardType) {
      throw ApiError.notFound('卡类型不存在');
    }
    if (cardType.status !== 1) {
      throw ApiError.conflict('该卡类型已下架', 'CARD_TYPE_OFF_SHELF');
    }
    if (cardType.storeId && cardType.storeId !== member.storeId) {
      throw ApiError.forbidden('该卡类型不适用于本门店');
    }

    const orderNo = `C${Date.now()}`;
    const order = await Order.create(
      {
        orderNo,
        memberId: member.id,
        type: 'card',
        amount: Number(cardType.price),
        payMethod: payMethod || 'cash',
        status: 'paid',
        storeId: member.storeId,
      },
      { transaction }
    );

    const today = new Date();
    const existing = await Membership.findOne({
      where: { memberId: member.id, cardTypeId: cardType.id, status: 'active' },
      transaction,
    });

    let membership: Membership;
    if (existing) {
      const baseDate = new Date(existing.endDate);
      const effectiveStart = baseDate.getTime() > today.getTime() ? baseDate : today;
      const newEndDate = addDays(effectiveStart, cardType.durationDays);
      await existing.update({ endDate: newEndDate.toISOString().slice(0, 10), status: 'active' }, { transaction });
      membership = existing;
    } else {
      const startDate = today;
      const endDate = addDays(startDate, cardType.durationDays);
      membership = await Membership.create(
        {
          memberId: member.id,
          cardTypeId: cardType.id,
          storeId: member.storeId,
          startDate: startDate.toISOString().slice(0, 10),
          endDate: endDate.toISOString().slice(0, 10),
          status: 'active',
        },
        { transaction }
      );
    }

    await transaction.commit();
    await writeOperationLog(req.user, '会员购卡', `会员 ${member.memberNo} 购买 ${cardType.name}`);
    res.status(201).json({ order, membership });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
}
