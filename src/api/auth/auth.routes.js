const router = require("express").Router();
//controller
const authController = require("../../controllers/auth/auth.controller");
//middlewares
const {
  verifyToken,
  verifyRole,
} = require("../../middlewares/auth.middleware");
const payloadValidator = require("../../middlewares/payloadValidator");
const { upload } = require("../../services/helpers/fileHelper");

//Register user
router.post(
  "/register",
  upload.single("profilePic"),
  payloadValidator.validateRegister,
  authController.registerUser
);

//Login User
router.post("/login", payloadValidator.validateLogin, authController.loginUser);

//Login Admin
router.post(
  "/admin-login",
  payloadValidator.validateLogin,
  authController.loginAdmin
);

//Login Guest
router.post("/guest-login", authController.guestLogin);

//Logout Guest
router.post(
  "/guest-logout",
  verifyToken,
  verifyRole(["Guest"]),
  authController.guestLogout
);

//Admin updates password
router.put(
  "/admin/update-password",
  verifyToken,
  verifyRole(["Admin"]),
  payloadValidator.validateUpdatePassword,
  authController.updateUserPassword
);

//Admin updates profile
router.put(
  "/admin/update-profile",
  verifyToken,
  verifyRole(["Admin"]),
  payloadValidator.validateAdminUpdateProfile,
  authController.updateAdminProfile
);

//Admin updates profile pic
router.put(
  "/admin/update-pic",
  verifyToken,
  verifyRole(["Admin"]),
  upload.single("profilePic"),
  authController.updateAdminProfilePic
);

//Get User Profile
router.get("/profile", verifyToken, authController.getUserProfile);

//generate reset password email and OTP
// router.post(
//   "/reset-password/email",
//   authController.generateResetPasswordEmailWithOTP
// );

//Verify otp of reset password email
// router.post(
//   "/reset-password/otp/verify",
//   authController.verifyResetPasswordOTP
// );

module.exports = router;
