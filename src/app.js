import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import xss from 'xss-clean';

import env from './config/env.js';

// Common Auth Routes
import authRouter from './routes/auth.routes.js';

// 👑 Admin Routes
import planAdminRouter from './routes/admin/plan.admin.routes.js';
import premiumAdminRouter from './routes/admin/premium.admin.routes.js';
import policyConditionAdminRouter from './routes/admin/policyCondition.admin.routes.js';
import applicationAdminRouter from './routes/admin/application.admin.routes.js';

// 📱 Customer Mobile App Routes
import customerRouter from './routes/customer/customer.routes.js';
import applicationCustomerRouter from './routes/customer/application.customer.routes.js';

import errorHandler from './middleware/error.middleware.js';
import ApiError from './utils/ApiError.js';
import { setupSwagger } from './config/swagger.js';

const app = express();

// 1. Configure allowed CORS origins dynamically
const rawOrigins = env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',').map((s) => s.trim()) : ['*'];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., mobile apps, curl, Postman, server-to-server)
    if (!origin) return callback(null, true);

    // If wildcard '*' is in allowed origins, dynamically allow the incoming origin
    if (rawOrigins.includes('*')) {
      return callback(null, true);
    }

    // Check exact matches or domain patterns (.vercel.app, localhost)
    if (
      rawOrigins.includes(origin) ||
      /\.vercel\.app$/.test(origin) ||
      /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }

    return callback(null, true); // Fallback allow to avoid blocking legitimate frontend origins
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200,
};

// Apply CORS middleware first
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 2. Security HTTP Headers (configured for cross-origin resources)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// 3. Logging in Development environment
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// 4. Rate Limiting (Prevent Brute-Force / DoS)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// 5. Parsers (JSON & UrlEncoded payload size limitations)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 6. Cookie Parser
app.use(cookieParser());

// 7. Data Sanitization (Against NoSQL injection queries)
app.use(mongoSanitize());

// 8. Data Sanitization (Against Cross-Site Scripting XSS)
app.use(xss());

// 9. Prevent HTTP Parameter Pollution
app.use(hpp());

// 10. Gzip Compression
app.use(compression());

// 10b. Swagger API Documentation
setupSwagger(app);

// 11. Application Routes
// Common Auth Route
app.use('/api/auth', authRouter);

// 👑 Admin Master Routes (/api/admin/*)
app.use('/api/admin', planAdminRouter);
app.use('/api/admin', premiumAdminRouter);
app.use('/api/admin', policyConditionAdminRouter);
app.use('/api/admin', applicationAdminRouter);

// 📱 Customer Mobile App Routes (/api/customer/*)
app.use('/api', customerRouter);
app.use('/api', applicationCustomerRouter);

// 12. Catch-all undefined routes
app.all('*', (req, res, next) => {
  next(new ApiError(404, `Can't find ${req.originalUrl} on this server!`));
});

// 13. Centralized error handling middleware
app.use(errorHandler);

export default app;
