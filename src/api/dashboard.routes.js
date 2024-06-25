const router = require("express").Router();
//controllers
const { adminDashboard } = require("../controllers/dashboard.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");

//Admin dashboard
router.get("/admin", verifyToken, adminDashboard);

module.exports = router;
