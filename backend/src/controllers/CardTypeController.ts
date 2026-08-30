import { Request, Response, NextFunction } from 'express';
import { CardType } from '../models';
import { ApiError } from '../utils/ApiError';
import { writeOperationLog } from '../middlewares/operationLog';
import { Op } from 'sequelize';
import type { WhereOptions } from 'sequelize';

export async function listCardTypes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { storeId } = req.query;
    const where: WhereOptions = storeId
      ? { [Op.or]: [{ storeId: Number(storeId) }, { storeId: null }] }
      : {};
    const cardTypes = await CardType.findAll({ where, order: [['id', 'ASC']] });
    res.json({ list: cardTypes });
  } catch (err) {
    next(err);
  }
}

export async function createCardType(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, durationDays, price, storeId, benefitsDesc } = req.body;
    if (!name || !durationDays || price === undefined) {
      throw ApiError.badRequest('卡名称、时长、价格不能为空');
    }
    const cardType = await CardType.create({ name, durationDays, price, storeId: storeId ?? null, benefitsDesc });
    await writeOperationLog(req.user, '创建卡类型', `创建卡类型 ${name}`);
    res.status(201).json(cardType);
  } catch (err) {
    next(err);
  }
}

export async function updateCardType(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cardType = await CardType.findByPk(req.params.id);
    if (!cardType) {
      throw ApiError.notFound('卡类型不存在');
    }
    const { name, durationDays, price, storeId, benefitsDesc } = req.body;
    await cardType.update({ name, durationDays, price, storeId, benefitsDesc });
    await writeOperationLog(req.user, '修改卡类型', `修改卡类型 ${cardType.name}`);
    res.json(cardType);
  } catch (err) {
    next(err);
  }
}

export async function updateCardTypeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cardType = await CardType.findByPk(req.params.id);
    if (!cardType) {
      throw ApiError.notFound('卡类型不存在');
    }
    const { status } = req.body;
    if (status !== 0 && status !== 1) {
      throw ApiError.badRequest('状态值不合法');
    }
    await cardType.update({ status });
    await writeOperationLog(req.user, status === 1 ? '上架卡类型' : '下架卡类型', `卡类型 ${cardType.name} 状态变更为 ${status}`);
    res.json(cardType);
  } catch (err) {
    next(err);
  }
}
