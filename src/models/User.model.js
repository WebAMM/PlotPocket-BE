const mongoose = require("mongoose");
const validator = require("validator");

const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
    },
    email: {
      type: String,
      // required: [true, "Please enter your email"],
      // unique: true,
      // validate: [validator.isEmail, "Please enter a valid email"],
    },
    password: {
      type: String,
      // required: [true, "Please enter your password"],
      // minlength: [6, "Password must be at least 6 characters long"],
      // maxlength: [25, "Password can have a maximum length of 25 characters"],
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    //Cloudinary images
    profileImage: {
      publicUrl: {
        type: String,
        default: "",
      },
      secureUrl: {
        type: String,
        default: "",
      },
      publicId: {
        type: String,
        default: "",
      },
      format: {
        type: String,
        default: "",
      },
    },
    role: {
      type: String,
      enum: ["Admin", "User", "Guest"],
      required: [true, "Please provide role"],
    },
    //For admin:
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    phoneNo: {
      type: String,
    },
    dateOfBirth: {
      type: Date,
    },
    emergencyContact: {
      type: String,
    },
    address: {
      type: String,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    zipCode: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
