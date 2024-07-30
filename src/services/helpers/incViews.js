const mongoose = require("mongoose");
const Category = require("../../models/Category.model");

const updateViews = async (model, id, userId) => {
  const document = await model.findById(id);
  if (!document) return null;

  const alreadyViewed = document.views.find(
    (viewRec) => viewRec.user == userId
  );
  if (alreadyViewed) {
    await model.updateOne(
      { _id: id },
      { "views.$[elem].date": new Date() },
      {
        arrayFilters: [{ "elem.user": new mongoose.Types.ObjectId(userId) }],
        runValidators: true,
      }
    );
  } else {
    await model.updateOne(
      { _id: id },
      {
        $push: {
          views: {
            user: new mongoose.Types.ObjectId(userId),
            view: 1,
            date: new Date(),
          },
        },
        $inc: { totalViews: 1 },
      },
      { runValidators: true }
    );
  }

  return document;
};

const updateCategoryViews = async (categoryId, userId) => {
  const category = await Category.findOne({
    _id: categoryId,
    status: "Active",
  });
  if (category) {
    const alreadyViewedCategory = category.views.find(
      (viewRec) => viewRec.user == userId
    );

    if (alreadyViewedCategory) {
      await Category.updateOne(
        { _id: categoryId },
        { "views.$[elem].date": new Date() },
        {
          arrayFilters: [{ "elem.user": new mongoose.Types.ObjectId(userId) }],
          runValidators: true,
        }
      );
    } else {
      await Category.updateOne(
        { _id: categoryId },
        {
          $push: {
            views: {
              user: new mongoose.Types.ObjectId(userId),
              view: 1,
              date: new Date(),
            },
          },
          $inc: { totalViews: 1 },
        },
        { runValidators: true }
      );
    }
  } else return;
};

module.exports = { updateViews, updateCategoryViews };
