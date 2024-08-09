const router = require("express").Router();
//controllers
const subscriptionController = require("../controllers/subscription.controller");
//middlewares
const { verifyToken, verifyRole } = require("../middlewares/auth.middleware");
const payloadValidator = require("../middlewares/payloadValidator");

//[ADMIN] Add subscription
router.post(
  "/admin/add",
  verifyToken,
  verifyRole(["Admin"]),
  payloadValidator.validateAddSubscription,
  subscriptionController.addSubscription
);

//[ADMIN] All subscriptions
router.get(
  "/admin/all",
  verifyToken,
  verifyRole(["Admin"]),
  subscriptionController.getAllAdminSubscriptions
);

//[APP] All subscriptions for App
router.get(
  "/app/all",
  verifyToken,
  verifyRole(["User", "Guest"]),
  subscriptionController.getAllAppSubscriptions
);

//[ADMIN] Edit subscriptions
router.put(
  "/admin/:id",
  verifyToken,
  verifyRole(["Admin"]),
  payloadValidator.validateAddSubscription,
  subscriptionController.editSubscription
);

//[ADMIN] Delete subscriptions
router.delete(
  "/admin/:id",
  verifyToken,
  verifyRole(["Admin"]),
  subscriptionController.deleteSubscription
);

//[APP] Get subscription
router.post(
  "/app/checkout-session/:id",
  // verifyToken,
  // verifyRole(["User"]),
  subscriptionController.createStripeSession
);

//[ADMIN] Get subscription by plan
// router.get("/admin/by-plan", verifyToken, verifyRole(["Admin"]), subscriptionController.getSubscriptionByPlan);

module.exports = router;
