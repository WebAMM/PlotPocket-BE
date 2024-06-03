const cors = require("cors");

const corsSetup = (app) => {
  app.use(cors());
};

module.exports = { corsSetup };
