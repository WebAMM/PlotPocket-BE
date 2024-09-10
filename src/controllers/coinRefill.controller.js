//Models
const CoinRefill = require("../models/CoinRefill.model");
const Episode = require("../models/Episode.model");
const UserCoin = require("../models/UserCoin.model");
//Responses and errors
const {
  error500,
  error409,
  error400,
  error404,
} = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");
//helpers
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const discountCalculator = require("../services/helpers/discountCalculator");

//Add Coin Refill
const addCoinRefill = async (req, res) => {
  const { price, discount } = req.body;
  try {
    let discountedPrice;
    if (discount && discount !== "0") {
      const result = discountCalculator(price, discount);
      if (typeof result === "string") {
        return error400(res, result);
      }
      discountedPrice = result;
    } else {
      discountedPrice = parseFloat(price);
    }
    if (discountedPrice < 0.5) {
      const errorMessage =
        discount && discount !== "0"
          ? "Discounted Price must be at least $0.50 USD"
          : "Price must be at least $0.50 USD";
      return error400(res, errorMessage);
    }
    await CoinRefill.create({ ...req.body, discountedPrice });
    return status200(res, "Refill coins added successfully");
  } catch (err) {
    error500(res, err);
  }
};

// Get All Coin Refill for Admin
const getAllAdminCoinRefill = async (req, res) => {
  try {
    const coinRefills = await CoinRefill.find().sort({ createdAt: -1 }).lean();
    return success(res, "200", "Success", coinRefills);
  } catch (err) {
    error500(res, err);
  }
};

// Get All Coin Refill for App
const getAllAppCoinRefill = async (req, res) => {
  try {
    const coinRefills = await CoinRefill.find()
      .select("price coins discount bonus description")
      .sort({ createdAt: -1 })
      .lean();
    return success(res, "200", "Success", coinRefills);
  } catch (err) {
    error500(res, err);
  }
};

//Edit Coin Refill
const editCoinRefill = async (req, res) => {
  const { id } = req.params;
  const { price, discount } = req.body;
  try {
    let discountedPrice;
    if (discount && discount !== "0") {
      const result = discountCalculator(price, discount);
      if (typeof result === "string") {
        return error400(res, result);
      }
      discountedPrice = result;
    } else {
      discountedPrice = parseFloat(price);
    }
    if (discountedPrice < 0.5) {
      const errorMessage =
        discount && discount !== "0"
          ? "Discounted Price must be at least $0.50 USD"
          : "Price must be at least $0.50 USD";
      return error400(res, errorMessage);
    }
    const coinRefill = await CoinRefill.findByIdAndUpdate(
      id,
      { $set: { ...req.body, discountedPrice } },
      { new: true }
    );
    if (!coinRefill) {
      return error409(res, "Coin refill record not found");
    }
    return success(res, "200", "Success", coinRefill);
  } catch (err) {
    error500(res, err);
  }
};

// Delete Coin Refill
const deleteCoinRefill = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await CoinRefill.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return error409(res, "Coin refill record not found");
    }
    return status200(res, "Coin refill deleted successfully");
  } catch (err) {
    error500(res, err);
  }
};

//Refill the coins using stripe payment intent API
const refillCoins = async (req, res) => {
  const { id } = req.params;
  // const { token } = req.body;
  try {
    const coinRefill = await CoinRefill.findById(id).lean();
    if (!coinRefill) {
      return error409(res, "Coin refill record not found");
    }
    let discountedPrice = coinRefill.discountedPrice;
    if (discountedPrice < 0.5) {
      return error400(res, "Price must be at least $0.50 USD");
    }
    let priceInCents = Math.round(discountedPrice * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: priceInCents,
      currency: "usd",
      description: coinRefill.description,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: req.user._id.toString(),
        coinRefillId: coinRefill._id.toString(),
      },
    });
    return success(res, "200", "Success", paymentIntent.client_secret);
  } catch (err) {
    return error500(res, err);
  }
};

//Get episode/chapter price and all refills
const buyCoinRefills = async (req, res) => {
  const { id } = req.params;
  const { type } = req.query;
  try {
    if (type !== "Episode" && type !== "Chapter") {
      return error400(res, "Type must be Episode or Chapter");
    }

    let price = 0;

    if (type === "Episode") {
      const episodeExist = await Episode.findOne({ _id: id, content: "Paid" });
      if (!episodeExist) {
        return error404(res, "Episode not found");
      }
      price = episodeExist.coins;
    } else if (type === "Chapter") {
      const existChapter = await Chapter.findOne({ _id: id, content: "Paid" });
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

    const coinsInfo = {
      price: price,
      coinBalance: coinDetails,
    };

    const coinRefills = await CoinRefill.find()
      .select("price coins discount bonus description")
      .sort({ createdAt: -1 });

    const data = {
      coinsInfo,
      coinRefills,
    };

    return success(res, "200", "Success", data);
  } catch (err) {
    return error500(res, err);
  }
};

// Get Subscription based on plan
// const getSubscriptionByPlan = async (req, res) => {
//   const { plan } = req.query;
//   if (!plan) {
//     return customError(res, 400, "Plan is required");
//   }
//   try {
//     const subscriptionByPlan = await Subscription.find({ plan });
//     success(res, "200", "Success", subscriptionByPlan);
//   } catch (err) {
//     error500(res, err);
//   }
// };

module.exports = {
  addCoinRefill,
  getAllAdminCoinRefill,
  getAllAppCoinRefill,
  editCoinRefill,
  deleteCoinRefill,
  refillCoins,
  buyCoinRefills,
  // getSubscriptionByPlan,
};
