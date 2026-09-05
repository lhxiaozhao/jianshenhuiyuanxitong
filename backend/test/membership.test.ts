import { beforeAll, describe, expect, it } from 'vitest';
import { initTestDb, request, app } from './helpers';
import { loginAs, registerMember, auth } from './helpers';
import { Membership } from '../src/models';

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

describe('会籍业务', () => {
  beforeAll(async () => {
    await initTestDb();
  });

  it('购卡成功创建已支付订单与生效会籍', async () => {
    const token = await loginAs('frontdesk');
    const member = await registerMember(token);

    const res = await request(app)
      .post(`/api/members/${member.id}/cards`)
      .set(auth(token))
      .send({ cardTypeId: 1, payMethod: 'wechat' });

    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe('paid');
    expect(res.body.order.type).toBe('card');
    expect(res.body.membership.status).toBe('active');
  });

  it('购买下架卡类型返回 409', async () => {
    const token = await loginAs('admin');
    const member = await registerMember(await loginAs('frontdesk'));

    const createRes = await request(app)
      .post('/api/card-types')
      .set(auth(token))
      .send({ name: '临时下架卡', durationDays: 10, price: 100 });
    const cardTypeId = createRes.body.id;
    await request(app).put(`/api/card-types/${cardTypeId}/status`).set(auth(token)).send({ status: 0 });

    const buyRes = await request(app).post(`/api/members/${member.id}/cards`).set(auth(await loginAs('frontdesk'))).send({ cardTypeId });
    expect(buyRes.status).toBe(409);
    expect(buyRes.body.code).toBe('CARD_TYPE_OFF_SHELF');
  });

  it('重复购买同类型卡续期延长结束日期', async () => {
    const token = await loginAs('frontdesk');
    const member = await registerMember(token);

    const first = await request(app).post(`/api/members/${member.id}/cards`).set(auth(token)).send({ cardTypeId: 1 });
    const second = await request(app).post(`/api/members/${member.id}/cards`).set(auth(token)).send({ cardTypeId: 1 });

    const firstEnd = first.body.membership.endDate;
    const secondEnd = second.body.membership.endDate;
    expect(new Date(secondEnd).getTime()).toBeGreaterThan(new Date(firstEnd).getTime());
  });

  it('卡类型不适用于会员所属门店时拒绝购卡', async () => {
    const adminToken = await loginAs('admin');
    const frontToken = await loginAs('frontdesk');
    const member = await registerMember(frontToken);

    const createRes = await request(app)
      .post('/api/card-types')
      .set(auth(adminToken))
      .send({ name: '分店专用卡', durationDays: 30, price: 200, storeId: 2 });

    const buyRes = await request(app)
      .post(`/api/members/${member.id}/cards`)
      .set(auth(frontToken))
      .send({ cardTypeId: createRes.body.id });
    expect(buyRes.status).toBe(403);
  });

  it('到期会籍查询时自动置为过期', async () => {
    const token = await loginAs('frontdesk');
    const member = await registerMember(token);

    const buyRes = await request(app).post(`/api/members/${member.id}/cards`).set(auth(token)).send({ cardTypeId: 1 });
    const membershipId = buyRes.body.membership.id;

    await Membership.update({ endDate: addDays(new Date(), -1) }, { where: { id: membershipId } });

    const listRes = await request(app).get(`/api/members/${member.id}/memberships`).set(auth(token));
    const target = listRes.body.list.find((m: { id: number }) => m.id === membershipId);
    expect(target.status).toBe('expired');
  });

  it('即将到期接口返回 7 天内到期的会籍', async () => {
    const token = await loginAs('frontdesk');
    const member = await registerMember(token);

    const buyRes = await request(app).post(`/api/members/${member.id}/cards`).set(auth(token)).send({ cardTypeId: 1 });
    const membershipId = buyRes.body.membership.id;
    const nearEnd = addDays(new Date(), 3);
    await Membership.update({ endDate: nearEnd }, { where: { id: membershipId } });

    const expiringRes = await request(app).get('/api/memberships/expiring').set(auth(await loginAs('admin')));
    expect(expiringRes.status).toBe(200);
    const found = expiringRes.body.list.some((m: { id: number }) => m.id === membershipId);
    expect(found).toBe(true);
  });

  it('会籍记录可追溯卡类型与会员', async () => {
    const token = await loginAs('frontdesk');
    const member = await registerMember(token);
    await request(app).post(`/api/members/${member.id}/cards`).set(auth(token)).send({ cardTypeId: 1 });

    const membership = await Membership.findOne({
      where: { memberId: member.id },
      include: [{ association: 'cardType' }, { association: 'member' }],
      order: [['id', 'DESC']],
    });
    expect(membership).toBeTruthy();
    expect(membership!.cardType).toBeTruthy();
    expect((membership! as unknown as { cardType: { name: string } }).cardType.name).toBeTruthy();
    expect((membership! as unknown as { member: { name: string } }).member.name).toBe(member.name);
  });
});
