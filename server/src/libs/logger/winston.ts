// libs
import { format, addColors, createLogger, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
// others
import ENV from "@/constants/env";

const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

const COLORS = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white"
};

addColors(COLORS);

const consoleFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
  format.colorize({ all: true }),
  format.printf((info) => {
    const { timestamp, level, message, service, requestId, ...meta } = info;
    const prefix = [service, requestId].filter(Boolean).join(" ");
    const prefixStr = prefix ? ` [${prefix}]` : "";
    const metaString =
      Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${level}]${prefixStr}: ${message}${metaString}`;
  })
);

const fileFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

const errorFileRotateTransport = new DailyRotateFile({
  level: "error",
  filename: path.join("logs", "error-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxFiles: "30d",
  maxSize: "20m",
  format: fileFormat
});

const combinedFileRotateTransport = new DailyRotateFile({
  filename: path.join("logs", "combined-%DATE%.log"),
  datePattern: "YYYY-MM-DD",
  maxFiles: "14d",
  maxSize: "20m",
  format: fileFormat
});

const logger = createLogger({
  level: ENV.LOG_LEVEL,
  levels: LEVELS,
  defaultMeta: { service: "web-app-store-server" },
  exitOnError: false,
  transports: [errorFileRotateTransport, combinedFileRotateTransport]
});

if (ENV.NODE_ENV !== "production") {
  logger.add(new transports.Console({ format: consoleFormat }));
}

export default logger;
