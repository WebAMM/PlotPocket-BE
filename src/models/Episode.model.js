const mongoose = require("mongoose");

const episodeSchema = new mongoose.Schema(
  {
    //Cloudinary images
    video: {
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
    title: {
      type: String,
      required: [true, "Title is required"],
    },
    description: {
      type: String,
    },
    content: {
      type: String,
      enum: ["Paid", "Free"],
    },
    visibility: {
      type: String,
      enum: ["Public", "Private"],
    },
  },
  {
    timestamps: true,
  }
);

const Chapter = mongoose.model("Episode", episodeSchema);
module.exports = Chapter;
