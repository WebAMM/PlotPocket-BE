const router = require("express").Router();
//controllers
const categoryController = require("../controllers/category.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");
const payloadValidator = require("../middlewares/payloadValidator");

//[ADMIN] Add category
router.post(
  "/admin/add",
  verifyToken,
  payloadValidator.validateAddCategory,
  categoryController.addCategory
);

//[ADMIN] Get all categories
router.get("/admin/all", verifyToken, categoryController.getAllCategories);

//[ADMIN] Get category by type
router.get(
  "/admin/by-type",
  verifyToken,
  categoryController.getCategoriesByType
);

//[ADMIN] Delete category - Replace category
router.delete("/admin/:id", verifyToken, categoryController.deleteCategory);

//[ADMIN] Edit category
router.put(
  "/admin/:id",
  verifyToken,
  payloadValidator.validateEditCategory,
  categoryController.editCategory
);

//[ADMIN] Change category status
router.patch(
  "/admin/change-status/:id",
  verifyToken,
  categoryController.changeCategoryStatus
);

//[APP] Get all categories
router.get("/all", verifyToken, categoryController.getAllCategories);

//[APP] Get category by type
router.get("/by-type", verifyToken, categoryController.getCategoriesByType);

module.exports = router;
