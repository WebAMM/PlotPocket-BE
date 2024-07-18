const mongoose = require("mongoose");

const userSteakSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  claimedDay: {
    type: Number,
    default: 0,
  },
  claimedDate: {
    type: Date,
    default: Date.now,
  },
});

const UserSteak = mongoose.model("UserSteak", userSteakSchema);
module.exports = UserSteak;
