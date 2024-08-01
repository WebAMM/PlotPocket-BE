//Models
const CoinRefill = require("../models/CoinRefill.model");
//Responses and errors
const { error500, error409 } = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");

//Add Coin Refill
const addCoinRefill = async (req, res) => {
  try {
    await CoinRefill.create({ ...req.body });
    return status200(res, "Refill coins added successfully");
  } catch (err) {
    error500(res, err);
  }
};

// Get All Coin Refill for Admin
const getAllAdminCoinRefill = async (req, res) => {
  try {
    const coinRefills = await CoinRefill.find().sort({ createdAt: -1 });
    return success(res, "200", "Success", coinRefills);
  } catch (err) {
    error500(res, err);
  }
};

// Get All Coin Refill for App
const getAllAppCoinRefill = async (req, res) => {
  try {
    const coinRefills = await CoinRefill.find()
      .select("price coins discount bonus description")
      .sort({ createdAt: -1 });
    return success(res, "200", "Success", coinRefills);
  } catch (err) {
    error500(res, err);
  }
};

//Edit Coin Refill
const editCoinRefill = async (req, res) => {
  const { id } = req.params;
  try {
    const coinRefill = await CoinRefill.findByIdAndUpdate(
      id,
      { $set: { ...req.body } },
      { new: true }
    );
    if (!coinRefill) {
      return error409(res, "Coin refill record not found");
    }
    return success(res, "200", "Success", coinRefill);
  } catch (err) {
    error500(res, err);
  }
};

// Delete Coin Refill
const deleteCoinRefill = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await CoinRefill.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return error409(res, "Coin refill record not found");
    }
    return status200(res, "Coin refill deleted successfully");
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
  addCoinRefill,
  getAllAdminCoinRefill,
  getAllAppCoinRefill,
  editCoinRefill,
  deleteCoinRefill,
  // getSubscriptionByPlan,
};
