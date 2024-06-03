const router = require("express").Router();
const authRouter = require("./auth/userAuth.routes");

router.use("/auth", authRouter);

module.exports = router;
