import { SystemConfig, PointsAccount, PointsRecord } from '../models';
import { sequelize } from '../config/database';
import { Op } from 'sequelize';
import type { Transaction as SequelizeTransaction } from 'sequelize';

const DEFAULT_POINTS_PER_YUAN = 1;
const DEFAULT_POINTS_VALID_DAYS = 365;

export interface PointsConfig {
  pointsPerYuan: number;
  pointsValidDays: number;
}

export async function getPointsConfig(): Promise<PointsConfig> {
  const configs = await SystemConfig.findAll();
  const map = new Map(configs.map((c) => [c.key, c.value]));
  return {
    pointsPerYuan: Number(map.get('points_per_yuan')) || DEFAULT_POINTS_PER_YUAN,
    pointsValidDays: Number(map.get('points_valid_days')) || DEFAULT_POINTS_VALID_DAYS,
  };
}

export async function updatePointsConfig(partial: Partial<PointsConfig>): Promise<PointsConfig> {
  const current = await getPointsConfig();
  const next: PointsConfig = {
    pointsPerYuan: partial.pointsPerYuan ?? current.pointsPerYuan,
    pointsValidDays: partial.pointsValidDays ?? current.pointsValidDays,
  };
  const entries: Array<[string, string]> = [
    ['points_per_yuan', String(next.pointsPerYuan)],
    ['points_valid_days', String(next.pointsValidDays)],
  ];
  for (const [key, value] of entries) {
    const existing = await SystemConfig.findOne({ where: { key } });
    if (existing) {
      await existing.update({ value });
    } else {
      await SystemConfig.create({ key, value });
    }
  }
  return next;
}

export async function earnPoints(
  memberId: number,
  orderId: number | null,
  amount: number,
  transaction?: SequelizeTransaction
): Promise<number> {
  const config = await getPointsConfig();
  const earned = Math.floor(amount) * config.pointsPerYuan;
  if (earned <= 0) {
    return 0;
  }

  let account = await PointsAccount.findOne({ where: { memberId }, transaction });
  if (!account) {
    account = await PointsAccount.create({ memberId, balance: 0 }, { transaction });
  }
  const locked = await PointsAccount.findByPk(account.id, { lock: transaction?.LOCK.UPDATE, transaction });
  const newBalance = Number((locked ?? account).balance) + earned;
  await (locked ?? account).update({ balance: newBalance }, { transaction });

  const expireAt = new Date();
  expireAt.setDate(expireAt.getDate() + config.pointsValidDays);
  await PointsRecord.create(
    { memberId, type: 'earn', points: earned, orderId, expireAt },
    { transaction }
  );
  return earned;
}

export async function recoverPoints(
  memberId: number,
  orderId: number | null,
  amount: number,
  transaction?: SequelizeTransaction
): Promise<number> {
  const config = await getPointsConfig();
  const recovered = Math.floor(amount) * config.pointsPerYuan;
  if (recovered <= 0) {
    return 0;
  }

  const account = await PointsAccount.findOne({ where: { memberId }, transaction });
  if (!account) {
    return 0;
  }
  const locked = await PointsAccount.findByPk(account.id, { lock: transaction?.LOCK.UPDATE, transaction });
  const newBalance = Math.max(Number((locked ?? account).balance) - recovered, 0);
  await (locked ?? account).update({ balance: newBalance }, { transaction });
  await PointsRecord.create(
    { memberId, type: 'spend', points: -recovered, orderId },
    { transaction }
  );
  return recovered;
}

export async function expireOverduePoints(transaction?: SequelizeTransaction): Promise<number> {
  const now = new Date();
  const overdueRecords = await PointsRecord.findAll({
    where: { type: 'earn', expireAt: { [Op.lt]: now }, expiredAt: null },
    transaction,
  });
  if (overdueRecords.length === 0) {
    return 0;
  }

  const grouped = new Map<number, number>();
  for (const record of overdueRecords) {
    grouped.set(record.memberId, (grouped.get(record.memberId) ?? 0) + record.points);
  }

  let totalExpired = 0;
  for (const [memberId, points] of grouped) {
    const account = await PointsAccount.findOne({ where: { memberId }, transaction });
    if (!account) {
      continue;
    }
    const locked = await PointsAccount.findByPk(account.id, { lock: transaction?.LOCK.UPDATE, transaction });
    const current = Number((locked ?? account).balance);
    const deduct = Math.min(points, current);
    if (deduct <= 0) {
      continue;
    }
    await (locked ?? account).update({ balance: current - deduct }, { transaction });
    await PointsRecord.create(
      { memberId, type: 'expire', points: -deduct },
      { transaction }
    );
    totalExpired += deduct;
  }

  await PointsRecord.update(
    { expiredAt: now },
    { where: { id: { [Op.in]: overdueRecords.map((r) => r.id) } }, transaction }
  );
  return totalExpired;
}

export { sequelize };
