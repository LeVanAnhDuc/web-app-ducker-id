// others
import logger from "./winston";

export class Logger {
  static error(
    message: string,
    error?: Error | unknown,
    meta?: Record<string, unknown>
  ): void {
    if (error instanceof Error) {
      logger.error(`${message} - ${error.message}`, {
        ...meta,
        stack: error.stack
      });
    } else if (error) {
      logger.error(`${message} - ${JSON.stringify(error)}`, meta);
    } else {
      logger.error(message, meta);
    }
  }

  static warn(message: string, meta?: Record<string, unknown>): void {
    logger.warn(message, meta);
  }

  static info(message: string, meta?: Record<string, unknown>): void {
    logger.info(message, meta);
  }

  static http(message: string, meta?: Record<string, unknown>): void {
    logger.http(message, meta);
  }

  static debug(message: string, meta?: Record<string, unknown>): void {
    logger.debug(message, meta);
  }

  static stream = {
    write: (message: string) => logger.http(message.trim())
  };
}
