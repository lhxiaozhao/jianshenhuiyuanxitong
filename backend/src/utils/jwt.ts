import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export type AccountType = 'staff' | 'member';

export interface JwtPayload {
  sub: number;
  role: string;
  type: AccountType;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn as jwt.SignOptions['expiresIn'] });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwt.secret) as unknown as JwtPayload;
}
