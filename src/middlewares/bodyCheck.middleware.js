//Responses and errors
const {
    error500,
    error409,
    error404,
    customError,
  } = require("../services/helpers/errors");
  const { status200, success } = require("../services/helpers/response");
  //helper functions
  const { isObjectEmpty } = require("../services/helpers/objectEmptyChecker");
  
  const bodyChecker = async (req, res, next) => {
    if (isObjectEmpty(req.body)) {
      error404(res, "Body required!");
    } else {
      next();
    }
  };
  
  module.exports = { bodyChecker };
  