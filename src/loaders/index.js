const express = require("express");
const helmet = require("helmet");
//DB Connection
require("./db");
//morgan
const { morganSetup } = require("./morgan");
//Cors
const { corsSetup } = require("./cors");

const appMiddlewares = (app) => {
  corsSetup(app);
  app.use(express.json());
  app.use(helmet());
  morganSetup(app);
};

module.exports = { appMiddlewares };
