const { body, validationResult } = require("express-validator");
//Responses and errors
const {
  error500,
  error409,
  error404,
  customError,
} = require("../services/helpers/errors");
//imports from packages
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
//config
const config = require("../config");

const validateEmailAndPassword = [
  //validate email
  body("email").isEmail().withMessage("Please enter a valid email"),

  //validate password
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  (req, res, next) => {
    const errors = validationResult(req);

    if (errors.isEmpty()) {
      next();
    } else {
      return res.status(400).json({ errors: errors.array() });
    }
  },
];

const verifyToken = (req, res, next) => {
  try {
    if (!req.headers["authorization"]) {
      error404(res, "A token is required for authorization");
    } else {
      const token = req.headers["authorization"];

      const bearer = token.split(" ");
      const bearerToken = bearer[1];

      const decode = jwt.verify(
        bearerToken,
        config.jwtPrivateKey,
        (err, authData) => {
          if (err) {
            error404(res, "Invalid token, try login again");
          } else {
            req.decodeData = authData;

            return next();
          }
        }
      );
    }
  } catch (err) {
    error500(res, err);
  }
};

module.exports = { validateEmailAndPassword, verifyToken };