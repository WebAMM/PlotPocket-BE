//Models
const Episode = require("../models/Episode.model");
const Series = require("../models/Series.model");
const UserPurchases = require("../models/UserPurchases.model");
const UserCoin = require("../models/UserCoin.model");
const myList = require("../models/MyList.model");
const UserSubscription = require("../models/UserSubscription.model");
const History = require("../models/History.model");
const SearchHistory = require("../models/SearchHistory.model");
const UserAdd = require("../models/UserAdd.model");
//Responses and errors
const {
  error500,
  error409,
  error404,
  error400,
  customError,
  customErrorWithData,
} = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");
//helpers and functions
const { default: mongoose } = require("mongoose");
const {
  uploadFileToS3,
  deleteFileFromBucket,
} = require("../services/helpers/awsConfig");
const extractFormat = require("../services/helpers/extractFormat");
const addToHistory = require("../services/helpers/addToHistory");
const {
  updateViews,
  updateCategoryViews,
} = require("../services/helpers/incViews");
//For compression of episodes and bucket upload
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

// Set the path for FFmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

//Add Episode
const addEpisode = async (req, res) => {
  const { title } = req.body;
  const { id } = req.params;

  try {
    const seriesExist = await Series.findOne({
      _id: id,
      status: "Published",
      visibility: "Public",
    });

    if (!seriesExist) {
      return error404(res, "Series not found");
    }

    const existEpisode = await Episode.findOne({
      title,
      series: seriesExist._id,
    });

    if (existEpisode) {
      return error409(
        res,
        "Episode with this name already exists in this series"
      );
    }

    if (req.file) {
      const file = req.file;
      const fileFormat = extractFormat(file.mimetype);

      // Save buffer to a temporary file for compression
      const tempInputFilePath = path.join(__dirname, "temp_video.mp4");
      const tempOutputFilePath = path.join(__dirname, "compressed_video.mp4");
      //Temporary input video file saved
      fs.writeFileSync(tempInputFilePath, file.buffer);
      console.log(
        "Temporary input video file saved for debugging:",
        tempInputFilePath
      );

      //Compress video using FFmpeg with file output
      await new Promise((resolve, reject) => {
        ffmpeg(tempInputFilePath) // Use the temporary file path as input
          .output(tempOutputFilePath) // Write output to a temporary file
          .outputOptions("-c:v libx264") // Use H.264 codec
          .outputOptions("-crf 28") // Set CRF value for more compression (lower quality)
          .outputOptions("-preset slow") // Use a slower preset for better compression
          .format("mp4") // Output format
          .on("stderr", (stderrLine) =>
            console.log("FFmpeg stderr:", stderrLine)
          ) // Log FFmpeg errors
          .on("end", () => {
            console.log("Compression finished.");
            resolve();
          })
          .on("error", (err) => {
            console.error("Error during compression:", err);
            reject(err);
          })
          .run(); // Run FFmpeg command
      });

      //Read compressed file into a buffer
      const compressedBuffer = fs.readFileSync(tempOutputFilePath);

      //Upload compressed file to S3
      const s3Params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `episode/${Date.now()}_${file.originalname}`,
        Body: compressedBuffer,
        ContentType: "video/mp4",
      };

      const uploadResult = await uploadFileToS3(s3Params);

      //Clean up temporary files made for compression
      fs.unlinkSync(tempInputFilePath);
      fs.unlinkSync(tempOutputFilePath);

      // Save episode details in the database
      const newEpisode = await Episode.create({
        ...req.body,
        series: seriesExist._id,
        episodeVideo: {
          publicUrl: uploadResult.Location,
          publicId: uploadResult.Key,
          format: fileFormat,
        },
      });

      await Series.updateOne(
        { _id: id },
        { $push: { episodes: newEpisode._id } },
        { new: true }
      );

      return status200(res, "Episode added to series");
    } else {
      return error400(res, "Episode video is required");
    }
  } catch (err) {
    error500(res, err);
  }
};

//Rate Episode
const rateTheEpisode = async (req, res) => {
  const { id } = req.params;
  let responseMessage = "";
  try {
    const existEpisode = await Episode.findById(id);
    if (!existEpisode) {
      return error409(res, "Episode doesn't exist");
    }
    const userHasRated = existEpisode.ratings.some(
      (rating) => rating.user.toString() === req.user._id.toString()
    );

    if (userHasRated) {
      await Episode.updateOne(
        { _id: id },
        {
          $pull: { ratings: { user: req.user._id } },
          $inc: { episodeRating: -1 },
        }
      );
      await Series.updateOne(
        {
          _id: existEpisode.series,
        },
        {
          $inc: {
            seriesRating: -1,
          },
        }
      );
      responseMessage = "Rating removed from episode";
    } else {
      await Episode.updateOne(
        { _id: id },
        {
          $push: { ratings: { user: req.user._id, rating: 1 } },
          $inc: { episodeRating: 1 },
        }
      );
      await Series.updateOne(
        {
          _id: existEpisode.series,
        },
        {
          $inc: {
            seriesRating: 1,
          },
        }
      );
      responseMessage = "Rated on episode";
    }
    return status200(res, responseMessage);
  } catch (err) {
    return error500(res, err);
  }
};

