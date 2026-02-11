/**
 * Logger utility - Centralized logging with environment-aware output
 * In production, these could be sent to a logging service
 */

const isDev = import.meta.env.DEV;

export const logger = {
  error: (message, error, context = {}) => {
    if (isDev) {
      console.error(`[ERROR] ${message}`, error, context);
    }
    // In production, could send to logging service:
    // logService.error({ message, error, context });
  },

  warn: (message, data = {}) => {
    if (isDev) {
      console.warn(`[WARN] ${message}`, data);
    }
  },

  info: (message, data = {}) => {
    if (isDev) {
      console.info(`[INFO] ${message}`, data);
    }
  },

  debug: (message, data = {}) => {
    if (isDev) {
      console.log(`[DEBUG] ${message}`, data);
    }
  },
};

export default logger;
