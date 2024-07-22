const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    rating: {
      type: Number,
      max: 5,
      min: 1,
      default: 0,
    },
    comment: {
      type: String,
      default: "",
    },
    likes: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    totalLikes: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const novelSchema = new mongoose.Schema(
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
    language: {
      type: String,
    },
    // publishDate: {
    //   type: Date,
    // },
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
      default: "Novel",
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
    adult: {
      type: Boolean,
      default: false,
    },
    author: {
      type: mongoose.Schema.ObjectId,
      ref: "Author",
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
    reviews: [reviewSchema],
  },
  {
    timestamps: true,
  }
);

novelSchema.index({ title: 1 });

const Novel = mongoose.model("Novel", novelSchema);
module.exports = Novel;
