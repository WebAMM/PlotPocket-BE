const router = require("express").Router();
//controllers
const {
  getAllUsers,
  changeUserStatus,
} = require("../controllers/user.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");

//Get all users
router.get("/all", verifyToken, getAllUsers);

//Change users status (ACTIVE/INACTIVE)
router.patch("/change-status/:id/", verifyToken, changeUserStatus);

module.exports = router;
