const express = require("express");
//DB Connection
require("./db");
//morgan
const { morganSetup } = require("./morgan");
//Cors
const { corsSetup } = require("./cors");

const appMiddlewares = (app) => {
  app.use(express.json());
  morganSetup(app);
  corsSetup(app);
};

module.exports = { appMiddlewares };
