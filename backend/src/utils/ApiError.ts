export class ApiError extends Error {
  status: number;
  code: string;
  errors?: unknown;

  constructor(status: number, code: string, message: string, errors?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
  }

  static badRequest(message: string, errors?: unknown): ApiError {
    return new ApiError(400, 'VALIDATION_ERROR', message, errors);
  }

  static unauthorized(message = '未认证'): ApiError {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = '权限不足'): ApiError {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message = '资源不存在'): ApiError {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string, code = 'CONFLICT'): ApiError {
    return new ApiError(409, code, message);
  }

  static locked(message: string, lockedUntil?: Date): ApiError {
    return new ApiError(423, 'ACCOUNT_LOCKED', message, lockedUntil);
  }
}
