"use strict";

const homeRoute = require("./home");
const { show } = require("../src/config");
/**
 * Initialize routes
 */
const init = (app) => {
  show.debug("Initialising routes");
  app.use("*", homeRoute);
};

module.exports = {
  init,
};
