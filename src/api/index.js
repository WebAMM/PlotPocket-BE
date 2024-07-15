const router = require("express").Router();
const authRouter = require("./auth/auth.routes");
const userRouter = require("./user.routes");
const dashboardRouter = require("./dashboard.routes");
const seriesRouter = require("./series.routes");
const novelRouter = require("./novel.routes");
const episodeRouter = require("./episode.routes");
const chapterRouter = require("./chapter.routes");
const categoryRouter = require("./category.routes");
const subscriptionRouter = require("./subscription.routes");
const authorRouter = require("./author.routes");
const rewardRouter = require("./reward.routes");
const myListRouter = require("./myList.routes");
const historyRouter = require("./history.routes");
const mightLikeRouter = require("./mightLike.routes");

//Routes
router.use("/auth", authRouter);
router.use("/user", userRouter);
router.use("/dashboard", dashboardRouter);
router.use("/category", categoryRouter);
router.use("/series", seriesRouter);
router.use("/novel", novelRouter);
router.use("/episode", episodeRouter);
router.use("/chapter", chapterRouter);
router.use("/author", authorRouter);
router.use("/subscription", subscriptionRouter);
router.use("/reward", rewardRouter);
router.use("/my-list", myListRouter);
router.use("/history", historyRouter);
router.use("/might-like", mightLikeRouter);

module.exports = router;
