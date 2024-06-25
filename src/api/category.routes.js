const router = require("express").Router();
//controllers
const {
  addCategory,
  getAllCategories,
  getCategoriesByType,
  editCategory,
  deleteCategory,
  changeCategoryStatus,
} = require("../controllers/category.controller");
//middlewares
const { verifyToken } = require("../middlewares/auth.middleware");
const payloadValidator = require("../middlewares/payloadValidator");

//Add category
router.post(
  "/admin/add",
  verifyToken,
  payloadValidator.validateAddCategory,
  addCategory
);

//Get all categories
router.get("/admin/all", verifyToken, getAllCategories);

//Get category by type
router.get("/admin/by-type", verifyToken, getCategoriesByType);

//Edit category
router.put("/admin/edit/:id", verifyToken, editCategory);

//Delete category
router.delete("/admin/delete/:id", verifyToken, deleteCategory);

//Change category status
router.patch("/admin/change-status/:id", verifyToken, changeCategoryStatus);

module.exports = router;