// Get All Episode Of Series in ListBox
const allEpisodeOfSeries = async (req, res) => {
  const { id } = req.params;
  try {
    // Check if the series exists
    const seriesExist = await Series.findById(id);
    if (!seriesExist) {
      return error409(res, "Series not found");
    }

    // Check if the user has an active subscription
    const isSubscribed = await UserSubscription.findOne({
      user: req.user._id,
      isSubscribed: true,
    });

    // Fetch user purchases (only if not subscribed)
    let userPurchases = null;
    if (!isSubscribed) {
      userPurchases = await UserPurchases.findOne(
        { user: req.user._id },
        { episodes: 1, _id: 0 }
      );
    }

    // Get all episodes of the series
    const allSeriesEpisodes = await Episode.find({ series: id })
      .select(
        "episodeVideo.publicUrl totalViews createdAt content title description coins"
      )
      .populate({
        path: "series",
        select: "thumbnail.publicUrl title",
      })
      .sort({ createdAt: 1 });

    // If user is subscribed, mark all episodes as "Free"
    let episodes = [];
    if (isSubscribed) {
      episodes = allSeriesEpisodes.map((episode) => ({
        ...episode._doc,
        content: "Free",
        canUnlock: false, // No need to unlock if everything is free
      }));
    } else {
      // If not subscribed, proceed with checking purchases
      const purchasedEpisodeIds = new Set(
        userPurchases ? userPurchases.episodes.map((e) => e.toString()) : []
      );

      let firstPaidEpisode = false;

      episodes = allSeriesEpisodes.map((episode) => {
        const isPurchased = purchasedEpisodeIds.has(episode._id.toString());

        let contentStatus = episode.content;

        if (episode.content === "Paid" && isPurchased) {
          contentStatus = "Free";
        }

        // Set canUnlock flag for the first paid episode
        let canUnlock = false;
        if (!firstPaidEpisode && contentStatus === "Paid") {
          firstPaidEpisode = true;
          canUnlock = true;
        }

        return {
          ...episode._doc,
          content: contentStatus,
          canUnlock,
        };
      });
    }

    return success(res, "200", "Success", episodes);
  } catch (err) {
    return error500(res, err);
  }
};

// All episodes of series in admin panel
const episodesOfSeries = async (req, res) => {
  const { id } = req.params;
  try {
    const seriesExist = await Series.findById(id);
    if (!seriesExist) {
      return error409(res, "Series not found");
    }
    const allEpisodesOfSeries = await Episode.find({
      series: id,
    })
      .select(
        "episodeVideo.publicUrl totalViews createdAt content title description coins"
      )
      .populate({
        path: "series",
        select: "thumbnail.publicUrl",
      })
      .lean();
    success(res, "200", "Success", allEpisodesOfSeries);
  } catch (err) {
    error500(res, err);
  }
};

// Delete Episode
const deleteEpisode = async (req, res) => {
  const { id } = req.params;
  try {
    const episode = await Episode.findById(id);
    if (!episode) {
      return error404(res, "Episode not found");
    }
    const series = await Series.findOne({ _id: episode.series });
    if (!series) {
      return error404(res, "Series against episode not found");
    }
    await Series.updateOne(
      {
        _id: episode.series,
      },
      {
        $pull: {
          episodes: id,
        },
      }
    );
    if (episode.episodeVideo && episode.episodeVideo.publicId) {
      //Delete from bucket
      const deleteParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: episode.episodeVideo.publicId,
      };
      await deleteFileFromBucket(deleteParams);
    }
    await Episode.deleteOne({ _id: id });
    return status200(res, "Episode removed successfully");
  } catch (err) {
    return error500(res, err);
  }
};

// Update Episode
const updateEpisode = async (req, res) => {
  const { id } = req.params;
  try {
    const episode = await Episode.findById(id);
    if (!episode) {
      return error404(res, "Episode not found");
    }
    if (req.file) {
      const file = req.file;
      const fileFormat = extractFormat(file.mimetype);

      if (episode.episodeVideo && episode.episodeVideo.publicId) {
        //Delete from bucket
        const deleteParams = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: episode.episodeVideo.publicId,
        };
        await deleteFileFromBucket(deleteParams);
      }

      //Upload to bucket
      const uploadParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `episode/${Date.now()}_${file.originalname}`,
        Body: fs.createReadStream(req.file.path),
        ContentType: req.file.mimetype,
      };

      const uploadResult = await uploadFileToS3(uploadParams);

      await Episode.updateOne(
        {
          _id: id,
        },
        {
          ...req.body,
          thumbnail: {
            publicUrl: uploadResult.Location,
            publicId: uploadResult.Key,
            format: fileFormat,
          },
        }
      );
      return status200(res, "Episode updated successfully");
    } else {
      await Episode.updateOne(
        {
          _id: id,
        },
        {
          ...req.body,
        }
      );
      return status200(res, "Episode updated successfully");
    }
  } catch (err) {
    return error500(res, err);
  }
};

// View Episode
// const viewEpisode = async (req, res) => {
//   const { id } = req.params;
//   const { up, down } = req.query;
//   const { autoUnlock, unlockNow } = req.body;

//   try {
//     const currentEpisode = await Episode.findById(id)
//       .select(
//         "episodeVideo.publicUrl episodeVideo.format coins series title description content totalViews createdAt episodeRating"
//       )
//       .populate({
//         path: "series",
//         select: "thumbnail.publicUrl title content visibility description coin",
//       });

