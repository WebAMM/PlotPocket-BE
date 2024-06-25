const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    plan: {
      type: String,
      enum: ["weekly", "monthly", "yearly"],
    },
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

const Subscription = mongoose.model("Subscription", subscriptionSchema);
module.exports = Subscription;
