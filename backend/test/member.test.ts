import { beforeAll, describe, expect, it } from 'vitest';
import { initTestDb, request, app } from './helpers';
import { loginAs, registerMember, auth, randomPhone } from './helpers';

describe('会员模块', () => {
  beforeAll(async () => {
    await initTestDb();
  });

  it('前台可注册会员并生成会员号', async () => {
    const token = await loginAs('frontdesk');
    const phone = randomPhone();
    const res = await request(app)
      .post('/api/members')
      .set(auth(token))
      .send({ name: '注册测试', phone, gender: 1, storeId: 1 });

    expect(res.status).toBe(201);
    expect(res.body.memberNo).toMatch(/^M\d{8}\d{4}$/);
    expect(res.body.status).toBe(1);
  });

  it('重复手机号注册返回 409 PHONE_EXISTS', async () => {
    const token = await loginAs('frontdesk');
    const member = await registerMember(token);
    const res = await request(app)
      .post('/api/members')
      .set(auth(token))
      .send({ name: '重复测试', phone: member.phone, storeId: 1 });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PHONE_EXISTS');
  });

  it('非法手机号注册返回 400', async () => {
    const token = await loginAs('frontdesk');
    const res = await request(app)
      .post('/api/members')
      .set(auth(token))
      .send({ name: '非法手机', phone: '12345', storeId: 1 });

    expect(res.status).toBe(400);
  });

  it('会员默认密码为手机号后六位', async () => {
    const staffToken = await loginAs('frontdesk');
    const member = await registerMember(staffToken);
    const res = await request(app).post('/api/auth/login').send({ username: member.phone, password: member.phone.slice(-6) });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('member');
  });

  it('会员可通过关键词筛选列表', async () => {
    const token = await loginAs('frontdesk');
    const member = await registerMember(token);
    const res = await request(app).get(`/api/members?keyword=${member.phone}`).set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(res.body.list.some((m: { id: number }) => m.id === member.id)).toBe(true);
  });

  it('修改会员资料生效', async () => {
    const token = await loginAs('frontdesk');
    const member = await registerMember(token);
    const res = await request(app)
      .put(`/api/members/${member.id}`)
      .set(auth(token))
      .send({ name: '改名会员', emergencyContact: '李四' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('改名会员');
    expect(res.body.emergencyContact).toBe('李四');
  });

  it('停用会员后无法登录，启用后恢复', async () => {
    const staffToken = await loginAs('frontdesk');
    const member = await registerMember(staffToken);

    const disableRes = await request(app).put(`/api/members/${member.id}/status`).set(auth(staffToken)).send({ status: 0 });
    expect(disableRes.status).toBe(200);

    const loginRes = await request(app).post('/api/auth/login').send({ username: member.phone, password: member.phone.slice(-6) });
    expect(loginRes.status).toBe(403);

    await request(app).put(`/api/members/${member.id}/status`).set(auth(staffToken)).send({ status: 1 });
    const reLogin = await request(app).post('/api/auth/login').send({ username: member.phone, password: member.phone.slice(-6) });
    expect(reLogin.status).toBe(200);
  });

  it('停用会员无法购卡', async () => {
    const staffToken = await loginAs('frontdesk');
    const member = await registerMember(staffToken);
    await request(app).put(`/api/members/${member.id}/status`).set(auth(staffToken)).send({ status: 0 });

    const res = await request(app).post(`/api/members/${member.id}/cards`).set(auth(staffToken)).send({ cardTypeId: 1 });
    expect(res.status).toBe(403);
  });

  it('会员角色访问员工会员列表被拒绝', async () => {
    const staffToken = await loginAs('frontdesk');
    const member = await registerMember(staffToken);
    const memberToken = await (async () => {
      const res = await request(app).post('/api/auth/login').send({ username: member.phone, password: member.phone.slice(-6) });
      return res.body.token;
    })();
    const res = await request(app).get('/api/members').set(auth(memberToken));
    expect(res.status).toBe(403);
  });

  it('前台只能查看本门店会员（数据隔离）', async () => {
    const token = await loginAs('frontdesk');
    const res = await request(app).get('/api/members').set(auth(token));
    expect(res.status).toBe(200);
    const storeIds = res.body.list.map((m: { storeId: number }) => m.storeId);
    expect(storeIds.every((id: number) => id === 1)).toBe(true);
  });
});
