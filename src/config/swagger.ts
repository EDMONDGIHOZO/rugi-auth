export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'YebaLabs Auth API',
    version: '1.0.0',
    description:
      'Centralized authentication service with multi-app role management, password reset, and email OTP login.',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development server',
    },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'Health status',
          },
        },
      },
    },
    '/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          201: { description: 'User registered successfully' },
          400: { description: 'Validation error' },
          409: { description: 'User already exists' },
        },
      },
    },
    '/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login user and receive tokens',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                  client_id: { type: 'string' },
                  client_secret: { type: 'string' },
                  device_info: { type: 'object' },
                },
                required: ['email', 'password', 'client_id'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Tokens issued' },
          400: { description: 'Validation error' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refresh_token: { type: 'string' },
                  client_id: { type: 'string' },
                },
                required: ['refresh_token', 'client_id'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Tokens issued' },
          400: { description: 'Validation error' },
          401: { description: 'Invalid token' },
        },
      },
    },
    '/revoke': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke refresh token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refresh_token: { type: 'string' },
                },
                required: ['refresh_token'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Token revoked' },
          400: { description: 'Validation error' },
        },
      },
    },
    '/.well-known/jwks.json': {
      get: {
        tags: ['Auth'],
        summary: 'Get public key in JWKS format',
        responses: {
          200: { description: 'JWKS document' },
        },
      },
    },
    '/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user information',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Current user info' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/apps': {
      post: {
        tags: ['Apps'],
        summary: 'Register a new client application',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string', enum: ['PUBLIC', 'CONFIDENTIAL'] },
                  redirect_uris: {
                    type: 'array',
                    items: { type: 'string', format: 'uri' },
                  },
                },
                required: ['name', 'type', 'redirect_uris'],
              },
            },
          },
        },
        responses: {
          201: { description: 'Application created' },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/apps/{appId}/roles': {
      post: {
        tags: ['Apps'],
        summary: 'Create or verify a role for an app',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'appId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  role_name: { type: 'string' },
                },
                required: ['role_name'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Role created/verified' },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/users/{userId}/roles': {
      post: {
        tags: ['Users'],
        summary: 'Assign a role to a user for a specific app',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  app_id: { type: 'string', format: 'uuid' },
                  role_name: { type: 'string' },
                },
                required: ['app_id', 'role_name'],
              },
            },
          },
        },
        responses: {
          201: { description: 'Role assigned' },
          400: { description: 'Validation error' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/audit': {
      get: {
        tags: ['Audit'],
        summary: 'List audit logs',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'user_id',
            in: 'query',
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'action',
            in: 'query',
            schema: {
              type: 'string',
              enum: [
                'LOGIN',
                'REFRESH',
                'REVOKE',
                'ROLE_ASSIGN',
                'REGISTER',
                'PASSWORD_RESET_REQUEST',
                'PASSWORD_RESET_COMPLETE',
                'OTP_REQUEST',
                'OTP_LOGIN',
              ],
            },
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: 'start_date',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'end_date',
            in: 'query',
            schema: { type: 'string', format: 'date-time' },
          },
        ],
        responses: {
          200: { description: 'Audit log list' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/password-reset/request': {
      post: {
        tags: ['Password Reset'],
        summary: 'Request a password reset email',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                },
                required: ['email'],
              },
            },
          },
        },
        responses: {
          200: {
            description:
              'If an account with that email exists, a password reset link has been sent.',
          },
        },
      },
    },
    '/password-reset/verify': {
      post: {
        tags: ['Password Reset'],
        summary: 'Verify if a reset token is valid',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  token: { type: 'string', format: 'uuid' },
                },
                required: ['token'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Token is valid' },
          400: { description: 'Invalid or expired token' },
        },
      },
    },
    '/password-reset/reset': {
      post: {
        tags: ['Password Reset'],
        summary: 'Reset password using token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  token: { type: 'string', format: 'uuid' },
                  new_password: { type: 'string', minLength: 8 },
                },
                required: ['token', 'new_password'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Password has been reset' },
          400: { description: 'Invalid token or validation error' },
        },
      },
    },
    '/otp/request': {
      post: {
        tags: ['OTP'],
        summary: 'Request OTP for email login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  client_id: { type: 'string' },
                  client_secret: { type: 'string' },
                },
                required: ['email', 'client_id'],
              },
            },
          },
        },
        responses: {
          200: {
            description:
              'If an account with that email exists, an OTP code has been sent.',
          },
          400: { description: 'Validation error' },
        },
      },
    },
    '/otp/verify': {
      post: {
        tags: ['OTP'],
        summary: 'Verify OTP and login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  code: { type: 'string' },
                  client_id: { type: 'string' },
                  client_secret: { type: 'string' },
                  device_info: { type: 'object' },
                },
                required: ['email', 'code', 'client_id'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Tokens issued' },
          400: { description: 'Invalid OTP or validation error' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};


