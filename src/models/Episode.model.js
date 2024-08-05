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
    coins: {
      type: Number,
      default: 0,
    },
    episodeVideo: {
      publicUrl: {
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
    totalViews: {
      type: Number,
      default: 0,
    },
    episodeRating: {
      type: Number,
      default: 0,
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
            required: [true, "Date of view is required"],
          },
        },
      ],
      default: [],
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
