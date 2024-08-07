//Models
const Category = require("../models/Category.model");
const Novel = require("../models/Novel.model");
const Series = require("../models/Series.model");
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
        return error409(res, `Category ${title} already exist`);
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
    const categories = await Category.find({ status: "Active" }).select(
      "_id title type status createdAt totalViews"
    );
    return success(res, "200", "Success", categories);
  } catch (err) {
    return error500(res, err);
  }
};

// Get Category based on type
const getCategoriesByType = async (req, res) => {
  const { type, id } = req.query;

  if (!type) {
    return customError(res, 400, "Type is required");
  }

  let query = {
    type,
    status: "Active",
  };
  //For Admin Panel check that id matches for what replacing
  if (id) {
    const categoryExist = await Category.findById(id, type);
    if (!categoryExist) {
      return error409(res, `Category don't exist`);
    }
    query._id = { $ne: id };
  }
  try {
    const categories = await Category.find(query).select(
      "_id title type status createdAt totalViews"
    );
    return success(res, "200", "Success", categories);
  } catch (err) {
    return error500(res, err);
  }
};

// Delete Category
const deleteCategory = async (req, res) => {
  const { id } = req.params;
  const { replaceCategoryId } = req.body;
  try {
    const category = await Category.findById(id);
    const replaceCategory = await Category.findById(replaceCategoryId);

    if (!category) {
      return error404(res, "Category not found");
    }
    if (!replaceCategory) {
      return error404(res, "Replace category not found");
    }
    if (replaceCategory.type === "Novels") {
      await Novel.updateMany({
        category: replaceCategoryId,
      });
    } else if (replaceCategory.type === "Series") {
      await Series.updateMany({
        category: replaceCategoryId,
      });
    }

    await Category.deleteOne({ _id: id });
    return status200(res, "Category replaced successfully");
  } catch (err) {
    return error500(res, err);
  }
};

// Edit Category
const editCategory = async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;
  try {
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      {
        title: title,
      },
      {
        new: true,
      }
    );
    if (!updatedCategory) {
      return error404(res, "Category not found");
    }
    return success(
      res,
      "200",
      "Category title updated successfully",
      updatedCategory
    );
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
  deleteCategory,
  editCategory,
  changeCategoryStatus,
};
