import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import {logger} from './utils/logger';
import {env} from './config/env';
import routes from './routes';
import {errorMiddleware, notFoundMiddleware} from './middleware/error.middleware';
import {swaggerDocument} from './config/swagger';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
    origin: env.cors.origin === '*' ? true : env.cors.origin.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({extended: true, limit: '10mb'}));

// Request logging
app.use(
    pinoHttp({
        logger,
        customLogLevel: (req, res, err) => {
            if (res.statusCode >= 400 && res.statusCode < 500) {
                return 'warn';
            } else if (res.statusCode >= 500 || err) {
                return 'error';
            }
            return 'info';
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
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health check endpoint
app.get('/health', (res) => {
    res.json({status: 'ok', timestamp: new Date().toISOString()});
});

// API routes
app.use('/', routes);

// 404 handler
app.use(notFoundMiddleware);

// Error handling middleware (must be last)
app.use(errorMiddleware);

export default app;

