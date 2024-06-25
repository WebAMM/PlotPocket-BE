const mongoose = require("mongoose");

const novelSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please enter title"],
    },
    description: {
      type: String,
    },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: "Category",
      required: true,
    },
    language: {
      type: String,
    },
    publishDate: {
      type: Date,
    },
    visibility: {
      type: String,
      enum: ["Public", "Private"],
    },
    isNovel: {
      type: Boolean,
    },
    views: {
      type: Number,
      default: 0,
    },
    author: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    chapters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chapter",
      },
    ],
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
  },
  {
    timestamps: true,
  }
);

const Novel = mongoose.model("Novel", novelSchema);
module.exports = Novel;
