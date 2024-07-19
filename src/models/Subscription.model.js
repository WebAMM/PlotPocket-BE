const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    plan: {
      type: String,
      enum: ["Weekly", "Monthly", "Yearly"],
    },
    price: {
      type: String,
      required: true,
    },
    description: {
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
