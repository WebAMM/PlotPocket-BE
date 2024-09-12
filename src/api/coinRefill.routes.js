const router = require("express").Router();
//controllers
const coinRefill = require("../controllers/coinRefill.controller");
//middlewares
const { verifyToken, verifyRole } = require("../middlewares/auth.middleware");
const payloadValidator = require("../middlewares/payloadValidator");

//[ADMIN] Add coin refill
router.post(
  "/admin/add",
  verifyToken,
  verifyRole(["Admin"]),
  payloadValidator.validateAddCoinRefill,
  coinRefill.addCoinRefill
);

//[ADMIN] All coin refill
router.get(
  "/admin/all",
  verifyToken,
  verifyRole(["Admin"]),
  coinRefill.getAllAdminCoinRefill
);

//[APP] All coin refills
router.get(
  "/app/all",
  verifyToken,
  verifyRole(["User", "Guest"]),
  coinRefill.getAllAppCoinRefill
);

//[ADMIN] Edit coin refill
router.put(
  "/admin/:id",
  verifyToken,
  verifyRole(["Admin"]),
  payloadValidator.validateAddCoinRefill,
  coinRefill.editCoinRefill
);

//[ADMIN] Delete coin refill
router.delete(
  "/admin/:id",
  verifyToken,
  verifyRole(["Admin"]),
  coinRefill.deleteCoinRefill
);

//[APP] Refill the coins using stripe payment intent API
router.post(
  "/app/refill/:id",
  verifyToken,
  verifyRole(["User"]),
  coinRefill.refillCoins
);

//[APP] Price needed for episode/chapter and all refills to buy coins
router.get(
  "/app/buy-refill/:id",
  verifyToken,
  verifyRole(["User"]),
  coinRefill.buyCoinRefills
);

//[ADMIN] Get coin subscription by plan
// router.get("/admin/by-plan", verifyToken, subscriptionController.getSubscriptionByPlan);

module.exports = router;
