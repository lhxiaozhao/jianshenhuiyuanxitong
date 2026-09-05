import { beforeAll, describe, expect, it } from 'vitest';
import { initTestDb, request, app } from './helpers';
import { loginAs, registerMember, auth } from './helpers';

describe('资金事务', () => {
  let frontToken = '';

  beforeAll(async () => {
    await initTestDb();
    frontToken = await loginAs('frontdesk');
  });

  async function createWalletMember(): Promise<{ id: number; phone: string }> {
    return registerMember(frontToken);
  }

  it('充值增加余额并生成充值流水', async () => {
    const member = await createWalletMember();
    const rechargeRes = await request(app)
      .post(`/api/wallets/${member.id}/recharge`)
      .set(auth(frontToken))
      .send({ amount: 100, payMethod: 'cash' });
    expect(rechargeRes.status).toBe(201);
    expect(Number(rechargeRes.body.balance)).toBe(100);

    const walletRes = await request(app).get(`/api/wallets/${member.id}`).set(auth(frontToken));
    expect(Number(walletRes.body.balance)).toBe(100);

    const txRes = await request(app).get(`/api/wallets/${member.id}/transactions`).set(auth(frontToken));
    const latest = txRes.body.list[0];
    expect(latest.type).toBe('recharge');
    expect(Number(latest.amount)).toBe(100);
  });

  it('消费扣减余额并赚取等额积分', async () => {
    const member = await createWalletMember();
    await request(app).post(`/api/wallets/${member.id}/recharge`).set(auth(frontToken)).send({ amount: 100, payMethod: 'cash' });

    const payRes = await request(app)
      .post(`/api/wallets/${member.id}/pay`)
      .set(auth(frontToken))
      .send({ amount: 40, description: '私教课费用' });
    expect(payRes.status).toBe(201);
    expect(Number(payRes.body.balance)).toBe(60);
    expect(payRes.body.pointsEarned).toBe(40);

    const walletRes = await request(app).get(`/api/wallets/${member.id}`).set(auth(frontToken));
    expect(Number(walletRes.body.points)).toBe(40);
  });

  it('余额不足消费被拒绝', async () => {
    const member = await createWalletMember();
    await request(app).post(`/api/wallets/${member.id}/recharge`).set(auth(frontToken)).send({ amount: 50, payMethod: 'cash' });

    const res = await request(app).post(`/api/wallets/${member.id}/pay`).set(auth(frontToken)).send({ amount: 200 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INSUFFICIENT_BALANCE');
  });

  it('退款恢复余额并回收积分', async () => {
    const member = await createWalletMember();
    await request(app).post(`/api/wallets/${member.id}/recharge`).set(auth(frontToken)).send({ amount: 100, payMethod: 'cash' });
    await request(app).post(`/api/wallets/${member.id}/pay`).set(auth(frontToken)).send({ amount: 40 });

    const txRes = await request(app).get(`/api/wallets/${member.id}/transactions`).set(auth(frontToken));
    const consumeTx = txRes.body.list.find((t: { type: string }) => t.type === 'consume');

    const refundRes = await request(app)
      .post(`/api/wallets/${member.id}/refund`)
      .set(auth(frontToken))
      .send({ transactionId: consumeTx.id });
    expect(refundRes.status).toBe(200);
    expect(Number(refundRes.body.balance)).toBe(100);
    expect(refundRes.body.pointsRecovered).toBe(40);

    const walletRes = await request(app).get(`/api/wallets/${member.id}`).set(auth(frontToken));
    expect(Number(walletRes.body.points)).toBe(0);
  });

  it('同一笔消费重复退款被拒绝', async () => {
    const member = await createWalletMember();
    await request(app).post(`/api/wallets/${member.id}/recharge`).set(auth(frontToken)).send({ amount: 100, payMethod: 'cash' });
    await request(app).post(`/api/wallets/${member.id}/pay`).set(auth(frontToken)).send({ amount: 30 });

    const txRes = await request(app).get(`/api/wallets/${member.id}/transactions`).set(auth(frontToken));
    const consumeTx = txRes.body.list.find((t: { type: string }) => t.type === 'consume');

    await request(app).post(`/api/wallets/${member.id}/refund`).set(auth(frontToken)).send({ transactionId: consumeTx.id });
    const second = await request(app).post(`/api/wallets/${member.id}/refund`).set(auth(frontToken)).send({ transactionId: consumeTx.id });
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('ALREADY_REFUNDED');
  });

  it('流水账单支持类型与日期筛选', async () => {
    const member = await createWalletMember();
    await request(app).post(`/api/wallets/${member.id}/recharge`).set(auth(frontToken)).send({ amount: 100, payMethod: 'cash' });
    await request(app).post(`/api/wallets/${member.id}/pay`).set(auth(frontToken)).send({ amount: 20 });

    const rechargeOnly = await request(app).get(`/api/wallets/${member.id}/transactions?type=recharge`).set(auth(frontToken));
    expect(rechargeOnly.body.list.every((t: { type: string }) => t.type === 'recharge')).toBe(true);

    const today = new Date().toISOString().slice(0, 10);
    const dated = await request(app)
      .get(`/api/wallets/${member.id}/transactions?startDate=${today}&endDate=${today}`)
      .set(auth(frontToken));
    expect(dated.status).toBe(200);
    expect(dated.body.list.length).toBeGreaterThanOrEqual(2);
  });

  it('会员只能操作自己的钱包', async () => {
    const memberA = await createWalletMember();
    const memberB = await registerMember(frontToken);

    const loginB = await request(app).post('/api/auth/login').send({ username: memberB.phone, password: memberB.phone.slice(-6) });
    const tokenB = loginB.body.token;

    const res = await request(app).post(`/api/wallets/${memberA.id}/recharge`).set(auth(tokenB)).send({ amount: 10, payMethod: 'cash' });
    expect(res.status).toBe(403);
  });

  it('停用会员无法充值', async () => {
    const member = await createWalletMember();
    await request(app).put(`/api/members/${member.id}/status`).set(auth(frontToken)).send({ status: 0 });

    const res = await request(app).post(`/api/wallets/${member.id}/recharge`).set(auth(frontToken)).send({ amount: 10, payMethod: 'cash' });
    expect(res.status).toBe(403);
  });
});
