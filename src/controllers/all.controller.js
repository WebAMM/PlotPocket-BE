//Models
const Novel = require("../models/Novel.model");
const Series = require("../models/Series.model");
const Episode = require("../models/Episode.model");
const Chapter = require("../models/Chapter.model");
const Category = require("../models/Category.model");
const History = require("../models/History.model");
const SearchHistory = require("../models/SearchHistory.model");
const UserSubscription = require("../models/UserSubscription.model");
const CoinRefill = require("../models/CoinRefill.model");
const UserCoin = require("../models/UserCoin.model");
const Subscription = require("../models/Subscription.model");
//Responses and errors
const {
  error500,
  error409,
  error404,
  customError,
  error400,
} = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");
//helpers and functions
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
// const {
//   updateViews,
//   updateCategoryViews,
// } = require("../services/helpers/incViews");

//Global Search Novels + Series
const globalSearch = async (req, res) => {
  const { title } = req.query;

  if (!title) {
    return error400(res, "Title is required");
  }

  try {
    const regex = new RegExp(`.*${title}.*`, "i");
    const novels = await Novel.find({
      status: "Published",
      visibility: "Public",
      title: {
        $regex: regex,
      },
    })
      .select(
        "thumbnail.publicUrl title type totalViews averageRating createdAt"
      )
      .sort({ createdAt: -1 })
      .populate({
        path: "chapters",
        select: "chapterPdf.publicUrl name chapterNo content totalViews coins",
        options: {
          sort: { createdAt: 1 },
          limit: 1,
        },
      })
      .lean();

    const series = await Series.find({
      status: "Published",
      visibility: "Public",
      title: {
        $regex: regex,
      },
    })
      .select(
        "thumbnail.publicUrl title type totalViews seriesRating createdAt"
      )
      .sort({ createdAt: -1 })
      .populate({
        path: "episodes",
        select: "episodeVideo.publicUrl title content totalViews coins",
        options: {
          sort: { createdAt: 1 },
          limit: 1,
        },
      })
      .lean();

    const data = [...series, ...novels]
      .map((item) => ({
        ...item,
        episodes:
          item.type === "Series"
            ? item.episodes && item.episodes.length > 0
              ? item.episodes[0]
              : {}
            : undefined,
        chapters:
          item.type === "Novel"
            ? item.chapters && item.chapters.length > 0
              ? item.chapters[0]
              : {}
            : undefined,
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return success(res, "200", "Success", data);
  } catch (err) {
    return error500(res, err);
  }
};

// Single novel/series detail with comments + might like.
const singleDetailPage = async (req, res) => {
  const { id } = req.params;
  const { type } = req.query;
  let content;
  let mightLike;

  try {
    if (type === "Novel") {
      content = await Novel.findById(id)
        .select(
          "thumbnail.publicUrl title type language description totalViews averageRating adult"
        )
        .populate([
          {
            path: "author",
            select: "authorPic.publicUrl name",
          },
          {
            path: "category",
            select: "title",
          },
          {
            path: "chapters",
            select:
              "chapterPdf.publicUrl chapterNo content totalViews createdAt coins name",
            options: {
              sort: { createdAt: 1 },
              limit: 5,
            },
          },
          {
            path: "reviews",
            select: "rating comment totalLikes createdAt",
            populate: {
              path: "user",
              select: "profileImage.publicUrl userName email",
            },
          },
        ])
        .lean();

      if (!content) {
        return error404(res, "Novel not found");
      }
      const totalChapters = await Chapter.find({
        novel: id,
      }).countDocuments();

      if (content?.reviews?.length) {
        content.reviews = content?.reviews?.map((review) => ({
          rating: review.rating,
          comment: review.comment,
          totalLikes: review.totalLikes,
          createdAt: review.createdAt,
          user: {
            profileImage: review?.user?.profileImage,
            userName: review?.user?.userName,
            email: review?.user?.email,
          },
        }));
      }
      content = {
        ...content,
        // chapters: content.chapters?.[0] || {},
        totalChapters,
      };
      //For the feature of You Might like, getting history etc
      const history = await History.find({ user: req.user._id })
        .populate("novel")
        .lean();
      const novelCategories = history
        .map((record) => record?.novel?.category)
        .filter(Boolean);
      const historyNovelIds = await History.distinct("novel", {
        user: req.user._id,
      });

      mightLike = await Novel.find({
        category: { $in: novelCategories },
        _id: { $nin: historyNovelIds },
      })
        .select("thumbnail.publicUrl title type totalViews")
        .sort({ createdAt: -1 })
        .limit(10)
        .populate({
          path: "chapters",
          select: "chapterPdf.publicUrl name content coins",
          options: {
            sort: { createdAt: 1 },
            limit: 1,
          },
        })
        .populate({
          path: "category",
          select: "title",
        })
        .populate({
          path: "author",
          select: "name",
        })
        .lean();

      mightLike = mightLike.map((item) => ({
        ...item,
        chapters: item.chapters?.[0] || {},
      }));

      // if (fromSearch) {
      //   const existSearchHistory = await SearchHistory.findOne({
      //     user: req.user._id,
      //     novel: content._id,
      //   }).lean();

      //   if (!existSearchHistory) {
      //     await SearchHistory.create({
      //       user: req.user._id,
      //       novel: content._id,
      //     });
      //   }
      // }
    } else if (type === "Series") {
      content = await Series.findById(id)
        .select(
          "thumbnail.publicUrl title description createdAt totalViews seriesRating"
        )
        .populate([
          {
            path: "category",
            select: "title",
          },
          {
            path: "episodes",
            select: "episodeVideo.publicUrl title content coins",
            options: {
              sort: {
                createdAt: 1,
              },
              limit: 5,
            },
          },
        ])
        .lean();

      if (!content) {
        return error404(res, "Series not found");
      }

      const totalEpisode = await Episode.find({
        series: id,
      }).countDocuments();

      content = {
        ...content,
        // episodes: content.episodes?.[0] || {},
        totalEpisode,
      };

      //For Might like feature getting history of user etc.
      const history = await History.find({ user: req.user._id })
        .populate("series")
        .lean();
      const seriesCategories = history
        .map((record) => record?.series?.category)
        .filter(Boolean);
      // Get history IDs
      const historySeriesIds = await History.distinct("series", {
        user: req.user._id,
      });

      mightLike = await Series.find({
        category: { $in: seriesCategories },
        _id: { $nin: historySeriesIds },
      })
        .select("thumbnail.publicUrl title type seriesRating")
        .sort({ createdAt: -1 })
        .limit(10)
        .populate({
          path: "episodes",
          select: "episodeVideo.publicUrl title content coins",
          options: {
            sort: { createdAt: 1 },
            limit: 1,
          },
        })
        .populate({
          path: "category",
          select: "title",
        })
        .lean();

      mightLike = mightLike.map((item) => ({
        ...item,
        episodes: item.episodes?.[0] || {},
      }));

      // if (fromSearch) {
      //   const existSearchHistory = await SearchHistory.findOne({
      //     user: req.user._id,
      //     series: content._id,
      //   }).lean();

      //   if (!existSearchHistory) {
      //     await SearchHistory.create({
      //       user: req.user._id,
      //       series: content._id,
      //     });
      //   }
      // }
    }
    const data = {
      detail: content,
      mightLike,
    };
    return success(res, "200", "Success", data);
  } catch (err) {
    return error500(res, err);
  }
};

const combinedSeriesNovels = async (req, res) => {
  const { type, category, pageSize = 10, page = 1, day } = req.query;
  let series = [];
  let novels = [];

  try {
    if (
      type != "Featured" &&
      type != "Latest" &&
      type != "TopRanked" &&
      type != "History"
    ) {
      return error400(
        res,
        "Invalid type, Type must be either Featured, Latest or TopRanked"
      );
    }

    if (type === "Featured") {
      // Query
      let query = {
        status: "Published",
        visibility: "Public",
        totalViews: { $gte: 10 },
      };
      // Filtering based on category
      if (
        category &&
        category !== "null" &&
        category !== "undefined" &&
        category !== "false"
      ) {
        const existCategory = await Category.findById(category);
        if (!existCategory) {
          return error404(res, "Category not found");
        }
        query.category = category;
      }
      series = await Series.find(query)
        .select(
          "thumbnail.publicUrl title type seriesRating totalViews createdAt"
        )
        .sort({ totalViews: -1 })
        .populate({
          path: "episodes",
          select: "episodeVideo.publicUrl title content coins",
          options: {
            sort: { createdAt: 1 },
            limit: 1,
          },
        })
        .populate({
          path: "category",
          select: "title",
        })
        .lean();
      novels = await Novel.find(query)
        .select(
          "thumbnail.publicUrl title type averageRating totalViews createdAt"
        )
        .sort({ totalViews: -1 })
        .populate({
          path: "chapters",
          select: "chapterPdf.publicUrl name content coins",
          options: {
            sort: { createdAt: 1 },
            limit: 1,
          },
        })
        .populate({
          path: "category",
          select: "title",
        })
        .populate({
          path: "author",
          select: "name",
        })
        .lean();
    } else if (type === "History") {
      //Query
      let query = {};
      //Filtering based on category
      if (
        category &&
        category !== "null" &&
        category !== "undefined" &&
        category !== "false"
      ) {
        const existCategory = await Category.findById(category);
        if (!existCategory) {
          return error404(res, "Category not found");
        }
        query.category = category;
      }
      series = await History.find({
        user: req.user._id,
        series: { $exists: true },
        episode: { $exists: true },
      })
        .select("_id createdAt")
        .sort({ createdAt: -1 })
        .populate([
          {
            path: "series",
            select:
              "thumbnail.publicUrl type totalViews seriesRatings title description",
            match: { ...query },
            populate: {
              path: "category",
              select: "title",
            },
          },
          {
            path: "episode",
            select:
              "episodeVideo.publicUrl title content description createdAt coins totalViews",
          },
        ])
        .lean();
      novels = await History.find({
        user: req.user._id,
        novel: { $exists: true },
        chapter: { $exists: true },
      })
        .select("_id createdAt")
        .sort({ createdAt: -1 })
        .populate([
          {
            path: "novel",
            select:
              "thumbnail.publicUrl type totalViews title adult averageRating",
            match: { ...query },
            populate: [
              {
                path: "author",
                select: "name",
              },
              {
                path: "category",
                select: "title",
              },
            ],
          },
          {
            path: "chapter",
            select:
              "chapterPdf.publicUrl name chapterNo content totalViews description createdAt coins ",
          },
        ])
        .lean();
    } else if (type === "Latest") {
      //Query
      let query = {
        status: "Published",
        visibility: "Public",
      };
      //Filtering based on category
      if (
        category &&
        category !== "null" &&
        category !== "undefined" &&
        category !== "false"
      ) {
        const existCategory = await Category.findById(category);
        if (!existCategory) {
          return error404(res, "Category not found");
        }
        query.category = category;
      }
      series = await Series.find(query)
        .select(
          "thumbnail.publicUrl title type totalViews seriesRating createdAt"
        )
        .sort({ createdAt: -1 })
        .populate({
          path: "episodes",
          select: "episodeVideo.publicUrl title content coins",
          options: {
            sort: {
              createdAt: 1,
            },
            limit: 1,
          },
        })
        .populate({
          path: "category",
          select: "title",
        })
        .lean();
      novels = await Novel.find(query)
        .select(
          "thumbnail.publicUrl title type totalViews averageRating createdAt"
        )
        .sort({ createdAt: -1 })
        .populate({
          path: "chapters",
          select: "chapterPdf.publicUrl name content coins",
          options: {
            sort: { createdAt: 1 },
            limit: 1,
          },
        })
        .populate({
          path: "category",
          select: "title",
        })
        .populate({
          path: "author",
          select: "name",
        })
        .lean();
    } else if (type === "TopRanked") {
      //Query
      let query = {
        status: "Published",
        visibility: "Public",
      };
      //Sorting Options
      let sortSeriesOptions = {
        seriesRating: -1,
        createdAt: -1,
      };
      let sortNovelOptions = {
        averageRating: -1,
        createdAt: -1,
      };
      //Filtering based on Category
      if (
        category &&
        category !== "null" &&
        category !== "undefined" &&
        category !== "false"
      ) {
        const existCategory = await Category.findById(category);
        if (!existCategory) {
          return error409(res, "Category don't exist");
        }
        query.category = category;
      }
      //Filtering based on Day
      if (day && day !== "null" && day !== "undefined" && day !== "false") {
        const parsedDay = parseInt(day);
        if (day === "Today") {
          const today = new Date();
          query.createdAt = {
            $gte: new Date(today.setHours(0, 0, 0, 0)),
            $lte: new Date(today.setHours(23, 59, 59, 999)),
          };
        } else if ([7, 14, 30].includes(parsedDay)) {
          const today = new Date();
          const startDate = new Date();
          startDate.setDate(today.getDate() - parsedDay + 1);
          query.createdAt = {
            $gte: new Date(startDate.setHours(0, 0, 0, 0)),
            $lte: new Date(today.setHours(23, 59, 59, 999)),
          };
        } else {
          return error400(
            res,
            "Invalid date parameter. Use 'Today', 7, 14, or 30"
          );
        }
      }
      //New
      // if (latest) {
      //   sortSeriesOptions.createdAt = -1;
      //   sortNovelOptions.createdAt = -1;
      // }
      series = await Series.find({
        ...query,
        seriesRating: { $gte: 1 },
      })
        .select(
          "thumbnail.publicUrl title type seriesRating totalViews createdAt"
        )
        .sort(sortSeriesOptions)
        .populate({
          path: "episodes",
          select: "episodeVideo.publicUrl title content coins",
          options: {
            sort: {
              createdAt: 1,
            },
            limit: 1,
          },
        })
        .populate({
          path: "category",
          select: "title",
        })
        .lean();
      novels = await Novel.find({
        ...query,
        averageRating: { $gte: 1 },
      })
        .select(
          "thumbnail.publicUrl type title totalViews averageRating createdAt"
        )
        .sort(sortNovelOptions)
        .populate({
          path: "chapters",
          select: "chapterPdf.publicUrl name content coins",
          options: {
            sort: { createdAt: 1 },
            limit: 1,
          },
        })
        .populate({
          path: "category",
          select: "title",
        })
        .populate({
          path: "author",
          select: "name",
        })
        .lean();
    }

    let combinedData;
    if (type === "History") {
      combinedData = [...series, ...novels]
        .map((item) => {
          if (item?.series && Object.keys(item?.series).length > 0) {
            return {
              _id: item.series._id.toString(),
              title: item.series.title,
              category: {
                _id: item.series.category._id.toString(),
                title: item.series.category.title,
              },
              type: item.series.type,
              seriesRating: item.series.seriesRating || 0,
              thumbnail: {
                publicUrl: item.series.thumbnail.publicUrl,
              },
              totalViews: item.series.totalViews || 0,
              episodes: {
                _id: item.episode._id.toString(),
                title: item.episode.title,
                coins: item.episode.coins,
                episodeVideo: {
                  publicUrl: item.episode.episodeVideo.publicUrl,
                },
                content: item.episode.content,
              },
              createdAt: item.createdAt,
            };
          } else if (item?.novel && Object.keys(item?.novel).length > 0) {
            return {
              _id: item.novel._id.toString(),
              title: item.novel.title,
              category: {
                _id: item.novel.category._id.toString(),
                title: item.novel.category.title,
              },
              author: {
                _id: item.novel.author._id.toString(),
                title: item.novel.author.name,
              },
              type: item.novel.type,
              averageRating: item.novel.averageRating || 0,
              thumbnail: {
                publicUrl: item.novel.thumbnail.publicUrl,
              },
              totalViews: item.novel.totalViews || 0,
              chapters: {
                _id: item.chapter._id.toString(),
                title: item.chapter.title,
                coins: item.chapter.coins,
                name: item.chapter.name,
                chapterPdf: {
                  publicUrl: item.chapter.chapterPdf.publicUrl,
                },
                content: item.chapter.content,
              },
              createdAt: item.createdAt,
            };
          } else {
            return null;
          }
        })
        .filter((item) => item !== null);
    } else {
      combinedData = [...series, ...novels].map((item) => ({
        ...item,
        episodes:
          item.type === "Series"
            ? item.episodes && item.episodes.length > 0
              ? item.episodes[0]
              : {}
            : undefined,
        chapters:
          item.type === "Novel"
            ? item.chapters && item.chapters.length > 0
              ? item.chapters[0]
              : {}
            : undefined,
      }));
    }

    combinedData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const startIndex = (page - 1) * pageSize;
    const endIndex = page * pageSize;
    const seriesNovels = combinedData.slice(startIndex, endIndex);
    const hasMore = combinedData.length > endIndex;

    const data = {
      data: seriesNovels,
      hasMore,
    };

    return success(res, "200", "Success", data);
  } catch (err) {
    return error500(res, err);
  }
};

const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    //Webhook signature, verifying that webhook is coming from authentic provided and not tempered.
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_ENDPOINT_SECRET
    );
  } catch (err) {
    console.log(`Webhook error: ${err.message}`);
    return error400(res, `Webhook error ${err.message}`);
  }

  try {
    //This event is fired when checkout session for subscription is successful, it involves both initial payment (checkout session or any subsequent recurring payment)
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;
      //On payment successful in checkout session, get subscription and customer details, these details are added when in checkout session we created customer and subscription when checkout session subscription mode
      let subscription;
      if (invoice.subscription) {
        subscription = await stripe.subscriptions.retrieve(
          invoice.subscription
        );
      }
      if (
        subscription.metadata.userId &&
        subscription.metadata.subscriptionId
      ) {
        // const customer = await stripe.customers.retrieve(invoice.customer);
        //Handle first subscription of user from Checkout session
        if (invoice.billing_reason === "subscription_create") {
          const alreadyUserSubscription = await UserSubscription.findOne({
            user: subscription.metadata.userId,
            subscription: subscription.metadata.subscriptionId,
          });
          if (alreadyUserSubscription) {
            return error409(res, "Subscription already exist for this user");
          }
          await UserSubscription.create({
            user: subscription.metadata.userId,
            subscription: subscription.metadata.subscriptionId,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer,
            isSubscribed: true,
            startAt: new Date(),
          });
        }
        // subscription_cycle: This indicates that a recurring payment for an existing subscription was successful. This event is fired each time a subscription invoice is paid, marking the start of a new billing cycle.
        // subscription_updated: This indicates that there was an update to the subscription, which could include changes to the subscription plan, quantity, or other parameters. This event is also fired when a new invoice is created due to these updates, but it's specifically about changes to the subscription itself.
        else if (
          invoice.billing_reason === "subscription_cycle" ||
          invoice.billing_reason === "subscription_updated"
        ) {
          //This condition when recurring is done successfully
          await UserSubscription.findOneAndUpdate(
            {
              user: subscription.metadata.userId,
              subscription: subscription.metadata.subscriptionId,
            },
            {
              isSubscribed: true,
              recurringSuccess: true,
              recurredAt: new Date(),
            }
          );
        }
      }
    }

    // For canceled/renewal subscription
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object;
      if (subscription.cancel_at_period_end) {
        //This condition when the subscription is cancelled
        await UserSubscription.findOneAndUpdate(
          {
            user: subscription.metadata.userId,
            subscription: subscription.metadata.subscriptionId,
          },
          {
            isSubscribed: false,
          }
        );
      } else {
        //This condition when the subscription is renewed
        await UserSubscription.findOneAndUpdate(
          {
            user: subscription.metadata.userId,
            subscription: subscription.metadata.subscriptionId,
          },
          {
            isSubscribed: true,
            startAt: new Date(),
          }
        );
      }
    }
    //If Payment fails, in first attempt or in recurring
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object;
      let subscription;
      if (invoice.subscription) {
        subscription = await stripe.subscriptions.retrieve(
          invoice.subscription
        );
      }
      if (
        subscription.metadata.userId &&
        subscription.metadata.subscriptionId
      ) {
        // Update the subscription status in your database
        await UserSubscription.findOneAndUpdate(
          {
            user: subscription.metadata.userId,
            subscription: subscription.metadata.subscriptionId,
          },
          {
            isSubscribed: false,
            recurringSuccess: false,
          }
        );
      }
    }
    //For charge API
    // if (event.type === "charge.succeeded") {
    //   const charge = event.data.object;
    //   const userId = charge.metadata.userId;
    //   const coinRefillId = charge.metadata.coinRefillId;

    //   const coinRefill = await CoinRefill.findById(coinRefillId);
    //   if (!coinRefill) {
    //     return error409(res, "No coin refill found");
    //   }
    //   await UserCoin.findOneAndUpdate(
    //     {
    //       user: userId,
    //     },
    //     {
    //       $inc: {
    //         refillCoins: coinRefill.coins,
    //         bonusCoins: coinRefill.bonus,
    //         totalCoins: coinRefill.coins + coinRefill.bonus,
    //       },
    //     },
    //     {
    //       upsert: true,
    //       runValidators: true,
    //     }
    //   );
    // }

    if (event.type === "payment_intent_succeeded") {
      const intent = event.data.object;
      const userId = intent.metadata.userId;
      const coinRefillId = intent.metadata.coinRefillId;
      const coinRefill = await CoinRefill.findById(coinRefillId);
      if (!coinRefill) {
        return error409(res, "No coin refill found");
      }
      await UserCoin.findOneAndUpdate(
        {
          user: userId,
        },
        {
          $inc: {
            refillCoins: coinRefill.coins,
            bonusCoins: coinRefill.bonus,
            totalCoins: coinRefill.coins + coinRefill.bonus,
          },
        },
        {
          upsert: true,
          runValidators: true,
        }
      );
    }
    return res.status(200).end();
  } catch (err) {
    return error500(res, err);
  }
};

