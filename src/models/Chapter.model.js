const mongoose = require("mongoose");

const chapterSchema = new mongoose.Schema(
  {
    novel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Novel",
      required: [true, "Novel is required"],
    },
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    description: {
      type: String,
    },
    coins: {
      type: Number,
      default: 0,
    },
    chapterNo: {
      type: Number,
      required: [true, "Chapter no is required"],
    },
    content: {
      type: String,
      enum: ["Paid", "Free"],
      required: [true, "Content is required"],
    },
    totalViews: {
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
    chapterPdf: {
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
  },
  {
    timestamps: true,
  }
);

const Chapter = mongoose.model("Chapter", chapterSchema);
module.exports = Chapter;
