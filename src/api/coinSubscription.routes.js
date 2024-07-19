const router = require("express").Router();
//controllers
const coinSubscription = require("../controllers/coinSubscription.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");
const payloadValidator = require("../middlewares/payloadValidator");

//Add coin subscription
router.post(
  "/admin/add",
  verifyToken,
  payloadValidator.validateAddCoinSubscription,
  coinSubscription.addCoinSubscription
);

//All coin subscriptions
router.get("/admin/all", verifyToken, coinSubscription.getAllCoinSubscriptions);

//Edit coin subscriptions
router.put(
  "/admin/:id",
  verifyToken,
  payloadValidator.validateAddCoinSubscription,
  coinSubscription.editCoinSubscription
);

//Delete coin subscriptions
router.delete(
  "/admin/:id",
  verifyToken,
  coinSubscription.deleteCoinSubscription
);

//Get coin subscription by plan
// router.get("/admin/by-plan", verifyToken, subscriptionController.getSubscriptionByPlan);

module.exports = router;