const allStore = async (req, res) => {
  try {
    const coinRefills = await CoinRefill.find()
      .select("price coins discount bonus description")
      .sort({ createdAt: -1 })
      .lean();

    const subscriptions = await Subscription.find()
      .select("plan price description stripeProductId stripePriceId createdAt")
      .sort({ createdAt: -1 })
      .lean();

    let coinDetails = {
      bonusCoins: 0,
      refillCoins: 0,
      totalCoins: 0,
    };

    const userCoins = await UserCoin.findOne({
      user: req.user._id,
    }).select("bonusCoins refillCoins totalCoins -_id");

    if (userCoins) {
      coinDetails = {
        bonusCoins: userCoins.bonusCoins,
        refillCoins: userCoins.refillCoins,
        totalCoins: userCoins.totalCoins,
      };
    }

    const data = {
      userCoins: coinDetails,
      coinRefills,
      subscriptions,
    };

    return success(res, "200", "Success", data);
  } catch (err) {
    error500(res, err);
  }
};

//Increase the views
// const increaseView = async (req, res) => {
//   const { type, seriesId, episodeId, chapterId, novelId } = req.body;
//   if (type === "Series") {
//     const series = await updateViews(Series, seriesId, req.user._id);
//     if (!series) {
//       return error409(res, "Series not found");
//     }
//     const episode = await updateViews(Episode, episodeId, req.user._id);
//     if (!episode) {
//       return error409(res, "Episode not found");
//     }
//     await updateCategoryViews(series.category, req.user._id);
//     return status200(res, "Series and episodes views increased");
//   } else if (type === "Novel") {
//     const novel = await updateViews(Novel, novelId, req.user._id);
//     if (!novel) {
//       return error409(res, "Novel not found");
//     }
//     const chapter = await updateViews(Chapter, chapterId, req.user._id);
//     if (!chapter) {
//       return error409(res, "Chapter not found");
//     }
//     await updateCategoryViews(novel.category, req.user._id);
//     return status200(res, "Novel and chapters views increased");
//   }
// };

