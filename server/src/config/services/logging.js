"use strict";

const winston = require("winston");

/**
 * Logging configuration (winston)
 */
const show = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: "error.log",
      level: "error",
    }),
  ],
});

show.add(
  new winston.transports.Console({
    format: winston.format.simple(),
  })
);

// console.log(show);

module.exports = show;
