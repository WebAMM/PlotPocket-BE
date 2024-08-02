const router = require("express").Router();
//PaymentController
const paymentController = require("../controllers/payment.controller");
//middlewares
const { verifyToken, verifyRole } = require("../middlewares/auth.middleware");

//[APP] Made the payment
// router.post(
//   "/create-setup-intent",
//   verifyToken,
//   verifyRole["User"],
//   paymentController.createCustomerAndSetupIntent
// );