// All featured series and novel
// const featuredSeriesNovels = async (req, res) => {
//   const { category, pageSize = 10, page = 1 } = req.query;
//   const limit = Math.floor(pageSize / 2);
//   const skip = (page - 1) * limit;
//   // Query
//   let query = {
//     status: "Published",
//     visibility: "Public",
//     totalViews: { $gte: 10 },
//   };
//   try {
//     // Filtering based on category
//     if (category) {
//       const existCategory = await Category.findById(category);
//       if (!existCategory) {
//         return error404(res, "Category not found");
//       }
//       query.category = category;
//     }
//     // Fetch Series and Novels
//     const featuredSeries = await Series.find(query)
//       .select("thumbnail.publicUrl title type seriesRating")
//       .sort({ totalViews: -1 })
//       .skip(skip)
//       .limit(limit);
//       .populate({
//         path: "episodes",
//         select: "episodeVideo.publicUrl title content visibility description coins",
//         options: { sort: { createdAt: 1 }, limit: 1 },
//       })
//     const featuredNovels = await Novel.find(query)
//       .select("thumbnail.publicUrl title type averageRating")
//       .sort({ totalViews: -1 })
//       .skip(skip)
//       .limit(limit);
//       .populate({
//         path: "chapters",
//         select: "chapterPdf.publicUrl name chapterNo content totalViews coins",
//         options: { sort: { createdAt: 1 }, limit: 1 },
//       })
//     const seriesAndNovels = [...featuredSeries, ...featuredNovels].sort(
//       (a, b) => b.createdAt - a.createdAt
//     );
//     // Check if there are more results to fetch
//     const hasMore = page * pageSize < totalItems;
//     const data = {
//       seriesAndNovels,
//       hasMore,
//     };
//     return success(res, "200", "Success", data);
//   } catch (err) {
//     return error500(res, err);
//   }
// };
// const latestSeriesNovels = async (req, res) => {
//   const { category, page = 1, pageSize = 10 } = req.query;
//   const limit = Math.floor(pageSize / 2);
//   const skip = (page - 1) * limit;
//   //Query's
//   let query = {
//     status: "Published",
//     visibility: "Public",
//   };
//   //Filtering based on Category
//   if (category) {
//     const existCategory = await Category.findById(category);
//     if (!existCategory) {
//       return error404(res, "Category not found");
//     }
//     query.category = category;
//   }
//   try {
//     const latestSeries = await Series.find(query)
//       .select("thumbnail.publicUrl title type totalViews")
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit);
//       .populate({
//         path: "episodes",
//         select: "episodeVideo.publicUrl title content visibility description coins",
//         options: {
//           sort: {
//             createdAt: 1,
//           },
//           limit: 1,
//         },
//       })
//       .populate({
//         path: "category",
//         select: "title",
//       })
//     const latestNovels = await Novel.find(query)
//       .select("thumbnail.publicUrl title type totalViews")
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .populate({
//         path: "chapters",
//         select: "chapterPdf.publicUrl name chapterNo content totalViews coins",
//         options: { sort: { createdAt: 1 }, limit: 1 },
//       })
//       .populate({
//         path: "category",
//         select: "title",
//       })
//       .populate({
//         path: "author",
//         select: "name",
//       });
//     const seriesAndNovels = [...latestSeries, ...latestNovels].sort(
//       (a, b) => b.createdAt - a.createdAt
//     );
//     const hasMore = page * pageSize < totalItems;
//     const data = {
//       seriesAndNovels,
//       hasMore,
//     };
//     return success(res, "200", "Success", data);
//   } catch (err) {
//     return error500(res, err);
//   }
// };
// const topRankedSeriesNovel = async (req, res) => {
//   const { category, latest, day, page = 1, pageSize = 10 } = req.query;
//   const limit = Math.floor(pageSize / 2);
//   const skip = (page - 1) * limit;
//   let query = {
//     status: "Published",
//     visibility: "Public",
//   };
//   let sortSeriesOptions = {
//     seriesRating: -1,
//   };
//   let sortNovelOptions = {
//     averageRating: -1,
//   };
//   //Filtering based on Day
// if (day && day !== "null" && day !== "undefined" && day !== "false") {
//   const parsedDay = parseInt(day);
//   if (day === "Today") {
//     const today = new Date();
//     query.createdAt = {
//       $gte: new Date(today.setHours(0, 0, 0, 0)),
//       $lte: new Date(today.setHours(23, 59, 59, 999)),
//     };
//   } else if ([7, 14, 30].includes(parsedDay)) {
//     const today = new Date();
//     const startDate = new Date();
//     startDate.setDate(today.getDate() - parsedDay + 1);
//     query.createdAt = {
//       $gte: new Date(startDate.setHours(0, 0, 0, 0)),
//       $lte: new Date(today.setHours(23, 59, 59, 999)),
//     };
//   } else {
//     return error400(
//       res,
//       "Invalid date parameter. Use 'Today', 7, 14, or 30"
//     );
//   }
// }
//   //New Book and New Novel
//   if (latest) {
//     sortSeriesOptions.createdAt = -1;
//     sortNovelOptions.createdAt = -1;
//   }
//   try {
//     if (category) {
//       const existCategory = await Category.findById(category);
//       if (!existCategory) {
//         return error409(res, "Category don't exist");
//       }
//       query.category = category;
//     }
//     //Top ranked series
//     const topRankedSeries = await Series.find({
//       ...query,
//       seriesRating: { $gte: 1 },
//     })
//       .select("thumbnail.publicUrl title view type seriesRating")
//       .sort(sortSeriesOptions)
//       .skip(skip)
//       .limit(limit);
//       .populate({
//         path: "episodes",
//         select: "episodeVideo.publicUrl title content visibility description coins",
//         options: {
//           sort: {
//             createdAt: 1,
//           },
//           limit: 1,
//         },
//       })
//       .populate({
//         path: "category",
//         select: "title",
//       })
//     //Top ranked novels
//     const topRankedNovels = await Novel.find({
//       ...query,
//       averageRating: { $gte: 1 },
//     })
//       .select("thumbnail.publicUrl averageRating type title averageRating")
//       .sort(sortNovelOptions)
//       .skip(skip)
//       .limit(limit);
//       .populate({
//         path: "chapters",
//         select: "chapterPdf.publicUrl name chapterNo content totalViews coins",
//         options: { sort: { createdAt: 1 }, limit: 1 },
//       })
//       .populate({
//         path: "category",
//         select: "title",
//       })
//       .populate({
//         path: "author",
//         select: "name",
//       })
//     const seriesAndNovels = [...topRankedSeries, ...topRankedNovels].sort(
//       (a, b) => b.createdAt - a.createdAt
//     );
//     const hasMore = page * pageSize < totalItems;
//     const data = {
//       seriesAndNovels,
//       hasMore,
//     };
//     return success(res, "200", "Success", data);
//   } catch (err) {
//     return error500(res, err);
//   }
// };

module.exports = {
  globalSearch,
  singleDetailPage,
  combinedSeriesNovels,
  stripeWebhook,
  allStore,
  // increaseView,
  // featuredSeriesNovels,
  // latestSeriesNovels,
  // topRankedSeriesNovel,
};
