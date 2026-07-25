/**
 * auth.middleware.ts
 * ──────────────────
 * JWT verification and RBAC (Role-Based Access Control) guard middlewares.
 *
 * Design:
 * - `authenticate`: Verifies the JWT access token from the Authorization header.
 *   Attaches the decoded payload to req.user.
 * - `authorize(...roles)`: Factory that returns a middleware checking if
 *   req.user.role is in the allowed roles list.
 */

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env.config';
import { AuthRequest, JwtPayload } from '../types';
import { AppError } from './error.middleware';
import { isAccessTokenBlocked } from '../modules/auth/auth.service';

/**
 * Verifies Bearer JWT token and injects payload into req.user.
 * Protected routes must call this first.
 */
export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('No authorization token provided', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

    // Check if this token was explicitly revoked (e.g. after logout)
    const blocked = await isAccessTokenBlocked(token);
    if (blocked) {
      return next(new AppError('Token has been revoked. Please log in again.', 401));
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError('Access token has expired', 401));
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid access token', 401));
    }
    next(err);
  }
};

/**
 * RBAC guard. Use after `authenticate`.
 * Example: router.delete('/station/:id', authenticate, authorize('ADMIN'), handler)
 */
export const authorize = (...roles: Role[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
          403
        )
      );
    }

    next();
  };
};
