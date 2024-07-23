const router = require("express").Router();
//controllers
const dashboardController = require("../controllers/dashboard.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");

//[ADMIN] Admin dashboard Insights
router.get("/admin/insights", verifyToken, dashboardController.adminDashboardInsights);

//[ADMIN] Admin dashboard Metrics
router.get("/admin/metrics", verifyToken, dashboardController.adminDashboardMetrics);

//[APP] 1st APP page in dashboard
router.get("/app/main", verifyToken, dashboardController.appDashboard);

//[APP] Series in dashboard
router.get("/app-series", verifyToken, dashboardController.dashboardSeries);

//[APP] Novels in dashboard 
router.get("/app-novels", verifyToken, dashboardController.dashboardNovels);

//[APP] Best Series in dashboard 
router.get("/app-best-series", verifyToken, dashboardController.bestSeries);

//[APP] Top ranked novel + series
// router.get(
//   "/app/single/:id",
//   verifyToken,
//   dashboardController.singleDetailPage
// );

//[APP] Detailed novel + series
// router.get(
//   "/app/single/:id",
//   verifyToken,
//   dashboardController.singleDetailPage
// );

//[APP] Featured Series [APP]
// router.get("/all-featured", verifyToken, dashboardController.allFeaturedSeries);

//[APP] New releases in dashboard [APP]
// router.get("/new-releases", verifyToken, dashboardController.newReleases);

module.exports = router;
