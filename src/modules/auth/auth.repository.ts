/**
 * auth/auth.repository.ts
 * ────────────────────────
 * Data access layer for the auth module.
 * All Prisma calls for User model live here — services never import prisma directly.
 */

import { Role } from '@prisma/client';
import { prisma } from '../../config/database.config';

export const AuthRepository = {
  /** Find a user by email (unique) */
  findByEmail: (email: string) =>
    prisma.user.findUnique({ where: { email } }),

  /** Find a user by ID (limited select — used for token validation) */
  findById: (id: string) =>
    prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, isActive: true, tokenVersion: true },
    }),

  /** Find a user by ID returning the full record (password, googleId included) */
  findByIdFull: (id: string) =>
    prisma.user.findUnique({ where: { id } }),

  /** Find a user by Google ID or email (OAuth linking) */
  findByGoogleIdOrEmail: (googleId: string, email: string) =>
    prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    }),

  /** Create a new user with a hashed password */
  createWithPassword: (data: {
    email: string;
    name: string;
    password: string;
    role: Role;
  }) =>
    prisma.user.create({
      data,
      select: { id: true, email: true, name: true, role: true, createdAt: true, tokenVersion: true },
    }),

  /** Create a new user via Google OAuth (no password) */
  createFromGoogle: (data: {
    email: string;
    name: string;
    googleId: string;
    avatarUrl?: string;
    role: Role;
  }) => prisma.user.create({ data }),

  /** Update last login timestamp */
  updateLastLogin: (id: string) =>
    prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    }),

  /** Link a Google account to an existing email-based user */
  linkGoogleAccount: (id: string, googleId: string, avatarUrl?: string) =>
    prisma.user.update({
      where: { id },
      data: { googleId, avatarUrl },
    }),

  /** Set a hashed password for an OAuth-only user */
  setPassword: (id: string, passwordHash: string) =>
    prisma.user.update({
      where: { id },
      data: { password: passwordHash },
    }),

  /** Increment tokenVersion to invalidate all existing tokens (logout-all) */
  incrementTokenVersion: (id: string) =>
    prisma.user.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
    }),
};
