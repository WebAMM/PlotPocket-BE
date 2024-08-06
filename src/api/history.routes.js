const router = require("express").Router();
//controllers
const historyController = require("../controllers/history.controller");
//middlewares
const { verifyToken, verifyRole } = require("../middlewares/auth.middleware");

//[APP] Add to history of logged in user
// router.post(
//   "/app/add",
//   verifyToken,
//   verifyRole(["User", "Guest"]),
//   payloadValidator.validateAddToHistory,
//   historyController.addToHistory
// );

//[APP] All history of logged in user
router.get(
  "/app/all",
  verifyToken,
  verifyRole(["User", "Guest"]),
  historyController.allHistory
);

module.exports = router;
