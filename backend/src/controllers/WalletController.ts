import { Request, Response, NextFunction } from 'express';
import { Member, Wallet, Transaction, Order, PointsAccount, PointsRecord, sequelize } from '../models';
import { ApiError } from '../utils/ApiError';
import { writeOperationLog } from '../middlewares/operationLog';
import { Op } from 'sequelize';
import type { WhereOptions } from 'sequelize';

const POINTS_PER_YUAN = 1;

async function ensureWallet(memberId: number, transaction?: unknown): Promise<Wallet> {
  let wallet = await Wallet.findOne({ where: { memberId }, transaction: transaction as never });
  if (!wallet) {
    wallet = await Wallet.create({ memberId, balance: 0 }, { transaction: transaction as never });
  }
  return wallet;
}

async function ensurePointsAccount(memberId: number, transaction?: unknown): Promise<PointsAccount> {
  let account = await PointsAccount.findOne({ where: { memberId }, transaction: transaction as never });
  if (!account) {
    account = await PointsAccount.create({ memberId, balance: 0 }, { transaction: transaction as never });
  }
  return account;
}

function assertMemberSelf(req: Request, memberId: number): void {
  if (req.user!.role === 'member' && req.user!.id !== memberId) {
    throw ApiError.forbidden('只能操作自己的钱包');
  }
}

export async function getWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const memberId = Number(req.params.memberId);
    assertMemberSelf(req, memberId);
    const member = await Member.findByPk(memberId);
    if (!member) {
      throw ApiError.notFound('会员不存在');
    }
    const wallet = await ensureWallet(member.id);
    const pointsAccount = await ensurePointsAccount(member.id);
    res.json({ balance: Number(wallet.balance), points: pointsAccount.balance });
  } catch (err) {
    next(err);
  }
}

export async function recharge(req: Request, res: Response, next: NextFunction): Promise<void> {
  const transaction = await sequelize.transaction();
  try {
    const memberId = Number(req.params.memberId);
    assertMemberSelf(req, memberId);
    const member = await Member.findByPk(memberId, { transaction });
    if (!member) {
      throw ApiError.notFound('会员不存在');
    }
    if (member.status !== 1) {
      throw ApiError.forbidden('会员已被停用，无法充值');
    }

    const { amount, payMethod } = req.body;
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      throw ApiError.badRequest('充值金额必须大于 0');
    }
    const method = ['cash', 'wechat', 'alipay'].includes(payMethod) ? payMethod : 'cash';

    const orderNo = `R${Date.now()}`;
    const order = await Order.create(
      { orderNo, memberId: member.id, type: 'recharge', amount: amountNum, payMethod: method, status: 'paid', storeId: member.storeId },
      { transaction }
    );

    const wallet = await ensureWallet(member.id, transaction);
    const newBalance = Number(wallet.balance) + amountNum;
    await wallet.update({ balance: newBalance }, { transaction });
    await Transaction.create(
      { memberId: member.id, walletId: wallet.id, type: 'recharge', amount: amountNum, orderId: order.id },
      { transaction }
    );

    await transaction.commit();
    await writeOperationLog(req.user, '余额充值', `会员 ${member.memberNo} 充值 ${amountNum} 元`);
    res.status(201).json({ order, balance: newBalance });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
}

export async function pay(req: Request, res: Response, next: NextFunction): Promise<void> {
  const transaction = await sequelize.transaction();
  try {
    const memberId = Number(req.params.memberId);
    const member = await Member.findByPk(memberId, { transaction });
    if (!member) {
      throw ApiError.notFound('会员不存在');
    }
    if (member.status !== 1) {
      throw ApiError.forbidden('会员已被停用，无法消费');
    }

    const { amount, description } = req.body;
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      throw ApiError.badRequest('消费金额必须大于 0');
    }

    const wallet = await ensureWallet(member.id, transaction);
    const lockedWallet = await Wallet.findByPk(wallet.id, { lock: transaction.LOCK.UPDATE, transaction });
    if (!lockedWallet) {
      throw ApiError.notFound('钱包不存在');
    }
    if (Number(lockedWallet.balance) < amountNum) {
      throw ApiError.conflict('余额不足', 'INSUFFICIENT_BALANCE');
    }

    const orderNo = `P${Date.now()}`;
    const order = await Order.create(
      { orderNo, memberId: member.id, type: 'course', amount: amountNum, payMethod: 'balance', status: 'paid', storeId: member.storeId },
      { transaction }
    );

    const newBalance = Number(lockedWallet.balance) - amountNum;
    await lockedWallet.update({ balance: newBalance }, { transaction });
    await Transaction.create(
      { memberId: member.id, walletId: lockedWallet.id, type: 'consume', amount: -amountNum, orderId: order.id },
      { transaction }
    );

    const earned = Math.floor(amountNum) * POINTS_PER_YUAN;
    if (earned > 0) {
      const pointsAccount = await ensurePointsAccount(member.id, transaction);
      const lockedPoints = await PointsAccount.findByPk(pointsAccount.id, { lock: transaction.LOCK.UPDATE, transaction });
      if (lockedPoints) {
        const newPoints = Number(lockedPoints.balance) + earned;
        await lockedPoints.update({ balance: newPoints }, { transaction });
        await PointsRecord.create(
          { memberId: member.id, type: 'earn', points: earned, orderId: order.id },
          { transaction }
        );
      }
    }

    await transaction.commit();
    await writeOperationLog(req.user, '余额消费', `会员 ${member.memberNo} 消费 ${amountNum} 元${description ? ` (${description})` : ''}`);
    res.status(201).json({ order, balance: newBalance, pointsEarned: earned });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
}

