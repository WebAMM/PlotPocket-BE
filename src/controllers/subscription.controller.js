//Models
const Subscription = require("../models/Subscription.model");
//Responses and errors
const { error500 } = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");

//Add Subscriptions
const addSubscriptionPlan = async (req, res) => {
  try {
    await Subscription.create({ ...req.body });
    return status200(res, "Subscriptions added successfully");
  } catch (err) {
    error500(res, err);
  }
};

// Get All Subscriptions
const getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find().select("-__v");
    return success(res, "200", "Success", subscriptions);
  } catch (err) {
    error500(res, err);
  }
};

// Get Subscription based on plan
const getSubscriptionByPlan = async (req, res) => {
  const { plan } = req.query;
  if (!plan) {
    return customError(res, 400, "Plan is required");
  }
  try {
    const subscriptionByPlan = await Subscription.find({ plan }).select("-__v");
    success(res, "200", "Success", subscriptionByPlan);
  } catch (err) {
    error500(res, err);
  }
};

module.exports = {
  addSubscriptionPlan,
  getAllSubscriptions,
  getSubscriptionByPlan,
};
