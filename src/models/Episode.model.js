const mongoose = require("mongoose");

const episodeSchema = new mongoose.Schema(
  {
    series: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Series",
    },
    title: {
      type: String,
      required: [true, "Title is required"],
    },
    description: {
      type: String,
    },
    //Cloudinary video links.
    episodeVideo: {
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
    content: {
      type: String,
      enum: ["Paid", "Free"],
    },
    visibility: {
      type: String,
      enum: ["Public", "Private"],
    },
    views: {
      type: Number,
      default: 0,
    },
    ratings: {
      type: [
        { 
          rating: {
            type: Number,
            required: true,
          },
          user: {
            type: mongoose.Schema.ObjectId,
            ref: "User",
            required: true,
          },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Episode = mongoose.model("Episode", episodeSchema);
module.exports = Episode;
