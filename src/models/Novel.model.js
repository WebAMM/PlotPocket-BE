const mongoose = require("mongoose");

const novelSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please enter title"],
    },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: "Category",
      required: true,
    },
    isNovel: {
      type: Boolean,
    },
    author: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    language: {
      type: String,
    },
    reviews: [
      {
        user: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
          required: [true, "User is required"],
        },
        rating: {
          type: Number,
        },
        comments: {
          type: String,
        },
      },
    ],
    text: {
      type: String,
    },
    totalViews: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

const Novel = mongoose.model("Novel", novelSchema);
module.exports = Novel;
