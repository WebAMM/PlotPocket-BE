const router = require("express").Router();
//controllers
const dashboardController = require("../controllers/dashboard.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");

//Admin dashboard
router.get("/admin", verifyToken, dashboardController.adminDashboard);

//1st APP page in dashboard [APP]
router.get("/app/main", verifyToken, dashboardController.appDashboard);

//Series in dashboard [APP]
router.get("/app-series", verifyToken, dashboardController.dashboardSeries);

//Novels in dashboard [APP]
router.get("/app-novels", verifyToken, dashboardController.dashboardNovels);

//Best Series in dashboard [APP]
router.get("/app-best-series", verifyToken, dashboardController.bestSeries);

//Featured Series [APP]
// router.get("/all-featured", verifyToken, dashboardController.allFeaturedSeries);

//New releases in dashboard [APP]
// router.get("/new-releases", verifyToken, dashboardController.newReleases);

module.exports = router;
