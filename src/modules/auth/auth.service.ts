/**
 * auth/auth.service.ts
 * ────────────────────
 * Business logic for authentication operations.
 * All database access goes through AuthRepository — no direct prisma calls.
 */

import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { redisClient } from '../../config/redis.config';
import { AppError } from '../../middlewares/error.middleware';
import { JwtPayload, JwtService } from './jwt.service';
import { RefreshTokenService } from './refresh-token.service';
import { RegisterDto, LoginDto, SetPasswordDto } from './auth.schema';
import { AuthRepository } from './auth.repository';
import jwt from 'jsonwebtoken';

const BCRYPT_ROUNDS = 12;
const blockedTokenKey = (rawToken: string) => `blocked_token:${rawToken}`;

/** Add an access token to the Redis blocklist until it naturally expires */
export const blockAccessToken = async (rawToken: string): Promise<void> => {
  try {
    const decoded = jwt.decode(rawToken) as { exp?: number } | null;
    if (!decoded?.exp) return;
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await redisClient.setex(blockedTokenKey(rawToken), ttl, '1');
    }
  } catch {
    // ignore decode errors
  }
};

/** Returns true if the access token has been blocklisted */
export const isAccessTokenBlocked = async (rawToken: string): Promise<boolean> => {
  const val = await redisClient.get(blockedTokenKey(rawToken));
  return val === '1';
};

export const AuthService = {
  /** Register a new user with hashed password */
  async register(dto: RegisterDto) {
    const existing = await AuthRepository.findByEmail(dto.email);
    if (existing) {
      throw new AppError('An account with this email already exists', 409);
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await AuthRepository.createWithPassword({
      email: dto.email,
      name: dto.name,
      password: passwordHash,
      role: dto.role as Role,
    });

    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    const accessToken = JwtService.generateAccessToken(jwtPayload);
    const refreshTokenStr = JwtService.generateRefreshTokenString(user.id);

    await RefreshTokenService.createToken(user.id, refreshTokenStr, 7);

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken,
      refreshTokenStr,
    };
  },

  /** Validate credentials and issue dual tokens */
  async login(dto: LoginDto) {
    const user = await AuthRepository.findByEmail(dto.email);

    if (!user || !user.password) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated. Contact administrator.', 403);
    }

    const isValidPassword = await bcrypt.compare(dto.password, user.password);
    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401);
    }

    await AuthRepository.updateLastLogin(user.id);

    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    const accessToken = JwtService.generateAccessToken(jwtPayload);
    const refreshTokenStr = JwtService.generateRefreshTokenString(user.id);

    await RefreshTokenService.createToken(user.id, refreshTokenStr, 7);

    return {
      accessToken,
      refreshTokenStr,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  },

  /** Validate refresh token and issue a new access token (Token Rotation) */
  async refreshAccessToken(refreshTokenStr: string) {
    let decoded: { sub: string };

    try {
      decoded = JwtService.verifyRefreshToken(refreshTokenStr) as { sub: string };
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const tokenRecord = await RefreshTokenService.findToken(refreshTokenStr);
    if (!RefreshTokenService.isValid(tokenRecord)) {
      throw new AppError('Refresh token is invalid or has been revoked', 401);
    }

    const user = await AuthRepository.findById(decoded.sub);

    if (!user || !user.isActive) {
      throw new AppError('User not found or deactivated', 401);
    }

    // Rotate refresh token: revoke old, create new
    await RefreshTokenService.revokeToken(tokenRecord!.id);

    const newRefreshTokenStr = JwtService.generateRefreshTokenString(user.id);
    await RefreshTokenService.createToken(user.id, newRefreshTokenStr, 7);

    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    return {
      accessToken: JwtService.generateAccessToken(jwtPayload),
      newRefreshTokenStr,
    };
  },

  /** Revoke refresh token (logout single device) */
  async logout(refreshTokenStr: string) {
    const tokenRecord = await RefreshTokenService.findToken(refreshTokenStr);
    if (tokenRecord) {
      await RefreshTokenService.revokeToken(tokenRecord.id);
    }
  },

  /** Revoke all refresh tokens for a user (logout all devices) */
  async logoutAll(userId: string) {
    await RefreshTokenService.revokeAllForUser(userId);
    await AuthRepository.incrementTokenVersion(userId);
  },

  /** Find or create user from Google OAuth profile */
  async findOrCreateGoogleUser(profile: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }) {
    let user = await AuthRepository.findByGoogleIdOrEmail(profile.googleId, profile.email);

    if (!user) {
      user = await AuthRepository.createFromGoogle({
        email: profile.email,
        name: profile.name,
        googleId: profile.googleId,
        avatarUrl: profile.avatarUrl,
        role: Role.OPERATOR,
      });
    } else if (!user.googleId) {
      // Link Google account to existing email account
      user = await AuthRepository.linkGoogleAccount(user.id, profile.googleId, profile.avatarUrl);
    }

    return user;
  },

  /** Set password for OAuth users who don't have one */
  async setPassword(userId: string, dto: SetPasswordDto) {
    const user = await AuthRepository.findByIdFull(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.password) {
      throw new AppError('Password already exists. Use change-password instead.', 400);
    }

    if (!user.googleId) {
      throw new AppError('Cannot set password for non-OAuth account without current password', 400);
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    await AuthRepository.setPassword(userId, passwordHash);
  },
};
