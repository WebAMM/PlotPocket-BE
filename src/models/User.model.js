const { default: mongoose } = require("mongoose");
const bcryptjs = require("bcryptjs");
const validator = require("validator");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      default: "",
    },
    lastName: {
      type: String,
      default: "",
    },
    userName: {
      type: String,
      default: "",
    },
    phoneNumber: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      required: [true, "Please enter your email"],
      validate: [validator.isEmail, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Please enter your password"],
    },
    profileImage: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

//Password hash
userSchema.pre("save", async function save(next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = 10;
    this.password = bcryptjs.hashSync(this.password, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

const User = mongoose.model("User", userSchema);
module.exports = User;
