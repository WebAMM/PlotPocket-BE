const mongoose = require("mongoose");

const episodeSchema = new mongoose.Schema(
  {
    thumbnail: {
      type: String,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
    },
    description: {
      type: String,
    },
    content: {
      type: String,
      enum: ["paid", "free"],
    },
    views: {
      type: Number,
      default: 0,
    },
    publishedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Chapter = mongoose.model("Episode", episodeSchema);
module.exports = Chapter;
