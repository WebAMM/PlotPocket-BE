//Get stripe interval names

const getStripeInterval = (plan) => {
  const planToIntervalMap = {
    Weekly: "week",
    Monthly: "month",
    Yearly: "year",
  };

  return planToIntervalMap[plan] || null;
};

module.exports = { getStripeInterval };
