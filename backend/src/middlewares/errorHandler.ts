import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ code: 'NOT_FOUND', message: `接口不存在: ${req.method} ${req.path}` });
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({ code: err.code, message: err.message, errors: err.errors });
    return;
  }
  console.error('[error]', err);
  res.status(500).json({ code: 'INTERNAL_ERROR', message: '服务器内部错误' });
}
