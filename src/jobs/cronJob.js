//Model
const UserAdd = require("../models/UserAdd.model");
//imports
const cron = require("node-cron");
const moment = require("moment");

cron.schedule("0 0 * * *", async () => {
  try {
    const now = moment().startOf("day");
    const result = await UserAdd.deleteMany({
      createdAt: { $lt: now.toDate() },
    });
    console.log("The result", result);
  } catch (err) {
    console.log("The error", err);
  }
});
