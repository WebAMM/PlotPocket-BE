const router = require("express").Router();
//controllers
const userController = require("../controllers/user.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");

//[ADMIN] Get all users
router.get("/admin/all", verifyToken, userController.getAllUsers);

//[ADMIN] Change users status (ACTIVE/INACTIVE)
router.patch(
  "/admin/change-status/:id/",
  verifyToken,
  userController.changeUserStatus
);

module.exports = router;
