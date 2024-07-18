const mongoose = require("mongoose");

const SearchHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
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

const SearchHistory = mongoose.model("SearchHistory", SearchHistorySchema);
module.exports = SearchHistory;
