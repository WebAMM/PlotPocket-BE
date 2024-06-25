const router = require("express").Router();
//controllers
const {
  registerUser,
  loginUser,
  generateResetPasswordEmailWithOTP,
  verifyResetPasswordOTP,
  updateUserPassword,
  loginWithFacebook,
  loginWithInstagram,
  getUserProfile,
  updateAdminProfile,
} = require("../../controllers/auth/userAuth.controller");
//middlewares
const { verifyToken } = require("../../middlewares/auth.middleware");
const payloadValidator = require("../../middlewares/payloadValidator");
//multer
const { upload } = require("../../services/helpers/fileHelper");

//Register user
router.post(
  "/register",
  upload.single("profilePic"),
  payloadValidator.validateLogin,
  registerUser
);

//Login User
router.post("/login", payloadValidator.validateLogin, loginUser);

//Admin updates password
router.put(
  "/admin/update-password/:id",
  verifyToken,
  payloadValidator.validateUpdatePassword,
  updateUserPassword
);

//Admin updates profile
router.put("/admin/update-profile/:id", updateAdminProfile);

//Login with facebook
router.post("/login/facebook", loginWithFacebook);

//Login with instagram
router.post("/login/instagram", loginWithInstagram);

//Get User Profile
router.get("/profile", verifyToken, getUserProfile);

//generate reset password email and OTP
router.post("/reset-password/email", generateResetPasswordEmailWithOTP);

//Verify otp of reset password email
router.post("/reset-password/otp/verify", verifyResetPasswordOTP);

module.exports = router;
