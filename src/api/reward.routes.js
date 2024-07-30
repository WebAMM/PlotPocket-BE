const router = require("express").Router();
//controllers
const rewardController = require("../controllers/reward.controller");
//middlewares
const { verifyToken, verifyRole } = require("../middlewares/auth.middleware");
const { upload } = require("../services/helpers/fileHelper");
const payloadValidator = require("../middlewares/payloadValidator");

//[ADMIN] Add Reward
router.post(
  "/admin/add",
  verifyToken,
  verifyRole(["Admin"]),
  payloadValidator.validateAddReward,
  rewardController.addReward
);

//[ADMIN] Get Reward
router.get(
  "/admin/all",
  verifyToken,
  verifyRole(["Admin"]),
  rewardController.getRewards
);

//[ADMIN] Update Reward
router.put(
  "/admin/update",
  verifyToken,
  verifyRole(["Admin"]),
  rewardController.editReward
);

//[ADMIN] Update Reward
router.patch(
  "/admin/update-status",
  verifyToken,
  verifyRole(["Admin"]),
  rewardController.editRewardStatus
);

//[APP] Rewards for app
router.get(
  "/app/all",
  verifyToken,
  verifyRole(["User", "Guest"]),
  rewardController.getRewardsForUser
);

//[APP] Update Reward
router.post(
  "/app/claim",
  verifyToken,
  verifyRole(["User", "Guest"]),
  rewardController.claimReward
);

module.exports = router;
