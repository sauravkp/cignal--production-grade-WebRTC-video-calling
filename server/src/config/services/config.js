"use strict";

const fs = require("fs");
const path = require("path");
let basePath = path.join(__dirname, "../../../");
const env = process.env.NODE_ENV;
// const env = 'development'
// if (env === 'production') {
//  basePath = './'
// }
const envPath = path.join(basePath, `.env/${env}.config.env`);
const envConfig = require("dotenv").config({
  path: envPath,
});
if (envConfig.error) {
  throw envConfig.error;
}

/**
 * Test config
 */
const test = {
  env,
  ip: process.env.IP,
  host: process.env.HOST,
  port: process.env.PORT,
  url: `https://${process.env.PROD_HOST}`,
  sslOptions: {
    key: fs.readFileSync(path.join(basePath, `ssl/${process.env.SSL_KEY}`)),
    cert: fs.readFileSync(path.join(basePath, `ssl/${process.env.SSL_CRT}`)),
  },
  clientStaticFolder: path.join(basePath, "./client/static"),
  clientBuildFolder: path.join(basePath, "./client"),
};

/**
 * Development config
 */
const development = {
  env,
  ip: process.env.IP,
  host: process.env.HOST,
  port: process.env.PORT,
  url: `https://${process.env.CLIENT_HOST}:${process.env.CLIENT_PORT}`,
  sslOptions: {
    key: fs.readFileSync(path.join(basePath, `ssl/${process.env.SSL_KEY}`)),
    cert: fs.readFileSync(path.join(basePath, `ssl/${process.env.SSL_CRT}`)),
  },

  clientStaticFolder: path.join(basePath, "../client/static"),
  clientBuildFolder: path.join(basePath, "../client"),
};

/**
 * Production config
 */
const production = {
  env,
  ip: process.env.IP,
  host: process.env.HOST,
  port: process.env.PORT,
  url: `https://${process.env.PROD_HOST}`,
  sslOptions: {
    key: fs.readFileSync(path.join(basePath, `ssl/${process.env.SSL_KEY}`)),
    cert: fs.readFileSync(path.join(basePath, `ssl/${process.env.SSL_CRT}`)),
  },
  clientStaticFolder: path.join(basePath, "./client/static"),
  clientBuildFolder: path.join(basePath, "./client"),
};

const config = {
  test,
  development,
  production,
};

module.exports = config[env];
