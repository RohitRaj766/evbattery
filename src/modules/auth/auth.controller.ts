/**
 * auth/auth.controller.ts
 * ───────────────────────
 * HTTP handlers for authentication endpoints.
 */

import { Request, Response, NextFunction, CookieOptions } from 'express';
import { AuthService, blockAccessToken } from './auth.service';
import { RegisterDto, LoginDto, SetPasswordDto } from './auth.schema';
import { AuthRequest } from '../../types';
import { env } from '../../config/env.config';
import { RefreshTokenService } from './refresh-token.service';
import { JwtService } from './jwt.service';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const AuthController = {
  /** POST /auth/register */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshTokenStr, ...result } = await AuthService.register(req.body as RegisterDto);
      
      res.cookie(REFRESH_COOKIE_NAME, refreshTokenStr, REFRESH_COOKIE_OPTIONS);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /** POST /auth/login */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshTokenStr, ...result } = await AuthService.login(req.body as LoginDto);
      
      res.cookie(REFRESH_COOKIE_NAME, refreshTokenStr, REFRESH_COOKIE_OPTIONS);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  /** POST /auth/refresh */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshTokenStr = req.cookies[REFRESH_COOKIE_NAME];
      if (!refreshTokenStr) {
        res.status(401).json({ success: false, message: 'Refresh token missing' });
        return;
      }

      const { newRefreshTokenStr, accessToken } = await AuthService.refreshAccessToken(refreshTokenStr);
      
      res.cookie(REFRESH_COOKIE_NAME, newRefreshTokenStr, REFRESH_COOKIE_OPTIONS);

      res.status(200).json({
        success: true,
        message: 'Access token refreshed',
        data: { accessToken },
      });
    } catch (err) {
      next(err);
    }
  },

  /** POST /auth/logout */
  async logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshTokenStr = req.cookies[REFRESH_COOKIE_NAME];
      if (refreshTokenStr) {
        await AuthService.logout(refreshTokenStr);
      }

      // Block the current access token so it stops working immediately
      const rawAccessToken = req.headers.authorization?.split(' ')[1];
      if (rawAccessToken) {
        await blockAccessToken(rawAccessToken);
      }

      res.clearCookie(REFRESH_COOKIE_NAME);
      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  },

  /** POST /auth/logout-all */
  async logoutAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (userId) {
        await AuthService.logoutAll(userId);
      }

      const rawAccessToken = req.headers.authorization?.split(' ')[1];
      if (rawAccessToken) {
        await blockAccessToken(rawAccessToken);
      }

      res.clearCookie(REFRESH_COOKIE_NAME);
      res.status(200).json({ success: true, message: 'Logged out of all devices successfully' });
    } catch (err) {
      next(err);
    }
  },

  /** GET /auth/me */
  async me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Not authenticated' });
        return;
      }
      res.status(200).json({
        success: true,
        message: 'User profile',
        data: { user: req.user },
      });
    } catch (err) {
      next(err);
    }
  },

  /** GET /auth/google/callback - called by Passport after Google OAuth */
  async googleCallback(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user as any;
      if (!user) {
        res.status(401).json({ success: false, message: 'Google authentication failed' });
        return;
      }

      const jwtPayload = { 
        sub: user.id, 
        email: user.email, 
        role: user.role,
        tokenVersion: user.tokenVersion || 0
      };
      
      const accessToken = JwtService.generateAccessToken(jwtPayload);
      const refreshTokenStr = JwtService.generateRefreshTokenString(user.id);
      
      await RefreshTokenService.createToken(user.id, refreshTokenStr, 7);

      res.cookie(REFRESH_COOKIE_NAME, refreshTokenStr, REFRESH_COOKIE_OPTIONS);

      const frontendUrl = env.API_BASE_URL;
      // Send both tokens in URL so the developer callback page can display them for testing
      res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}&refreshToken=${refreshTokenStr}`);
    } catch (err) {
      next(err);
    }
  },

  /** POST /auth/set-password */
  async setPassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const dto = req.body as SetPasswordDto;
      await AuthService.setPassword(user.sub, dto);

      res.status(200).json({
        success: true,
        message: 'Password created successfully',
      });
    } catch (err) {
      next(err);
    }
  },
};
