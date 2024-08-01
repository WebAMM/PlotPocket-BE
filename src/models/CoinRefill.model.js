const mongoose = require("mongoose");

const coinRefillSchema = new mongoose.Schema(
  {
    price: {
      type: Number,
      required: [true, "Price is required"],
    },
    coins: {
      type: Number,
      required: [true, "Coin is required"],
    },
    discount: {
      type: Number,
      required: [true, "Discount is required"],
    },
    bonus: {
      type: Number,
      required: [true, "Bonus is required"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
  },
  {
    timestamps: true,
  }
);

const CoinRefill = mongoose.model("CoinRefill", coinRefillSchema);
module.exports = CoinRefill;
