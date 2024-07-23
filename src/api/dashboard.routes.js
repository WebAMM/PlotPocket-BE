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

//[ADMIN] Admin dashboard Metrics
router.get(
  "/admin/metrics",
  verifyToken,
  verifyRole(["Admin"]),
  dashboardController.adminDashboardMetrics
);

//[APP] 1st APP page in dashboard
router.get("/app/main", verifyToken, dashboardController.appDashboard);

//[APP] Series in dashboard
router.get("/app-series", verifyToken, dashboardController.dashboardSeries);

//[APP] Novels in dashboard
router.get("/app-novels", verifyToken, dashboardController.dashboardNovels);

module.exports = router;
