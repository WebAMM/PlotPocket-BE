//Models
const { query } = require("express");
const Subscription = require("../models/Subscription.model");
//Responses and errors
const { error500, error409, error400 } = require("../services/helpers/errors");
const { status200, success } = require("../services/helpers/response");
const {
  getStripeInterval,
} = require("../services/helpers/subscriptionInterval");
//helpers
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

//Add Subscriptions
const addSubscription = async (req, res) => {
  const { plan, description, price } = req.body;
  try {
    if (price < 0.5) {
      return error400(res, "Price should be minimum 0.50 USD");
    }
    // const existPlan = await Subscription.findOne({ plan: plan });
    // if (existPlan) {
    //   return error409(res, `${plan} plan already exist`);
    // }
    //Get plan names
    const subscriptionInterval = getStripeInterval(plan);

    const stripeProductId = await stripe.products.create({
      name: `${plan} Plan for free episodes and chapters`,
      description: description,
    });

    const stripePriceId = await stripe.prices.create({
      product: stripeProductId.id,
      unit_amount: price * 100,
      currency: "usd",
      recurring: {
        interval: subscriptionInterval,
      },
    });

    if (stripeProductId && stripePriceId) {
      await Subscription.create({
        ...req.body,
        stripeProductId: stripeProductId.id,
        stripePriceId: stripePriceId.id,
      });
      return status200(res, "Subscriptions added successfully");
    } else {
      return error500(res, "Failed to create product and price in stripe");
    }
  } catch (err) {
    return error500(res, err);
  }
};

// Get All Subscriptions for Admin
const getAllAdminSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find().sort({ createdAt: -1 });
    return success(res, "200", "Success", subscriptions);
  } catch (err) {
    error500(res, err);
  }
};

// Get All Subscriptions for App
const getAllAppSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find()
      .select("plan price description stripeProductId stripePriceId createdAt")
      .sort({ createdAt: -1 })
      .lean();
    return success(res, "200", "Success", subscriptions);
  } catch (err) {
    error500(res, err);
  }
};

//Edit Subscriptions
const editSubscription = async (req, res) => {
  const { id } = req.params;
  const { plan, description, price } = req.body;

  try {
    const subscription = await Subscription.findById(id);

    if (!subscription) {
      return error409(res, "Subscription not found");
    }

    if (price < 0.5) {
      return error400(res, "Price should be minimum 0.50 USD");
    }

    // Get plan interval
    const subscriptionInterval = getStripeInterval(plan);

    // Update the product in Stripe
    await stripe.products.update(subscription.stripeProductId, {
      name: `${plan} Plan for free episodes and chapters`,
      description: description,
    });

    await stripe.prices.update(subscription.stripePriceId, {
      active: false, // Deactivate the old price
    });

    // Create a new price in Stripe (since prices are immutable)
    const newProductPrice = await stripe.prices.create({
      product: subscription.stripeProductId,
      unit_amount: price * 100,
      currency: "usd",
      recurring: {
        interval: subscriptionInterval,
      },
    });

    if (newProductPrice.id) {
      const updatedSubscription = await Subscription.findByIdAndUpdate(
        id,
        {
          $set: {
            plan: plan,
            description: description,
            price: price,
            stripePriceId: newProductPrice.id,
          },
        },
        { new: true }
      );
      return success(res, "200", "Success", updatedSubscription);
    } else {
      return error500(res, "Failed to update new price in Stripe");
    }
  } catch (err) {
    return error500(res, err);
  }
};

// Delete Subscription
const deleteSubscription = async (req, res) => {
  const { id } = req.params;
  try {
    const subscription = await Subscription.findById({ _id: id });
    if (!subscription) {
      return error409(res, "Subscription not found");
    }
    await stripe.prices.update(subscription.stripePriceId, {
      active: false,
    });

    await stripe.products.update(subscription.stripeProductId, {
      active: false,
    });

    const result = await Subscription.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return error409(res, "Failed to delete subscription from database");
    }

    return status200(res, "Subscription deleted successfully");
  } catch (err) {
    return error500(res, err);
  }
};

//Create stripe subscription session
const purchaseSubscription = async (req, res) => {
  //Subscription id
  const { id } = req.params;
  try {
    const subscriptionRecord = await Subscription.findById(id);
    if (!subscriptionRecord) {
      return error409(res, "Subscription not found");
    }
    let customer;
    //Check if existing customer in stripe account
    const existsCustomer = await stripe.customers.search({
      query: `metadata['userId']: "${req.user._id}"`,
    });
    if (existsCustomer.data.length > 0) {
      //Customer already exist
      customer = existsCustomer.data[0];
      //Check if customer have already active subscription
      const subscription = await stripe.subscriptions.list({
        customer: customer.id,
        price: subscriptionRecord.stripePriceId,
        // status: "active",
        // limit: 10,
      });
      if (subscription.data.length > 0) {
        //Customer already have active subscription, send them to billing portal to manage subscription
        const stripeSession = await stripe.billingPortal.sessions.create({
          customer: customer.id,
          return_url: "http://localhost:3000/",
        });
        return res.status(200).json({ url: stripeSession.url });
      }
    } else {
      //No customer found, create a new customer
      customer = await stripe.customers.create({
        email: req.user.email,
        metadata: {
          userId: req.user._id,
        },
      });
    }

    //Create stripe checkout session with customer id
    const session = await stripe.checkout.sessions.create({
      success_url: "http://localhost:3000/success",
      cancel_url: "http://localhost:3000/cancel",
      payment_method_types: ["card"],
      mode: "subscription",
      billing_address_collection: "auto",
      //Below code if not using stripe product and price
      // line_items: [
      //   {
      //     price_data: {
      //       currency: "usd",
      //       product_data: {
      //         //Subscription model data
      //         name: `${subscriptionRecord.plan} Plan for free episode and chapters`,
      //         description:
      //           subscriptionRecord.description || "Subscription plan",
      //       },
      //       unit_amount: subscriptionRecord.price * 100,
      //       recurring: {
      //         interval: subscriptionInterval,
      //       },
      //     },
      //     quantity: 1,
      //   },
      // ],
      line_items: [
        {
          price: subscriptionRecord.stripePriceId,
          quantity: 1,
        },
      ],
      metadata: {
        //User id will help in webhook to update related user data
        userId: req.user._id.toString(),
      },
      customer: customer.id,
      subscription_data: {
        metadata: {
          subscriptionId: id.toString(),
          userId: req.user._id.toString(),
        },
      },
    });
    return res.json({ url: session.url });
  } catch (err) {
    return error500(res, err);
  }
};

module.exports = {
  addSubscription,
  getAllAdminSubscriptions,
  getAllAppSubscriptions,
  editSubscription,
  deleteSubscription,
  purchaseSubscription,
  // getSubscriptionByPlan,
};
