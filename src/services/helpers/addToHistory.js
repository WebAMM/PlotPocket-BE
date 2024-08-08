//Models
const History = require("../../models/History.model");
const Chapter = require("../../models/Chapter.model");
const Episode = require("../../models/Episode.model");

const addToHistory = async (type, userId, segmentId) => {
  if (type === "Series") {
    const episode = await Episode.findById(segmentId);
    const existHistory = await History.findOne({
      user: userId,
      series: episode.series,
    });
    if (existHistory) {
      existHistory.episode = segmentId;
      return await existHistory.save();
    }
    return await History.create({
      user: userId,
      series: episode.series,
      episode: segmentId,
    });
  } else if (type === "Novel") {
    const chapter = await Chapter.findById(segmentId);
    const existHistory = await History.findOne({
      user: userId,
      novel: chapter.novel,
    });
    if (existHistory) {
      existHistory.chapter = segmentId;
      return await existHistory.save();
    }
    return await History.create({
      user: userId,
      novel: chapter.novel,
      chapter: segmentId,
    });
  }
};

module.exports = addToHistory;
