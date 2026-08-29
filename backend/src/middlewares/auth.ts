import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { User } from '../models';

export interface AuthUser {
  id: number;
  role: string;
  type: 'staff' | 'member';
  storeId?: number | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw ApiError.unauthorized('缺少访问令牌');
    }

    const token = header.slice(7);
    let payload: JwtPayload;
    try {
      payload = verifyToken(token);
    } catch {
      throw ApiError.unauthorized('令牌无效或已过期');
    }

    const user: AuthUser = {
      id: payload.sub,
      role: payload.role,
      type: payload.type,
    };

    if (payload.type === 'staff') {
      const staff = await User.findByPk(payload.sub);
      if (!staff || staff.status !== 1) {
        throw ApiError.unauthorized('账号不存在或已被停用');
      }
      user.storeId = staff.storeId;
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
