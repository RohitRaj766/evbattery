/**
 * auth/auth.routes.ts
 * ───────────────────
 * Express router for authentication endpoints.
 * Routes: 6 total
 */

import { Router } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { AuthController } from './auth.controller';
import { validate } from '../../middlewares/validate.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { RegisterSchema, LoginSchema, SetPasswordSchema } from './auth.schema';
import { AuthService } from './auth.service';
import { env } from '../../config/env.config';

const router = Router();

// ─── Configure Passport Google OAuth2 Strategy ───────────────────────────────
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken: string, _refreshToken: string, profile: Profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No email found in Google profile'));
          }

          const user = await AuthService.findOrCreateGoogleUser({
            googleId: profile.id,
            email,
            name: profile.displayName,
            avatarUrl: profile.photos?.[0]?.value,
          });

          return done(null, { ...user, sub: user.id });
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user as Express.User));

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user account
 * @access  Public
 */
router.post(
  '/register',
  validate({ body: RegisterSchema }),
  AuthController.register
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login and receive access + refresh tokens
 * @access  Public
 */
router.post(
  '/login',
  validate({ body: LoginSchema }),
  AuthController.login
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Exchange refresh token (from cookie) for new access token
 * @access  Public
 */
router.post(
  '/refresh',
  AuthController.refresh
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Revoke refresh token (logout single device)
 * @access  Protected
 */
router.post(
  '/logout',
  authenticate,
  AuthController.logout
);

/**
 * @route   POST /api/v1/auth/logout-all
 * @desc    Revoke all refresh tokens for a user (logout all devices)
 * @access  Protected
 */
router.post(
  '/logout-all',
  authenticate,
  AuthController.logoutAll
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Protected
 */
router.get('/me', authenticate, AuthController.me);

/**
 * @route   POST /api/v1/auth/set-password
 * @desc    Set password for Google OAuth users
 * @access  Protected
 */
router.post(
  '/set-password',
  authenticate,
  validate({ body: SetPasswordSchema }),
  AuthController.setPassword
);

/**
 * @route   GET /api/v1/auth/google
 * @desc    Redirect to Google OAuth2 consent screen
 * @access  Public
 */
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

/**
 * @route   GET /api/v1/auth/google/callback
 * @desc    Google OAuth2 callback handler
 * @access  Public
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/failed', session: false }),
  AuthController.googleCallback
);

export default router;
