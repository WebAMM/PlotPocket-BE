const mongoose = require("mongoose");

const rewardSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    weeklyRewards: [
      {
        day: {
          type: Number,
          required: true,
        },
        reward: {
          type: Number,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Reward = mongoose.model("Reward", rewardSchema);
module.exports = Reward;
