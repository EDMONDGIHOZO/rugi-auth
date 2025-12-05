export const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Rugi Auth API",
    version: "1.0.0",
    description:
      "Centralized authentication service with multi-app role management, OAuth, password reset, and email OTP login.",
    contact: {
      name: "Rugi Auth",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local development server",
    },
  ],
  tags: [
    { name: "System", description: "Service health and metadata" },
    { name: "Auth", description: "Core authentication endpoints" },
    { name: "Apps", description: "Client application management" },
    { name: "Users", description: "User and role management" },
    { name: "Roles", description: "Role catalogue" },
    { name: "Audit", description: "Authentication audit logs" },
    { name: "Password Reset", description: "Password reset flows" },
    { name: "OTP", description: "One-time password login flows" },
    { name: "Auth Settings", description: "Per-app authentication settings" },
    { name: "OAuth", description: "Third-party OAuth providers" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        description: "Simple liveness probe for the auth service.",
        responses: {
          200: {
            description: "Health status",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },

    // AUTH
    "/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        description:
          "Registers a user using email and password for a specific client application.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/RegisterRequest" },
                  { $ref: "#/components/schemas/ClientCredentialsOptional" },
                ],
              },
            },
          },
        },
        responses: {
          201: {
            description: "User registered successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterResponse" },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          409: { $ref: "#/components/responses/ConflictError" },
        },
      },
    },
    "/login": {
      post: {
        tags: ["Auth"],
        summary: "Login user and receive tokens",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                allOf: [
                  { $ref: "#/components/schemas/LoginRequest" },
                  { $ref: "#/components/schemas/ClientCredentialsOptional" },
                ],
              },
            },
          },
        },
        responses: {
          200: {
            description: "Tokens issued",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthTokens" },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/AuthError" },
        },
      },
    },
    "/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh access token",
        description:
          "Rotates the refresh token and returns a new access token and refresh token pair.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RefreshRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Tokens issued",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthTokens" },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/AuthError" },
        },
      },
    },
    "/revoke": {
      post: {
        tags: ["Auth"],
        summary: "Revoke refresh token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RevokeRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Token revoked",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { revoked: { type: "boolean" } },
                },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          404: { $ref: "#/components/responses/NotFoundError" },
        },
      },
    },
    "/.well-known/jwks.json": {
      get: {
        tags: ["Auth"],
        summary: "Get public key in JWKS format",
        responses: {
          200: {
            description: "JWKS document",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    keys: {
                      type: "array",
                      items: { type: "object", additionalProperties: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current user information",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Current user info",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserSummary" },
              },
            },
          },
          401: { $ref: "#/components/responses/AuthError" },
        },
      },
    },

    // PASSWORD RESET
    "/password-reset/request": {
      post: {
        tags: ["Password Reset"],
        summary: "Request a password reset email",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PasswordResetRequest" },
            },
          },
        },
        responses: {
          200: {
            description:
              "If an account with that email exists, a password reset link has been sent.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageResponse" },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/password-reset/verify": {
      post: {
        tags: ["Password Reset"],
        summary: "Verify if a reset token is valid",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PasswordResetVerify" },
            },
          },
        },
        responses: {
          200: {
            description: "Token is valid",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    valid: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          400: { $ref: "#/components/responses/AuthError" },
        },
      },
    },
    "/password-reset/reset": {
      post: {
        tags: ["Password Reset"],
        summary: "Reset password using token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PasswordResetComplete" },
            },
          },
        },
        responses: {
          200: {
            description: "Password has been reset",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageResponse" },
              },
            },
          },
          400: { $ref: "#/components/responses/AuthError" },
        },
      },
    },

    // OTP
    "/otp/request": {
      post: {
        tags: ["OTP"],
        summary: "Request OTP for email login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/OtpRequest" },
            },
          },
        },
        responses: {
          200: {
            description:
              "If an account with that email exists, an OTP code has been sent.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageResponse" },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/otp/verify": {
      post: {
        tags: ["OTP"],
        summary: "Verify OTP and login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/OtpVerify" },
            },
          },
        },
        responses: {
          200: {
            description: "Tokens issued",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthTokens" },
              },
            },
          },
          400: { $ref: "#/components/responses/AuthError" },
          401: { $ref: "#/components/responses/AuthError" },
        },
      },
    },

    // APPS
    "/apps": {
      get: {
        tags: ["Apps"],
        summary: "List applications",
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/Page" },
          { $ref: "#/components/parameters/Limit" },
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Filter by app name or client_id (case-insensitive).",
          },
        ],
        responses: {
          200: {
            description: "List of applications",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/AppSummary" },
                    },
                    pagination: { $ref: "#/components/schemas/Pagination" },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/AuthError" },
        },
      },
      post: {
        tags: ["Apps"],
        summary: "Register a new client application",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateAppRequest" },
            },
          },
        },
        responses: {
          201: {
            description:
              "Application created. The client_secret is returned only once.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AppWithSecret" },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/AuthError" },
        },
      },
    },
    "/apps/{appId}": {
      get: {
        tags: ["Apps"],
        summary: "Get an app by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/AppId" }],
        responses: {
          200: {
            description: "App details",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AppSummary" },
              },
            },
          },
          401: { $ref: "#/components/responses/AuthError" },
          404: { $ref: "#/components/responses/NotFoundError" },
        },
      },
      put: {
        tags: ["Apps"],
        summary: "Update an app by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/AppId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateAppRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Application updated",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    { $ref: "#/components/schemas/AppSummary" },
                    { $ref: "#/components/schemas/AppWithSecret" },
                  ],
                },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/AuthError" },
          404: { $ref: "#/components/responses/NotFoundError" },
        },
      },
      delete: {
        tags: ["Apps"],
        summary: "Delete an app by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/AppId" }],
        responses: {
          200: {
            description: "Application deleted",
          },
          401: { $ref: "#/components/responses/AuthError" },
          404: { $ref: "#/components/responses/NotFoundError" },
        },
      },
    },
    "/apps/{appId}/users": {
      get: {
        tags: ["Apps"],
        summary: "Get all users of an app",
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/AppId" },
          { $ref: "#/components/parameters/Page" },
          { $ref: "#/components/parameters/Limit" },
        ],
        responses: {
          200: {
            description: "Users for application",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    app: { $ref: "#/components/schemas/AppSummaryInternal" },
                    users: {
                      type: "array",
                      items: { $ref: "#/components/schemas/AppUserSummary" },
                    },
                    pagination: { $ref: "#/components/schemas/Pagination" },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/AuthError" },
          404: { $ref: "#/components/responses/NotFoundError" },
        },
      },
    },
    "/apps/{appId}/roles": {
      get: {
        tags: ["Apps"],
        summary: "Get all roles for an app",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/AppId" }],
        responses: {
          200: {
            description: "Roles for application",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    app: { $ref: "#/components/schemas/SlimApp" },
                    roles: {
                      type: "array",
                      items: { $ref: "#/components/schemas/AppRoleSummary" },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/AuthError" },
          404: { $ref: "#/components/responses/NotFoundError" },
        },
      },
      post: {
        tags: ["Apps"],
        summary: "Create or verify a role for an app",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/AppId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AppAssignRoleRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Role created/verified",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AppAssignRoleResponse" },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/AuthError" },
          404: { $ref: "#/components/responses/NotFoundError" },
        },
      },
    },

    // USERS
    "/users": {
      get: {
        tags: ["Users"],
        summary: "List users",
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/Page" },
          { $ref: "#/components/parameters/Limit" },
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Filter by user email (case-insensitive).",
          },
        ],
        responses: {
          200: {
            description: "List of users",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/UserListItem" },
                    },
                    pagination: { $ref: "#/components/schemas/Pagination" },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/AuthError" },
        },
      },
    },
    "/users/invite": {
      post: {
        tags: ["Users"],
        summary: "Invite a user to one or more apps",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/InviteUserRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "User invited",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/InviteUserResponse" },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/AuthError" },
          404: { $ref: "#/components/responses/NotFoundError" },
          409: { $ref: "#/components/responses/ConflictError" },
        },
      },
    },
    "/users/{userId}": {
      get: {
        tags: ["Users"],
        summary: "Get a user by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/UserId" }],
        responses: {
          200: {
            description: "User details",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserDetailResponse" },
              },
            },
          },
          401: { $ref: "#/components/responses/AuthError" },
          404: { $ref: "#/components/responses/NotFoundError" },
        },
      },
      put: {
        tags: ["Users"],
        summary: "Update a user",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/UserId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateUserRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "User updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    user: { $ref: "#/components/schemas/UserSummary" },
                  },
                },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/AuthError" },
          404: { $ref: "#/components/responses/NotFoundError" },
          409: { $ref: "#/components/responses/ConflictError" },
        },
      },
      delete: {
        tags: ["Users"],
        summary: "Delete a user (superadmin only)",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/UserId" }],
        responses: {
          200: {
            description: "User deleted successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageResponse" },
              },
            },
          },
          401: { $ref: "#/components/responses/AuthError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
          404: { $ref: "#/components/responses/NotFoundError" },
        },
      },
    },
    "/users/{userId}/roles": {
      post: {
        tags: ["Users"],
        summary: "Assign a role to a user for a specific app",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/UserId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UserAssignRoleRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Role assigned",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserAssignRoleResponse" },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/AuthError" },
          404: { $ref: "#/components/responses/NotFoundError" },
          409: { $ref: "#/components/responses/ConflictError" },
        },
      },
    },

    // ROLES
    "/roles": {
      get: {
        tags: ["Roles"],
        summary: "List roles",
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/Page" },
          { $ref: "#/components/parameters/Limit" },
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Filter by role name (case-insensitive).",
          },
        ],
        responses: {
          200: {
            description: "List of roles",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/RoleSummary" },
                    },
                    pagination: { $ref: "#/components/schemas/Pagination" },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/AuthError" },
        },
      },
    },

    // AUDIT
    "/audit": {
      get: {
        tags: ["Audit"],
        summary: "List audit logs",
        description:
          "Lists authentication and authorization audit events with optional filters.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "user_id",
            in: "query",
            schema: { type: "string", format: "uuid" },
            description: "Filter by user ID",
          },
          {
            name: "action",
            in: "query",
            schema: {
              type: "string",
              enum: [
                "LOGIN",
                "REFRESH",
                "REVOKE",
                "ROLE_ASSIGN",
                "REGISTER",
                "PASSWORD_RESET_REQUEST",
                "PASSWORD_RESET_COMPLETE",
                "OTP_REQUEST",
                "OTP_LOGIN",
                "USER_INVITE",
              ],
            },
          },
          { $ref: "#/components/parameters/Page" },
          { $ref: "#/components/parameters/Limit" },
          {
            name: "start_date",
            in: "query",
            schema: { type: "string", format: "date-time" },
          },
          {
            name: "end_date",
            in: "query",
            schema: { type: "string", format: "date-time" },
          },
        ],
        responses: {
          200: {
            description: "Audit log list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/AuditLog" },
                    },
                    pagination: { $ref: "#/components/schemas/Pagination" },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/AuthError" },
        },
      },
    },

    // AUTH SETTINGS
    "/auth-settings": {
      get: {
        tags: ["Auth Settings"],
        summary: "List all authentication settings (superadmin only)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/Page" },
          { $ref: "#/components/parameters/Limit" },
        ],
        responses: {
          200: {
            description: "Authentication settings list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/AuthSettings" },
                    },
                    pagination: { $ref: "#/components/schemas/Pagination" },
                  },
                },
              },
            },
          },
          401: { $ref: "#/components/responses/AuthError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
        },
      },
    },
    "/auth-settings/apps/{appId}": {
      get: {
        tags: ["Auth Settings"],
        summary: "Get authentication settings for an app",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/AppId" }],
        responses: {
          200: {
            description: "Authentication settings",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthSettings" },
              },
            },
          },
          401: { $ref: "#/components/responses/AuthError" },
          404: { $ref: "#/components/responses/NotFoundError" },
        },
      },
      post: {
        tags: ["Auth Settings"],
        summary: "Create authentication settings for an app",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/AppId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthSettingsInput" },
            },
          },
        },
        responses: {
          201: {
            description: "Settings created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthSettings" },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/AuthError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
          404: { $ref: "#/components/responses/NotFoundError" },
          409: { $ref: "#/components/responses/ConflictError" },
        },
      },
      patch: {
        tags: ["Auth Settings"],
        summary: "Update authentication settings for an app",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/AppId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthSettingsInput" },
            },
          },
        },
        responses: {
          200: {
            description: "Settings updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthSettings" },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/AuthError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
          404: { $ref: "#/components/responses/NotFoundError" },
        },
      },
      delete: {
        tags: ["Auth Settings"],
        summary: "Delete authentication settings for an app",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/AppId" }],
        responses: {
          200: {
            description: "Settings deleted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageResponse" },
              },
            },
          },
          401: { $ref: "#/components/responses/AuthError" },
          403: { $ref: "#/components/responses/ForbiddenError" },
          404: { $ref: "#/components/responses/NotFoundError" },
        },
      },
    },
    "/auth-settings/apps/{appId}/check/{method}": {
      get: {
        tags: ["Auth Settings"],
        summary: "Check if a specific auth method is enabled for an app",
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/AppId" },
          {
            name: "method",
            in: "path",
            required: true,
            schema: {
              type: "string",
              enum: [
                "email_password",
                "email_otp",
                "google",
                "github",
                "microsoft",
                "facebook",
              ],
            },
          },
        ],
        responses: {
          200: {
            description: "Method status",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    app_id: { type: "string", format: "uuid" },
                    method: { type: "string" },
                    enabled: { type: "boolean" },
                  },
                },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/AuthError" },
          404: { $ref: "#/components/responses/NotFoundError" },
        },
      },
    },

    // OAUTH
    "/oauth/providers": {
      get: {
        tags: ["OAuth"],
        summary: "Get available OAuth providers for an app",
        parameters: [
          {
            name: "client_id",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Provider configuration for app",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    app_id: { type: "string", format: "uuid" },
                    app_name: { type: "string" },
                    client_id: { type: "string" },
                    providers: {
                      type: "object",
                      additionalProperties: { type: "boolean" },
                    },
                    allow_registration: { type: "boolean" },
                    require_email_verification: { type: "boolean" },
                  },
                },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          404: { $ref: "#/components/responses/NotFoundError" },
        },
      },
    },
    "/oauth/google": {
      get: {
        tags: ["OAuth"],
        summary: "Initiate Google OAuth flow",
        parameters: [
          {
            name: "client_id",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "redirect_uri",
            in: "query",
            required: true,
            schema: { type: "string", format: "uri" },
          },
          {
            name: "state",
            in: "query",
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Authorization URL generated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    auth_url: { type: "string", format: "uri" },
                    provider: { type: "string", example: "google" },
                  },
                },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          404: { $ref: "#/components/responses/NotFoundError" },
        },
      },
    },
    "/oauth/google/callback": {
      post: {
        tags: ["OAuth"],
        summary: "Handle Google OAuth callback",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  client_id: { type: "string" },
                  client_secret: { type: "string" },
                  redirect_uri: { type: "string", format: "uri" },
                  device_info: { type: "object" },
                },
                required: ["code", "client_id", "redirect_uri"],
              },
            },
          },
        },
        responses: {
          200: {
            description: "User authenticated via Google",
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/AuthTokens" },
                    {
                      type: "object",
                      properties: {
                        user: {
                          type: "object",
                          properties: {
                            id: { type: "string", format: "uuid" },
                            email: { type: "string", format: "email" },
                            registration_method: { type: "string" },
                            is_email_verified: { type: "boolean" },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          400: { $ref: "#/components/responses/ValidationError" },
          401: { $ref: "#/components/responses/AuthError" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    parameters: {
      Page: {
        name: "page",
        in: "query",
        schema: { type: "integer", minimum: 1, default: 1 },
      },
      Limit: {
        name: "limit",
        in: "query",
        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      },
      AppId: {
        name: "appId",
        in: "path",
        required: true,
        schema: { type: "string", format: "uuid" },
      },
      UserId: {
        name: "userId",
        in: "path",
        required: true,
        schema: { type: "string", format: "uuid" },
      },
    },
    schemas: {
      // Shared
      MessageResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string" },
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string" },
                message: { type: "string" },
              },
            },
          },
        },
      },
      Pagination: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 20 },
          total: { type: "integer", example: 120 },
          totalPages: { type: "integer", example: 6 },
        },
      },

      // Auth
      ClientCredentialsOptional: {
        type: "object",
        properties: {
          client_id: { type: "string" },
          client_secret: { type: "string" },
        },
      },
      RegisterRequest: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
        },
        required: ["email", "password"],
      },
      RegisterResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          user: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              email: { type: "string", format: "email" },
              registration_method: { type: "string" },
              created_at: { type: "string", format: "date-time" },
            },
          },
        },
      },
      LoginRequest: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
          device_info: { type: "object" },
        },
        required: ["email", "password"],
      },
      RefreshRequest: {
        type: "object",
        properties: {
          refresh_token: { type: "string" },
          client_id: { type: "string" },
        },
        required: ["refresh_token", "client_id"],
      },
      RevokeRequest: {
        type: "object",
        properties: {
          refresh_token: { type: "string" },
        },
        required: ["refresh_token"],
      },
      AuthTokens: {
        type: "object",
        properties: {
          access_token: { type: "string" },
          refresh_token: { type: "string" },
          token_type: { type: "string", example: "Bearer" },
          expires_in: { type: "integer", example: 604800 },
        },
      },

      // OTP
      OtpRequest: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          client_id: { type: "string" },
          client_secret: { type: "string" },
        },
        required: ["email", "client_id"],
      },
      OtpVerify: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          code: { type: "string" },
          client_id: { type: "string" },
          client_secret: { type: "string" },
          device_info: { type: "object" },
        },
        required: ["email", "code", "client_id"],
      },

      // Password reset
      PasswordResetRequest: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
        },
        required: ["email"],
      },
      PasswordResetVerify: {
        type: "object",
        properties: {
          token: { type: "string", format: "uuid" },
        },
        required: ["token"],
      },
      PasswordResetComplete: {
        type: "object",
        properties: {
          token: { type: "string", format: "uuid" },
          new_password: { type: "string", minLength: 8 },
        },
        required: ["token", "new_password"],
      },

      // Users
      UserSummary: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          isEmailVerified: { type: "boolean" },
          mfaEnabled: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      UserListItem: {
        allOf: [{ $ref: "#/components/schemas/UserSummary" }],
      },
      UserDetailResponse: {
        type: "object",
        properties: {
          user: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              email: { type: "string", format: "email" },
              isEmailVerified: { type: "boolean" },
              mfaEnabled: { type: "boolean" },
              optedInApps: {
                type: "array",
                items: { type: "string", format: "uuid" },
              },
              createdAt: { type: "string", format: "date-time" },
              roles: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    role: { type: "string" },
                    app: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        name: { type: "string" },
                        clientId: { type: "string" },
                      },
                    },
                    assignedAt: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
      InviteUserRequest: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          app_ids: {
            type: "array",
            items: { type: "string", format: "uuid" },
          },
        },
        required: ["email", "app_ids"],
      },
      InviteUserResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          user: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              email: { type: "string", format: "email" },
              is_new_user: { type: "boolean" },
              generated_password: { type: "string", nullable: true },
              apps: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", format: "uuid" },
                    name: { type: "string" },
                  },
                },
              },
              role: { type: "string", example: "user" },
              opted_in_apps: {
                type: "array",
                items: { type: "string", format: "uuid" },
              },
            },
          },
        },
      },
      UpdateUserRequest: {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
          isEmailVerified: { type: "boolean" },
          mfaEnabled: { type: "boolean" },
          app_id: { type: "string", format: "uuid" },
        },
      },
      UserAssignRoleRequest: {
        type: "object",
        properties: {
          app_id: { type: "string", format: "uuid" },
          role_name: { type: "string" },
        },
        required: ["app_id", "role_name"],
      },
      UserAssignRoleResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          userAppRole: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              userId: { type: "string", format: "uuid" },
              appId: { type: "string", format: "uuid" },
              roleId: { type: "string", format: "uuid" },
              assignedBy: { type: "string", format: "uuid", nullable: true },
              assignedAt: { type: "string", format: "date-time" },
            },
          },
        },
      },

      // Apps
      CreateAppRequest: {
        type: "object",
        properties: {
          name: { type: "string" },
          type: { type: "string", enum: ["PUBLIC", "CONFIDENTIAL"] },
          redirect_uris: {
            type: "array",
            items: { type: "string", format: "uri" },
          },
        },
        required: ["name", "type", "redirect_uris"],
      },
      UpdateAppRequest: {
        type: "object",
        properties: {
          name: { type: "string" },
          type: { type: "string", enum: ["PUBLIC", "CONFIDENTIAL"] },
          redirect_uris: {
            type: "array",
            items: { type: "string", format: "uri" },
          },
        },
      },
      AppSummary: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          client_id: { type: "string" },
          type: { type: "string", enum: ["PUBLIC", "CONFIDENTIAL"] },
          redirect_uris: {
            type: "array",
            items: { type: "string", format: "uri" },
          },
          created_at: { type: "string", format: "date-time" },
        },
      },
      AppWithSecret: {
        allOf: [
          { $ref: "#/components/schemas/AppSummary" },
          {
            type: "object",
            properties: {
              client_secret: { type: "string" },
            },
          },
        ],
      },
      AppSummaryInternal: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          clientId: { type: "string" },
          type: { type: "string" },
          redirectUris: {
            type: "array",
            items: { type: "string", format: "uri" },
          },
        },
      },
      SlimApp: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
        },
      },
      AppUserSummary: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          isEmailVerified: { type: "boolean" },
          mfaEnabled: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          roles: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
      AppRoleSummary: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          userCount: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      AppAssignRoleRequest: {
        type: "object",
        properties: {
          role_name: { type: "string" },
        },
        required: ["role_name"],
      },
      AppAssignRoleResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          role: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              name: { type: "string" },
              appId: { type: "string", format: "uuid" },
              createdAt: { type: "string", format: "date-time" },
            },
          },
        },
      },

      // Roles
      RoleSummary: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          usageCount: { type: "integer" },
        },
      },

      // Auth settings
      AuthSettingsInput: {
        type: "object",
        properties: {
          email_password_enabled: { type: "boolean" },
          email_otp_enabled: { type: "boolean" },
          google_auth_enabled: { type: "boolean" },
          google_client_id: { type: "string" },
          google_client_secret: { type: "string" },
          github_auth_enabled: { type: "boolean" },
          github_client_id: { type: "string" },
          github_client_secret: { type: "string" },
          microsoft_auth_enabled: { type: "boolean" },
          microsoft_client_id: { type: "string" },
          microsoft_client_secret: { type: "string" },
          facebook_auth_enabled: { type: "boolean" },
          facebook_client_id: { type: "string" },
          facebook_client_secret: { type: "string" },
          require_email_verification: { type: "boolean" },
          allow_registration: { type: "boolean" },
        },
      },
      AuthSettings: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          app_id: { type: "string", format: "uuid" },
          email_password_enabled: { type: "boolean" },
          email_otp_enabled: { type: "boolean" },
          google_auth_enabled: { type: "boolean" },
          google_client_id: { type: "string", nullable: true },
          github_auth_enabled: { type: "boolean" },
          github_client_id: { type: "string", nullable: true },
          microsoft_auth_enabled: { type: "boolean" },
          microsoft_client_id: { type: "string", nullable: true },
          facebook_auth_enabled: { type: "boolean" },
          facebook_client_id: { type: "string", nullable: true },
          require_email_verification: { type: "boolean" },
          allow_registration: { type: "boolean" },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },

      // Audit
      AuditLog: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid", nullable: true },
          action: { type: "string" },
          metadata: { type: "object", additionalProperties: true },
          createdAt: { type: "string", format: "date-time" },
          user: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "string", format: "uuid" },
              email: { type: "string", format: "email" },
            },
          },
        },
      },
    },
    responses: {
      AuthError: {
        description: "Authentication error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      ForbiddenError: {
        description: "Forbidden error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      ValidationError: {
        description: "Validation error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      NotFoundError: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      ConflictError: {
        description: "Resource conflict",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  },
} as const;


