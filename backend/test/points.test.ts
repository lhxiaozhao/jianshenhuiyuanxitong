import { beforeAll, describe, expect, it } from 'vitest';
import { initTestDb, request, app } from './helpers';
import { loginAs, registerMember, auth } from './helpers';
import { PointsRecord } from '../src/models';

describe('积分业务', () => {
  let frontToken = '';
  let adminToken = '';

  beforeAll(async () => {
    await initTestDb();
    frontToken = await loginAs('frontdesk');
    adminToken = await loginAs('admin');
  });

  async function createMemberWithPoints(payAmount: number): Promise<{ id: number; phone: string }> {
    const member = await registerMember(frontToken);
    await request(app).post(`/api/wallets/${member.id}/recharge`).set(auth(frontToken)).send({ amount: payAmount, payMethod: 'cash' });
    await request(app).post(`/api/wallets/${member.id}/pay`).set(auth(frontToken)).send({ amount: payAmount, description: '消费赚积分' });
    return member;
  }

  async function createBenefit(name: string, pointsCost: number, type: string): Promise<number> {
    const res = await request(app).post('/api/benefits').set(auth(adminToken)).send({ name, pointsCost, type });
    return res.body.id as number;
  }

  it('消费赚取的积分记录携带过期时间', async () => {
    const member = await createMemberWithPoints(50);
    const accountRes = await request(app).get(`/api/points/${member.id}`).set(auth(frontToken));

    expect(accountRes.body.balance).toBe(50);
    const earn = accountRes.body.records.find((r: { type: string }) => r.type === 'earn');
    expect(earn).toBeTruthy();
    expect(earn.expireAt).toBeTruthy();
    expect(new Date(earn.expireAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('积分兑换成功扣减余额并生成兑换记录', async () => {
    const member = await createMemberWithPoints(50);
    const benefitId = await createBenefit('兑换测试权益', 20, 'test');

    const res = await request(app).post(`/api/points/${member.id}/exchange`).set(auth(frontToken)).send({ benefitId });
    expect(res.status).toBe(201);
    expect(res.body.balance).toBe(30);

    const accountRes = await request(app).get(`/api/points/${member.id}`).set(auth(frontToken));
    expect(accountRes.body.balance).toBe(30);
    expect(accountRes.body.exchanges.some((e: { benefitId: number }) => e.benefitId === benefitId)).toBe(true);
    expect(accountRes.body.records.some((r: { type: string; points: number }) => r.type === 'spend' && r.points === -20)).toBe(true);
  });

  it('积分不足时兑换被拒绝', async () => {
    const member = await createMemberWithPoints(30);
    const benefitId = await createBenefit('高价权益', 500, 'trial');

    const res = await request(app).post(`/api/points/${member.id}/exchange`).set(auth(frontToken)).send({ benefitId });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INSUFFICIENT_POINTS');
  });

  it('已下架权益无法兑换', async () => {
    const member = await createMemberWithPoints(50);
    const benefitId = await createBenefit('将下架权益', 10, 'coupon');
    await request(app).put(`/api/benefits/${benefitId}/status`).set(auth(adminToken)).send({ status: 0 });

    const res = await request(app).post(`/api/points/${member.id}/exchange`).set(auth(frontToken)).send({ benefitId });
    expect(res.status).toBe(404);
  });

  it('过期积分自动扣除并标记', async () => {
    const member = await createMemberWithPoints(60);
    const accountBefore = await request(app).get(`/api/points/${member.id}`).set(auth(frontToken));
    const earnRecord = accountBefore.body.records.find((r: { type: string }) => r.type === 'earn');
    expect(earnRecord).toBeTruthy();

    const past = new Date(Date.now() - 86400000).toISOString();
    await PointsRecord.update({ expireAt: past }, { where: { id: earnRecord.id } });

    const expireRes = await request(app).post('/api/points/expire-run').set(auth(adminToken));
    expect(expireRes.status).toBe(200);
    expect(expireRes.body.expired).toBe(60);

    const accountAfter = await request(app).get(`/api/points/${member.id}`).set(auth(frontToken));
    expect(accountAfter.body.balance).toBe(0);
    expect(accountAfter.body.records.some((r: { type: string }) => r.type === 'expire')).toBe(true);
  });

  it('积分规则仅管理员可更新且校验参数', async () => {
    const rulesRes = await request(app).get('/api/points/rules').set(auth(frontToken));
    expect(rulesRes.status).toBe(200);
    expect(rulesRes.body.pointsPerYuan).toBeGreaterThanOrEqual(1);

    const forbidden = await request(app).put('/api/points/rules').set(auth(frontToken)).send({ pointsPerYuan: 2 });
    expect(forbidden.status).toBe(403);

    const invalid = await request(app).put('/api/points/rules').set(auth(adminToken)).send({ pointsValidDays: 0 });
    expect(invalid.status).toBe(400);

    const update = await request(app).put('/api/points/rules').set(auth(adminToken)).send({ pointsPerYuan: 2 });
    expect(update.status).toBe(200);
    expect(update.body.pointsPerYuan).toBe(2);

    await request(app).put('/api/points/rules').set(auth(adminToken)).send({ pointsPerYuan: 1 });
  });

  it('前台更新积分规则被 RBAC 拒绝', async () => {
    const res = await request(app).put('/api/points/rules').set(auth(frontToken)).send({ pointsPerYuan: 3 });
    expect(res.status).toBe(403);
  });
});
