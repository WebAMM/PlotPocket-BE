//Models
const User = require("../../models/User.model");
//Responses and errors
const {
  error500,
  error409,
  error404,
  customError,
  error400,
} = require("../../services/helpers/errors");
const { status200, success } = require("../../services/helpers/response");
//helpers and functions
const cloudinary = require("../../services/helpers/cloudinary").v2;
//imports
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
//config
const config = require("../../config");
const { v4: uuidv4 } = require("uuid");

//Register User
const registerUser = async (req, res) => {
  try {
    const { email, password, userName } = req.body;
    const existUser = await User.findOne({ email });
    if (existUser) {
      return error409(res, "User Already Exists");
    }
    const userData = { userName, email, password };
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "image",
        folder: "user",
      });
      userData.profileImage = {
        publicUrl: result.url,
        secureUrl: result.secure_url,
        publicId: result.public_id,
        format: result.format,
      };
      userData.role = "User";
    }
    const newUser = new User(userData);
    await newUser.save();
    status200(res, "User registered successfully");
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
    if (user.status === "Inactive") {
      return error404(res, "User is inactive");
    }
    if (user && bcryptjs.compareSync(req.body.password, user.password)) {
      const secret = config.jwtPrivateKey;
      const token = jwt.sign(
        {
          _id: user._id,
          name: user.userName,
          email: user.email,
          role: user.role,
          profileImage: user.profileImage.publicUrl,
          createdAt: user.createdAt,
        },
        secret,
        {
          expiresIn: "24h",
        }
      );
      const responseUser = {
        _id: user._id,
        userName: user.userName,
        email: user.email,
        profileImage: user.profileImage.publicUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
      return success(res, "200", "Login Success", {
        token,
        user: responseUser,
      });
    } else {
      customError(res, 401, "Invalid credentials");
    }
  } catch (err) {
    error500(res, err);
  }
};

//Guest Login
const guestLogin = async (req, res) => {
  try {
    const guestId = uuidv4();
    const guestName = `Guest_${guestId.slice(0, 8)}`;

    const secret = config.jwtPrivateKey;
    const token = jwt.sign(
      {
        _id: guestId,
        name: guestName,
        role: "Guest",
      },
      secret
    );

    const responseUser = {
      _id: guestId,
      userName: guestName,
      role: "Guest",
    };

    return success(res, "200", "Guest Login Success", {
      token,
      user: responseUser,
    });
  } catch (err) {
    error500(res, err);
  }
};

//Get User
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "_id userName email profileImage.publicUrl status createdAt firstName lastName address city dateOfBirth emergencyContact phoneNo state zipCode"
    );
    if (!user) {
      return error404(res, "User not found!");
    }
    success(res, "200", "User profile", user);
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
        expiresIn: "24h",
      });
      success(res, "200", "Login Success", {
        token,
        user: checkUser,
      });
    } else {
      const newUser = await new User({
        email: email,
        password: fbId,
      });
      newUser.save();
      const secret = config.jwtPrivateKey;
      const token = jwt.sign({ _id: newUser._id }, secret, {
        expiresIn: "24h",
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
      checkUser.password = "";
      const secret = config.jwtPrivateKey;
      const token = jwt.sign({ _id: checkUser._id }, secret, {
        expiresIn: "24h",
      });
      success(res, "200", "Login Success", {
        token,
        user: checkUser,
      });
    } else {
      console.log("In creation");
      const newUser = await new User({
        email: email,
        password: instaId,
      });
      newUser.save();
      const secret = config.jwtPrivateKey;
      const token = jwt.sign({ _id: newUser._id }, secret, {
        expiresIn: "24h",
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
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;
    const userExist = await User.findById(id);
    if (!userExist) {
      return error404(res, "User not found!");
    }
    const comparedPassword = await bcryptjs.compare(
      oldPassword,
      userExist.password
    );
    if (!comparedPassword) {
      return customError(res, 401, "Invalid credentials");
    }
    await User.findByIdAndUpdate(
      id,
      {
        password: bcryptjs.hashSync(newPassword, 10),
      },
      { new: true }
    );
    status200(res, "Password updated successfully");
  } catch (err) {
    error500(res, err);
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    success(res, "200", "Success", users);
  } catch (err) {
    error500(res, err);
  }
};

const changeUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const user = await User.findByIdAndUpdate(id, { status }, { new: true });
    if (!user) {
      return error404(res, "User not found");
    }
    success(res, "200", "User status updated successfully", user);
  } catch (err) {
    error500(res, err);
  }
};

const updateAdminProfile = async (req, res) => {
  try {
    const userExist = await User.findById(req.user._id);
    if (!userExist) {
      return error404(res, "User not found!");
    }
    await User.updateOne(
      { _id: req.user._id },
      { $set: req.body },
      { new: true }
    );
    return status200(res, "Profile updated successfully");
  } catch (err) {
    error500(res, err);
  }
};

const updateAdminProfilePic = async (req, res) => {
  try {
    const userExist = await User.findById(req.user._id);
    if (!userExist) {
      return error404(res, "User not found!");
    }
    if (req.file) {
      // Remove existing profile image from Cloudinary
      if (userExist.profileImage.publicId) {
        await cloudinary.uploader.destroy(userExist.profileImage.publicId);
      }
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "image",
        folder: "user",
      });
      // Update user profile image details
      userExist.profileImage = {
        publicUrl: result.url,
        secureUrl: result.secure_url,
        publicId: result.public_id,
        format: result.format,
      };
      await userExist.save();
      return status200(res, "Profile image updated successfully");
    } else {
      return error400(res, "Profile image is required");
    }
  } catch (err) {
    error500(res, err);
  }
};

module.exports = {
  registerUser,
  loginUser,
  guestLogin,
  generateResetPasswordEmailWithOTP,
  verifyResetPasswordOTP,
  updateUserPassword,
  loginWithFacebook,
  loginWithInstagram,
  getUserProfile,
  getAllUsers,
  changeUserStatus,
  updateAdminProfile,
  updateAdminProfilePic,
};
