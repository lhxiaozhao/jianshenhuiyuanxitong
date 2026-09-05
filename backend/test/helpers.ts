import request from 'supertest';
import app from '../src/app';
import { testConnection } from '../src/config/database';
import { initModels } from '../src/models';
import { seedData } from '../src/scripts/seed';

let initPromise: Promise<void> | null = null;

export function initTestDb(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await testConnection();
      await initModels();
      await seedData();
    })();
  }
  return initPromise;
}

export type StaffRole = 'admin' | 'frontdesk' | 'trainer';

export async function loginAs(role: StaffRole): Promise<string> {
  await initTestDb();
  const res = await request(app).post('/api/auth/login').send({ username: role, password: 'admin123' });
  if (res.status !== 200) {
    throw new Error(`登录失败 ${role}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.token as string;
}

export async function registerMember(token: string, storeId = 1): Promise<{ id: number; phone: string; name: string }> {
  await initTestDb();
  const phone = randomPhone();
  const name = `测试会员${phone.slice(-4)}`;
  const res = await request(app)
    .post('/api/members')
    .set('Authorization', `Bearer ${token}`)
    .send({ name, phone, gender: 1, storeId });
  if (res.status !== 201) {
    throw new Error(`注册会员失败: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { id: res.body.id as number, phone, name };
}

let seq = 0;

export function randomPhone(): string {
  seq += 1;
  return `13${Date.now().toString().slice(-6)}${String(seq).padStart(3, '0')}`;
}

export function auth(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

export { request, app };
