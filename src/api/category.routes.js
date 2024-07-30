const router = require("express").Router();
//controllers
const categoryController = require("../controllers/category.controller");
//middlewares
const payloadValidator = require("../middlewares/payloadValidator");
const { verifyToken, verifyRole } = require("../middlewares/auth.middleware");

//[ADMIN] Add category
router.post(
  "/admin/add",
  verifyToken,
  verifyRole(["Admin"]),
  payloadValidator.validateAddCategory,
  categoryController.addCategory
);

//[APP] Get all categories
router.get(
  "/app/all",
  verifyToken,
  verifyRole(["User", "Guest"]),
  categoryController.getAllCategories
);

//[APP] Get categories by type
router.get(
  "/app/by-type",
  verifyToken,
  verifyRole(["User", "Guest"]),
  categoryController.getCategoriesByType
);

//[ADMIN] Get all categories
router.get(
  "/admin/all",
  verifyToken,
  verifyRole(["Admin"]),
  categoryController.getAllCategories
);

//[ADMIN] Get category by type
router.get(
  "/admin/by-type",
  verifyToken,
  verifyRole(["Admin"]),
  categoryController.getCategoriesByType
);

//[ADMIN] Delete category - Replace category
router.delete(
  "/admin/:id",
  verifyToken,
  verifyRole(["Admin"]),
  categoryController.deleteCategory
);

//[ADMIN] Edit category
router.put(
  "/admin/:id",
  verifyToken,
  verifyRole(["Admin"]),
  payloadValidator.validateEditCategory,
  categoryController.editCategory
);

//[ADMIN] Change category status
router.patch(
  "/admin/change-status/:id",
  verifyToken,
  verifyRole(["Admin"]),
  categoryController.changeCategoryStatus
);

//[APP] Get all categories
// router.get("/all", verifyToken, categoryController.getAllCategories);

// //[APP] Get category by type
// router.get("/by-type", verifyToken, categoryController.getCategoriesByType);

module.exports = router;
