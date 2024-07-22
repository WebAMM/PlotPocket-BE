const mongoose = require("mongoose");

const coinSubscriptionSchema = new mongoose.Schema(
  {
    price: {
      type: Number,
      required: true,
    },
    coins: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      required: true,
    },
    bonus: {
      type: Number,
      required: true,
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
