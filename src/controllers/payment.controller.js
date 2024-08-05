//Models
const Novel = require("../models/Novel.model");
const Chapter = require("../models/Chapter.model");
const Category = require("../models/Category.model");
const Author = require("../models/Author.model");
//Responses and errors
const {
  error500,
  error409,
  error404,
  customError,
  error400,
} = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");

//1st create the customer + create setup intent in ONE GO
//2nd then after confirmation of setup intent then do the subscription in ONE GO

//Create setup intent
const createCustomerAndSetupIntent = async (req, res) => {
  const { email } = req.body;
  try {
    //Search from customer lists in Stripe
    const existCustomer = await stripe.customers.list({
      email,
      limit: 1,
    });

    let customer;
    if (existCustomer.data.length > 0) {
      customer = existCustomer.data[0];
    } else {
      customer = await stripe.customers.create({ email });
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
    });

    return res.send({
      customerId: customer.id,
      clientSecret: setupIntent.client_secret,
    });
  } catch (err) {
    return error500(res, err);
  }
};

const createSubscription = async (req, res) => {
  const { paymentMethodId, customerEmail, plan, customerId } = req.body;

  try {
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ plan: plan }],
      expand: ["latest_invoice.payment_intent"],
    });

    return res.send({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret,
    });
  } catch (err) {
    return error500(res, err);
  }
};

//Need to store customer id for each user in database for checking this.
const checkSubscriptionStatus = async (req, res) => {
  const { customerId } = req.body;
  try {
    const subscriptions = await stripe.subscription.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const isSubscribed = subscriptions.data.length > 0;
    res.send({ isSubscribed });
  } catch (err) {
    return error500(res, err);
  }
};

module.exports = {
  createCustomerAndSetupIntent,
  createSubscription,
  checkSubscriptionStatus,
};
