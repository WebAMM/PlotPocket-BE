//Bad request
const error400 = (res, message) => {
  res.status(400).json({
    status: "400",
    message: message,
  });
};

//Not Found
const error404 = (res, message) => {
  res.status(404).json({
    status: "404",
    message: message,
  });
};

//Already Exists
const error409 = (res, message) => {
  res.status(409).json({
    status: "409",
    message: message,
  });
};

//Server error
const error500 = (res, err) => {
  res.status(500).json({
    status: "500",
    message: `Unexpected Error: ${err}`,
  });
};

//Custom Error
const customError = (res, statusCode, message) => {
  res.status(statusCode).json({
    status: statusCode,
    message: message,
  });
};

module.exports = {
  error400,
  error404,
  error409,
  error500,
  customError,
};
