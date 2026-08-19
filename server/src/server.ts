// others
import "reflect-metadata";
import config from "@/constants/env";
import app from "./app";
import { loadAll, closeAll } from "./loaders";
import { Logger } from "@/libs/logger";

const startServer = async (): Promise<void> => {
  try {
    await loadAll(app);

    const PORT = config.APP_PORT || 3000;
    const server = app.listen(PORT, () => {
      Logger.info(`Server is running at http://localhost:${PORT}`);
      Logger.info(`Environment: ${config.NODE_ENV}`);
    });

    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.syscall !== "listen") {
        throw error;
      }

      const bind = typeof PORT === "string" ? `Pipe ${PORT}` : `Port ${PORT}`;

      switch (error.code) {
        case "EACCES":
          Logger.error(`${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case "EADDRINUSE":
          Logger.error(`${bind} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

    const gracefulShutdown = async (signal: string): Promise<void> => {
      Logger.info(`${signal} received, starting graceful shutdown`);

      // 1. Ngừng accept request mới
      server.closeIdleConnections();

      try {
        // 2. Chờ hết request đang xử lý (timeout 30s)
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            Logger.warn("Force closing connections after 30s");
            resolve();
          }, 30000);

          server.closeAllConnections();
          server.close(() => {
            clearTimeout(timeout);
            resolve();
          });
        });

        await closeAll();

        Logger.info("Graceful shutdown completed");
        process.exit(0);
      } catch (error) {
        Logger.error("Error during graceful shutdown", error);
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    process.on("uncaughtException", (error) => {
      Logger.error("UNCAUGHT EXCEPTION! Shutting down...", {
        error: error.message,
        stack: error.stack
      });
      // Không graceful → crash để PM2/Docker restart
      process.exit(1);
    });

    process.on("unhandledRejection", async (reason, promise) => {
      Logger.error("UNHANDLED REJECTION! Graceful shutdown...", {
        reason,
        promise
      });
      await gracefulShutdown("unhandledRejection");
    });
  } catch (error) {
    Logger.error("Failed to start server", error);
    process.exit(1);
  }
};

startServer().catch((error) => {
  Logger.error("Fatal error during startup", error);
  process.exit(1);
});
