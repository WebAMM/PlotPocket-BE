//Models
const Category = require("../models/Category.model");
//Responses and errors
const {
  error500,
  error409,
  error404,
  customError,
} = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");

//Add Category
const addCategory = async (req, res) => {
  const { titles, type } = req.body;
  try {
    const categoriesToSave = [];
    for (const title of titles) {
      const existCategory = await Category.findOne({ title, type });
      if (existCategory) {
        return error409(res, `Category ${title} Already Exists`);
      }
      categoriesToSave.push({ title, type });
    }
    await Category.insertMany(categoriesToSave);
    return status200(res, "Category created successfully");
  } catch (err) {
    return error500(res, err);
  }
};

// Get All Categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().select(
      "_id title type status createdAt view"
    );
    return success(res, "200", "Success", categories);
  } catch (err) {
    return error500(res, err);
  }
};

// Get Category based on type
const getCategoriesByType = async (req, res) => {
  const { type } = req.query;
  if (!type) {
    return customError(res, 400, "Type is required");
  }
  try {
    const categories = await Category.find({ type });
    return success(res, "200", "Success", categories);
  } catch (err) {
    return error500(res, err);
  }
};

// Edit Category
const editCategory = async (req, res) => {
  const { id } = req.params;
  const { title, type, status } = req.body;
  try {
    const category = await Category.findById(id);
    if (!category) {
      return error404(res, "Category not found");
    }
    if (title) category.title = title;
    if (type) category.type = type;
    if (status) category.status = status;
    await category.save();
    return success(res, "200", "Category updated successfully", category);
  } catch (err) {
    return error500(res, err);
  }
};

// Delete Category
const deleteCategory = async (req, res) => {
  const { id } = req.params;
  try {
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return error404(res, "Category not found");
    }
    return status200(res, "Category deleted successfully");
  } catch (err) {
    return error500(res, err);
  }
};

// Change Category Status
const changeCategoryStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status || !["Active", "Inactive"].includes(status)) {
    return customError(res, 400, "Invalid status");
  }
  try {
    const category = await Category.findById(id);
    if (!category) {
      return error404(res, "Category not found");
    }
    category.status = status;
    await category.save();
    return success(
      res,
      "200",
      "Category status updated successfully",
      category
    );
  } catch (err) {
    return error500(res, err);
  }
};

module.exports = {
  addCategory,
  getAllCategories,
  getCategoriesByType,
  editCategory,
  deleteCategory,
  changeCategoryStatus,
};