//     if (!currentEpisode) {
//       return error404(res, "Episode not found");
//     }

//     if (down && up) {
//       return error400(res, "Query must be either up or down");
//     }

//     if (down) {
//       const nextEpisode = await Episode.findOne({
//         series: new mongoose.Types.ObjectId(currentEpisode.series),
//         createdAt: { $gt: currentEpisode.createdAt },
//       })
//         .select(
//           "episodeVideo.publicUrl episodeVideo.format coins series title description content totalViews createdAt episodeRating"
//         )
//         .sort({ createdAt: 1 })
//         .populate({
//           path: "series",
//           select:
//             "thumbnail.publicUrl title content visibility description coin",
//         });

//       if (!nextEpisode) {
//         return error404(res, "No more episode of series");
//       }

//       if (nextEpisode.content === "Free" && nextEpisode.coins === 0) {
//         const isRated = nextEpisode.ratings.some(
//           (rating) => rating.user.toString() === req.user._id.toString()
//         );

//         const isBookmarked = await myList.exists({
//           user: req.user._id,
//           episode: nextEpisode._id,
//         });

//         const data = {
//           episode: nextEpisode,
//           isBookmarked,
//           isRated,
//         };

//         return success(res, "200", "Success", data);
//       }

//       if (nextEpisode.content === "Paid" && nextEpisode.coins > 0) {
//         let userPurchasedEpisode;
//         const userPurchases = await UserPurchases.findOne({
//           user: req.user._id,
//         });
//         //Check only if user have any purchases before
//         if (userPurchases) {
//           userPurchasedEpisode = userPurchases.episodes.includes(
//             nextEpisode._id
//           );
//         }

//         if (userPurchasedEpisode) {
//           const isRated = nextEpisode.ratings.some(
//             (rating) => rating.user.toString() === req.user._id.toString()
//           );

//           const isBookmarked = await myList.exists({
//             user: req.user._id,
//             // episode: nextEpisode._id,
//           });

//           const data = {
//             episode: nextEpisode,
//             isBookmarked,
//             isRated,
//           };

//           return success(res, "200", "Success", data);
//         } else {
//           if (autoUnlock) {
//             const userCoins = await UserCoin.findOne({ user: req.user._id });
//             if (!userCoins) {
//               return error404(res, "User has no coins");
//             }

//             let { totalCoins, refillCoins, bonusCoins } = userCoins;

//             if (totalCoins < nextEpisode.coins) {
//               return error400(
//                 res,
//                 "Insufficient total coins to purchase episode"
//               );
//             }

//             // Deduct refill coins first
//             let remainingCoins = nextEpisode.coins;
//             if (refillCoins >= remainingCoins) {
//               refillCoins -= remainingCoins;
//               remainingCoins = 0;
//             } else {
//               remainingCoins -= refillCoins;
//               refillCoins = 0;
//             }

//             if (remainingCoins > 0) {
//               if (bonusCoins >= remainingCoins) {
//                 bonusCoins -= remainingCoins;
//                 remainingCoins = 0;
//               } else {
//                 remainingCoins -= bonusCoins;
//                 bonusCoins = 0;
//               }
//             }

//             // Deduct the remaining cost from total coins
//             if (remainingCoins > 0) {
//               totalCoins -= remainingCoins;
//             }

//             if (!userPurchases) {
//               const newUserPurchases = new UserPurchases({
//                 user: req.user._id,
//                 episodes: [nextEpisode._id],
//               });
//               await newUserPurchases.save();
//             } else {
//               userPurchases.episodes.push(nextEpisode._id);
//               await userPurchases.save();
//             }

//             userCoins.totalCoins = totalCoins;
//             userCoins.refillCoins = refillCoins;
//             userCoins.bonusCoins = bonusCoins;

//             await userCoins.save();

//             const isRated = nextEpisode.ratings.some(
//               (rating) => rating.user.toString() === req.user._id.toString()
//             );

//             const isBookmarked = await myList.exists({
//               user: req.user._id,
//               episode: nextEpisode._id,
//             });

//             const data = {
//               episode: nextEpisode,
//               isBookmarked,
//               isRated,
//             };

//             return success(res, "200", "Success", data);
//           } else {
//             return customError(res, 403, "Use coin to unlock episode");
//           }
//         }
//       }
//     } else if (up) {
//       const prevEpisode = await Episode.findOne({
//         series: new mongoose.Types.ObjectId(currentEpisode.series),
//         createdAt: { $lt: currentEpisode.createdAt },
//       })
//         .select(
//           "episodeVideo.publicUrl episodeVideo.format coins series title description content totalViews createdAt episodeRating"
//         )
//         .sort({ createdAt: -1 })
//         .populate({
//           path: "series",
//           select:
//             "thumbnail.publicUrl title content visibility description coin",
//         });

//       if (!prevEpisode) {
//         return error404(res, "No previous episode found");
//       }

//       if (prevEpisode.content === "Free" && prevEpisode.coins === 0) {
//         const isRated = prevEpisode.ratings.some(
//           (rating) => rating.user.toString() === req.user._id.toString()
//         );

//         const isBookmarked = await myList.exists({
//           user: req.user._id,
//           episode: prevEpisode._id,
//         });

//         const data = {
//           episode: prevEpisode,
//           isRated,
//           isBookmarked,
//         };

