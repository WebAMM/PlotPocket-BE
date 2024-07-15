const router = require("express").Router();
//controller
const authController = require("../../controllers/auth/auth.controller");
//middlewares
const { verifyToken } = require("../../middlewares/auth.middleware");
const payloadValidator = require("../../middlewares/payloadValidator");
const { upload } = require("../../services/helpers/fileHelper");

//Register user
router.post(
  "/register",
  upload.single("profilePic"),
  payloadValidator.validateLogin,
  authController.registerUser
);

//Login User
router.post("/login", payloadValidator.validateLogin, authController.loginUser);

//Login as Guest
router.post("/guest-login", authController.guestLogin);

//Admin updates password
router.put(
  "/admin/update-password/:id",
  verifyToken,
  payloadValidator.validateUpdatePassword,
  authController.updateUserPassword
);

//Admin updates profile
router.put("/admin/update-profile/:id", authController.updateAdminProfile);

//Login with facebook
router.post("/login/facebook", authController.loginWithFacebook);

//Login with instagram
router.post("/login/instagram", authController.loginWithInstagram);

//Get User Profile
router.get("/profile", verifyToken, authController.getUserProfile);

//generate reset password email and OTP
router.post(
  "/reset-password/email",
  authController.generateResetPasswordEmailWithOTP
);

//Verify otp of reset password email
router.post(
  "/reset-password/otp/verify",
  authController.verifyResetPasswordOTP
);

module.exports = router;
