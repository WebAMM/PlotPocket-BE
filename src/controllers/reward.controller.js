//Models
const Reward = require("../models/Rewards.model");
const UserSteak = require("../models/UserSteak.model");
//Response and errors
const {
  error500,
  error409,
  customError,
} = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");
const timeDiffChecker = require("../services/helpers/timeDiffChecker");
const moment = require("moment");

//Add Rewards
const addReward = async (req, res) => {
  try {
    const rewardExist = await Reward.findOne();
    if (rewardExist) {
      return error409(res, "Reward exist already, update reward");
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

//Get Reward
const getRewardsForUser = async (req, res) => {
  try {
    const rewards = await Reward.findOne({ status: "Active" });
    if (!rewards) {
      return success(res, "200", "Success", []);
    }
    if (!rewards.weeklyRewards.length === 7) {
      return customError(res, 422, `Weekly rewards invalid`);
    }
    const userSteak = await UserSteak.findOne({
      user: req.user._id,
    });

    //Rewards with check of either can claim or not
    let rewardsWithClaim;
    if (userSteak && userSteak.claimedDate) {
      // const now = moment();
      // const lastClaimedDate = moment(userSteak.claimedDate);
      // const timeDiff = now.diff(lastClaimedDate, "hours");

      const timeDiff = timeDiffChecker(userSteak.claimedDate);

      if (timeDiff >= 24 && timeDiff <= 48) {
        rewardsWithClaim = rewards.weeklyRewards.map((reward) => ({
          day: reward.day,
          reward: reward.reward,
          canClaim:
            userSteak.claimedDay < 7
              ? userSteak.claimedDay + 1 === reward.day
                ? true
                : false
              : userSteak.claimedDay >= 7 && reward.day === 1
              ? true
              : false,
        }));
      } else {
        rewardsWithClaim = rewards.weeklyRewards.map((reward) => ({
          day: reward.day,
          reward: reward.reward,
          canClaim: false,
        }));
      }
    } else {
      rewardsWithClaim = rewards.weeklyRewards.map((reward) => ({
        day: reward.day,
        reward: reward.reward,
        canClaim: reward.day === 1 ? true : false,
      }));
    }
    return success(res, "200", "Success", rewardsWithClaim);
  } catch (err) {
    error500(res, err);
  }
};

//User claim reward
const claimReward = async (req, res) => {
  try {
    const rewards = await Reward.findOne({
      status: "Active",
    });
    if (!rewards) {
      return customError(res, 403, `Reward is inactive`);
    }
    if (!rewards.weeklyRewards.length === 7) {
      return customError(res, 422, `Weekly rewards invalid`);
    }
    if (rewards) {
      const userSteak = await UserSteak.findOne({
        user: req.user._id,
      });
      if (!userSteak) {
        await UserSteak.create({
          user: req.user._id,
          claimedDay: 1,
          claimedDate: new Date(),
        });
        return status200(res, "Day 1 reward claimed successfully");
      } else {
        if (userSteak && userSteak.claimedDate) {
          // const now = moment();
          // const lastClaimedDate = moment(userSteak.claimedDate);
          // const timeDiff = now.diff(lastClaimedDate, "hour");
          const timeDiff = timeDiffChecker(userSteak.claimedDate);
          if (userSteak.claimedDay < 7) {
            if (timeDiff < 24) {
              return status200(res, "Cannot avail before next day");
            } else if (timeDiff >= 24 && timeDiff < 48) {
              //Means can avail after 24 hours means tomorrow and before tomorrow day ends.
              await UserSteak.findOneAndUpdate(
                {
                  user: req.user._id,
                },
                {
                  $set: {
                    claimedDay: userSteak.claimedDay + 1,
                    claimedDate: new Date(),
                  },
                }
              );
              return status200(
                res,
                `Day ${userSteak.claimedDay + 1} reward claimed successfully`
              );
            } else if (timeDiff < 48) {
              //Means don't availed next day as well so break the steak
              await UserSteak.findOneAndUpdate(
                {
                  user: req.user._id,
                },
                {
                  claimedDay: 1,
                  claimedDate: new Date(),
                }
              );
              return status200(res, "Day 1 Reward claimed successfully");
            }
          } else {
            await UserSteak.findOneAndUpdate(
              {
                user: req.user._id,
              },
              {
                claimedDay: 1,
                claimedDate: new Date(),
              }
            );
            return status200(res, "Day 1 Reward claimed successfully");
          }
        }
      }
    }
  } catch (err) {
    error500(res, err);
  }
};

module.exports = {
  addReward,
  getRewards,
  getRewardsForUser,
  editReward,
  editRewardStatus,
  claimReward,
};
