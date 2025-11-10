// logger.js
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;
const path = require('path');
const fs = require('fs');

const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

function getUserLogger(username) {
  const filename = path.join(logsDir, `${username}.log`);

  return createLogger({
    level: 'info',
    format: combine(
      colorize(), // ✅ Adds colors to console output
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    ),
    transports: [
      new transports.Console(), // ✅ prints to console
      new transports.File({ filename }) // ✅ writes to per-user file
    ],
    exitOnError: false
  });
}

module.exports = getUserLogger;
