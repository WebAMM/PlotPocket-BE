//Models
const Novel = require("../models/Novel.model");
const Series = require("../models/Series.model");
const User = require("../models/User.model");

//Responses and errors
const {
  error500,
  error409,
  error404,
  customError,
  error400,
} = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");

// Admin dashboard
const adminDashboard = async (req, res) => {
  try {
    const chapters = await Novel.countDocuments();
    const series = await Series.countDocuments();
    const users = await User.countDocuments();
    const dashboardData = {
      chapters,
      series,
      users,
    };
    success(res, "200", "Success", dashboardData);
  } catch (err) {
    error500(res, err);
  }
};

module.exports = {
  adminDashboard,
};
