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
const removeViews = require("../../services/helpers/removeViews");
//imports
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
//config
const config = require("../../config");
const { v4: uuidv4 } = require("uuid");
const myList = require("../../models/MyList.model");
const SearchHistory = require("../../models/SearchHistory.model");
const History = require("../../models/History.model");
const Category = require("../../models/Category.model");
const Episode = require("../../models/Episode.model");
const Chapter = require("../../models/Chapter.model");
const Series = require("../../models/Series.model");
const Novel = require("../../models/Novel.model");
const appendGuestUserRec = require("../../services/helpers/appendGuestRec");

//Register User
const registerUser = async (req, res) => {
  try {
    const { email, password, userName } = req.body;
    const { guestId } = req.query;

    const existUser = await User.findOne({ email });
    if (existUser) {
      return error409(res, "User already exist");
    }
    // Hash the password
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    const userData = { userName, email, password: hashedPassword };
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
    if (guestId) {
      const guestUser = await User.findOne({ _id: guestId });
      if (guestUser) {
        //If guestUser than append record to new user
        await History.updateMany(
          { user: guestUser._id },
          {
            $set: {
              user: newUser._id,
            },
          }
        );
        await SearchHistory.updateMany(
          {
            user: guestUser._id,
          },
          {
            $set: {
              user: newUser._id,
            },
          }
        );
        await myList.updateMany(
          {
            user: guestUser._id,
          },
          {
            $set: {
              user: newUser._id,
            },
          }
        );
        const models = [Category, Series, Novel, Episode, Chapter];
        for (const model of models) {
          await appendGuestUserRec(model, guestUser._id, newUser._id);
        }
        await User.deleteOne({ _id: guestUser._id });
      } else return error409(res, "No such guest exist");
    }
    return status200(res, "User registered successfully");
  } catch (err) {
    return error500(res, err);
  }
};

//Login User
const loginUser = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email, role: "User" });
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
          expiresIn: "72h",
        }
      );
      const responseUser = {
        _id: user._id,
        userName: user.userName,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage.publicUrl,
        createdAt: user.createdAt,
      };
      return success(res, "200", "Login success", {
        token,
        user: responseUser,
      });
    } else {
      return customError(res, 401, "Invalid credentials");
    }
  } catch (err) {
    return error500(res, err);
  }
};

//Login User
const loginAdmin = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email, role: "Admin" });
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
          createdAt: user.createdAt,
        },
        secret,
        {
          expiresIn: "48h",
        }
      );
      const responseUser = {
        _id: user._id,
        userName: user.userName,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage.publicUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
      return success(res, "200", "Login success", {
        token,
        user: responseUser,
      });
    } else {
      return customError(res, 401, "Invalid credentials");
    }
  } catch (err) {
    return error500(res, err);
  }
};

//Guest Login
const guestLogin = async (req, res) => {
  try {
    let guestUserNameId = uuidv4();
    let guestUserName = `Guest_${guestUserNameId.slice(0, 8)}`;

    const alreadyExistGuest = await User.findOne({ userName: guestUserName });

    if (alreadyExistGuest) {
      guestUserNameId = uuidv4();
      guestUserName = `Guest_${guestUserNameId.slice(0, 8)}`;
    }

    const user = await User.create({
      userName: guestUserName,
      role: "Guest",
      profileImage: {
        publicUrl:
          "http://res.cloudinary.com/djio34uft/image/upload/v1722259844/images_lmgsdd.jpg",
        secureUrl:
          "https://res.cloudinary.com/djio34uft/image/upload/v1722259844/images_lmgsdd.jpg",
        publicId: "images_lmgsdd",
        format: "jpg",
      },
    });

    const secret = config.jwtPrivateKey;
    const token = jwt.sign(
      {
        _id: user._id,
        name: user.userName,
        role: user.role,
        createdAt: user.createdAt,
      },
      secret
    );

    const responseUser = {
      _id: user._id,
      userName: user.userName,
      role: user.role,
      createdAt: user.createdAt,
    };

    return success(res, "200", "Guest login success", {
      token,
      user: responseUser,
    });
  } catch (err) {
    return error500(res, err);
  }
};

