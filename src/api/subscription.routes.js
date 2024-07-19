const router = require("express").Router();
//controllers
const subscriptionController = require("../controllers/subscription.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");
const payloadValidator = require("../middlewares/payloadValidator");

//Add subscription
router.post(
  "/admin/add",
  verifyToken,
  payloadValidator.validateAddSubscription,
  subscriptionController.addSubscription
);

//All subscriptions
router.get(
  "/admin/all",
  verifyToken,
  subscriptionController.getAllSubscriptions
);

//Edit subscriptions
router.put(
  "/admin/:id",
  verifyToken,
  payloadValidator.validateAddSubscription,
  subscriptionController.editSubscription
);

//Delete subscriptions
router.delete(
  "/admin/:id",
  verifyToken,
  subscriptionController.deleteSubscription
);

//Get subscription by plan
// router.get("/admin/by-plan", verifyToken, subscriptionController.getSubscriptionByPlan);

module.exports = router;
