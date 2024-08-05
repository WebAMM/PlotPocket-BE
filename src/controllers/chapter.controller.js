//Models
const Chapter = require("../models/Chapter.model");
const Novel = require("../models/Novel.model");
const UserCoin = require("../models/UserCoin.model");
const UserPurchases = require("../models/UserPurchases.model");
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
const cloudinary = require("../services/helpers/cloudinary").v2;
const { default: mongoose } = require("mongoose");

//Add Chapter
const addChapter = async (req, res) => {
  const { name } = req.body;
  const { id } = req.params;
  try {
    const novelExist = await Novel.findOne({
      _id: id,
      status: "Published",
      visibility: "Public",
    });
    if (!novelExist) {
      return error404(res, "Novel not found");
    }
    // const existChapter = await Chapter.findOne({ name });
    // if (existChapter) {
    //   return error409(res, "Chapter Already Exist");
    // }
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "raw",
        folder: "chapter",
      });
      const newChapter = await Chapter.create({
        ...req.body,
        novel: novelExist._id,
        chapterPdf: {
          publicUrl: result.url,
          secureUrl: result.secure_url,
          publicId: result.public_id,
          format: result.format,
        },
      });
      await Novel.updateOne(
        {
          _id: id,
        },
        { $push: { chapters: newChapter._id } },
        { new: true }
      );
      return status200(res, "Chapter added in novel");
    } else {
      return error400(res, "Chapter pdf is required");
    }
  } catch (err) {
    error500(res, err);
  }
};

// Get All Chapters by Novel
const getAllChaptersByNovel = async (req, res) => {
  const { id } = req.params;
  try {
    const novelExist = await Novel.findById(id);
    if (!novelExist) {
      return error404(res, "Novel not found");
    }
    const chapters = await Chapter.find({
      novel: id,
    })
      .select(
        "chapterPdf.publicUrl chapterPdf.format totalViews content name chapterNo createdAt coins"
      )
      .populate({
        path: "novel",
        select: "thumbnail.publicUrl",
      });
    success(res, "200", "Success", chapters);
  } catch (err) {
    error500(res, err);
  }
};

// Delete Chapter
const deleteChapter = async (req, res) => {
  const { id } = req.params;
  try {
    const chapter = await Chapter.findById(id);
    if (!chapter) {
      return error404(res, "Chapter not found");
    }
    const novel = await Novel.findOne({ _id: chapter.novel });
    if (!novel) {
      return error404(res, "Novel against chapter not found");
    }
    await Novel.updateOne(
      {
        _id: chapter.novel,
      },
      {
        $pull: {
          chapters: id,
        },
      }
    );
    if (chapter.chapterPdf && chapter.chapterPdf.publicId) {
      await cloudinary.uploader.destroy(chapter.chapterPdf.publicId, {
        resource_type: "raw",
        folder: "chapter",
      });
    }
    await Chapter.deleteOne({ _id: id });
    return status200(res, "Chapter removed successfully");
  } catch (err) {
    return error500(res, err);
  }
};

// Update Chapter
const updateChapter = async (req, res) => {
  const { id } = req.params;
  try {
    const chapter = await Chapter.findById(id);
    if (!chapter) {
      return error404(res, "Chapter not found");
    }
    if (req.file) {
      if (chapter.episodeVideo && chapter.episodeVideo.publicId) {
        await cloudinary.uploader.destroy(episode.episodeVideo.publicId, {
          resource_type: "raw",
          folder: "chapter",
        });
      }
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "raw",
        folder: "chapter",
      });
      await Chapter.updateOne(
        {
          _id: id,
        },
        {
          ...req.body,
          thumbnail: {
            publicUrl: result.url,
            secureUrl: result.secure_url,
            publicId: result.public_id,
            format: result.format,
          },
        }
      );
      return status200(res, "Chapter updated successfully");
    } else {
      await Chapter.updateOne(
        {
          _id: id,
        },
        {
          ...req.body,
        }
      );
      return status200(res, "Chapter updated successfully");
    }
  } catch (err) {
    return error500(res, err);
  }
};

//View Chapter
// const viewChapter = async (req, res) => {
//   const { id } = req.params;
//   const { up, down } = req.query;
//   const { autoUnlock } = req.body;

//   try {
//     const currentChapter = await Chapter.findById(id)
//       .select(
//         "novel name description coins totalViews chapterPdf.publicUrl format"
//       )
//       .populate({
//         path: "novel",
//         select: "thumbnail.publicUrl title type totalViews description",
//       });

