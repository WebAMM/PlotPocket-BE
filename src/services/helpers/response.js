const success = (res, statusCode, message, data) => {
    res.status(200).json({
      status: statusCode,
      message: message,
      data: data,
    });
  };
  
  const status200 = (res, message = "Success") => {
    res.status(200).json({
      status: "200",
      message,
    });
  };
  
  module.exports = {
    success,
    status200,
  };