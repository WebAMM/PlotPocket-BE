const mongoose = require("mongoose");

const myListSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    episode: {
      type: mongoose.Schema.ObjectId,
      ref: "Episode",
    },
    chapter: {
      type: mongoose.Schema.ObjectId,
      ref: "Chapter",
    },
  },
  {
    timestamps: true,
  }
);

const myList = mongoose.model("myList", myListSchema);
module.exports = myList;
