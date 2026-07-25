/**
 * error.middleware.ts
 * ───────────────────
 * Global Express error handler. Catches all errors thrown or passed via next(err).
 * Returns consistent JSON error responses regardless of error source.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // ── Zod Validation Errors ─────────────────────────────────────────────────
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  // ── Prisma Known Errors ───────────────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: Unique constraint violation
    if (err.code === 'P2002') {
      const fields = (err.meta?.target as string[])?.join(', ') || 'field';
      res.status(409).json({
        success: false,
        message: `A record with this ${fields} already exists`,
      });
      return;
    }
    // P2025: Record not found
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
      return;
    }
  }

  // ── Operational Errors (AppError) ─────────────────────────────────────────
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // ── Unknown / Programming Errors ──────────────────────────────────────────
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: process.env['NODE_ENV'] === 'production'
      ? 'An internal server error occurred'
      : err.message,
  });
};
