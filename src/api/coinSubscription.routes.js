const router = require("express").Router();
//controllers
const coinSubscription = require("../controllers/coinSubscription.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");
const payloadValidator = require("../middlewares/payloadValidator");

//[ADMIN] Add coin subscription
router.post(
  "/admin/add",
  verifyToken,
  payloadValidator.validateAddCoinSubscription,
  coinSubscription.addCoinSubscription
);

//[ADMIN] All coin subscriptions
router.get("/admin/all", verifyToken, coinSubscription.getAllCoinSubscriptions);

//[ADMIN] Edit coin subscriptions
router.put(
  "/admin/:id",
  verifyToken,
  payloadValidator.validateAddCoinSubscription,
  coinSubscription.editCoinSubscription
);

//[ADMIN] Delete coin subscriptions
router.delete(
  "/admin/:id",
  verifyToken,
  coinSubscription.deleteCoinSubscription
);

//[ADMIN] Get coin subscription by plan
// router.get("/admin/by-plan", verifyToken, subscriptionController.getSubscriptionByPlan);

module.exports = router;
