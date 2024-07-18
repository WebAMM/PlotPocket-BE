const moment = require("moment");

const timeDiffChecker = (userClaimedDate) => {
  const now = moment();
  const lastClaimedDate = moment(userClaimedDate);
  const timeDiff = now.diff(lastClaimedDate, "hours");
  return timeDiff;
};

module.exports = timeDiffChecker;
