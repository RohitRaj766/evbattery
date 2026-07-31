/**
 * swagger.config.ts
 * ─────────────────
 * OpenAPI 3.0 specification for all API endpoints.
 * Every endpoint with a request body has a full schema + inline example
 * so Swagger UI pre-fills the "Try it out" JSON editor automatically.
 */

import { env } from './env.config';

export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'EV Battery Swapping & Thermal Safety Platform',
    description:
      'Production API for managing real-time EV battery swapping stations, thermal safety monitoring, and fleet lifecycle management.',
    version: '1.0.0',
  },
  servers: [
    {
      url: `${env.API_BASE_URL}/api/v1`,
      description: 'Current environment',
    },
  ],

  // ── Reusable component schemas ──────────────────────────────────────────────
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste your JWT access token (15-minute expiry). Get one from POST /auth/login.',
      },
    },
    schemas: {
      // ── Generic ────────────────────────────────────────────────────────────
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed' },
          errors: { type: 'object' },
        },
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { type: 'object' },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 100 },
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          totalPages: { type: 'integer', example: 5 },
        },
      },

      // ── Auth ───────────────────────────────────────────────────────────────
      RegisterBody: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email', example: 'rohit@gmail.com' },
          password: {
            type: 'string',
            minLength: 8,
            example: 'StrongPassword@123',
            description: 'Min 8 chars, must include uppercase letter and number.',
          },
          name: { type: 'string', example: 'Rohit Sharma' },
          role: {
            type: 'string',
            enum: ['OPERATOR', 'ADMIN', 'DRIVER'],
            default: 'DRIVER',
            example: 'DRIVER',
          },
        },
      },
      LoginBody: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'rohit@gmail.com' },
          password: { type: 'string', example: 'StrongPassword@123' },
        },
      },
      SetPasswordBody: {
        type: 'object',
        required: ['password'],
        properties: {
          password: {
            type: 'string',
            minLength: 8,
            example: 'StrongPassword@123',
            description: 'Min 8 chars. Must contain: uppercase, lowercase, number, special character.',
          },
        },
      },

      // ── Telemetry ──────────────────────────────────────────────────────────
      IngestTelemetryBody: {
        type: 'object',
        required: ['dockId', 'batteryId', 'voltage', 'current', 'temperature', 'soc', 'soh'],
        properties: {
          dockId: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
          batteryId: { type: 'string', format: 'uuid', example: 'b2c3d4e5-f6a1-8901-bcde-f12345678901' },
          voltage: { type: 'number', example: 48.5, description: 'Volts (0–100)' },
          current: { type: 'number', example: 12.3, description: 'Amperes. Positive = charging, negative = discharging.' },
          temperature: { type: 'number', example: 38.2, description: 'Celsius (–40 to 150). Values > 55°C trigger alarm.' },
          soc: { type: 'number', minimum: 0, maximum: 100, example: 87.4, description: 'State of Charge %' },
          soh: { type: 'number', minimum: 0, maximum: 100, example: 92.1, description: 'State of Health %' },
        },
      },

      // ── Stations ───────────────────────────────────────────────────────────
      CreateStationBody: {
        type: 'object',
        required: ['name', 'location', 'latitude', 'longitude'],
        properties: {
          name: { type: 'string', minLength: 2, example: 'Dwarka Sector-21 Hub' },
          location: {
            type: 'string',
            minLength: 5,
            example: 'Plot 14, Sector 21, Dwarka, New Delhi – 110077',
          },
          latitude: { type: 'number', minimum: -90, maximum: 90, example: 28.5562 },
          longitude: { type: 'number', minimum: -180, maximum: 180, example: 77.0595 },
        },
      },
      CreateOperatorBody: {
        type: 'object',
        required: ['name', 'email'],
        properties: {
          name: { type: 'string', minLength: 2, example: 'Rahul Sharma' },
          email: { type: 'string', format: 'email', example: 'rahul@example.com' },
          phone: { type: 'string', example: '9876543210' },
        },
      },
      AssignOperatorBody: {
        type: 'object',
        required: ['operatorId'],
        properties: {
          operatorId: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
          isPrimary: { type: 'boolean', example: true },
        },
      },
      UpdateAssignmentBody: {
        type: 'object',
        properties: {
          assignmentStatus: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], example: 'ACTIVE' },
          isPrimary: { type: 'boolean', example: true },
        },
      },
      CreateDocksBody: {
        type: 'object',
        required: ['dockNumbers'],
        properties: {
          dockNumbers: {
            type: 'array',
            items: { type: 'integer', minimum: 1 },
            example: [1, 2, 3, 4],
            description: 'Array of physical bay numbers to create',
          },
        },
      },
      InsertBatteryBody: {
        type: 'object',
        required: ['batteryId'],
        properties: {
          batteryId: {
            type: 'string',
            format: 'uuid',
            example: 'b2c3d4e5-f6a1-8901-bcde-f12345678901',
          },
        },
      },

      // ── Batteries ──────────────────────────────────────────────────────────
      CreateBatteryBody: {
        type: 'object',
        required: ['serialNumber', 'manufacturer', 'modelName', 'capacityKwh', 'manufacturedAt'],
        properties: {
          serialNumber: { type: 'string', example: 'BS-2024-00142' },
          manufacturer: { type: 'string', example: 'Amara Raja Energy' },
          modelName: { type: 'string', example: 'AR-48V-30AH-LFP' },
          capacityKwh: { type: 'number', minimum: 0.1, maximum: 100, example: 1.44 },
          soh: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            default: 100,
            example: 100,
            description: 'Initial State of Health %. Defaults to 100 for new batteries.',
          },
          manufacturedAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-03-15T00:00:00.000Z',
          },
          notes: {
            type: 'string',
            nullable: true,
            example: 'Batch #Q1-2024. Passed QC inspection on 2024-03-20.',
          },
        },
      },
      DecommissionBody: {
        type: 'object',
        properties: {
          notes: {
            type: 'string',
            example: 'SoH degraded below 75% threshold. Physical inspection confirmed. Removed from Dwarka hub.',
          },
        },
      },

      // ── Swaps ──────────────────────────────────────────────────────────────
      CreateSwapBody: {
        type: 'object',
        required: ['stationId', 'batteryOutId', 'driverPhone'],
        properties: {
          stationId: { type: 'string', format: 'uuid', example: 'c3d4e5f6-a1b2-9012-cdef-012345678902' },
          batteryOutId: {
            type: 'string',
            format: 'uuid',
            example: 'b2c3d4e5-f6a1-8901-bcde-f12345678901',
            description: 'UUID of the fully-charged battery to hand out to the driver.',
          },
          batteryInId: {
            type: 'string',
            format: 'uuid',
            nullable: true,
            example: 'd4e5f6a1-b2c3-0123-def0-123456789012',
            description: 'Optional UUID of the depleted battery returned by the driver.',
          },
          driverPhone: {
            type: 'string',
            minLength: 10,
            maxLength: 15,
            example: '9876543210',
          },
          driverVehicleId: {
            type: 'string',
            nullable: true,
            example: 'DL-5S-AB-1234',
            description: 'Optional vehicle registration plate.',
          },
          notes: {
            type: 'string',
            nullable: true,
            example: 'Driver reported battery was hot. Incoming battery temp: ~42°C.',
          },
        },
      },

      // ── Alarm resolve ──────────────────────────────────────────────────────
      ResolveAlarmBody: {
        type: 'object',
        properties: {
          notes: {
            type: 'string',
            example: 'Inspected dock physically. Cooling fan replaced. Temperature normalized to 32°C. Safe to restore.',
          },
        },
      },
    },
  },

  // ── Default security (applied to all endpoints unless overridden) ───────────
  security: [{ BearerAuth: [] }],

  // ── API Paths ───────────────────────────────────────────────────────────────
  paths: {

    // ════════════════════════════════════════════════════════
    //  SYSTEM
    // ════════════════════════════════════════════════════════

    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health Check',
        description: 'Returns the health status of the API, Database, and Redis.',
        servers: [
          {
            url: env.API_BASE_URL,
            description: 'Root environment'
          }
        ],
        security: [],
        responses: {
          200: {
            description: 'API is healthy',
            content: {
              'application/json': {
                example: {
                  success: true,
                  status: 'healthy',
                  services: {
                    database: 'connected',
                    redis: 'connected',
                  },
                  timestamp: '2023-10-25T12:00:00.000Z',
                  environment: 'development',
                },
              },
            },
          },
          503: {
            description: 'API is unhealthy',
            content: {
              'application/json': {
                example: {
                  success: false,
                  status: 'unhealthy',
                  error: 'Database connection failed',
                  timestamp: '2023-10-25T12:00:00.000Z',
                },
              },
            },
          },
        },
      },
    },

    // ════════════════════════════════════════════════════════
    //  AUTH  (9 endpoints)
    // ════════════════════════════════════════════════════════

    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user account',
        description: 'Creates an OPERATOR or ADMIN account with email + password. Returns JWT access token and sets an HttpOnly refresh-token cookie.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterBody' },
              example: {
                email: 'rohit@gmail.com',
                password: 'StrongPassword@123',
                name: 'Rohit Sharma',
                role: 'OPERATOR',
              },
            },
          },
        },
        responses: {
          201: {
            description: 'User registered. Access token in body; refresh token in HttpOnly cookie.',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'User registered successfully',
                  data: {
                    accessToken: 'eyJhbG...',
                    user: { id: 'uuid', email: 'rohit@gmail.com', name: 'Rohit Sharma', role: 'OPERATOR' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation failed (weak password, bad email, etc.)' },
          409: { description: 'Email already registered' },
        },
      },
    },

    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email & password',
        description: 'Returns a short-lived JWT access token in the body and stores a 7-day refresh token in an HttpOnly cookie.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginBody' },
              example: {
                email: 'rohit@gmail.com',
                password: 'StrongPassword@123',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'Login successful',
                  data: {
                    accessToken: 'eyJhbG...',
                    user: { id: 'uuid', email: 'rohit@gmail.com', role: 'OPERATOR' },
                  },
                },
              },
            },
          },
          401: { description: 'Invalid email or password' },
          403: { description: 'Account deactivated' },
        },
      },
    },

    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token using the HttpOnly refresh-token cookie',
        description: 'No body required. Reads the `refreshToken` cookie automatically. Issues a new access token and rotates the refresh token cookie.',
        security: [],
        responses: {
          200: {
            description: 'New access token issued',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'Access token refreshed',
                  data: { accessToken: 'eyJhbG...' },
                },
              },
            },
          },
          401: { description: 'Refresh token missing, expired, or revoked' },
        },
      },
    },

    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout — revoke this device\'s refresh token',
        description: 'Revokes the refresh token cookie for this device only. Other logged-in devices remain active. Also immediately blocks the current access token.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Logged out successfully. Cookie cleared.' },
          401: { description: 'Not authenticated' },
        },
      },
    },

    '/auth/logout-all': {
      post: {
        tags: ['Auth'],
        summary: 'Logout all devices — revoke every refresh token for this user',
        description: 'Revokes ALL refresh tokens issued to this user across all devices. Use after a suspected account compromise.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Logged out of all devices successfully' },
          401: { description: 'Not authenticated' },
        },
      },
    },

    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current authenticated user profile',
        description: 'Returns the JWT payload (id, email, role) of the currently authenticated user. No database hit.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'User profile from token',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'User profile',
                  data: {
                    user: { sub: 'uuid', email: 'rohit@gmail.com', role: 'OPERATOR' },
                  },
                },
              },
            },
          },
          401: { description: 'Not authenticated' },
        },
      },
    },

    '/auth/set-password': {
      post: {
        tags: ['Auth'],
        summary: 'Set a password for Google OAuth accounts',
        description: 'Allows users who signed up via Google OAuth (and therefore have no password) to add a local password. Can only be called once — if a password already exists, the endpoint returns 400.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SetPasswordBody' },
              example: {
                password: 'StrongPassword@123',
              },
            },
          },
        },
        responses: {
          200: { description: 'Password set successfully' },
          400: { description: 'Password already set, or does not meet strength requirements' },
          401: { description: 'Authentication required' },
        },
      },
    },

    '/auth/google': {
      get: {
        tags: ['Auth'],
        summary: 'Initiate Google OAuth2 login — opens in browser only',
        description: '⚠️ This endpoint does a browser redirect to Google. It cannot be tested via Swagger "Try it out". Open it directly in your browser.',
        security: [],
        responses: {
          302: { description: 'Redirect to Google consent screen' },
        },
      },
    },

    '/auth/google/callback': {
      get: {
        tags: ['Auth'],
        summary: 'Google OAuth2 callback (internal — called by Google)',
        description: 'Handled automatically by Google after user consents. Redirects to the frontend with access token in query string.',
        security: [],
        responses: {
          302: { description: 'Redirect to frontend callback page with ?token=...&refreshToken=...' },
        },
      },
    },

    // ════════════════════════════════════════════════════════
    //  TELEMETRY  (2 endpoints)
    // ════════════════════════════════════════════════════════

    '/telemetry': {
      post: {
        tags: ['Telemetry'],
        summary: 'Ingest a telemetry reading from a charging dock',
        description: 'High-frequency ingestion endpoint. Persists telemetry, updates dock snapshot, and broadcasts `TELEMETRY_UPDATE` via Socket.io. **If temperature > 55°C**, enqueues a 3-second debounced BullMQ job for thermal runaway evaluation.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/IngestTelemetryBody' },
              example: {
                dockId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
                batteryId: 'b2c3d4e5-f6a1-8901-bcde-f12345678901',
                voltage: 48.5,
                current: 12.3,
                temperature: 38.2,
                soc: 87.4,
                soh: 92.1,
              },
            },
          },
        },
        responses: {
          202: { description: 'Telemetry accepted and persisted' },
          400: { description: 'Validation error (missing fields, out-of-range values)' },
          404: { description: 'Dock or battery not found' },
          409: { description: 'Dock is ISOLATED_CUTOFF — telemetry rejected for safety' },
        },
      },
    },

    '/telemetry/{batteryId}/history': {
      get: {
        tags: ['Telemetry'],
        summary: 'Get historical telemetry time-series for a battery',
        description: 'Returns paginated telemetry records ordered by timestamp DESC. Supports time-window filtering.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'batteryId',
            in: 'path',
            required: true,
            description: 'UUID of the battery',
            schema: { type: 'string', format: 'uuid', example: 'b2c3d4e5-f6a1-8901-bcde-f12345678901' },
          },
          {
            name: 'from',
            in: 'query',
            description: 'Start of time window (ISO 8601)',
            schema: { type: 'string', format: 'date-time', example: '2025-07-01T00:00:00.000Z' },
          },
          {
            name: 'to',
            in: 'query',
            description: 'End of time window (ISO 8601)',
            schema: { type: 'string', format: 'date-time', example: '2025-07-25T23:59:59.000Z' },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Maximum records to return (1–1000)',
            schema: { type: 'integer', default: 100, minimum: 1, maximum: 1000 },
          },
        ],
        responses: {
          200: { description: 'Telemetry time-series records' },
          404: { description: 'Battery not found' },
        },
      },
    },

    // ════════════════════════════════════════════════════════
    //  ALARMS  (4 endpoints)
    // ════════════════════════════════════════════════════════

    '/alarms': {
      get: {
        tags: ['Alarms'],
        summary: 'List alarms (paginated, filterable by status)',
        description: 'Returns all alarms ordered by triggered date DESC. Use `status=ACTIVE` to see unresolved emergencies.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            description: 'Filter by alarm lifecycle state',
            schema: { type: 'string', enum: ['ACTIVE', 'SILENCED', 'RESOLVED'] },
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1, minimum: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
          },
        ],
        responses: {
          200: { description: 'Paginated alarm list with dock and station details' },
        },
      },
    },

    '/alarms/{id}': {
      get: {
        tags: ['Alarms'],
        summary: 'Get alarm details by ID',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Alarm UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: { description: 'Alarm record with dock, station, and resolver info' },
          404: { description: 'Alarm not found' },
        },
      },
    },

    '/alarms/{id}/silence': {
      patch: {
        tags: ['Alarms'],
        summary: 'Silence an ACTIVE alarm (operator acknowledgement)',
        description: 'Moves alarm from `ACTIVE` → `SILENCED`. The dock remains isolated. Monitoring continues. No body required.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Alarm UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: { description: 'Alarm silenced. Status → SILENCED.' },
          409: { description: 'Alarm is not in ACTIVE state' },
          404: { description: 'Alarm not found' },
        },
      },
    },

    '/alarms/{id}/resolve': {
      patch: {
        tags: ['Alarms'],
        summary: 'Resolve an alarm and restore dock power (ADMIN only)',
        description: 'Moves alarm from `ACTIVE` or `SILENCED` → `RESOLVED`. Restores the dock state to `CHARGING` or `AVAILABLE`. **Requires physical inspection before calling.**',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Alarm UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResolveAlarmBody' },
              example: {
                notes: 'Inspected dock physically. Cooling fan replaced. Temperature normalized to 32°C. Safe to restore.',
              },
            },
          },
        },
        responses: {
          200: { description: 'Alarm resolved, dock power restored' },
          403: { description: 'ADMIN role required' },
          409: { description: 'Alarm is already resolved' },
          404: { description: 'Alarm not found' },
        },
      },
    },

    // ════════════════════════════════════════════════════════
    //  STATIONS  (5 endpoints)
    // ════════════════════════════════════════════════════════

    '/stations': {
      get: {
        tags: ['Stations'],
        summary: 'List all active swapping stations',
        description: 'Returns all active stations with dock count and swap count.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Array of station objects with aggregate counts' },
        },
      },
      post: {
        tags: ['Stations'],
        summary: 'Create a new swapping station (ADMIN only)',
        description: 'Registers a new battery swapping station in the fleet. Requires ADMIN role.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateStationBody' },
              example: {
                name: 'Dwarka Sector-21 Hub',
                location: 'Plot 14, Sector 21, Dwarka, New Delhi – 110077',
                latitude: 28.5562,
                longitude: 77.0595,
                operatorId: null,
              },
            },
          },
        },
        responses: {
          201: { description: 'Station created successfully' },
          400: { description: 'Validation error' },
          403: { description: 'ADMIN role required' },
        },
      },
    },

    '/stations/{id}': {
      get: {
        tags: ['Stations'],
        summary: 'Get station details with all docks and current battery info',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Station UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: { description: 'Station with all dock states and installed batteries' },
          404: { description: 'Station not found' },
        },
      },
    },

    '/enums': {
      get: {
        tags: ['Enums'],
        summary: 'Get all system enums',
        description: 'Returns all available enum values for dropdowns and reference (Roles, Dock States, etc).',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Enums retrieved successfully' },
        },
      },
    },

    '/stations/{id}/docks': {
      post: {
        tags: ['Stations'],
        summary: 'Create multiple docks for a station (ADMIN only)',
        description: 'Registers new physical dock bays within a station. Requires ADMIN role.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Station UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateDocksBody' },
              example: {
                dockNumbers: [1, 2, 3, 4],
              },
            },
          },
        },
        responses: {
          201: { description: 'Docks created successfully' },
          400: { description: 'Validation error' },
          403: { description: 'ADMIN role required' },
          404: { description: 'Station not found' },
          409: { description: 'One or more dock numbers already exist in this station' },
        },
      },
    },

    '/stations/{id}/recommend-swap': {
      get: {
        tags: ['Stations'],
        summary: '⚡ Smart Swap Recommender — get optimal battery for incoming driver',
        description: 'Returns the **best available dock** meeting all criteria:\n- `state = READY`\n- `SoC ≥ 95%` (fully charged)\n- `temperature ≤ 40°C` (thermally safe)\n- `healthState ≠ DECOMMISSIONED`\n\nSorted by **SoH descending** to hand out the healthiest battery first.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Station UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Optimal battery recommendation',
            content: {
              'application/json': {
                example: {
                  success: true,
                  message: 'Optimal battery pack identified for swap',
                  data: {
                    dockId: 'a1b2c3d4-...',
                    dockNumber: 3,
                    batteryId: 'b2c3d4e5-...',
                    serialNumber: 'BS-2024-00142',
                    soc: 98.2,
                    soh: 94.7,
                    temperature: 36.1,
                    estimatedRange: 117,
                  },
                },
              },
            },
          },
          404: { description: 'No batteries meet SoC/temperature criteria — wait for charging/cooling' },
          409: { description: 'No batteries are READY at this station — all docks charging or isolated' },
        },
      },
    },

    '/stations/{stationId}/docks/{dockId}/insert': {
      patch: {
        tags: ['Stations'],
        summary: 'Insert a battery into an empty dock (initial pairing)',
        description: 'Used by ADMIN to initially insert a battery into an empty dock. Once inserted, the dock state becomes CHARGING.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'stationId',
            in: 'path',
            required: true,
            description: 'Station UUID',
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'dockId',
            in: 'path',
            required: true,
            description: 'Dock UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/InsertBatteryBody' },
              example: {
                batteryId: 'b2c3d4e5-f6a1-8901-bcde-f12345678901',
              },
            },
          },
        },
        responses: {
          200: { description: 'Battery inserted successfully' },
          400: { description: 'Validation error' },
          403: { description: 'ADMIN role required' },
          404: { description: 'Dock or Battery not found' },
          409: { description: 'Dock already has a battery or is isolated, or battery is decommissioned' },
        },
      },
    },

    '/stations/{stationId}/docks/{dockId}/remove': {
      patch: {
        tags: ['Stations'],
        summary: 'Remove a battery from a dock',
        description: 'Used by ADMIN to remove a battery from a dock without completing a swap. The dock becomes AVAILABLE.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'stationId',
            in: 'path',
            required: true,
            description: 'Station UUID',
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'dockId',
            in: 'path',
            required: true,
            description: 'Dock UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: { description: 'Battery removed successfully' },
          403: { description: 'ADMIN role required' },
          404: { description: 'Dock not found' },
          409: { description: 'Dock is already empty or isolated' },
        },
      },
    },

    '/stations/{stationId}/docks/{dockId}/cutoff': {
      patch: {
        tags: ['Stations'],
        summary: 'Manually trigger thermal cutoff on a dock (ADMIN only)',
        description: 'Isolates power to a specific dock bay. Creates a MANUAL_CUTOFF alarm. Broadcasts `DOCK_POWER_CUTOFF` via Socket.io. No body required.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'stationId',
            in: 'path',
            required: true,
            description: 'Station UUID',
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'dockId',
            in: 'path',
            required: true,
            description: 'Dock UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: { description: 'Dock isolated, alarm created' },
          403: { description: 'ADMIN role required' },
          404: { description: 'Dock not found in this station' },
          409: { description: 'Dock is already isolated' },
        },
      },
    },

    // ════════════════════════════════════════════════════════
    //  BATTERIES  (4 endpoints)
    // ════════════════════════════════════════════════════════

    '/batteries': {
      get: {
        tags: ['Batteries'],
        summary: 'List battery fleet (paginated, filterable by health state)',
        description: 'Returns all batteries sorted by SoH ascending (most degraded first) for easy fleet management review.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'healthState',
            in: 'query',
            description: 'Filter by battery health state',
            schema: {
              type: 'string',
              enum: ['HEALTHY', 'DEGRADED', 'CRITICAL', 'DECOMMISSIONED'],
            },
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1, minimum: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
          },
        ],
        responses: {
          200: { description: 'Paginated battery fleet list with current dock location' },
        },
      },
      post: {
        tags: ['Batteries'],
        summary: 'Register a new battery pack into the fleet (ADMIN only)',
        description: 'Adds a new battery to the system. Initial `healthState` is derived automatically from the provided `soh` value.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateBatteryBody' },
              example: {
                serialNumber: 'BS-2024-00142',
                manufacturer: 'Amara Raja Energy',
                modelName: 'AR-48V-30AH-LFP',
                capacityKwh: 1.44,
                soh: 100,
                manufacturedAt: '2024-03-15T00:00:00.000Z',
                notes: 'Batch #Q1-2024. Passed QC inspection on 2024-03-20.',
              },
            },
          },
        },
        responses: {
          201: { description: 'Battery registered in fleet' },
          400: { description: 'Validation error' },
          403: { description: 'ADMIN role required' },
          409: { description: 'Serial number already registered' },
        },
      },
    },

    '/batteries/{id}': {
      get: {
        tags: ['Batteries'],
        summary: 'Get battery details and lifecycle audit (last 20 swaps)',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Battery UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: { description: 'Battery details with current dock, recent swap history, and telemetry count' },
          404: { description: 'Battery not found' },
        },
      },
    },

    '/batteries/{id}/decommission': {
      patch: {
        tags: ['Batteries'],
        summary: 'Decommission a battery pack (ADMIN only)',
        description: 'Permanently retires a battery. Removes it from its dock (sets dock to AVAILABLE). Batteries with SoH < 75% are auto-flagged as CRITICAL; this endpoint confirms the physical retirement.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Battery UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DecommissionBody' },
              example: {
                notes: 'SoH degraded below 75% threshold. Physical inspection confirmed. Removed from Dwarka hub.',
              },
            },
          },
        },
        responses: {
          200: { description: 'Battery decommissioned, dock freed' },
          403: { description: 'ADMIN role required' },
          404: { description: 'Battery not found' },
          409: { description: 'Battery is already decommissioned' },
        },
      },
    },

    // ════════════════════════════════════════════════════════
    //  SWAPS  (2 endpoints)
    // ════════════════════════════════════════════════════════

    '/swaps': {
      get: {
        tags: ['Swaps'],
        summary: 'Get battery swap audit log (paginated)',
        description: 'Returns swap transactions ordered by swappedAt DESC. Filter by station or driver phone for targeted audits.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'stationId',
            in: 'query',
            description: 'Filter by station UUID',
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'driverPhone',
            in: 'query',
            description: 'Filter by driver phone number',
            schema: { type: 'string', example: '9876543210' },
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 20 },
          },
        ],
        responses: {
          200: { description: 'Paginated swap audit log with station, battery, and operator info' },
        },
      },
      post: {
        tags: ['Swaps'],
        summary: 'Record a battery swap transaction',
        description: 'Atomically records the swap: gives out the charged battery, frees its dock, increments cycle count, and auto-flags incoming battery health if SoH < 75%.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateSwapBody' },
              example: {
                stationId: 'c3d4e5f6-a1b2-9012-cdef-012345678902',
                batteryOutId: 'b2c3d4e5-f6a1-8901-bcde-f12345678901',
                batteryInId: 'd4e5f6a1-b2c3-0123-def0-123456789012',
                driverPhone: '9876543210',
                driverVehicleId: 'DL-5S-AB-1234',
                notes: 'Normal swap. Driver reported previous battery was overheating.',
              },
            },
          },
        },
        responses: {
          201: { description: 'Swap recorded. Dock freed. Cycle count incremented.' },
          400: { description: 'Validation error' },
          404: { description: 'Battery not found' },
          409: { description: 'Battery is DECOMMISSIONED/CRITICAL or dock is not READY' },
        },
      },
    },
  },
};
