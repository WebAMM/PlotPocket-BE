//Models
const Reward = require("../models/Rewards.model");
//Response and errors
const { error500, error409 } = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");

//Add Rewards
const addReward = async (req, res) => {
  try {
    const rewardExist = await Reward.findOne();
    if (rewardExist) {
      return error409(res, `Reward exist already, update reward`);
    }
    await Reward.create({
      ...req.body,
    });
    return status200(res, "Reward created successfully");
  } catch (err) {
    error500(res, err);
  }
};

//Get Reward
const getRewards = async (req, res) => {
  try {
    const reward = await Reward.findOne();
    return success(res, "200", "Success", reward);
  } catch (err) {
    error500(res, err);
  }
};

//Update Reward
const editReward = async (req, res) => {
  try {
    await Reward.findOneAndUpdate(
      {},
      {
        ...req.body,
      },
      {
        new: true,
      }
    );
    return status200(res, "Reward updated successfully");
  } catch (err) {
    error500(res, err);
  }
};

//Update Reward Status (ACTIVE/INACTIVE)
const editRewardStatus = async (req, res) => {
  const { status } = req.body;
  try {
    await Reward.findOneAndUpdate(
      {},
      {
        status,
      },
      {
        new: true,
      }
    );
    return status200(res, "Reward status updated successfully");
  } catch (err) {
    error500(res, err);
  }
};

//User claim reward
const claimReward = async (req, res) => {
  const { status } = req.body;
  try {
    await Reward.findOneAndUpdate(
      {},
      {
        status,
      },
      {
        new: true,
      }
    );
    return status200(res, "Reward status updated successfully");
  } catch (err) {
    error500(res, err);
  }
};

module.exports = {
  addReward,
  getRewards,
  editReward,
  editRewardStatus,
  claimReward,
};
