const router = require("express").Router();
//controllers
const dashboardController = require("../controllers/dashboard.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");

//Admin dashboard Insights
router.get("/admin/insights", verifyToken, dashboardController.adminDashboardInsights);

//Admin dashboard Metrics
router.get("/admin/metrics", verifyToken, dashboardController.adminDashboardMetrics);

//1st APP page in dashboard [APP]
router.get("/app/main", verifyToken, dashboardController.appDashboard);

//Series in dashboard [APP]
router.get("/app-series", verifyToken, dashboardController.dashboardSeries);

//Novels in dashboard [APP]
router.get("/app-novels", verifyToken, dashboardController.dashboardNovels);

//Best Series in dashboard [APP]
router.get("/app-best-series", verifyToken, dashboardController.bestSeries);

// //Top ranked novel + series
// router.get(
//   "/app/single/:id",
//   verifyToken,
//   dashboardController.singleDetailPage
// );

// //Detailed novel + series
// router.get(
//   "/app/single/:id",
//   verifyToken,
//   dashboardController.singleDetailPage
// );

//Featured Series [APP]
// router.get("/all-featured", verifyToken, dashboardController.allFeaturedSeries);

//New releases in dashboard [APP]
// router.get("/new-releases", verifyToken, dashboardController.newReleases);

module.exports = router;
