const router = require("express").Router();
//controllers
const userController = require("../controllers/user.controller");
//middlewares
const { verifyToken, verifyRole } = require("../middlewares/auth.middleware");
const payloadValidator = require("../middlewares/payloadValidator");

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

module.exports = router;
