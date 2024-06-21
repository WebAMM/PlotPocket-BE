const mongoose = require("mongoose");

const seriesSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please enter title"],
    },
    description: {
      type: String,
    },
    thumbnailImg: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: "Category",
      required: true,
    },
    publishDate: {
      type: Date,
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
    },
    isSeries: {
      type: Boolean,
      required: [true, "Is series field is required"],
    },
    views: {
      type: Number,
      default: 0,
    },
    episodes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Episode",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Series = mongoose.model("Series", seriesSchema);
module.exports = Series;
