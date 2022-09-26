"use strict";

const { express, show, stats, config } = require("../config");
const spdy = require("spdy");
const { initSocketServer, store } = require("../lib");
const { Server } = require("socket.io");
const routes = require("../../routes");

let server = null;

/**
 * Start HTTP/2 server, database, socket.io connection
 * Load routes, services, check memory usage
 * @function
 */
const listen = () => {
  const app = express.init();

  server = spdy
    .createServer(config.sslOptions, app)
    .listen(config.port, config.ip);
  show.debug(`Listening at https://${config.host}:${config.port}`);
  const io = new Server(server, {});
  // socket.listen(server);
  initSocketServer(io);
  routes.init(app);
  stats.memory();
};

/**
 * Close server, database connection
 * @function
 */
const close = () => {
  server.close();
  show.debug("Server down");
};

module.exports = {
  listen,
  close,
};
