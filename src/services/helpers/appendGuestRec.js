const mongoose = require("mongoose");

const appendGuestUserRec = async (model, guestUserId, newUserId) => {
  try {
    await model.updateMany(
      {
        "views.user": guestUserId,
      },
      {
        $set: { "views.$[elem].user": newUserId },
      },
      {
        arrayFilters: [
          { "elem.user": new mongoose.Types.ObjectId(guestUserId) },
        ],
      }
    );
  } catch (err) {
    console.error(`Error appending guest`, err);
    throw err;
  }
};

module.exports = appendGuestUserRec;
