/**
 * app.ts
 * ──────
 * Express application factory.
 * Configures all middleware, routes, and error handlers.
 * Separated from server.ts to allow testing without starting the HTTP server.
 */

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env.config';
import { swaggerDocument } from './config/swagger.config';
import { errorMiddleware } from './middlewares/error.middleware';
import { buildOAuthCallbackHtml } from './utils/oauthCallbackPage';

// ─── Module Routers ───────────────────────────────────────────────────────────
import authRoutes from './modules/auth/auth.routes';
import telemetryRoutes from './modules/telemetry/telemetry.routes';
import alarmRoutes from './modules/alarms/alarm.routes';
import stationRoutes from './modules/stations/station.routes';
import batteryRoutes from './modules/batteries/battery.routes';
import swapRoutes from './modules/swaps/swap.routes';

const createApp = (): Application => {
  const app = express();

  // ─── Security Middleware ──────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production',
    })
  );

  app.use(
    cors({
      origin: env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ─── Global Rate Limiter ──────────────────────────────────────────────────
  // Telemetry endpoint has its own, higher limit — see telemetry routes.
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
  });
  app.use('/api/', globalLimiter);

  // ─── Body Parsing Middleware ──────────────────────────────────────────────
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  app.use(cookieParser());
  app.use(compression());
  app.use(express.static('public'));

  // ─── Logging ──────────────────────────────────────────────────────────────
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  // ─── Passport (for Google OAuth sessions) ─────────────────────────────────
  app.use(passport.initialize());

  // ─── API Documentation ────────────────────────────────────────────────────
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customSiteTitle: 'EV Battery API Docs',
      customJs: ['/swagger-auth.js'], // Keeping this just for the Google Login button logic
    })
  );


  // ─── OAuth Token Display (Developer Callback Page) ───────────────────────
  // Shown after Google login completes — displays access + refresh tokens.
  app.get('/auth/callback', (req: Request, res: Response) => {
    const accessToken = (req.query.token as string) || '';
    const refreshToken = (req.query.refreshToken as string) || '';
    const html = buildOAuthCallbackHtml(accessToken, refreshToken);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(accessToken ? 200 : 400).send(html);
  });

  // ─── Health Check ─────────────────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
  });

  // ─── API Routes ───────────────────────────────────────────────────────────
  const API_PREFIX = '/api/v1';

  app.use(`${API_PREFIX}/auth`, authRoutes);
  app.use(`${API_PREFIX}/telemetry`, telemetryRoutes);
  app.use(`${API_PREFIX}/alarms`, alarmRoutes);
  app.use(`${API_PREFIX}/stations`, stationRoutes);
  app.use(`${API_PREFIX}/batteries`, batteryRoutes);
  app.use(`${API_PREFIX}/swaps`, swapRoutes);

  // ─── 404 Handler ─────────────────────────────────────────────────────────
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: `Route ${req.method} ${req.originalUrl} not found`,
    });
  });

  // ─── Global Error Handler ─────────────────────────────────────────────────
  app.use(errorMiddleware);

  return app;
};

export default createApp;
