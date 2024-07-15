const mongoose = require("mongoose");

const chapterSchema = new mongoose.Schema(
  {
    novel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Novel",
    },
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    chapterNo: {
      type: Number,
      required: [true, "Chapter no is required"],
    },
    content: {
      type: String,
      enum: ["Paid", "Free"],
    },
    views: {
      type: Number,
      default: 0,
    },
    publishedDate: {
      type: Date,
      default: Date.now,
    },
    //Cloudinary images
    chapterPdf: {
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
  },
  {
    timestamps: true,
  }
);

const Chapter = mongoose.model("Chapter", chapterSchema);
module.exports = Chapter;
