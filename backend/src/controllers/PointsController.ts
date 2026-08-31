import { Request, Response, NextFunction } from 'express';
import { Member, PointsAccount, PointsRecord, PointExchange, Benefit, sequelize } from '../models';
import { ApiError } from '../utils/ApiError';
import { writeOperationLog } from '../middlewares/operationLog';
import { getPointsConfig, updatePointsConfig, expireOverduePoints } from '../services/PointsService';

function assertMemberSelf(req: Request, memberId: number): void {
  if (req.user!.role === 'member' && req.user!.id !== memberId) {
    throw ApiError.forbidden('只能操作自己的积分账户');
  }
}

export async function getPointsAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const memberId = Number(req.params.memberId);
    assertMemberSelf(req, memberId);
    const member = await Member.findByPk(memberId);
    if (!member) {
      throw ApiError.notFound('会员不存在');
    }

    await expireOverduePoints();

    const account = await PointsAccount.findOne({ where: { memberId: member.id } });
    const records = await PointsRecord.findAll({
      where: { memberId: member.id },
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    const exchanges = await PointExchange.findAll({
      where: { memberId: member.id },
      include: [{ model: Benefit, as: 'benefit', attributes: ['id', 'name', 'pointsCost', 'type'] }],
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    res.json({
      balance: account ? Number(account.balance) : 0,
      records,
      exchanges,
    });
  } catch (err) {
    next(err);
  }
}

export async function exchange(req: Request, res: Response, next: NextFunction): Promise<void> {
  const transaction = await sequelize.transaction();
  try {
    const memberId = Number(req.params.memberId);
    assertMemberSelf(req, memberId);
    const member = await Member.findByPk(memberId, { transaction });
    if (!member) {
      throw ApiError.notFound('会员不存在');
    }
    if (member.status !== 1) {
      throw ApiError.forbidden('会员已被停用，无法兑换');
    }

    const benefitId = Number(req.body.benefitId);
    const benefit = await Benefit.findOne({ where: { id: benefitId, status: 1 }, transaction });
    if (!benefit) {
      throw ApiError.notFound('权益项目不存在或已下架');
    }

    let account = await PointsAccount.findOne({ where: { memberId: member.id }, transaction });
    if (!account) {
      account = await PointsAccount.create({ memberId: member.id, balance: 0 }, { transaction });
    }
    const locked = await PointsAccount.findByPk(account.id, { lock: transaction.LOCK.UPDATE, transaction });
    if (!locked || Number(locked.balance) < Number(benefit.pointsCost)) {
      throw ApiError.conflict('积分不足，无法兑换', 'INSUFFICIENT_POINTS');
    }

    const newBalance = Number(locked.balance) - Number(benefit.pointsCost);
    await locked.update({ balance: newBalance }, { transaction });
    const exchangeRecord = await PointExchange.create(
      { memberId: member.id, benefitId: benefit.id, pointsCost: Number(benefit.pointsCost) },
      { transaction }
    );
    await PointsRecord.create(
      { memberId: member.id, type: 'spend', points: -Number(benefit.pointsCost) },
      { transaction }
    );

    await transaction.commit();
    await writeOperationLog(req.user, '积分兑换', `会员 ${member.memberNo} 兑换权益「${benefit.name}」`);
    res.status(201).json({ exchange: exchangeRecord, balance: newBalance });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
}

export async function getRules(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const config = await getPointsConfig();
    res.json(config);
  } catch (err) {
    next(err);
  }
}

export async function updateRules(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { pointsPerYuan, pointsValidDays } = req.body;
    const next: { pointsPerYuan?: number; pointsValidDays?: number } = {};
    if (pointsPerYuan !== undefined) {
      const value = Number(pointsPerYuan);
      if (!Number.isInteger(value) || value <= 0) {
        throw ApiError.badRequest('积分规则必须为正整数');
      }
      next.pointsPerYuan = value;
    }
    if (pointsValidDays !== undefined) {
      const value = Number(pointsValidDays);
      if (!Number.isInteger(value) || value <= 0) {
        throw ApiError.badRequest('积分有效期天数必须为正整数');
      }
      next.pointsValidDays = value;
    }
    if (Object.keys(next).length === 0) {
      throw ApiError.badRequest('没有可更新的规则');
    }
    const config = await updatePointsConfig(next);
    await writeOperationLog(req.user, '积分规则配置', JSON.stringify(next));
    res.json(config);
  } catch (err) {
    next(err);
  }
}

export async function expireRun(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const expired = await expireOverduePoints();
    res.json({ expired });
  } catch (err) {
    next(err);
  }
}
