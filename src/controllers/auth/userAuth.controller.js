//Models
const User = require("../../models/User.model");
//Responses and errors
const {
  error500,
  error409,
  error404,
  customError,
} = require("../../services/helpers/errors");
const { status200, success } = require("../../services/helpers/response");
//helpers and functions
const cloudinary = require("../../services/helpers/cloudinary").v2;
//imports
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
//config
const config = require("../../config");

//Register User
const registerUser = async (req, res) => {
  try {
    const { email, password, userName } = req.body;

    // Check if user already exists
    const existUser = await User.findOne({ email });
    if (existUser) {
      return error409(res, "User Already Exists");
    }

    // Initialize user data
    const userData = { userName, email, password };

    // Handle file upload if present
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "image",
        folder: "cosmo/event-thumbnails",
      });

      userData.profileImage = {
        publicUrl: result.url,
        secureUrl: result.secure_url,
        publicId: result.public_id,
        format: result.format,
      };
    }

    // Create new user
    const newUser = new User(userData);
    await newUser.save();

    success(res, "200", "Success", null);
  } catch (err) {
    error500(res, err);
  }
};

//Login User
const loginUser = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return error404(res, "User not found!");
    }

    if (user && bcryptjs.compareSync(req.body.password, user.password)) {
      user.password = "";
      const secret = config.jwtPrivateKey;
      const token = jwt.sign({ _id: user._id }, secret, {
        expiresIn: "8h",
      });

      success(res, "200", "Login Success", {
        token,
        user,
      });
    } else {
      customError(res, 401, "Wrong Password");
    }
  } catch (err) {
    error500(res, err);
  }
};

//Get User
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return error404(res, "User not found!");
    }

    success(res, "200", "Login Success", {
      user,
    });
  } catch (err) {
    error500(res, err);
  }
};

//Login with Facebook
const loginWithFacebook = async (req, res) => {
  try {
    const { email, fbId } = req.body;

    const checkUser = await User.findOne({
      email: email,
    });

    if (checkUser) {
      checkUser.password = "";
      const secret = config.jwtPrivateKey;
      const token = jwt.sign({ _id: checkUser._id }, secret, {
        expiresIn: "8h",
      });

      success(res, "200", "Login Success", {
        token,
        user: checkUser,
      });
    } else {
      console.log("In creation");
      //creating new user
      const newUser = await new User({
        email: email,
        password: fbId,
      });

      newUser.save();

      const secret = config.jwtPrivateKey;
      const token = jwt.sign({ _id: newUser._id }, secret, {
        expiresIn: "8h",
      });

      success(res, "200", "Login Success", {
        token,
        user: newUser,
      });
    }
  } catch (err) {
    error500(res, err);
  }
};

//Login with Instagram
const loginWithInstagram = async (req, res) => {
  try {
    const { email, instaId } = req.body;

    const checkUser = await User.findOne({
      email: email,
    });

    if (checkUser) {
      console.log("Already created");
      checkUser.password = "";
      const secret = config.jwtPrivateKey;
      const token = jwt.sign({ _id: checkUser._id }, secret, {
        expiresIn: "8h",
      });

      success(res, "200", "Login Success", {
        token,
        user: checkUser,
      });
    } else {
      console.log("In creation");
      //creating new user
      const newUser = await new User({
        email: email,
        password: instaId,
      });

      newUser.save();

      const secret = config.jwtPrivateKey;
      const token = jwt.sign({ _id: newUser._id }, secret, {
        expiresIn: "8h",
      });

      success(res, "200", "Login Success", {
        token,
        user: newUser,
      });
    }
  } catch (err) {
    error500(res, err);
  }
};

//Generate reset password user email and OTP
const generateResetPasswordEmailWithOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email });

    if (!user) {
      error404(res, "User not found, make sure you have an account.");
    } else {
      // Generate a 6-digit OTP
      const otp = Math.floor(1000 + Math.random() * 900000);

      // OTP expiration time in seconds
      const otpExpirationTime = 15 * 60; // 15 minute multiply by 60 seconds

      user.resetPassOtp = {
        code: otp,
        expiresAt: new Date(Date.now() + otpExpirationTime * 1000),
      };

      await user.save();

      //sending reset password otp email
      await sendOTPPasswordEmail(email, otp);

      status200(res);
    }
  } catch (err) {
    error500(res, err);
  }
};

//Verify OTP of reset password email
const verifyResetPasswordOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    //Retrieve the user document from the db
    const user = await User.findOne({ email });

    if (
      !user ||
      !user.resetPassOtp ||
      user.resetPassOtp.code !== otp ||
      user.resetPassOtp.expiresAt < new Date()
    ) {
      error404(res, "Invalid OTP or expired!");
    } else {
      //clearing the OTP after successful otp verification
      user.resetPassOtp = null;
      await user.save();

      success(res, "200", "OTP verified Successfully", true);
    }
  } catch (err) {
    error500(res, err);
  }
};

//Update User Password
const updateUserPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    //updating password
    await User.findOneAndUpdate(
      { email: email },
      {
        password: bcryptjs.hashSync(password, 10),
      },
      { new: true }
    )
      .then((updateUser) => {
        updateUser.password = "";
        success(res, "200", "Password Updated Successfully!", updateUser);
      })
      .catch((error) => error500(res, error));
  } catch (err) {
    error500(res, err);
  }
};

module.exports = {
  registerUser,
  loginUser,
  generateResetPasswordEmailWithOTP,
  verifyResetPasswordOTP,
  updateUserPassword,
  loginWithFacebook,
  loginWithInstagram,
  getUserProfile,
};
