const mongoose = require("mongoose");

const authorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Author name is required"],
    },
    gender: {
      type: String,
      required: true,
      enum: ["Male", "Female"],
    },
    authorPic: {
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
    // followers: [
    //   {
    //     type: mongoose.Schema.ObjectId,
    //     ref: "User",
    //   },
    // ],
    reviews: [
      {
        comments: {
          type: String,
        },
        rating: {
          type: Number,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Author = mongoose.model("Author", authorSchema);
module.exports = Author;
