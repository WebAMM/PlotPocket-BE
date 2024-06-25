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
    //Cloudinary images
    thumbnail: {
      publicUrl: {
        type: String,
        default: "",
      },
      secureUrl: {
        type: String,
        default: "",
      },
      publicId: {
        type: String,
        default: "",
      },
      format: {
        type: String,
        default: "",
      },
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
      enum: ["Public", "Private"],
    },
    isSeries: {
      type: Boolean,
      required: [true, "Is series field is required"],
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
