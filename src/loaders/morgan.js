//HTTP request logger middleware for nodeJs
const morgan = require("morgan");

const morganSetup = (app) => {
  app.use(morgan("dev", "immediate"));
};

module.exports = { morganSetup };