//         return success(res, "200", "Success", data);
//       }

//       if (prevEpisode.content === "Paid" && prevEpisode.coins > 0) {
//         let userPurchasedEpisode;
//         const userPurchases = await UserPurchases.findOne({
//           user: req.user._id,
//         });
//         // Check only if user have any purchases before
//         if (userPurchases) {
//           userPurchasedEpisode = userPurchases.episodes.includes(
//             prevEpisode._id
//           );
//         }

//         if (userPurchasedEpisode) {
//           const isRated = prevEpisode.ratings.some(
//             (rating) => rating.user.toString() === req.user._id.toString()
//           );

//           const isBookmarked = await myList.exists({
//             user: req.user._id,
//             episode: prevEpisode._id,
//           });

//           const data = {
//             episode: prevEpisode,
//             isRated,
//             isBookmarked,
//           };

//           return success(res, "200", "Success", data);
//         } else {
//           return customError(res, 403, "Episode not found in user purchases");
//         }
//       }
//     } else {
//       if (currentEpisode.content === "Free") {
//         const isRated = currentEpisode.ratings.some(
//           (rating) => rating.user.toString() === req.user._id.toString()
//         );

//         const isBookmarked = await myList.exists({
//           user: req.user._id,
//           episode: currentEpisode._id,
//         });

//         const data = {
//           episode: currentEpisode,
//           isBookmarked,
//           isRated,
//         };

//         return success(res, "200", "Success", data);
//       }

//       if (currentEpisode.content === "Paid" && currentEpisode.coins > 0) {
//         let userPurchasedEpisode;
//         const userPurchases = await UserPurchases.findOne({
//           user: req.user._id,
//         });
//         if (userPurchases) {
//           userPurchasedEpisode = userPurchases.episodes.includes(
//             currentEpisode._id
//           );
//         }

//         if (userPurchasedEpisode) {
//           const isRated = currentEpisode.ratings.some(
//             (rating) => rating.user.toString() === req.user._id.toString()
//           );

//           const isBookmarked = await myList.exists({
//             user: req.user._id,
//             episode: currentEpisode._id,
//           });

//           const data = {
//             episode: nextEpisode,
//             isBookmarked,
//             isRated,
//           };

//           return success(res, "200", "Success", data);
//         } else {
//           if (unlockNow) {
//             const userCoins = await UserCoin.findOne({ user: req.user._id });
//             if (!userCoins) {
//               return error404(res, "User has no coins");
//             }

//             let { totalCoins, refillCoins, bonusCoins } = userCoins;

//             if (totalCoins < currentEpisode.coins) {
//               return error400(
//                 res,
//                 "Insufficient total coins to purchase episode"
//               );
//             }

//             // Deduct refill coins first
//             let remainingCoins = currentEpisode.coins;
//             if (refillCoins >= remainingCoins) {
//               refillCoins -= remainingCoins;
//               remainingCoins = 0;
//             } else {
//               remainingCoins -= refillCoins;
//               refillCoins = 0;
//             }

//             if (remainingCoins > 0) {
//               if (bonusCoins >= remainingCoins) {
//                 bonusCoins -= remainingCoins;
//                 remainingCoins = 0;
//               } else {
//                 remainingCoins -= bonusCoins;
//                 bonusCoins = 0;
//               }
//             }

//             // Deduct the remaining cost from total coins
//             if (remainingCoins > 0) {
//               totalCoins -= remainingCoins;
//             }

//             if (!userPurchases) {
//               const newUserPurchases = new UserPurchases({
//                 user: req.user._id,
//                 episodes: [currentEpisode._id],
//               });
//               await newUserPurchases.save();
//             } else {
//               userPurchases.episodes.push(currentEpisode._id);
//               await userPurchases.save();
//             }

//             userCoins.totalCoins = totalCoins;
//             userCoins.refillCoins = refillCoins;
//             userCoins.bonusCoins = bonusCoins;

//             await userCoins.save();

//             const isRated = currentEpisode.ratings.some(
//               (rating) => rating.user.toString() === req.user._id.toString()
//             );

//             const isBookmarked = await myList.exists({
//               user: req.user._id,
//               episode: currentEpisode._id,
//             });

//             const data = {
//               episode: nextEpisode,
//               isBookmarked,
//               isRated,
//             };

//             return success(res, "200", "Success", data);
//           } else {
//             return customError(res, 403, "Use coin to unlock episode");
//           }
//         }
//       }
//     }
//   } catch (err) {
//     return error500(res, err);
//   }
// };

