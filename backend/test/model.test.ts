import { beforeAll, describe, expect, it } from 'vitest';
import { initTestDb, request, app } from './helpers';
import { loginAs, registerMember, auth } from './helpers';

describe('模型关联与完整性', () => {
  beforeAll(async () => {
    await initTestDb();
  });

  it('种子数据就绪：门店与员工账号存在', async () => {
    const storeRes = await request(app).get('/api/stores').set(auth(await loginAs('admin')));
    expect(storeRes.status).toBe(200);
    expect(storeRes.body.list.length).toBeGreaterThan(0);
  });

  it('注册会员自动创建钱包与积分账户关联', async () => {
    const token = await loginAs('frontdesk');
    const member = await registerMember(token);

    const walletRes = await request(app).get(`/api/wallets/${member.id}`).set(auth(token));
    expect(walletRes.status).toBe(200);
    expect(Number(walletRes.body.balance)).toBe(0);
    expect(Number(walletRes.body.points)).toBe(0);
  });

  it('会员可持有会籍并关联卡类型', async () => {
    const token = await loginAs('frontdesk');
    const member = await registerMember(token);

    const buyRes = await request(app)
      .post(`/api/members/${member.id}/cards`)
      .set(auth(token))
      .send({ cardTypeId: 1, payMethod: 'cash' });
    expect(buyRes.status).toBe(201);
    expect(buyRes.body.membership.status).toBe('active');

    const listRes = await request(app).get(`/api/members/${member.id}/memberships`).set(auth(token));
    expect(listRes.status).toBe(200);
    const membership = listRes.body.list[0];
    expect(membership).toBeDefined();
    expect(membership.cardType).toBeDefined();
    expect(membership.cardType.id).toBe(buyRes.body.membership.cardTypeId);
  });

  it('门店详情统计接口返回完整计数', async () => {
    const token = await loginAs('admin');
    const storeRes = await request(app).get('/api/stores').set(auth(token));
    const storeId = storeRes.body.list[0].id;

    const statsRes = await request(app).get(`/api/stores/${storeId}/stats`).set(auth(token));
    expect(statsRes.status).toBe(200);
    expect(statsRes.body).toHaveProperty('memberCount');
    expect(statsRes.body).toHaveProperty('bookingCount');
  });
});