export async function refund(req: Request, res: Response, next: NextFunction): Promise<void> {
  const transaction = await sequelize.transaction();
  try {
    const memberId = Number(req.params.memberId);
    const member = await Member.findByPk(memberId, { transaction });
    if (!member) {
      throw ApiError.notFound('会员不存在');
    }

    const { transactionId } = req.body;
    if (!transactionId) {
      throw ApiError.badRequest('缺少消费流水');
    }

    const consumeTx = await Transaction.findOne({
      where: { id: transactionId, memberId: member.id, type: 'consume' },
      transaction,
    });
    if (!consumeTx) {
      throw ApiError.notFound('消费流水不存在');
    }

    const existingRefund = await Transaction.findOne({
      where: { orderId: consumeTx.orderId, type: 'refund' },
      transaction,
    });
    if (existingRefund) {
      throw ApiError.conflict('该笔消费已退款', 'ALREADY_REFUNDED');
    }

    const refundAmount = Math.abs(Number(consumeTx.amount));
    const wallet = await ensureWallet(member.id, transaction);
    const lockedWallet = await Wallet.findByPk(wallet.id, { lock: transaction.LOCK.UPDATE, transaction });
    if (!lockedWallet) {
      throw ApiError.notFound('钱包不存在');
    }
    const newBalance = Number(lockedWallet.balance) + refundAmount;
    await lockedWallet.update({ balance: newBalance }, { transaction });
    await Transaction.create(
      { memberId: member.id, walletId: lockedWallet.id, type: 'refund', amount: refundAmount, orderId: consumeTx.orderId },
      { transaction }
    );

    const earned = Math.floor(refundAmount) * POINTS_PER_YUAN;
    if (earned > 0) {
      const pointsAccount = await ensurePointsAccount(member.id, transaction);
      const lockedPoints = await PointsAccount.findByPk(pointsAccount.id, { lock: transaction.LOCK.UPDATE, transaction });
      if (lockedPoints) {
        const newPoints = Math.max(Number(lockedPoints.balance) - earned, 0);
        await lockedPoints.update({ balance: newPoints }, { transaction });
        await PointsRecord.create(
          { memberId: member.id, type: 'spend', points: -earned, orderId: consumeTx.orderId },
          { transaction }
        );
      }
    }

    await transaction.commit();
    await writeOperationLog(req.user, '退款', `会员 ${member.memberNo} 退款 ${refundAmount} 元`);
    res.json({ refundAmount, balance: newBalance });
  } catch (err) {
    await transaction.rollback();
    next(err);
  }
}

export async function listTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const memberId = Number(req.params.memberId);
    assertMemberSelf(req, memberId);
    const member = await Member.findByPk(memberId);
    if (!member) {
      throw ApiError.notFound('会员不存在');
    }

    const { type, startDate, endDate } = req.query;
    const where: WhereOptions = { memberId: member.id };
    if (type) {
      where.type = String(type);
    }
    if (startDate || endDate) {
      const createdAt: WhereOptions =
        startDate && endDate
          ? ({
              [Op.gte]: new Date(String(startDate)),
              [Op.lte]: new Date(`${String(endDate)} 23:59:59`),
            } as WhereOptions)
          : startDate
            ? ({ [Op.gte]: new Date(String(startDate)) } as WhereOptions)
            : ({ [Op.lte]: new Date(`${String(endDate)} 23:59:59`) } as WhereOptions);
      where.createdAt = createdAt;
    }

    const transactions = await Transaction.findAll({
      where,
      include: [{ model: Order, as: 'order', attributes: ['orderNo', 'type', 'payMethod'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ list: transactions });
  } catch (err) {
    next(err);
  }
}
