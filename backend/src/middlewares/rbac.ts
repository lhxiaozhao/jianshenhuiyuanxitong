import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

export type AllowedRole = 'admin' | 'frontdesk' | 'trainer' | 'member';

export function requireRole(...roles: AllowedRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw ApiError.unauthorized();
    }
    if (!roles.includes(req.user.role as AllowedRole)) {
      throw ApiError.forbidden('当前角色无权执行该操作');
    }
    next();
  };
}
