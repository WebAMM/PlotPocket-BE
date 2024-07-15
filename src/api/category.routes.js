const router = require("express").Router();
//controllers
const categoryController = require("../controllers/category.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");
const payloadValidator = require("../middlewares/payloadValidator");

//Add category
router.post(
  "/admin/add",
  verifyToken,
  payloadValidator.validateAddCategory,
  categoryController.addCategory
);

//Get all categories
router.get("/admin/all", verifyToken, categoryController.getAllCategories);

//Get category by type
router.get(
  "/admin/by-type",
  verifyToken,
  categoryController.getCategoriesByType
);

//Edit category
router.put("/admin/edit/:id", verifyToken, categoryController.editCategory);

//Delete category
router.delete(
  "/admin/delete/:id",
  verifyToken,
  categoryController.deleteCategory
);

//Change category status
router.patch(
  "/admin/change-status/:id",
  verifyToken,
  categoryController.changeCategoryStatus
);

//Get all categories [APP]
router.get("/all", verifyToken, categoryController.getAllCategories);

//Get category by type  [APP]
router.get("/by-type", verifyToken, categoryController.getCategoriesByType);

module.exports = router;
