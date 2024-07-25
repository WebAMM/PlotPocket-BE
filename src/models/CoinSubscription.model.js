const mongoose = require("mongoose");

const coinSubscriptionSchema = new mongoose.Schema(
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
  },
  {
    timestamps: true,
  }
);

const CoinSubscription = mongoose.model(
  "CoinSubscription",
  coinSubscriptionSchema
);
module.exports = CoinSubscription;
