const pino = require('pino');

// Create logger instance with environment-based configuration
const logger = pino({
  level: process.env.LOG_LEVEL,
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        }
      : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});

// Create child loggers for different modules
const createModuleLogger = (module) => {
  return logger.child({ module });
};

module.exports = {
  logger,
  createModuleLogger,
};