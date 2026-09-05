import { beforeAll, describe, expect, it } from 'vitest';
import { initTestDb, request, app } from './helpers';
import { loginAs, registerMember, auth } from './helpers';

function futureIso(minutesFromNow: number): string {
  return new Date(Date.now() + minutesFromNow * 60000).toISOString();
}

describe('预约业务', () => {
  let frontToken = '';
  let adminToken = '';
  let trainerToken = '';

  beforeAll(async () => {
    await initTestDb();
    frontToken = await loginAs('frontdesk');
    adminToken = await loginAs('admin');
    trainerToken = await loginAs('trainer');
  });

  async function createMemberWithCard(): Promise<{ id: number; phone: string }> {
    const member = await registerMember(frontToken);
    await request(app).post(`/api/members/${member.id}/cards`).set(auth(frontToken)).send({ cardTypeId: 1, payMethod: 'cash' });
    return member;
  }

  async function createCourse(body: Record<string, unknown>): Promise<number> {
    const res = await request(app).post('/api/courses').set(auth(adminToken)).send({
      name: `测试课${Date.now()}`,
      type: 'group',
      trainerId: 3,
      storeId: 1,
      durationMinutes: 60,
      capacity: 10,
      ...body,
    });
    if (res.status !== 201) {
      throw new Error(`创建课程失败: ${res.status} ${JSON.stringify(res.body)}`);
    }
    return res.body.id as number;
  }

  async function createPrivateCourse(startMinutes: number): Promise<number> {
    const res = await request(app).post('/api/courses').set(auth(adminToken)).send({
      name: `测试私教${Date.now()}`,
      type: 'private',
      trainerId: 3,
      storeId: 1,
      durationMinutes: 60,
      price: 300,
      startTime: futureIso(startMinutes),
    });
    return res.body.id as number;
  }

  it('无有效会籍的会员预约被拒绝', async () => {
    const member = await registerMember(frontToken);
    const courseId = await createCourse({ startTime: futureIso(60 * 24) });

    const res = await request(app).post('/api/bookings').set(auth(frontToken)).send({ memberId: member.id, courseId });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('NO_ACTIVE_MEMBERSHIP');
  });

  it('有会籍会员预约团体课成功', async () => {
    const member = await createMemberWithCard();
    const courseId = await createCourse({ startTime: futureIso(60 * 48) });

    const res = await request(app).post('/api/bookings').set(auth(frontToken)).send({ memberId: member.id, courseId });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('booked');
  });

  it('满员团体课加入候补', async () => {
    const courseId = await createCourse({ capacity: 1, startTime: futureIso(60 * 72) });
    const memberA = await createMemberWithCard();
    const memberB = await createMemberWithCard();

    const first = await request(app).post('/api/bookings').set(auth(frontToken)).send({ memberId: memberA.id, courseId });
    expect(first.body.status).toBe('booked');

    const second = await request(app).post('/api/bookings').set(auth(frontToken)).send({ memberId: memberB.id, courseId });
    expect(second.body.status).toBe('waiting');
  });

  it('私教课被占用后其他人预约被拒绝', async () => {
    const privateCourseId = await createPrivateCourse(60 * 49);
    const memberX = await createMemberWithCard();
    const memberY = await createMemberWithCard();

    const first = await request(app).post('/api/bookings').set(auth(frontToken)).send({ memberId: memberX.id, courseId: privateCourseId });
    expect(first.status).toBe(201);

    const fullRes = await request(app).post('/api/bookings').set(auth(frontToken)).send({ memberId: memberY.id, courseId: privateCourseId });
    expect(fullRes.status).toBe(409);
    expect(fullRes.body.code).toBe('COURSE_FULL');
  });

  it('预约时间与已有课程冲突被拒绝', async () => {
    const member = await createMemberWithCard();
    const courseA = await createCourse({ startTime: futureIso(60 * 96) });
    const courseB = await createCourse({ startTime: futureIso(60 * 96 + 30) });

    const first = await request(app).post('/api/bookings').set(auth(frontToken)).send({ memberId: member.id, courseId: courseA });
    expect(first.status).toBe(201);

    const conflict = await request(app).post('/api/bookings').set(auth(frontToken)).send({ memberId: member.id, courseId: courseB });
    expect(conflict.status).toBe(409);
    expect(conflict.body.code).toBe('TIME_CONFLICT');
  });

  it('取消预约后候补自动转正', async () => {
    const courseId = await createCourse({ capacity: 1, startTime: futureIso(60 * 120) });
    const memberA = await createMemberWithCard();
    const memberB = await createMemberWithCard();

    const bookingA = (await request(app).post('/api/bookings').set(auth(frontToken)).send({ memberId: memberA.id, courseId })).body.booking;
    const bookingB = (await request(app).post('/api/bookings').set(auth(frontToken)).send({ memberId: memberB.id, courseId })).body.booking;
    expect(bookingB.status).toBe('waiting');

    await request(app).put(`/api/bookings/${bookingA.id}/cancel`).set(auth(frontToken));

    const listRes = await request(app).get('/api/bookings').set(auth(frontToken));
    const promoted = listRes.body.list.find((b: { id: number }) => b.id === bookingB.id);
    expect(promoted.status).toBe('booked');
  });

  it('私教课不足 2 小时取消被拒绝', async () => {
    const member = await createMemberWithCard();
    const courseId = await createPrivateCourse(90);

    const bookRes = await request(app).post('/api/bookings').set(auth(frontToken)).send({ memberId: member.id, courseId });
    expect(bookRes.status).toBe(201);
    const bookingId = bookRes.body.booking.id;

    const cancelRes = await request(app).put(`/api/bookings/${bookingId}/cancel`).set(auth(frontToken));
    expect(cancelRes.status).toBe(409);
    expect(cancelRes.body.code).toBe('CANCEL_TOO_LATE');
  });

  it('会员不能取消他人的预约', async () => {
    const courseId = await createCourse({ startTime: futureIso(60 * 144) });
    const memberA = await createMemberWithCard();
    const memberB = await registerMember(frontToken);
    const bookingA = (await request(app).post('/api/bookings').set(auth(frontToken)).send({ memberId: memberA.id, courseId })).body.booking;

    const loginB = await request(app).post('/api/auth/login').send({ username: memberB.phone, password: memberB.phone.slice(-6) });
    const res = await request(app).put(`/api/bookings/${bookingA.id}/cancel`).set(auth(loginB.body.token));
    expect(res.status).toBe(403);
  });

  it('教练确认自己课程消课成功', async () => {
    const courseId = await createCourse({ startTime: futureIso(60 * 168) });
    const member = await createMemberWithCard();
    const bookingA = (await request(app).post('/api/bookings').set(auth(frontToken)).send({ memberId: member.id, courseId })).body.booking;

    const res = await request(app).put(`/api/bookings/${bookingA.id}/confirm`).set(auth(trainerToken));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
  });

  it('会员不能执行消课确认', async () => {
    const courseId = await createCourse({ startTime: futureIso(60 * 192) });
    const member = await createMemberWithCard();
    const bookingA = (await request(app).post('/api/bookings').set(auth(frontToken)).send({ memberId: member.id, courseId })).body.booking;

    const login = await request(app).post('/api/auth/login').send({ username: member.phone, password: member.phone.slice(-6) });
    const res = await request(app).put(`/api/bookings/${bookingA.id}/confirm`).set(auth(login.body.token));
    expect(res.status).toBe(403);
  });

  it('预约已关闭课程被拒绝', async () => {
    const courseId = await createCourse({ startTime: futureIso(60 * 216) });
    await request(app).put(`/api/courses/${courseId}`).set(auth(adminToken)).send({ status: 'closed' });

    const member = await createMemberWithCard();
    const res = await request(app).post('/api/bookings').set(auth(frontToken)).send({ memberId: member.id, courseId });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('COURSE_CLOSED');
  });
});
