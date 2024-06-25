const router = require("express").Router();
const authRouter = require("./auth/userAuth.routes");
const novelRouter = require("./novel.routes");
const categoryRouter = require("./category.routes");
const userRouter = require("./user.routes");
const dashboardRouter = require("./dashboard.routes");
const subscriptionRouter = require("./subscription.routes");
const seriesRouter = require("./series.routes");

router.use("/auth", authRouter);

router.use("/novel", novelRouter);

router.use("/category", categoryRouter);

router.use("/user", userRouter);

router.use("/dashboard", dashboardRouter);

router.use("/subscription", subscriptionRouter);

router.use("/series", seriesRouter);

module.exports = router;
