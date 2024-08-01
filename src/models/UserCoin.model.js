const mongoose = require("mongoose");

const userCoinSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    totalCoins: {
      type: Number,
      default: 0,
      required: [true, "Total coin is required"],
    },
    bonusCoins: {
      type: Number,
      default: 0,
      required: [true, "Bonus Coins is required"],
    },
    refillCoins: {
      type: Number,
      default: 0,
      required: [true, "Refill Coins is required"],
    },
  },
  {
    timestamps: true,
  }
);

const UserCoin = mongoose.model("UserCoin", userCoinSchema);
module.exports = UserCoin;
