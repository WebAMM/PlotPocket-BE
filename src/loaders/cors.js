const cors = require("cors");

const corsSetup = (app) => {
  app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
};

module.exports = { corsSetup };
