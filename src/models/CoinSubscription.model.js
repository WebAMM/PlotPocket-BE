const mongoose = require("mongoose");

const coinSubscriptionSchema = new mongoose.Schema(
  {
    price: {
      type: String,
      required: true,
    },
    coins: {
      type: String,
      required: true,
    },
    discount: {
      type: String,
      required: true,
    },
    bonus: {
      type: String,
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
