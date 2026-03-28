require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('./config/passport');
const connectDB = require('./config/db');
const { logger } = require('./config/logger');
const pinoHttp = require('pino-http');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const authRoutes = require('./routes/auth');
const spotifyRoutes = require('./routes/spotify');
const youtubeRoutes = require('./routes/youtube');
const migrateRoutes = require('./routes/migrate');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.PORT;

// Connect to MongoDB
connectDB();

// HTTP request logging with Pino
app.use(
  pinoHttp({
    logger,
    autoLogging: true,
    customLogLevel: (res, err) => {
      if (res.statusCode >= 400 && res.statusCode < 500) return 'warn';
      if (res.statusCode >= 500 || err) return 'error';
      return 'info';
    },
    customSuccessMessage: function (req, res) {
      return `${req.method} ${req.url} - ${res.statusCode}`;
    },
    customErrorMessage: function (req, res, err) {
      return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
    },
  })
);

// CORS — allow frontend origin with credentials
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session with MongoDB store
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 24 * 60 * 60, // 1 day
    }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      httpOnly: true,
      secure: false, // set to true in production with HTTPS
      sameSite: 'lax',
    },
  })
);

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'PlaylistBridge API Documentation',
}));

// Swagger JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Routes
app.use('/auth', authRoutes);
app.use('/api/spotify', spotifyRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/migrate', migrateRoutes);
app.use('/api/export', exportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
const ApiResponse = require('./utils/ApiResponse');
app.use((err, req, res, next) => {
  req.log.error({ err }, 'Unhandled error');
  
  // Import AppError for proper error handling
  const AppError = require('./utils/AppError');
  
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(
      ApiResponse.error(err.message, err.errors)
    );
  }

  res.status(500).json(ApiResponse.error('Internal Server Error'));
});

app.listen(PORT, () => {
  logger.info(`PlaylistBridge server running on port ${PORT}`);
  logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
});

module.exports = app;