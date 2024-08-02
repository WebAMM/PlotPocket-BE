//Models
const User = require("../models/User.model");
const Episode = require("../models/Episode.model");
const Chapter = require("../models/Chapter.model");
const UserCoin = require("../models/UserCoin.model");
const UserPurchases = require("../models/UserPurchases.model");
//Responses and errors
const {
  error500,
  error404,
  customError,
  error400,
} = require("../services/helpers/errors");
const { success, status200 } = require("../services/helpers/response");

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({
      role: {
        $ne: "Admin",
      },
    }).select("profilePic.publicUrl _id userName email createdAt status");
    success(res, "200", "Success", users);
  } catch (err) {
    error500(res, err);
  }
};

const getUserCoinsDetail = async (req, res) => {
  const { id } = req.params;
  const { type } = req.query;

  try {
    if (type !== "Episode" && type !== "Chapter") {
      return error400(res, "Type must be Episode or Chapter");
    }

    let price = 0;
    if (type === "Episode") {
      const episodeExist = await Episode.findById(id);
      if (!episodeExist) {
        return error404(res, "Episode not found");
      }
      price = episodeExist.coins;
    } else if (type === "Chapter") {
      const existChapter = await Chapter.findById(id);
      if (!existChapter) {
        return error404(res, "Chapter not found");
      }
      price = existChapter.price;
    }

    let coinDetails = {
      bonusCoins: 0,
      refillCoins: 0,
      totalCoins: 0,
    };
    const coinDetailsOfUser = await UserCoin.findOne({
      user: req.user._id,
    }).select("bonusCoins refillCoins totalCoins -_id");

    if (coinDetailsOfUser) {
      coinDetails = {
        bonusCoins: coinDetailsOfUser.bonusCoins,
        refillCoins: coinDetailsOfUser.refillCoins,
        totalCoins: coinDetailsOfUser.totalCoins,
      };
    }

    const data = {
      coinBalance: coinDetails,
      price: price - coinDetails.totalCoins,
    };

    return success(res, "200", "Success", data);
  } catch (err) {
    error500(res, err);
  }
};

const changeUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) {
    return customError(res, 400, "Status is required");
  }
  try {
    const user = await User.findByIdAndUpdate(id, { status }, { new: true });
    if (!user) {
      return error404(res, "User not found");
    }
    success(res, "200", "User status updated successfully", user);
  } catch (err) {
    error500(res, err);
  }
};

// const addToUserPurchase = async (req, res) => {
//   const { type } = req.query;
//   const { episodeId, chapterId } = req.body;

//   try {
//     if (type !== "Episode" && type !== "Chapter") {
//       return error400(res, "Type must be Episode or Chapter");
//     }

//     const userCoin = await UserCoin.findOne({ user: req.user._id });
//     if (!userCoin) {
//       return error404(res, "User has no coins");
//     }

//     let userPurchases = await UserPurchases.findOne({ user: req.user._id });
//     if (!userPurchases) {
//       userPurchases = new UserPurchases({
//         user: req.user._id,
//         episodes: [],
//         chapters: [],
//       });
//     }

//     if (type === "Episode") {
//       // Fetch the current episode
//       const currentEpisode = await Episode.findById(episodeId);
//       if (!currentEpisode) {
//         return error404(res, "Episode not found");
//       }

//       const nextPaidEpisode = await Episode.findOne({
//         series: currentEpisode.series,
//         createdAt: { $gt: currentEpisode.createdAt },
//         content: "Paid",
//         _id: { $nin: userPurchases.episodes },
//       }).sort({ createdAt: 1 });

//       if (!nextPaidEpisode) {
//         return error404(res, "No subsequent paid episode found");
//       }

//       let totalCoins = userCoin.totalCoins;
//       let refillCoins = userCoin.refillCoins;
//       let bonusCoins = userCoin.bonusCoins;

//       if (totalCoins < nextPaidEpisode.coins) {
//         return error400(res, "Insufficient coins to purchase the episode");
//       }

//       // Deduct refill coins first
//       let remainingCoins = nextPaidEpisode.coins;
//       if (refillCoins >= remainingCoins) {
//         refillCoins -= remainingCoins;
//         remainingCoins = 0;
//       } else {
//         remainingCoins -= refillCoins;
//         refillCoins = 0;
//       }

//       if (remainingCoins > 0) {
//         if (bonusCoins >= remainingCoins) {
//           bonusCoins -= remainingCoins;
//           remainingCoins = 0;
//         } else {
//           remainingCoins -= bonusCoins;
//           bonusCoins = 0;
//         }
//       }

//       // Deduct the remaining cost from total coins
//       if (remainingCoins > 0) {
//         totalCoins -= remainingCoins;
//       }

//       // Add the next paid episode to user's purchases if not already added
//       if (!userPurchases.episodes.includes(nextPaidEpisode._id)) {
//         userPurchases.episodes.push(nextPaidEpisode._id);
//       }

//       userCoin.totalCoins = totalCoins;
//       userCoin.refillCoins = refillCoins;
//       userCoin.bonusCoins = bonusCoins;

//       await userCoin.save();
//       await userPurchases.save();

//       return status200(res, "Episode Purchased");
//     } else if (type === "Chapter") {
//       //Fetch the current chapter
//       const currentChapter = await Chapter.findById(chapterId);
//       if (!currentChapter) {
//         return error404(res, "Chapter not found");
//       }

//       const nextPaidChapter = await Chapter.findOne({
//         novel: currentChapter.novel,
//         createdAt: { $gt: currentChapter.createdAt },
//         content: "Paid",
//         _id: { $nin: userPurchases.chapters },
//       }).sort({ createdAt: 1 });

//       if (!nextPaidChapter) {
//         return error404(res, "No subsequent paid episode found");
//       }

//       let totalCoins = userCoin.totalCoins;
//       let refillCoins = userCoin.refillCoins;
//       let bonusCoins = userCoin.bonusCoins;

//       if (totalCoins < nextPaidChapter.coins) {
//         return error404(res, "Insufficient coins to purchase the chapter");
//       }

//       //Deduct refill coins first
//       let remainingCoins = nextPaidChapter.coins;
//       if (refillCoins >= remainingCoins) {
//         refillCoins -= remainingCoins;
//         remainingCoins = 0;
//       } else {
//         remainingCoins -= refillCoins;
//         refillCoins = 0;
//       }

//       if (remainingCoins > 0) {
//         if (bonusCoins >= remainingCoins) {
//           bonusCoins -= remainingCoins;
//           remainingCoins = 0;
//         } else {
//           remainingCoins -= bonusCoins;
//           bonusCoins = 0;
//         }
//       }

//       // Deduct the remaining cost from total coins
//       if (remainingCoins > 0) {
//         totalCoins -= remainingCoins;
//       }

//       // Add the next paid episode to user's purchases if not already added
//       if (!userPurchases.episodes.includes(nextPaidEpisode._id)) {
//         userPurchases.episodes.push(nextPaidEpisode._id);
//       }
//       userCoin.totalCoins = totalCoins;
//       userCoin.refillCoins = refillCoins;
//       userCoin.bonusCoins = bonusCoins;

//       await userCoin.save();
//       await userPurchases.save();

//       return status200(res, "Chapter Purchased");
//     }
//   } catch (err) {
//     console.log("The err", err);
//     error500(res, err);
//   }
// };

module.exports = {
  getAllUsers,
  changeUserStatus,
  getUserCoinsDetail,
  // addToUserPurchase,
};
