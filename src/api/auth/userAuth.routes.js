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
const {
  validateEmailAndPassword,
  verifyToken,
} = require("../../middlewares/auth.middleware");
const { bodyChecker } = require("../../middlewares/bodyCheck.middleware");
//multer
const { upload } = require("../../services/helpers/fileHelper");

//Register user
router.post(
  "/register",
  upload.single("profilePic"),
  validateEmailAndPassword,
  registerUser
);

//Login User
router.post("/login", validateEmailAndPassword, loginUser);

//Login with facebook
router.post("/login/facebook", bodyChecker, loginWithFacebook);

//Login with instagram
router.post("/login/instagram", bodyChecker, loginWithInstagram);

//Get User Profile
router.get("/profile", verifyToken, getUserProfile);

//generate reset password email and OTP
router.post(
  "/reset-password/email",
  bodyChecker,
  generateResetPasswordEmailWithOTP
);

//Verify otp of reset password email
router.post("/reset-password/otp/verify", bodyChecker, verifyResetPasswordOTP);

//Admin updates password
router.put("/admin/update-password/:id", bodyChecker, updateUserPassword);

//Admin updates profile
router.put("/admin/update-profile/:id", bodyChecker, updateAdminProfile);

module.exports = router;
