import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { User, Member } from '../models';
import { ApiError } from '../utils/ApiError';
import { signToken } from '../utils/jwt';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      throw ApiError.badRequest('用户名和密码不能为空');
    }

    const staff = await User.findOne({ where: { username } });
    if (staff) {
      const token = await loginStaff(staff, password);
      res.json({ token, role: staff.role, name: staff.name });
      return;
    }

    const member = await Member.findOne({ where: { phone: username } });
    if (member) {
      const token = await loginMember(member, password);
      res.json({ token, role: 'member', name: member.name });
      return;
    }

    throw ApiError.unauthorized('用户名或密码错误');
  } catch (err) {
    next(err);
  }
}

async function loginStaff(user: User, password: string): Promise<string> {
  if (user.status !== 1) {
    throw ApiError.forbidden('账号已被停用');
  }
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    throw ApiError.locked('账号已锁定，请稍后再试', user.lockedUntil);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await handleFailedAttempt(user);
    throw ApiError.unauthorized('用户名或密码错误');
  }

  await user.update({ failedAttempts: 0, lockedUntil: null });
  return signToken({ sub: user.id, role: user.role, type: 'staff' });
}

async function loginMember(member: Member, password: string): Promise<string> {
  if (member.status !== 1) {
    throw ApiError.forbidden('会员账号已被停用');
  }
  const expected = member.passwordHash ?? member.phone.slice(-6);
  const valid = await bcrypt.compare(password, expected);
  if (!valid) {
    throw ApiError.unauthorized('用户名或密码错误');
  }
  return signToken({ sub: member.id, role: 'member', type: 'member' });
}

async function handleFailedAttempt(user: User): Promise<void> {
  const attempts = user.failedAttempts + 1;
  if (attempts >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
    await user.update({ failedAttempts: 0, lockedUntil });
  } else {
    await user.update({ failedAttempts: attempts });
  }
}

export async function profile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      throw ApiError.unauthorized();
    }

    if (user.type === 'staff') {
      const staff = await User.findByPk(user.id);
      if (!staff) {
        throw ApiError.unauthorized('账号不存在');
      }
      res.json({
        id: staff.id,
        username: staff.username,
        name: staff.name,
        role: staff.role,
        storeId: staff.storeId,
      });
      return;
    }

    const member = await Member.findByPk(user.id);
    if (!member) {
      throw ApiError.unauthorized('会员不存在');
    }
    res.json({
      id: member.id,
      memberNo: member.memberNo,
      name: member.name,
      phone: member.phone,
      role: 'member',
      storeId: member.storeId,
    });
  } catch (err) {
    next(err);
  }
}
