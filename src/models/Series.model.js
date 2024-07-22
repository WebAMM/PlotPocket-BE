const mongoose = require("mongoose");

const seriesSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      // required: [true, "Please enter title"],
    },
    description: {
      type: String,
    },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: "Category",
      // required: true,
    },
    visibility: {
      type: String,
      enum: ["Public", "Private"],
    },
    status: {
      type: String,
      enum: ["Published", "Draft"],
      required: true,
    },
    type: {
      type: String,
      default: "Series",
    },
    seriesRating: {
      type: Number,
      default: 0,
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
    views: {
      type: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User is required"],
          },
          view: {
            type: Number,
            default: 0,
          },
          date: {
            type: Date,
            required: [true, "Date for views is required"],
          },
        },
      ],
      default: [],
    },
    totalViews: {
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

seriesSchema.index({ title: 1 });

const Series = mongoose.model("Series", seriesSchema);
module.exports = Series;
