import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'secure-flow-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
});

// Only add file transports in development (not on Vercel)
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  try {
    logger.add(new winston.transports.File({ filename: 'logs/error.log', level: 'error' }));
    logger.add(new winston.transports.File({ filename: 'logs/combined.log' }));
  } catch (error) {
    console.warn('Could not create file transports:', error.message);
  }
}

export default logger;
