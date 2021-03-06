/**
 * User: Marius
 * Date: 14.02.2015
 * Time: 10:46
 */

var winston = require("winston");

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({ json: false, timestamp: true }),
    new winston.transports.File({ filename: __dirname + '/debug.log', json: false })
  ],
  exitOnError: true
});

module.exports = logger;
