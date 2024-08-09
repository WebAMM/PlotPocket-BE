const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    plan: {
      type: String,
      enum: ["Weekly", "Monthly", "Yearly"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
    },
    description: {
      type: String,
      required: true,
    },
    stripeProductId: {
      type: String,
      required: true,
    },
    stripePriceId: {
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
