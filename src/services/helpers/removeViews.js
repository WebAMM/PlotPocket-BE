const mongoose = require("mongoose");

const removeViews = async (model, userId) => {
  try {
    await model.updateMany(
      {
        "views.user": userId,
      },
      {
        $pull: {
          views: {
            user: userId,
          },
        },
        $inc: {
          totalViews: -1,
        },
      }
    );
  } catch (err) { 
    console.error(`Error updating views for user in model ${model}:`, err);
    throw err;
  }
};

module.exports = removeViews;
