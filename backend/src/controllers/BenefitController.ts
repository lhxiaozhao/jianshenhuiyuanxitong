import { Request, Response, NextFunction } from 'express';
import { Benefit } from '../models';
import { ApiError } from '../utils/ApiError';
import { writeOperationLog } from '../middlewares/operationLog';

const BENEFIT_TYPES = ['coupon', 'trial', 'test'];

export async function listBenefits(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { all } = req.query;
    const where = all === '1' ? {} : { status: 1 };
    const benefits = await Benefit.findAll({ where, order: [['id', 'ASC']] });
    res.json({ list: benefits });
  } catch (err) {
    next(err);
  }
}

export async function createBenefit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, pointsCost, type } = req.body;
    if (!name || !pointsCost) {
      throw ApiError.badRequest('权益名称和所需积分不能为空');
    }
    if (!BENEFIT_TYPES.includes(type)) {
      throw ApiError.badRequest('权益类型不合法');
    }
    const cost = Number(pointsCost);
    if (!Number.isInteger(cost) || cost <= 0) {
      throw ApiError.badRequest('所需积分必须为正整数');
    }
    const benefit = await Benefit.create({ name, pointsCost: cost, type });
    await writeOperationLog(req.user, '创建权益', `创建权益「${name}」`);
    res.status(201).json(benefit);
  } catch (err) {
    next(err);
  }
}

export async function updateBenefit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const benefit = await Benefit.findByPk(req.params.id);
    if (!benefit) {
      throw ApiError.notFound('权益项目不存在');
    }
    const { name, pointsCost, type } = req.body;
    if (name !== undefined) {
      benefit.name = name;
    }
    if (pointsCost !== undefined) {
      const cost = Number(pointsCost);
      if (!Number.isInteger(cost) || cost <= 0) {
        throw ApiError.badRequest('所需积分必须为正整数');
      }
      benefit.pointsCost = cost;
    }
    if (type !== undefined) {
      if (!BENEFIT_TYPES.includes(type)) {
        throw ApiError.badRequest('权益类型不合法');
      }
      benefit.type = type;
    }
    await benefit.save();
    await writeOperationLog(req.user, '修改权益', `修改权益「${benefit.name}」`);
    res.json(benefit);
  } catch (err) {
    next(err);
  }
}

export async function updateBenefitStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const benefit = await Benefit.findByPk(req.params.id);
    if (!benefit) {
      throw ApiError.notFound('权益项目不存在');
    }
    const { status } = req.body;
    if (status !== 0 && status !== 1) {
      throw ApiError.badRequest('状态值不合法');
    }
    await benefit.update({ status });
    await writeOperationLog(req.user, status === 1 ? '上架权益' : '下架权益', `权益「${benefit.name}」状态变更为 ${status}`);
    res.json(benefit);
  } catch (err) {
    next(err);
  }
}
