//Models
const Reward = require("../models/Rewards.model");
const UserCoin = require("../models/UserCoin.model");
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
    if (rewards.weeklyRewards.length !== 7) {
      return customError(res, 422, `Weekly rewards invalid`);
    }

    const userSteak = await UserSteak.findOne({
      user: req.user._id,
    });

    // Function to generate the rewards with the canClaim flag
    const generateRewardsWithClaim = (claimedDay, canClaim) => {
      return rewards.weeklyRewards.map((reward) => ({
        day: reward.day,
        reward: reward.reward,
        canClaim:
          canClaim &&
          (claimedDay < 7 ? claimedDay + 1 === reward.day : reward.day === 1),
      }));
    };

    let rewardsWithClaim;
    if (userSteak && userSteak.claimedDate) {
      const isNextDay = timeDiffChecker(userSteak.claimedDate);

      if (isNextDay) {
        rewardsWithClaim = generateRewardsWithClaim(userSteak.claimedDay, true);
      } else {
        rewardsWithClaim = generateRewardsWithClaim(
          userSteak.claimedDay,
          false
        );
      }
    } else {
      // If no steak exists, the user can only claim Day 1 reward
      rewardsWithClaim = generateRewardsWithClaim(0, true);
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
      return customError(res, 422, "Weekly rewards invalid");
    }
    const userSteak = await UserSteak.findOne({
      user: req.user._id,
    });
    if (!userSteak) {
      //If user steak doesn't exist, create it and claim day 1 reward
      await UserSteak.create({
        user: req.user._id,
        claimedDay: 1,
        claimedDate: new Date(),
      });
      await UserCoin.findOneAndUpdate(
        {
          user: req.user._id,
        },
        {
          $inc: {
            totalCoins: rewards.weeklyRewards[0].reward,
            bonusCoins: rewards.weeklyRewards[0].reward,
          },
        },
        {
          upsert: true,
          runValidators: true,
        }
      );
      return status200(res, "Day 1 reward claimed successfully");
    } else {
      if (userSteak && userSteak.claimedDate) {
        const isNextDay = timeDiffChecker(userSteak.claimedDate);
        if (userSteak.claimedDay < 7) {
          if (!isNextDay) {
            return status200(res, "Cannot avail before next day");
          } else {
            //Means can avail after 24 hours means tomorrow and before tomorrow day ends.
            const newClaimedDay = userSteak.claimedDay + 1;
            await UserSteak.findOneAndUpdate(
              {
                user: req.user._id,
              },
              {
                $set: {
                  claimedDay: newClaimedDay,
                  claimedDate: new Date(),
                },
              }
            );
            await UserCoin.findOneAndUpdate(
              {
                user: req.user._id,
              },
              {
                $inc: {
                  totalCoins: rewards.weeklyRewards[newClaimedDay - 1].reward,
                  bonusCoins: rewards.weeklyRewards[newClaimedDay - 1].reward,
                },
              }
            );
            return status200(
              res,
              `Day ${userSteak.claimedDay + 1} reward claimed successfully`
            );
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