//View Episode
const viewEpisode = async (req, res) => {
  const { id } = req.params;
  const { up, down, autoUnlock, unlockNow, addWatched, fromSearch } = req.query;

  try {
    const currentEpisode = await Episode.findById(id)
      .select(
        "episodeVideo.publicUrl episodeVideo.format coins series title description content totalViews createdAt episodeRating ratings"
      )
      .populate({
        path: "series",
        select: "thumbnail.publicUrl title content visibility description coin",
        populate: [{ path: "category", select: "title" }],
      })
      .lean();

    if (!currentEpisode) {
      return error404(res, "Episode not found");
    }

    if (fromSearch) {
      const existSearchHistory = await SearchHistory.findOne({
        user: req.user._id,
        series: currentEpisode.series,
      }).lean();

      if (!existSearchHistory) {
        await SearchHistory.create({
          user: req.user._id,
          series: currentEpisode.series,
        });
      }
    }

    if (
      (up && up !== "true" && up !== true) ||
      (down && down !== "true" && down !== true) ||
      (autoUnlock && autoUnlock !== "true" && autoUnlock !== true) ||
      (unlockNow && unlockNow !== "true" && unlockNow !== true)
    ) {
      return error400(res, "Query parameters value must be true");
    }

    if (down && up) {
      return error400(res, "Query must be either up or down");
    }

    // if (down && autoUnlock) {
    //   return error400(res, "Auto unlock should not be true with down");
    // }

    // if (!up && autoUnlock) {
    //   return error400(res, "Auto unlock should only be used with up");
    // }

    if ((down || up) && unlockNow) {
      return error400(
        res,
        "UnlockNow should not be true when using up or down"
      );
    }
    //Add watch
    if ((down || up) && addWatched) {
      return error400(
        res,
        "addWatched should not be true when using up or down"
      );
    }

    // if (autoUnlock && unlockNow) {
    //   return error400(res, "Either autoUnlock or unlockNow");
    // }

    const findEpisode = async (condition, sort) => {
      return Episode.findOne(condition)
        .select(
          "episodeVideo.publicUrl episodeVideo.format coins series title description content totalViews createdAt episodeRating ratings"
        )
        .sort(sort)
        .populate({
          path: "series",
          select: "thumbnail.publicUrl title visibility description",
          populate: [
            {
              path: "category",
              select: "title",
            },
          ],
        })
        .lean();
    };

    const checkUserPurchases = async (userId, episodeId) => {
      const userPurchases = await UserPurchases.findOne({
        user: userId,
      });
      if (userPurchases) {
        return userPurchases.episodes.includes(episodeId);
      }
      return false;
    };

    const handleResponse = async (episode) => {
      //Add to user history
      await addToHistory("Series", req.user._id, episode._id);
      await updateViews(Series, episode.series, req.user._id);
      await updateViews(Episode, episode._id, req.user._id);
      await updateCategoryViews(episode.series.category, req.user._id);

      const isRated = episode.ratings.some(
        (rating) => rating.user.toString() === req.user._id.toString()
      );

      const isBookmarked = await myList.exists({
        user: req.user._id,
        episode: episode._id,
      });

      const userAdds = await UserAdd.findOne({
        userId: req.user._id,
        "watchedSeries.seriesId": episode.series._id.toString(),
      }).select("watchedSeries");

      const addsCount = userAdds?.watchedSeries[0]?.totalCount || 0;
      const episodeCopy = { ...episode };
      delete episodeCopy.ratings;

      const data = {
        episode: episodeCopy,
        isBookmarked: isBookmarked ? true : false,
        isRated,
        addsCount,
      };

      return success(res, "200", "Success", data);
    };

    const handleCoinDeduction = async (userCoins, episodeCoins) => {
      let { totalCoins, refillCoins, bonusCoins } = userCoins;
      let remainingCoins = episodeCoins;

      if (totalCoins < episodeCoins) {
        return { error: "Insufficient total coins to purchase episode" };
      }

      // Deduct refill coins first
      if (refillCoins >= remainingCoins) {
        refillCoins -= remainingCoins;
        remainingCoins = 0;
      } else {
        remainingCoins -= refillCoins;
        refillCoins = 0;
      }

      if (remainingCoins > 0) {
        if (bonusCoins >= remainingCoins) {
          bonusCoins -= remainingCoins;
          remainingCoins = 0;
        } else {
          remainingCoins -= bonusCoins;
          bonusCoins = 0;
        }
      }

      // Deduct the remaining cost from total coins
      totalCoins = refillCoins + bonusCoins;
      return { totalCoins, refillCoins, bonusCoins };
    };

    const handleUnlock = async (episode, userCoins) => {
      const result = await handleCoinDeduction(userCoins, episode.coins);
      // Check if there was an error in handleCoinDeduction
      if (result.error) {
        // return customError(res, 403, result.error);
        let coinDetails = {
          bonusCoins: userCoins?.bonusCoins || 0,
          refillCoins: userCoins?.refillCoins || 0,
          totalCoins: userCoins?.totalCoins || 0,
        };
        let price = episode.coins || 0;
        let data = {
          episodePrice: price,
          userCoins: coinDetails,
          currentEpisodeId: episode._id,
        };
        return customErrorWithData(res, 403, result.error, data);
      }

      const { totalCoins, refillCoins, bonusCoins } = result;

      userCoins.totalCoins = totalCoins;
      userCoins.refillCoins = refillCoins;
      userCoins.bonusCoins = bonusCoins;
      await userCoins.save();

      const userPurchases = await UserPurchases.findOne({
        user: req.user._id,
      });
      if (!userPurchases) {
        const newUserPurchases = new UserPurchases({
          user: req.user._id,
          episodes: [episode._id],
        });
        await newUserPurchases.save();
      } else {
        userPurchases.episodes.push(episode._id);
        await userPurchases.save();
      }

      return handleResponse(episode);
    };

    if (up) {
      const nextEpisode = await findEpisode(
        {
          series: new mongoose.Types.ObjectId(currentEpisode.series._id),
          createdAt: { $gt: currentEpisode.createdAt },
        },
        { createdAt: 1 }
      );

      if (!nextEpisode) {
        return error404(res, "No more episodes of series");
      }

      if (nextEpisode.content === "Free" && nextEpisode.coins === 0) {
        return handleResponse(nextEpisode);
      }

      if (nextEpisode.content === "Paid" && nextEpisode.coins > 0) {
        // Check if the user has an active subscription
        const isSubscribed = await UserSubscription.findOne({
          user: req.user._id,
          isSubscribed: true,
        }).lean();
        if (isSubscribed) {
          return handleResponse(nextEpisode);
        } else {
          if (await checkUserPurchases(req.user._id, nextEpisode._id)) {
            return handleResponse(nextEpisode);
          }
          if (autoUnlock) {
            const userCoins = await UserCoin.findOne({
              user: req.user._id,
              totalCoins: { $gte: 1 },
            });
            if (!userCoins) {
              //return error404(res, "User has no coins");
              //Changes to show price, coin balance.
              //If no coins of user, then screen card open where price, _id of nextEpisode and user coins balance
              let coinDetails = {
                bonusCoins: 0,
                refillCoins: 0,
                totalCoins: 0,
              };
              let price = nextEpisode.coins;
              let data = {
                episodePrice: price,
                userCoins: coinDetails,
                currentEpisodeId: nextEpisode._id,
              };
              // return success(res, "200", "User coins not found", data);
              return customErrorWithData(
                res,
                403,
                "User coins not found",
                data
              );
              // return customError(
              //   res,
              //   403,
              //   "Insufficient total coins to purchase episode"
              // );
            }
            //Else if user have coin give response
            return handleUnlock(nextEpisode, userCoins);
          } else {
            //Telling to use unlock now now because user didn't use auto unlock with down.
            //Now episode is not up but current
            //return customError(res, 403, "Use unlockNow to use coins to unlock this episode");
            let coinDetails = {
              bonusCoins: 0,
              refillCoins: 0,
              totalCoins: 0,
            };
            const userCoins = await UserCoin.findOne({
              user: req.user._id,
              totalCoins: { $gte: 1 },
            });
            if (userCoins) {
              coinDetails = {
                bonusCoins: userCoins?.bonusCoins,
                refillCoins: userCoins?.refillCoins,
                totalCoins: userCoins?.totalCoins,
              };
            }
            let price = nextEpisode.coins;
            let data = {
              price,
              coinDetails,
              currentEpisodeId: nextEpisode._id,
            };
            //change in demo --> return success(res, "200", "Use unlock to purchase episode", data);
            return customErrorWithData(
              res,
              400,
              "Use unlock to purchase episode",
              data
            );
          }
        }
      }
    } else if (down) {
      const prevEpisode = await findEpisode(
        {
          series: new mongoose.Types.ObjectId(currentEpisode.series._id),
          createdAt: { $lt: currentEpisode.createdAt },
        },
        { createdAt: -1 }
      );

      if (!prevEpisode) {
        return error404(res, "No previous episode found");
      }

      if (prevEpisode.content === "Free" && prevEpisode.coins === 0) {
        return handleResponse(prevEpisode);
      }

      if (prevEpisode.content === "Paid" && prevEpisode.coins > 0) {
        const isSubscribed = await UserSubscription.findOne({
          user: req.user._id,
          isSubscribed: true,
        }).lean();
        if (isSubscribed) {
          return handleResponse(prevEpisode);
        } else {
          if (await checkUserPurchases(req.user._id, prevEpisode._id)) {
            return handleResponse(prevEpisode);
          } else {
            return customError(res, 403, "Episode not found in user purchases");
          }
        }
      }
    } else {
      if (currentEpisode.content === "Free") {
        return handleResponse(currentEpisode);
      }
      if (currentEpisode.content === "Paid" && currentEpisode.coins > 0) {
        const isSubscribed = await UserSubscription.findOne({
          user: req.user._id,
          isSubscribed: true,
        }).lean();
        if (isSubscribed) {
          return handleResponse(currentEpisode);
        } else {
          if (await checkUserPurchases(req.user._id, currentEpisode._id)) {
            return handleResponse(currentEpisode);
          }
          //Add watch
          if (addWatched) {
            const userAdds = await UserAdd.findOne({
              userId: req.user._id,
            });
            if (!userAdds) {
              const newUserAdd = new UserAdd({
                userId: req.user._id,
                watchedSeries: [
                  {
                    seriesId: currentEpisode.series,
                    totalCount: 1,
                    // episodeIds: currentEpisode._id,
                  },
                ],
              });
              await newUserAdd.save();
              //Now add in the user purchases
              const userPurchases = await UserPurchases.findOne({
                user: req.user._id,
              });
              if (!userPurchases) {
                const newUserPurchases = new UserPurchases({
                  user: req.user._id,
                  episodes: [currentEpisode._id],
                });
                await newUserPurchases.save();
              } else {
                userPurchases.episodes.push(currentEpisode._id);
                await userPurchases.save();
              }
              return handleResponse(currentEpisode);
            } else {
              const series = userAdds.watchedSeries.find(
                (item) =>
                  item.seriesId.toString() ===
                  currentEpisode.series._id.toString()
              );
              if (series && series.totalCount >= 2) {
                return error400(
                  res,
                  "Already viewed 5 adds for this series episodes"
                );
              } else {
                if (series) {
                  await UserAdd.updateOne(
                    {
                      userId: req.user._id,
                      "watchedSeries.seriesId": currentEpisode.series,
                    },
                    {
                      $inc: { "watchedSeries.$.totalCount": 1 },
                    }
                  );
                } else {
                  await UserAdd.updateOne(
                    {
                      userId: req.user._id,
                    },
                    {
                      $push: {
                        watchedSeries: {
                          seriesId: currentEpisode.series,
                          totalCount: 1,
                        },
                      },
                    }
                  );
                }
                //Now add in the user purchases
                const userPurchases = await UserPurchases.findOne({
                  user: req.user._id,
                });
                if (!userPurchases) {
                  const newUserPurchases = new UserPurchases({
                    user: req.user._id,
                    episodes: [currentEpisode._id],
                  });
                  await newUserPurchases.save();
                } else {
                  userPurchases.episodes.push(currentEpisode._id);
                  await userPurchases.save();
                }
                return handleResponse(currentEpisode);
              }
            }
          }
          if (unlockNow) {
            const userCoins = await UserCoin.findOne({
              user: req.user._id,
            });
            if (!userCoins) {
              // return error404(res, "User has no coins");
              //Changes to show price, coin balance.
              //If no coins of user, then screen card open where price, _id of nextEpisode and user coins balance
              let coinDetails = {
                bonusCoins: 0,
                refillCoins: 0,
                totalCoins: 0,
              };
              let price = currentEpisode.coins;

              let data = {
                episodePrice: price,
                userCoins: coinDetails,
                currentEpisodeId: currentEpisode._id,
              };
              return customErrorWithData(
                res,
                403,
                "User coins not found",
                data
              );
              // return success(res, "200", "User coins not found", data);
              // return customError(
              //   res,
              //   403,
              //   "Insufficient total coins to purchase episode"
              // );
            }
            return handleUnlock(currentEpisode, userCoins);
          } else {
            //Telling to use unlock now.
            // return customError(
            //   res,
            //   403,
            //   "Use unlockNow to use coins to unlock this episode"
            // );
            let coinDetails = {
              bonusCoins: 0,
              refillCoins: 0,
              totalCoins: 0,
            };
            const userCoins = await UserCoin.findOne({
              user: req.user._id,
              totalCoins: { $gte: 1 },
            });
            if (userCoins) {
              coinDetails = {
                bonusCoins: userCoins?.bonusCoins,
                refillCoins: userCoins?.refillCoins,
                totalCoins: userCoins?.totalCoins,
              };
            }
            let price = currentEpisode.coins;
            let data = {
              price,
              coinDetails,
              currentEpisodeId: currentEpisode._id,
            };
            return customErrorWithData(
              res,
              400,
              "Use unlock to purchase episode",
              data
            );
            //change in demo --> return success(res, "200", "Use unlock to purchase episode", data);
          }
        }
      }
    }
  } catch (err) {
    return error500(res, err);
  }
};

