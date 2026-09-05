import { beforeAll, describe, expect, it } from 'vitest';
import { initTestDb, request, app } from './helpers';
import { loginAs, registerMember, auth, randomPhone } from './helpers';
import { User } from '../src/models';
import bcrypt from 'bcryptjs';

describe('认证与权限', () => {
  beforeAll(async () => {
    await initTestDb();
  });

  it('员工登录成功返回 token 与角色', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.role).toBe('admin');
  });

  it('密码错误返回 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('会员可用手机号与后六位密码登录', async () => {
    const staffToken = await loginAs('frontdesk');
    const member = await registerMember(staffToken);
    const res = await request(app).post('/api/auth/login').send({ username: member.phone, password: member.phone.slice(-6) });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('member');
  });

  it('未携带 token 访问受保护接口返回 401', async () => {
    const res = await request(app).get('/api/stores');
    expect(res.status).toBe(401);
  });

  it('无效 token 访问受保护接口返回 401', async () => {
    const res = await request(app).get('/api/stores').set(auth('invalid.token.value'));
    expect(res.status).toBe(401);
  });

  it('profile 返回当前用户信息', async () => {
    const token = await loginAs('admin');
    const res = await request(app).get('/api/auth/profile').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('admin');
    expect(res.body.name).toBeTruthy();
  });

  it('前台创建门店被 RBAC 拒绝返回 403', async () => {
    const token = await loginAs('frontdesk');
    const res = await request(app).post('/api/stores').set(auth(token)).send({ name: '越权门店' });
    expect(res.status).toBe(403);
  });

  it('教练创建会员被 RBAC 拒绝返回 403', async () => {
    const token = await loginAs('trainer');
    const res = await request(app).post('/api/members').set(auth(token)).send({ name: '越权会员', phone: randomPhone(), storeId: 1 });
    expect(res.status).toBe(403);
  });

  it('管理员可创建门店', async () => {
    const token = await loginAs('admin');
    const res = await request(app).post('/api/stores').set(auth(token)).send({ name: `联调测试店${Date.now()}` });
    expect(res.status).toBe(201);
  });

  it('连续 5 次密码错误锁定账号 30 分钟', async () => {
    const username = `lockuser${Date.now()}`;
    const passwordHash = await bcrypt.hash('correct123', 10);
    await User.create({ username, passwordHash, name: '锁定测试', role: 'admin', storeId: 1, status: 1 });

    for (let i = 0; i < 5; i += 1) {
      const fail = await request(app).post('/api/auth/login').send({ username, password: 'wrong' });
      expect(fail.status).toBe(401);
    }

    const locked = await request(app).post('/api/auth/login').send({ username, password: 'correct123' });
    expect(locked.status).toBe(423);
    expect(locked.body.errors).toBeTruthy();

    const again = await request(app).post('/api/auth/login').send({ username, password: 'correct123' });
    expect(again.status).toBe(423);
  });

  it('停用账号无法登录', async () => {
    const username = `disabled${Date.now()}`;
    const passwordHash = await bcrypt.hash('pass1234', 10);
    await User.create({ username, passwordHash, name: '停用测试', role: 'frontdesk', storeId: 1, status: 0 });

    const res = await request(app).post('/api/auth/login').send({ username, password: 'pass1234' });
    expect(res.status).toBe(403);
  });
});
