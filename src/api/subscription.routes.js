const router = require("express").Router();
//controllers
const subscriptionController = require("../controllers/subscription.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");
const payloadValidator = require("../middlewares/payloadValidator");

//[ADMIN] Add subscription
router.post(
  "/admin/add",
  verifyToken,
  payloadValidator.validateAddSubscription,
  subscriptionController.addSubscription
);

//[ADMIN] All subscriptions
router.get(
  "/admin/all",
  verifyToken,
  subscriptionController.getAllSubscriptions
);

//[ADMIN] Edit subscriptions
router.put(
  "/admin/:id",
  verifyToken,
  payloadValidator.validateAddSubscription,
  subscriptionController.editSubscription
);

//[ADMIN] Delete subscriptions
router.delete(
  "/admin/:id",
  verifyToken,
  subscriptionController.deleteSubscription
);

//Get subscription by plan
// router.get("/admin/by-plan", verifyToken, subscriptionController.getSubscriptionByPlan);

module.exports = router;
