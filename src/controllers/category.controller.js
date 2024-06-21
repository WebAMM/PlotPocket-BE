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
//helpers and functions
const cloudinary = require("../services/helpers/cloudinary").v2;

//Add Category
const addCategory = async (req, res) => {
  const { titles, type } = req.body;
  if (!titles || !type || !Array.isArray(titles)) {
    return customError(res, 400, "Invalid format");
  }
  try {
    const categoriesToSave = [];
    for (const title of titles) {
      const existCategory = await Category.findOne({ title });
      if (existCategory) {
        return error409(res, `Category "${title}" Already Exists`);
      }
      categoriesToSave.push({ title, type });
    }
    await Category.insertMany(categoriesToSave);
    status200(res, "Category created successfully");
  } catch (err) {
    error500(res, err);
  }
};

// Get All Categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    success(res, "200", "Success", categories);
  } catch (err) {
    error500(res, err);
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
    success(res, "200", "Success", categories);
  } catch (err) {
    error500(res, err);
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
    success(res, "200", "Category updated successfully", category);
  } catch (err) {
    error500(res, err);
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
    success(res, "200", "Category deleted successfully", null);
  } catch (err) {
    error500(res, err);
  }
};

// Change Category Status
const changeCategoryStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status || !["active", "inactive"].includes(status)) {
    return customError(res, 400, "Invalid status");
  }
  try {
    const category = await Category.findById(id);
    if (!category) {
      return error404(res, "Category not found");
    }
    category.status = status;
    await category.save();
    success(res, "200", "Category status updated successfully", category);
  } catch (err) {
    error500(res, err);
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