//     if (!currentChapter) {
//       return error404(res, "Chapter not found");
//     }

//     if (down && up) {
//       return error400(res, "Query must be either up or down");
//     }

//     if (down) {
//       const nextChapter = await Chapter.findOne({
//         novel: new mongoose.Types.ObjectId(currentChapter.novel),
//         createdAt: { $gt: currentChapter.createdAt },
//       })
//         .select(
//           "chapterPdf.publicUrl chapterPdf.format coins createdAt totalViews content chapterNo name"
//         )
//         .sort({
//           createdAt: 1,
//         })
//         .populate({
//           path: "novel",
//           select: "thumbnail.publicUrl title type totalViews",
//         });

//       if (!nextChapter) {
//         return error404(res, "No more chapter of novel");
//       }

//       if (nextChapter.content === "Free" && nextChapter.coins === 0) {
//         return success(res, "200", "FreeSuccess", nextChapter);
//       }

//       if (nextChapter.content === "Paid" && nextChapter.coins > 0) {
//         let userPurchasedChapter;
//         const userPurchases = await UserPurchases.findOne({
//           user: req.user._id,
//         });
//         //Check only if user have any purchases before
//         if (userPurchases) {
//           userPurchasedChapter = userPurchases.chapters.includes(
//             nextChapter._id
//           );
//         }

//         if (userPurchasedChapter) {
//           return success(res, "200", "Success", nextChapter);
//         } else {
//           if (autoUnlock) {
//             const userCoins = await UserCoin.findOne({ user: req.user._id });
//             if (!userCoins) {
//               return error404(res, "User has no coins");
//             }

//             let { totalCoins, refillCoins, bonusCoins } = userCoins;

//             if (totalCoins < nextChapter.coins) {
//               return error400(
//                 res,
//                 "Insufficient total coins to purchase chapter"
//               );
//             }

//             // Deduct refill coins first
//             let remainingCoins = nextChapter.coins;
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
//                 chapters: [nextChapter._id],
//               });
//               await newUserPurchases.save();
//             } else {
//               userPurchases.chapters.push(nextChapter._id);
//               await userPurchases.save();
//             }

//             userCoins.totalCoins = totalCoins;
//             userCoins.refillCoins = refillCoins;
//             userCoins.bonusCoins = bonusCoins;

//             await userCoins.save();
//             return success(res, "200", "Success", nextChapter);
//           } else {
//             return customError(res, 403, "Use coins to unlock chapter");
//           }
//         }
//       }
//     } else if (up) {
//       const prevChapter = await Chapter.findOne({
//         novel: new mongoose.Types.ObjectId(currentChapter.novel),
//         createdAt: { $lt: currentChapter.createdAt },
//       })
//         .select(
//           "chapterPdf.publicUrl chapterPdf.format coins createdAt totalViews content chapterNo name"
//         )
//         .sort({ createdAt: -1 })
//         .populate({
//           path: "novel",
//           select: "thumbnail.publicUrl title type totalViews",
//         });

//       if (!prevChapter) {
//         return error404(res, "No previous chapter found");
//       }

//       if (prevChapter.content === "Free" && prevChapter.coins === 0) {
//         return success(res, "200", "Success", prevChapter);
//       }

//       if (prevChapter.content === "Paid" && prevChapter.coins > 0) {
//         let userPurchasedChapter;
//         const userPurchases = await UserPurchases.findOne({
//           user: req.user._id,
//         });
//         // Check only if user have any purchases before
//         if (userPurchases) {
//           userPurchasedChapter = userPurchases.chapters.includes(
//             prevChapter._id
//           );
//         }

//         if (userPurchasedChapter) {
//           return success(res, "200", "Success", prevChapter);
//         } else {
//           return customError(res, 403, "Chapter not found in user purchases");
//         }
//       }
//     }
//   } catch (err) {
//     return error500(res, err);
//   }
// };

