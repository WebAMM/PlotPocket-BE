//Server Errors
const error500 = (res, err) => {
    console.log(err);
    res.status(500).json({
      status: "500",
      message: `Unexpected Error: ${err}`,
    });
  };
  
  //Not Found
  const error404 = (res, message) => {
    res.status(404).json({
      status: "404",
      message: message,
    });
  };
  
  //bad request
  const error400 = (res, message) => {
    res.status(400).json({
      status: "400",
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
  
  //Custom Error
  const customError = (res, statusCode, message) => {
    res.status(statusCode).json({
      status: statusCode,
      message: message,
    });
  };
  
  module.exports = {
    error500,
    error404,
    error400,
    error409,
    customError,
  };