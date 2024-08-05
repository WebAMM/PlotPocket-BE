//Models
const Episode = require("../models/Episode.model");
const Series = require("../models/Series.model");
const UserPurchases = require("../models/UserPurchases.model");
const UserCoin = require("../models/UserCoin.model");
const myList = require("../models/MyList.model");
//Responses and errors
const {
  error500,
  error409,
  error404,
  error400,
  customError,
} = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");
//helpers and functions
const { default: mongoose } = require("mongoose");
const {
  uploadFileToS3,
  deleteFileFromBucket,
} = require("../services/helpers/awsConfig");
const extractFormat = require("../services/helpers/extractFormat");
const fs = require("fs");

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
        "Episode with this name already exist in this series"
      );
    }
    if (req.file) {
      const file = req.file;
      const fileFormat = extractFormat(file.mimetype);

      //Upload file to S3
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `episode/${Date.now()}_${file.originalname}`,
        Body: fs.createReadStream(req.file.path),
        Content: fileFormat,
      };

      const uploadResult = await uploadFileToS3(params);

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
      return status200(res, "Episode added in series");
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

// Get All Episode Of Series
const allEpisodeOfSeries = async (req, res) => {
  const { id } = req.params;
  try {
    const seriesExist = await Series.findById(id);
    if (!seriesExist) {
      return error409(res, "Series not found");
    }

    //Fetch user purchases
    const userPurchases = await UserPurchases.findOne(
      {
        user: req.user._id,
      },
      { episodes: 1, _id: 0 }
    ).lean();

    const allSeriesEpisodes = await Episode.find({
      series: id,
    })
      .select(
        "episodeVideo.publicUrl totalViews createdAt content title description coins"
      )
      .populate({
        path: "series",
        select: "thumbnail.publicUrl title",
      })
      .sort({ createdAt: 1 });

    const purchasedEpisodeIds = new Set(
      userPurchases ? userPurchases.episodes.map((e) => e.toString()) : []
    );

    let firstPaidEpisode = false;

    const episodes = allSeriesEpisodes.map((episode) => {
      const isPurchased = purchasedEpisodeIds.has(episode._id.toString());

      contentStatus = episode.content;

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
      });
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
        ContentType: fileFormat,
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
  const { up, down, autoUnlock, unlockNow } = req.query;

  try {
    const currentEpisode = await Episode.findById(id)
      .select(
        "episodeVideo.publicUrl episodeVideo.format coins series title description content totalViews createdAt episodeRating ratings"
      )
      .populate({
        path: "series",
        select: "thumbnail.publicUrl title content visibility description coin",
        populate: [{ path: "category", select: "title" }],
      });

    if (!currentEpisode) {
      return error404(res, "Episode not found");
    }

    if (down && up) {
      return error400(res, "Query must be either up or down");
    }

    // if (up && autoUnlock) {
    //   return error400(res, "Auto unlock should not be true with down");
    // }

    // if ((down || up) && unlockNow === "true") {
    //   return error400(
    //     res,
    //     "UnlockNow should not be true when using up or down"
    //   );
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
        });
    };

    const checkUserPurchases = async (userId, episodeId) => {
      const userPurchases = await UserPurchases.findOne({ user: userId });
      if (userPurchases) {
        return userPurchases.episodes.includes(episodeId);
      }
      return false;
    };

    const handleResponse = async (episode) => {
      const isRated = episode.ratings.some(
        (rating) => rating.user.toString() === req.user._id.toString()
      );

      const isBookmarked = await myList.exists({
        user: req.user._id,
        episode: episode._id,
      });

      const data = {
        episode,
        isBookmarked: isBookmarked || false,
        isRated,
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
      if (remainingCoins > 0) {
        totalCoins -= remainingCoins;
      }

      return { totalCoins, refillCoins, bonusCoins };
    };

    const handleUnlock = async (episode, userCoins) => {
      const { totalCoins, refillCoins, bonusCoins } = await handleCoinDeduction(
        userCoins,
        episode.coins
      );

      userCoins.totalCoins = totalCoins;
      userCoins.refillCoins = refillCoins;
      userCoins.bonusCoins = bonusCoins;
      await userCoins.save();

      const userPurchases = await UserPurchases.findOne({ user: req.user._id });
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

    if (down) {
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
        if (await checkUserPurchases(req.user._id, nextEpisode._id)) {
          return handleResponse(nextEpisode);
        }

        if (autoUnlock) {
          const userCoins = await UserCoin.findOne({ user: req.user._id });
          if (!userCoins) {
            return error404(res, "User has no coins");
          }

          return handleUnlock(nextEpisode, userCoins);
        } else {
          return customError(res, 403, "Use coins to unlock episode");
        }
      }
    } else if (up) {
      const prevEpisode = await findEpisode(
        {
          series: new mongoose.Types.ObjectId(currentEpisode.series),
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
        if (await checkUserPurchases(req.user._id, prevEpisode._id)) {
          return handleResponse(prevEpisode);
        } else {
          return customError(res, 403, "Episode not found in user purchases");
        }
      }
    } else {
      if (currentEpisode.content === "Free") {
        return handleResponse(currentEpisode);
      }

      if (currentEpisode.content === "Paid" && currentEpisode.coins > 0) {
        if (await checkUserPurchases(req.user._id, currentEpisode._id)) {
          return handleResponse(currentEpisode);
        }

        if (unlockNow) {
          const userCoins = await UserCoin.findOne({ user: req.user._id });
          if (!userCoins) {
            return error404(res, "User has no coins");
          }
          return handleUnlock(currentEpisode, userCoins);
        } else {
          return customError(res, 403, "Use coins to unlock episode");
        }
      }
    }
  } catch (err) {
    return error500(res, err);
  }
};

module.exports = {
  addEpisode,
  rateTheEpisode,
  allEpisodeOfSeries,
  episodesOfSeries,
  deleteEpisode,
  updateEpisode,
  viewEpisode,
};
