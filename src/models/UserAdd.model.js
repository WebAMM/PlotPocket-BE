const mongoose = require("mongoose");

const userAddSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    watchedSeries: [
      {
        seriesId: {
          type: mongoose.Schema.ObjectId,
          ref: "Series",
        },
        totalCount: {
          type: Number,
          default: 0,
          min: 0,
          max: 5,
        },
        // episodeIds: [
        //   {
        //     type: mongoose.Schema.ObjectId,
        //     ref: "Episode",
        //   },
        // ],
      },
    ],
    watchedNovel: [
      {
        novelId: {
          type: mongoose.Schema.ObjectId,
          ref: "Novel",
        },
        totalCount: {
          type: Number,
          default: 0,
          min: 0,
          max: 5,
        },
        // chapterIds: [
        //   {
        //     type: mongoose.Schema.ObjectId,
        //     ref: "Chapter",
        //   },
        // ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

const UserAdd = mongoose.model("UserAdd", userAddSchema);
module.exports = UserAdd;