//For you episodes
const episodesForYou = async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    // Step 1: Getting all the history of user where series exist in most sorted order.
    const userHistory = await History.find({
      user: req.user._id,
      series: { $exists: true },
    })
      .populate("series")
      .sort({ createdAt: -1 })
      .lean();

    if (!userHistory.length) {
      // return res.status(404).json({
      //   status: "404",
      //   message: "No series found in the user's history",
      // });
      const data = {
        data: [],
        hasMore: false,
      };
      return success(res, "200", "Success", data);
    }

    // Step 2: Determine the unique categories from the user's history
    const uniqueCategories = new Set();
    const seriesInHistory = new Set();
    // const seriesByCategory = {};
    userHistory.forEach((record) => {
      if (record.series && record.series.category) {
        const categoryId = String(record.series.category);
        uniqueCategories.add(categoryId);
        seriesInHistory.add(String(record.series._id));
        // if (!seriesByCategory[categoryId]) {
        //   seriesByCategory[categoryId] = [];
        // }
        // seriesByCategory[categoryId].push(record.series._id);
      }
    });

    //Converted set into array
    const uniqueCategoriesArray = Array.from(uniqueCategories);
    // Limit to at most 3 categories, for max level 3
    if (uniqueCategoriesArray.length > 3) {
      uniqueCategoriesArray.splice(3); // Keep only the 3 most recent categories if we have more than 3 still 3 needed
    }

    let response = [];

    // Step 3: Determine the Level based on the number of unique categories
    if (uniqueCategoriesArray.length === 1) {
      // Level 1: Single unique category of series

      //Destructure category from uniqueCategories
      const [categoryId] = uniqueCategoriesArray;

      //Find all the series of same category
      const allSeriesInCategory = await Series.find({
        status: "Published",
        visibility: "Public",
        category: categoryId,
        // _id: { $nin: Array.from(seriesInHistory) },
      })
        .select("_id")
        .lean();
      const allSeriesIds = allSeriesInCategory.map((series) => series._id);

      //Get episodes for all series in that category

      //All series id of which we need episodes | 3 represents the limit | the id of logged in user
      response = await getEpisodesBySeriesOrder(allSeriesIds, 3, req.user._id);
    } else if (uniqueCategoriesArray.length === 2) {
      // Level 2: Two unique categories
      const [latestCategory, olderCategory] = uniqueCategoriesArray;

      //Latest unique watched series category
      const latestSeries = await Series.find({
        status: "Published",
        visibility: "Public",
        category: latestCategory,
        // _id: { $nin: Array.from(seriesInHistory) },
      })
        .select("_id")
        .lean();

      //Oldest unique watched series category
      const olderSeries = await Series.find({
        status: "Published",
        visibility: "Public",
        category: olderCategory,
        // _id: { $nin: Array.from(seriesInHistory) },
      })
        .select("_id")
        .lean();

      //Getting the latest and oldest episodes
      const latestEpisodes = await getEpisodesBySeriesOrder(
        latestSeries.map((series) => series._id),
        3,
        req.user._id
      );
      const olderEpisodes = await getEpisodesBySeriesOrder(
        olderSeries.map((series) => series._id),
        2,
        req.user._id
      );
      response = [...latestEpisodes, ...olderEpisodes];
    } else if (uniqueCategoriesArray.length === 3) {
      // Level 3: Three unique categories
      const [latestCategory, middleCategory, oldestCategory] =
        uniqueCategoriesArray;

      const latestSeries = await Series.find({
        status: "Published",
        visibility: "Public",
        category: latestCategory,
        // _id: { $nin: Array.from(seriesInHistory) },
      })
        .select("_id")
        .lean();

      const middleSeries = await Series.find({
        status: "Published",
        visibility: "Public",
        category: middleCategory,
        // _id: { $nin: Array.from(seriesInHistory) },
      })
        .select("_id")
        .lean();

      const oldestSeries = await Series.find({
        status: "Published",
        visibility: "Public",
        category: oldestCategory,
        // _id: { $nin: Array.from(seriesInHistory) },
      })
        .select("_id")
        .lean();

      const latestEpisodes = await getEpisodesBySeriesOrder(
        latestSeries.map((series) => series._id),
        3,
        req.user._id
      );

      const middleEpisodes = await getEpisodesBySeriesOrder(
        middleSeries.map((series) => series._id),
        2,
        req.user._id
      );

      const oldestEpisodes = await getEpisodesBySeriesOrder(
        oldestSeries.map((series) => series._id),
        1,
        req.user._id
      );
      response = [...latestEpisodes, ...middleEpisodes, ...oldestEpisodes];
    }

    //Pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = page * pageSize;
    const episodes = response.slice(startIndex, endIndex);
    const hasMore = response.length > endIndex;

    const data = {
      data: episodes,
      hasMore,
    };

    return success(res, "200", "Success", data);
  } catch (err) {
    error500(res, err);
  }
};

