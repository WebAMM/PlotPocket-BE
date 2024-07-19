//Models
const CoinSubscription = require("../models/CoinSubscription.model");
//Responses and errors
const { error500, error409 } = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");

//Add Subscriptions
const addCoinSubscription = async (req, res) => {
  try {
    await CoinSubscription.create({ ...req.body });
    return status200(res, "Subscriptions coins added successfully");
  } catch (err) {
    error500(res, err);
  }
};

// Get All Subscriptions
const getAllCoinSubscriptions = async (req, res) => {
  try {
    const coinSubscriptions = await CoinSubscription.find();
    return success(res, "200", "Success", coinSubscriptions);
  } catch (err) {
    error500(res, err);
  }
};

//Edit Coin Subscriptions
const editCoinSubscription = async (req, res) => {
  const { id } = req.params;
  try {
    const subscription = await CoinSubscription.findByIdAndUpdate(
      id,
      { $set: { ...req.body } },
      { new: true }
    );
    if (!subscription) {
      return error409(res, "Subscriptions coins record not found");
    }
    return success(res, "200", "Success", subscription);
  } catch (err) {
    error500(res, err);
  }
};

// Delete Coin Subscription
const deleteCoinSubscription = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await CoinSubscription.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return error409(res, "Subscriptions coins record not found");
    }
    return status200(res, "Subscriptions coins deleted successfully");
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
  addCoinSubscription,
  getAllCoinSubscriptions,
  editCoinSubscription,
  deleteCoinSubscription,
  // getSubscriptionByPlan,
};
