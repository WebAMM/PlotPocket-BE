const router = require("express").Router();
//controllers
const rewardController = require("../controllers/reward.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");
const { upload } = require("../services/helpers/fileHelper");
const payloadValidator = require("../middlewares/payloadValidator");

//Add Reward
router.post(
  "/admin/add",
  verifyToken,
  payloadValidator.validateAddReward,
  rewardController.addReward
);

//Get Reward
router.get("/admin/all", verifyToken, rewardController.getRewards);

//Update Reward
router.put("/admin/update", verifyToken, rewardController.editReward);

//Update Reward
router.patch(
  "/admin/update-status",
  verifyToken,
  rewardController.editRewardStatus
);

//Rewards for app
router.get("/app/all", verifyToken, rewardController.getRewardsForUser);

//Update Reward
router.post("/app/claim", verifyToken, rewardController.claimReward);

module.exports = router;
