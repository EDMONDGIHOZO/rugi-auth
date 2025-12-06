import express, { Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import { logger } from "./utils/logger";
import { env } from "./config/env";
import routes from "./routes";
import {
  errorMiddleware,
  notFoundMiddleware,
} from "./middleware/error.middleware";
import { swaggerDocument } from "./config/swagger";

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - only allow origins explicitly defined in .env
const corsOptions = {
  origin: env.cors.origin.split(",").map((origin: string) => origin.trim()),
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging - only log errors and warnings (4xx, 5xx)
// Successful requests (2xx, 3xx) are not logged to reduce noise
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => {
        // Skip logging for health checks and docs
        return req.url === "/health" || req.url === "/docs" || req.url.startsWith("/docs/");
      },
    },
    customLogLevel: (_req, res, err) => {
      if (res.statusCode >= 400 && res.statusCode < 500) {
        return "warn";
      } else if (res.statusCode >= 500 || err) {
        return "error";
      }
      // Return a level below the configured LOG_LEVEL to suppress successful requests
      // This won't be logged if LOG_LEVEL is "info" or higher (default)
      return "trace";
    },
    customSuccessMessage: (req, res) => {
      return `${req.method} ${req.url} ${res.statusCode}`;
    },
    customErrorMessage: (req, res, err) => {
      return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
    },
  })
);

// Swagger UI - API documentation
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/", routes);

// 404 handler
app.use(notFoundMiddleware);

// Error handling middleware (must be last)
app.use(errorMiddleware);

export default app;
