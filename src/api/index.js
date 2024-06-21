const router = require("express").Router();
const authRouter = require("./auth/userAuth.routes");
const novelRouter = require("./novel.routes");
const categoryRouter = require("./category.routes");
const userRouter = require("./user.routes");

router.use("/auth", authRouter);

router.use("/novel", novelRouter);

router.use("/category", categoryRouter);

router.use("/user", userRouter);

module.exports = router;
