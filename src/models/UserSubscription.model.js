const mongoose = require("mongoose");

const userSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    subscription: {
      type: mongoose.Schema.ObjectId,
      ref: "Subscription",
      required: [true, "Subscription is required"],
    },
    stripeSubscriptionId: {
      type: String,
      required: [true, "Stripe subscription id is required"],
    },
    stripeCustomerId: {
      type: String,
      required: [true, "Stripe customer id is required"],
    },
    isSubscribed: {
      type: Boolean,
      required: [true, "isSubscribed is required"],
    },
    recurringSuccess: {
      type: Boolean,
      default: false,
    },
    startAt: {
      type: Date,
      default: null,
    },
    recurredAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const UserSubscription = mongoose.model(
  "UserSubscription",
  userSubscriptionSchema
);
module.exports = UserSubscription;
