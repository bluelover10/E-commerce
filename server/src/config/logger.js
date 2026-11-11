const winston = require("winston");
const path = require("path");

const { combine, timestamp, printf, colorize, errors } = winston.format;

// ── Log Format ────────────────────────────────────────────────────────────────
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return stack
    ? `${timestamp} [${level}]: ${message}\n${stack}`
    : `${timestamp} [${level}]: ${message}`;
});

// ── Transports ────────────────────────────────────────────────────────────────
const transports = [
  new winston.transports.Console({
    format: combine(colorize(), timestamp({ format: "HH:mm:ss" }), logFormat)
  })
];

// In production, also write to log files
if (process.env.NODE_ENV === "production") {
  const logsDir = path.join(process.cwd(), "logs");

  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 10
    })
  );
}

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "warn" : "debug",
  format: combine(
    errors({ stack: true }),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    logFormat
  ),
  transports,
  exitOnError: false
});

module.exports = logger;
