const moment = require("moment");

const timeDiffChecker = (userClaimedDate) => {
  const now = moment();
  const lastClaimedDate = moment(userClaimedDate);
  // Check if the current date is different from the last claimed date
  const isNextDay = now.isAfter(lastClaimedDate, 'day');

  return isNextDay;
};

module.exports = timeDiffChecker;