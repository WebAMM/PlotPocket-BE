//Responses and errors
const {
  error500,
  error404,
  customError,
} = require("../services/helpers/errors");
//imports from packages
const jwt = require("jsonwebtoken");
//config
const config = require("../config");

const verifyToken = (req, res, next) => {
  try {
    if (!req.headers["authorization"]) {
      error404(res, "A token is required for authorization");
    } else {
      const token = req.headers["authorization"];
      const bearer = token.split(" ");
      const bearerToken = bearer[1];
      jwt.verify(bearerToken, config.jwtPrivateKey, (err, authData) => {
        if (err) {
          error404(res, "Invalid token, try login again");
        } else {
          req.user = authData;
          return next();
        }
      });
    }
  } catch (err) {
    error500(res, err);
  }
};

// Middleware to verify token and role
const verifyRole = (roles) => {
  return (req, res, next) => {
    // Check if the user's role is in the allowed roles
    if (!roles.includes(req.user.role)) {
      return customError(
        res,
        403,
        "Forbidden: Do not have access to this resource"
      );
    }
    next();
  };
};

module.exports = { verifyToken, verifyRole };
