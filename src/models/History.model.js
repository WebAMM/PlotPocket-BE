const mongoose = require("mongoose");

const HistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    series: {
      type: mongoose.Schema.ObjectId,
      ref: "Series",
    },
    novel: {
      type: mongoose.Schema.ObjectId,
      ref: "Novel",
    },
  },
  {
    timestamps: true,
  }
);

const History = mongoose.model("History", HistorySchema);
module.exports = History;