// Helper function to get episodes in order for a series array
async function getEpisodesBySeriesOrder(seriesIds, episodeLimit, userId) {
  // Fetch all episodes for the given series IDs, sorted by creation date
  const episodes = await Episode.find({
    series: { $in: seriesIds },
    coins: 0,
    content: "Free",
  })
    .select(
      "episodeVideo.publicUrl episodeVideo.format coins series title description content totalViews createdAt episodeRating ratings"
    )
    .populate({
      path: "series",
      select: "thumbnail.publicUrl title content visibility description coin",
      populate: [{ path: "category", select: "title" }],
    })
    .sort({ createdAt: 1 })
    .lean();
  // Sort by creation date to get episodes in order

  // Group episodes by series ID and limit to the first 3 episodes
  const episodesBySeries = {};
  seriesIds.forEach((id) => {
    episodesBySeries[id] = episodes
      .filter((ep) => String(ep.series._id) === String(id))
      .slice(0, episodeLimit); // Only keep the first 3 episodes
  });

  const orderedEpisodes = [];

  // Interleave episodes: 1st of each series, then 2nd of each series, then 3rd of each series
  for (let i = 0; i < 3; i++) {
    for (const seriesId of seriesIds) {
      const episode = episodesBySeries[seriesId][i] || {}; // Get the i-th episode or empty object
      if (Object.keys(episode).length > 0) {
        // Fetch user's ratings and bookmarks
        const isRated = episode.ratings.some(
          (rating) => rating.user.toString() === userId.toString()
        );
        const isBookmarked = await myList.exists({
          user: userId,
          episode: episode._id,
        });
        // Add the episode to the ordered list
        orderedEpisodes.push({
          episode: {
            episodeVideo: episode.episodeVideo || {},
            _id: episode._id || null,
            series: {
              thumbnail: episode.series?.thumbnail || {},
              _id: episode.series?._id || null,
              title: episode.series?.title || "",
              description: episode.series?.description || "",
              category: {
                _id: episode.series?.category?._id || null,
                title: episode.series?.category?.title || "",
              },
              visibility: episode.series?.visibility || "",
            },
            title: episode.title || "",
            description: episode.description || "",
            coins: episode.coins || 0,
            content: episode.content || "",
            totalViews: episode.totalViews || 0,
            episodeRating: episode.episodeRating || 0,
            createdAt: episode.createdAt || "",
          },
          isRated: isRated || false,
          isBookmarked: isBookmarked ? true : false,
        });
      }
    }
  }
  return orderedEpisodes;
}

module.exports = {
  addEpisode,
  rateTheEpisode,
  allEpisodeOfSeries,
  episodesOfSeries,
  deleteEpisode,
  updateEpisode,
  viewEpisode,
  episodesForYou,
};
