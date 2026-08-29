import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { verifyToken, JwtPayload } from '../utils/jwt';

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

export function authenticate(req: Request, res: Response, next: NextFunction): void {
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

  req.user = {
    id: payload.sub,
    role: payload.role,
    type: payload.type,
  };
  next();
}