//Guest Logout, Remove the record and views
const guestLogout = async (req, res) => {
  try {
    const existUser = await User.findOne({
      _id: req.user._id,
      role: "Guest",
    });

    if (existUser) {
      await History.deleteMany({ user: req.user._id });
      await myList.deleteMany({ user: req.user._id });
      await SearchHistory.deleteMany({ user: req.user._id });
      const models = [Category, Series, Novel, Episode, Chapter];
      for (const model of models) {
        await removeViews(model, req.user._id);
      }
      await User.deleteOne({ _id: req.user._id });
      return status200(res, "Guest user deleted successfully");
    } else return error404(res, "User not found");
  } catch (err) {
    return error500(res, err);
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
    return success(res, "200", "User profile", user);
  } catch (err) {
    return error500(res, err);
  }
};

//

//Update User Password
const updateUserPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userExist = await User.findById(req.user._id);
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
      req.user._id,
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

//Get all the user in admin panel
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    success(res, "200", "Success", users);
  } catch (err) {
    error500(res, err);
  }
};

//Inactive/active user status
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

//Update admin profile
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

//Update admin profile pic
const updateAdminProfilePic = async (req, res) => {
  try {
    const userExist = await User.findById(req.user._id);
    if (!userExist) {
      return error404(res, "User not found!");
    }
    if (req.file) {
      // Remove existing profile image from Cloudinary
      if (userExist.profileImage.publicId) {
        await cloudinary.uploader.destroy(userExist.profileImage.publicId, {
          resource_type: "image",
          folder: "user",
        });
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
      return status200(res, "Profile pic updated successfully");
    } else {
      if (userExist.profileImage.publicId) {
        await cloudinary.uploader.destroy(userExist.profileImage.publicId, {
          resource_type: "image",
          folder: "user",
        });
      }
      userExist.profileImage = {
        publicUrl: "",
        secureUrl: "",
        publicId: "",
        format: "",
      };
      await userExist.save();
      return status200(res, "Profile pic removed successfully");
    }
  } catch (err) {
    error500(res, err);
  }
};

//Generate reset password user email and OTP
// const generateResetPasswordEmailWithOTP = async (req, res) => {
//   try {
//     const { email } = req.body;
//     const user = await User.findOne({ email: email });
//     if (!user) {
//       error404(res, "User not found, make sure you have an account.");
//     } else {
//       // Generate a 6-digit OTP
//       const otp = Math.floor(1000 + Math.random() * 900000);
//       // OTP expiration time in seconds
//       const otpExpirationTime = 15 * 60; // 15 minute multiply by 60 seconds
//       user.resetPassOtp = {
//         code: otp,
//         expiresAt: new Date(Date.now() + otpExpirationTime * 1000),
//       };
//       await user.save();
//       //sending reset password otp email
//       await sendOTPPasswordEmail(email, otp);
//       status200(res);
//     }
//   } catch (err) {
//     error500(res, err);
//   }
// };

// //Verify OTP of reset password email
// const verifyResetPasswordOTP = async (req, res) => {
//   try {
//     const { email, otp } = req.body;
//     //Retrieve the user document from the db
//     const user = await User.findOne({ email });
//     if (
//       !user ||
//       !user.resetPassOtp ||
//       user.resetPassOtp.code !== otp ||
//       user.resetPassOtp.expiresAt < new Date()
//     ) {
//       error404(res, "Invalid OTP or expired!");
//     } else {
//       //clearing the OTP after successful otp verification
//       user.resetPassOtp = null;
//       await user.save();
//       success(res, "200", "OTP verified successfully", true);
//     }
//   } catch (err) {
//     error500(res, err);
//   }
// };

module.exports = {
  registerUser,
  loginUser,
  loginAdmin,
  guestLogin,
  guestLogout,
  updateUserPassword,
  getUserProfile,
  getAllUsers,
  changeUserStatus,
  updateAdminProfile,
  updateAdminProfilePic,
  // generateResetPasswordEmailWithOTP,
  // verifyResetPasswordOTP,
};
