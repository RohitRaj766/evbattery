import jwt from 'jsonwebtoken';
import { env } from '../../config/env.config';

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'OPERATOR' | 'ADMIN' | 'DRIVER';
  tokenVersion?: number;
}

export const JwtService = {
  /**
   * Generates a new short-lived access token
   */
  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
  },

  /**
   * Verifies an access token
   */
  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
  },

  /**
   * Generates a long-lived refresh token string
   */
  generateRefreshTokenString(userId: string): string {
    // Generate a JWT refresh token
    return jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
  },

  /**
   * Verifies a refresh token
   */
  verifyRefreshToken(token: string): any {
    return jwt.verify(token, env.JWT_REFRESH_SECRET);
  },
};
