const router = require("express").Router();
//controllers
const rewardController = require("../controllers/reward.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");
const { upload } = require("../services/helpers/fileHelper");
const payloadValidator = require("../middlewares/payloadValidator");

//[ADMIN] Add Reward
router.post(
  "/admin/add",
  verifyToken,
  payloadValidator.validateAddReward,
  rewardController.addReward
);

//[ADMIN] Get Reward
router.get("/admin/all", verifyToken, rewardController.getRewards);

//[ADMIN] Update Reward
router.put("/admin/update", verifyToken, rewardController.editReward);

//[ADMIN] Update Reward
router.patch(
  "/admin/update-status",
  verifyToken,
  rewardController.editRewardStatus
);

//[APP] Rewards for app
router.get("/app/all", verifyToken, rewardController.getRewardsForUser);

//[APP] Update Reward
router.post("/app/claim", verifyToken, rewardController.claimReward);

module.exports = router;
