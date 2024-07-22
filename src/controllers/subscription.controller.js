//Models
const Subscription = require("../models/Subscription.model");
//Responses and errors
const { error500, error409 } = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");

//Add Subscriptions
const addSubscription = async (req, res) => {
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
    const subscriptions = await Subscription.find();
    return success(res, "200", "Success", subscriptions);
  } catch (err) {
    error500(res, err);
  }
};

//Edit Subscriptions
const editSubscription = async (req, res) => {
  const { id } = req.params;
  try {
    const subscription = await Subscription.findByIdAndUpdate(
      id,
      { $set: { ...req.body } },
      { new: true }
    );
    if (!subscription) {
      return error409(res, "Subscription not found");
    }
    return success(res, "200", "Success", subscription);
  } catch (err) {
    error500(res, err);
  }
};

// Delete Subscription
const deleteSubscription = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await Subscription.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return error409(res, "Subscription not found");
    }
    return status200(res, "Subscriptions deleted successfully");
  } catch (err) {
    error500(res, err);
  }
};

// Get Subscription based on plan
// const getSubscriptionByPlan = async (req, res) => {
//   const { plan } = req.query;
//   if (!plan) {
//     return customError(res, 400, "Plan is required");
//   }
//   try {
//     const subscriptionByPlan = await Subscription.find({ plan });
//     success(res, "200", "Success", subscriptionByPlan);
//   } catch (err) {
//     error500(res, err);
//   }
// };

module.exports = {
  addSubscription,
  getAllSubscriptions,
  editSubscription,
  deleteSubscription,
  // getSubscriptionByPlan,
};
