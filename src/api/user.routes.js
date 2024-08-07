const router = require("express").Router();
//controllers
const userController = require("../controllers/user.controller");
//middlewares
const { verifyToken, verifyRole } = require("../middlewares/auth.middleware");

//[ADMIN] Get all users
router.get(
  "/admin/all",
  verifyToken,
  verifyRole(["Admin"]),
  userController.getAllUsers
);

//[ADMIN] Change users status (ACTIVE/INACTIVE)
router.patch(
  "/admin/change-status/:id/",
  verifyToken,
  verifyRole(["Admin"]),
  userController.changeUserStatus
);

//[APP] Get user coins info
router.get(
  "/app/coins-detail/:id",
  verifyToken,
  verifyRole(["User"]),
  userController.getUserCoinsDetail
);

//[APP] Add to user purchases
// router.post(
//   "/app/purchase",
//   verifyToken,
//   verifyRole(["User"]),
//   userController.addToUserPurchase
// );


module.exports = router;
