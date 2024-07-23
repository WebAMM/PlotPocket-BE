const router = require("express").Router();
//controllers
const coinSubscription = require("../controllers/coinSubscription.controller");
//middlewares
const { verifyToken, verifyRole } = require("../middlewares/auth.middleware");
const payloadValidator = require("../middlewares/payloadValidator");

//[ADMIN] Add coin subscription
router.post(
  "/admin/add",
  verifyToken,
  verifyRole(["Admin"]),
  payloadValidator.validateAddCoinSubscription,
  coinSubscription.addCoinSubscription
);

//[ADMIN] All coin subscriptions
router.get(
  "/admin/all",
  verifyToken,
  verifyRole(["Admin"]),
  coinSubscription.getAllCoinSubscriptions
);

//[ADMIN] Edit coin subscriptions
router.put(
  "/admin/:id",
  verifyToken,
  verifyRole(["Admin"]),
  payloadValidator.validateAddCoinSubscription,
  coinSubscription.editCoinSubscription
);

//[ADMIN] Delete coin subscriptions
router.delete(
  "/admin/:id",
  verifyToken,
  verifyRole(["Admin"]),
  coinSubscription.deleteCoinSubscription
);

//[ADMIN] Get coin subscription by plan
// router.get("/admin/by-plan", verifyToken, subscriptionController.getSubscriptionByPlan);

module.exports = router;
