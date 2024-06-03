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
router.post("/register", validateEmailAndPassword, registerUser);

//Login User
router.post("/login", bodyChecker, loginUser);

//Login with facebook
router.post("/login/facebook", bodyChecker, loginWithFacebook);

//Login with instagram
router.post("/login/instagram", bodyChecker, loginWithInstagram);

//test
router.post("/test", verifyToken, (req, res) => {
  res.status(200).json({
    message: "test",
    data: req.decodeData,
  });
});

//generate reset password email and OTP
router.post(
  "/reset-password/email",
  bodyChecker,
  generateResetPasswordEmailWithOTP
);

//Verify otp of reset password email
router.post("/reset-password/otp/verify", bodyChecker, verifyResetPasswordOTP);

//User update password
router.post("/update/password", bodyChecker, updateUserPassword);

module.exports = router;