const viewChapter = async (req, res) => {
  const { id } = req.params;
  const { up, down } = req.query;
  const { autoUnlock, unlockNow } = req.body;

  try {
    const currentChapter = await Chapter.findById(id)
      .select(
        "novel name description coins totalViews chapterPdf.publicUrl format"
      )
      .populate({
        path: "novel",
        select: "thumbnail.publicUrl title type totalViews description",
        populate: [
          { path: "category", select: "title" },
          { path: "author", select: "name" },
        ],
      });

    if (!currentChapter) {
      return error404(res, "Chapter not found");
    }

    if (down && up) {
      return error400(res, "Query must be either up or down");
    }

    const findChapter = async (condition, sortOrder) => {
      return await Chapter.findOne(condition)
        .select(
          "chapterPdf.publicUrl chapterPdf.format coins createdAt totalViews content chapterNo name"
        )
        .sort({ createdAt: sortOrder })
        .populate({
          path: "novel",
          select: "thumbnail.publicUrl title type totalViews description",
          populate: [
            { path: "category", select: "title" },
            { path: "author", select: "name" },
          ],
        });
    };

    const checkUserPurchases = async (userId, chapterId) => {
      const userPurchases = await UserPurchases.findOne({ user: userId });
      if (userPurchases) {
        return userPurchases.chapters.includes(chapterId);
      }
      return false;
    };

    const handleResponse = async (chapter) => {
      const isBookmarked = await myList.exists({
        user: req.user._id,
        chapter: chapter._id,
      });

      const data = {
        chapter,
        isBookmarked: isBookmarked || false,
      };

      return success(res, "200", "Success", data);
    };

    const handleCoinDeduction = async (userCoins, chapterCoins) => {
      let { totalCoins, refillCoins, bonusCoins } = userCoins;
      let remainingCoins = chapterCoins;

      if (totalCoins < chapterCoins) {
        return { error: "Insufficient total coins to purchase chapter" };
      }

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

    const handleUnlock = async (chapter, userCoins) => {
      const { totalCoins, refillCoins, bonusCoins } = await handleCoinDeduction(
        userCoins,
        chapter.coins
      );

      userCoins.totalCoins = totalCoins;
      userCoins.refillCoins = refillCoins;
      userCoins.bonusCoins = bonusCoins;
      await userCoins.save();

      const userPurchases = await UserPurchases.findOne({ user: req.user._id });
      if (!userPurchases) {
        const newUserPurchases = new UserPurchases({
          user: req.user._id,
          chapters: [chapter._id],
        });
        await newUserPurchases.save();
      } else {
        userPurchases.chapters.push(chapter._id);
        await userPurchases.save();
      }

      return handleResponse(chapter);
    };

    if (down) {
      const nextChapter = await findChapter(
        {
          novel: new mongoose.Types.ObjectId(currentChapter.novel),
          createdAt: { $gt: currentChapter.createdAt },
        },
        1
      );

      if (!nextChapter) {
        return error404(res, "No more chapters in the novel");
      }

      if (nextChapter.content === "Free" && nextChapter.coins === 0) {
        return handleResponse(nextChapter);
      }

      if (nextChapter.content === "Paid" && nextChapter.coins > 0) {
        if (await checkUserPurchases(req.user._id, nextChapter._id)) {
          return handleResponse(nextChapter);
        }

        if (autoUnlock) {
          const userCoins = await UserCoin.findOne({ user: req.user._id });
          if (!userCoins) {
            return error404(res, "User has no coins");
          }

          return handleUnlock(nextChapter, userCoins);
        } else {
          return customError(res, 403, "Use coins to unlock chapter");
        }
      }
    } else if (up) {
      const prevChapter = await findChapter(
        {
          novel: new mongoose.Types.ObjectId(currentChapter.novel),
          createdAt: { $lt: currentChapter.createdAt },
        },
        -1
      );

      if (!prevChapter) {
        return error404(res, "No previous chapter found");
      }

      if (prevChapter.content === "Free" && prevChapter.coins === 0) {
        return handleResponse(prevChapter);
      }

      if (prevChapter.content === "Paid" && prevChapter.coins > 0) {
        if (await checkUserPurchases(req.user._id, prevChapter._id)) {
          return handleResponse(prevChapter);
        } else {
          return customError(res, 403, "Chapter not found in user purchases");
        }
      }
    } else {
      if (currentChapter.content === "Free") {
        return handleResponse(currentChapter);
      }

      if (currentChapter.content === "Paid" && currentChapter.coins > 0) {
        if (await checkUserPurchases(req.user._id, currentChapter._id)) {
          return handleResponse(currentChapter);
        }

        if (unlockNow) {
          const userCoins = await UserCoin.findOne({ user: req.user._id });
          if (!userCoins) {
            return error404(res, "User has no coins");
          }

          return handleUnlock(currentChapter, userCoins);
        } else {
          return customError(res, 403, "Use coins to unlock chapter");
        }
      }
    }
  } catch (err) {
    return error500(res, err);
  }
};

module.exports = {
  addChapter,
  getAllChaptersByNovel,
  deleteChapter,
  updateChapter,
  viewChapter,
};
