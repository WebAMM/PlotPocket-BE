const mongoose = require("mongoose");

const myListSchema = new mongoose.Schema(
  {
    episode: {
      type: mongoose.Schema.ObjectId,
      ref: "Episode",
    },
    novel: {
      type: mongoose.Schema.ObjectId,
      ref: "Novel",
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const myList = mongoose.model("myList", myListSchema);
module.exports = myList;
