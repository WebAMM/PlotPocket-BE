const router = require("express").Router();
//controllers
const {
  addSubscriptionPlan,
  getAllSubscriptions,
  getSubscriptionByPlan,
} = require("../controllers/subscription.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");

//Add subscription
router.post("/admin/add", verifyToken, addSubscriptionPlan);

//All subscriptions
router.get("/admin/all", verifyToken, getAllSubscriptions);

//Get subscription by plan
router.get("/admin/by-plan", verifyToken, getSubscriptionByPlan);

module.exports = router;
