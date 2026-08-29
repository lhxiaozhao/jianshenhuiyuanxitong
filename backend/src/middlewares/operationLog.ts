import { Request, Response, NextFunction } from 'express';
import { OperationLog } from '../models';
import { AuthUser } from './auth';

export interface LogOptions {
  action: string;
  detail?: string;
}

export async function writeOperationLog(user: AuthUser | undefined, action: string, detail?: string): Promise<void> {
  if (!user || user.type !== 'staff') {
    return;
  }
  try {
    await OperationLog.create({
      userId: user.id,
      action,
      detail: detail || null,
    });
  } catch (err) {
    console.error('记录操作日志失败:', err);
  }
}

export function operationLogger(options: LogOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json;
    res.json = function (body) {
      res.locals.responseBody = body;
      return originalJson.call(this, body);
    };
    res.on('finish', () => {
      const detail = `${req.method} ${req.originalUrl}`;
      const result = res.locals.responseBody?.code ? `失败(${res.locals.responseBody.code})` : `成功(${res.statusCode})`;
      void writeOperationLog(req.user, options.action, `${detail} - ${result}`);
    });
    next();
  };
}
