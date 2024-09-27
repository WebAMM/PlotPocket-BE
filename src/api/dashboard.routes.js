const router = require("express").Router();
//controllers
const dashboardController = require("../controllers/dashboard.controller");
//middlewares
const { verifyToken, verifyRole } = require("../middlewares/auth.middleware");

//[ADMIN] Admin dashboard Insights
router.get(
  "/admin/insights",
  verifyToken,
  verifyRole(["Admin"]),
  dashboardController.adminDashboardInsights
);

//[ADMIN] Admin dashboard User - Metrics
router.get(
  "/admin/user-metrics",
  verifyToken,
  verifyRole(["Admin"]),
  dashboardController.adminDashboardUserMetrics
);

//[ADMIN] Admin dashboard Earning Metrics
router.get(
  "/admin/earning-metrics",
  verifyToken,
  verifyRole(["Admin"]),
  dashboardController.adminDashboardBalanceMetric
);

//[APP] 1st APP page in dashboard
router.get(
  "/app/all",
  verifyToken,
  verifyRole(["User", "Guest"]),
  dashboardController.appDashboard
);

//[APP] Series in dashboard
router.get(
  "/app-series",
  verifyToken,
  verifyRole(["User", "Guest"]),
  dashboardController.dashboardSeries
);

//[APP] Novels in dashboard
router.get(
  "/app-novels",
  verifyToken,
  verifyRole(["User", "Guest"]),
  dashboardController.dashboardNovels
);

//[APP] Top ranked
router.get(
  "/app/top-ranked",
  verifyToken,
  verifyRole(["User", "Guest"]),
  dashboardController.dashboardTopRanked
);

module.exports = router;
