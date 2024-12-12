//Models
const Chapter = require("../models/Chapter.model");
const Novel = require("../models/Novel.model");
const UserCoin = require("../models/UserCoin.model");
const UserPurchases = require("../models/UserPurchases.model");
const myList = require("../models/MyList.model");
const UserSubscription = require("../models/UserSubscription.model");
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
const fs = require("fs");
const {
  updateCategoryViews,
  updateViews,
} = require("../services/helpers/incViews");
const addToHistory = require("../services/helpers/addToHistory");

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
    const existChapter = await Chapter.findOne({ name, novel: novelExist._id });
    if (existChapter) {
      return error409(
        res,
        "Chapter with this name already exist in this novel"
      );
    }
    if (req.file) {
      const file = req.file;
      const fileFormat = extractFormat(file.mimetype);

      //Upload file to S3
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `chapter/${Date.now()}_${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      const uploadResult = await uploadFileToS3(params);

      const newChapter = await Chapter.create({
        ...req.body,
        novel: novelExist._id,
        chapterPdf: {
          publicUrl: uploadResult.Location,
          publicId: uploadResult.Key,
          format: fileFormat,
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
        "chapterPdf.publicUrl chapterPdf.format totalViews content name chapterNo createdAt coins description"
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
      //Delete from bucket
      const deleteParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: chapter.chapterPdf.publicId,
      };
      await deleteFileFromBucket(deleteParams);
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
      if (chapter.chapterPdf && chapter.chapterPdf.publicId) {
        //Delete from bucket
        const deleteParams = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: chapter.chapterPdf.publicId,
        };
        await deleteFileFromBucket(deleteParams);
      }

      const file = req.file;
      const fileFormat = extractFormat(file.mimetype);

      //Upload to Bucket
      const uploadParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `chapter/${Date.now()}_${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
      };
      const uploadResult = await uploadFileToS3(uploadParams);

      await Chapter.updateOne(
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
  const { up, down, autoUnlock, unlockNow, addWatched, fromSearch } = req.query;

  try {
    const currentChapter = await Chapter.findById(id)
      .select(
        "chapterPdf.publicUrl chapterPdf.format novel name description coins totalViews content chapterNo createdAt"
      )
      .populate({
        path: "novel",
        select: "thumbnail.publicUrl title type totalViews description",
        populate: [
          { path: "category", select: "title" },
          { path: "author", select: "name" },
        ],
      })
      .lean();

    if (!currentChapter) {
      return error404(res, "Chapter not found");
    }

    if (fromSearch) {
      const existSearchHistory = await SearchHistory.findOne({
        user: req.user._id,
        novel: currentChapter.novel,
      }).lean();

      if (!existSearchHistory) {
        await SearchHistory.create({
          user: req.user._id,
          novel: currentChapter.novel,
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
    //   return error400(res, "Auto unlock should not be true with up");
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

    const findChapter = async (condition, sort) => {
      return Chapter.findOne(condition)
        .select(
          "chapterPdf.publicUrl chapterPdf.format novel coins createdAt totalViews content chapterNo name"
        )
        .sort(sort)
        .populate({
          path: "novel",
          select: "thumbnail.publicUrl title type totalViews description",
          populate: [
            { path: "category", select: "title" },
            { path: "author", select: "name" },
          ],
        })
        .lean();
    };

    const checkUserPurchases = async (userId, chapterId) => {
      const userPurchases = await UserPurchases.findOne({ user: userId });
      if (userPurchases) {
        return userPurchases.chapters.includes(chapterId);
      }
      return false;
    };

    const handleResponse = async (chapter) => {
      //Add to user history
      await addToHistory("Novel", req.user._id, chapter._id);
      await updateViews(Novel, chapter.novel, req.user._id);
      await updateViews(Chapter, chapter._id, req.user._id);
      await updateCategoryViews(chapter.novel.category, req.user._id);

      const isBookmarked = await myList.exists({
        user: req.user._id,
        chapter: chapter._id,
      });

      const userAdds = await UserAdd.findOne({
        userId: req.user._id,
        "watchedNovel.novelId": chapter.novel._id.toString(),
      }).select("watchedNovel");

      const addsCount = userAdds?.watchedNovel[0]?.totalCount || 0;

      const data = {
        chapter,
        isBookmarked: isBookmarked ? true : false,
        addsCount,
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
      totalCoins = refillCoins + bonusCoins;
      return { totalCoins, refillCoins, bonusCoins };
    };

    const handleUnlock = async (chapter, userCoins) => {
      const result = await handleCoinDeduction(userCoins, chapter.coins);
      // Check if there was an error in handleCoinDeduction
      if (result.error) {
        // return customError(res, 403, result.error);
        let coinDetails = {
          bonusCoins: userCoins?.bonusCoins || 0,
          refillCoins: userCoins?.refillCoins || 0,
          totalCoins: userCoins?.totalCoins || 0,
        };
        let price = chapter.coins || 0;
        let data = {
          chapterPrice: price,
          userCoins: coinDetails,
          currentChapterId: chapter._id,
        };
        return customErrorWithData(res, 403, result.error, data);
      }

      const { totalCoins, refillCoins, bonusCoins } = result;

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

    if (up) {
      const nextChapter = await findChapter(
        {
          novel: new mongoose.Types.ObjectId(currentChapter.novel._id),
          createdAt: { $gt: currentChapter.createdAt },
        },
        { createdAt: 1 }
      );

      if (!nextChapter) {
        return error404(res, "No more chapters of novel");
      }

      if (nextChapter.content === "Free" && nextChapter.coins === 0) {
        return handleResponse(nextChapter);
      }

      if (nextChapter.content === "Paid" && nextChapter.coins > 0) {
        // Check if the user has an active subscription
        const isSubscribed = await UserSubscription.findOne({
          user: req.user._id,
          isSubscribed: true,
        }).lean();
        if (isSubscribed) {
          return handleResponse(nextChapter);
        } else {
          if (await checkUserPurchases(req.user._id, nextChapter._id)) {
            return handleResponse(nextChapter);
          }
          if (autoUnlock) {
            const userCoins = await UserCoin.findOne({
              user: req.user._id,
              totalCoins: { $gte: 1 },
            });
            if (!userCoins) {
              let coinDetails = {
                bonusCoins: 0,
                refillCoins: 0,
                totalCoins: 0,
              };
              let price = nextChapter.coins;
              let data = {
                chapterPrice: price,
                userCoins: coinDetails,
                currentChapterId: nextChapter._id,
              };
              // return success(res, "200", "User coins not found", data);
              return customErrorWithData(
                res,
                403,
                "User coins not found",
                data
              );
              // return error404(res, "User has no coins");
            }
            return handleUnlock(nextChapter, userCoins);
          } else {
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
            let price = nextChapter.coins;
            let data = {
              price,
              coinDetails,
              currentChapterId: nextChapter._id,
            };
            return customErrorWithData(
              res,
              400,
              "Use unlock to purchase chapter",
              data
            );
            // return customError(res, 403, "Use coins to unlock chapter");
          }
        }
      }
    } else if (down) {
      const prevChapter = await findChapter(
        {
          novel: new mongoose.Types.ObjectId(currentChapter.novel._id),
          createdAt: { $lt: currentChapter.createdAt },
        },
        { createdAt: -1 }
      );

      if (!prevChapter) {
        return error404(res, "No previous chapter found");
      }

      if (prevChapter.content === "Free" && prevChapter.coins === 0) {
        return handleResponse(prevChapter);
      }

      if (prevChapter.content === "Paid" && prevChapter.coins > 0) {
        const isSubscribed = await UserSubscription.findOne({
          user: req.user._id,
          isSubscribed: true,
        });
        if (isSubscribed) {
          return handleResponse(prevChapter);
        } else {
          if (await checkUserPurchases(req.user._id, prevChapter._id)) {
            return handleResponse(prevChapter);
          } else {
            return customError(res, 403, "Chapter not found in user purchases");
          }
        }
      }
    } else {
      if (currentChapter.content === "Free") {
        return handleResponse(currentChapter);
      }
      if (currentChapter.content === "Paid" && currentChapter.coins > 0) {
        const isSubscribed = await UserSubscription.findOne({
          user: req.user._id,
          isSubscribed: true,
        }).lean();
        if (isSubscribed) {
          return handleResponse(currentChapter);
        } else {
          if (await checkUserPurchases(req.user._id, currentChapter._id)) {
            return handleResponse(currentChapter);
          }
          //Add watch
          if (addWatched) {
            const userAdds = await UserAdd.findOne({
              userId: req.user._id,
            });
            if (!userAdds) {
              const newUserAdd = new UserAdd({
                userId: req.user._id,
                watchedNovel: [
                  {
                    novelId: currentChapter.novel,
                    totalCount: 1,
                    // chapterIds: currentChapter._id
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
                  chapters: [currentChapter._id],
                });
                await newUserPurchases.save();
              } else {
                userPurchases.chapters.push(currentChapter._id);
                await userPurchases.save();
              }
              return handleResponse(currentChapter);
            } else {
              const novel = userAdds.watchedNovel.find(
                (item) =>
                  item.novelId.toString() ===
                  currentChapter.novel._id.toString()
              );
              if (novel && novel.totalCount >= 2) {
                return error400(
                  res,
                  "Already viewed 2 adds for this novel chapters"
                );
              } else {
                if (novel) {
                  await UserAdd.updateOne(
                    {
                      userId: req.user._id,
                      "watchedNovel.novelId": currentChapter.novel,
                    },
                    {
                      $inc: { "watchedNovel.$.totalCount": 1 },
                    }
                  );
                } else {
                  await UserAdd.updateOne(
                    {
                      userId: req.user._id,
                    },
                    {
                      $push: {
                        watchedNovel: {
                          novelId: currentChapter.novel,
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
                    chapters: [currentChapter._id],
                  });
                  await newUserPurchases.save();
                } else {
                  userPurchases.chapters.push(currentChapter._id);
                  await userPurchases.save();
                }
                return handleResponse(currentChapter);
              }
            }
          }
          if (unlockNow) {
            const userCoins = await UserCoin.findOne({ user: req.user._id });
            if (!userCoins) {
              let coinDetails = {
                bonusCoins: 0,
                refillCoins: 0,
                totalCoins: 0,
              };
              let price = currentChapter.coins;

              let data = {
                chapterPrice: price,
                userCoins: coinDetails,
                currentChapterId: currentChapter._id,
              };
              return customErrorWithData(
                res,
                403,
                "User coins not found",
                data
              );
              // return error404(res, "User has no coins");
            }
            return handleUnlock(currentChapter, userCoins);
          } else {
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
            let price = currentChapter.coins;
            let data = {
              price,
              coinDetails,
              currentChapterId: currentChapter._id,
            };
            return customErrorWithData(
              res,
              400,
              "Use unlock to purchase chapter",
              data
            );
            // return customError(res, 403, "Use coins to unlock chapter");
          }
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
