const mongoose = require("mongoose");

const seriesSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please enter title"],
    },
    bannerImg: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: "Category",
      required: true,
    },
    // rating: {
    //   type: mongoose.Schema.ObjectId,
    //   ref: "Category",
    //   required: true,
    // },
    isSeries: {
      type: Boolean,
      required: [true, "Is series field is required"],
    },
    totalViews: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Series = mongoose.model("Series", seriesSchema);
module.exports = Series;
