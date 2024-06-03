//comfigs
const config = require("../../config");
//nodemailer
const nodemailer = require("nodemailer");

let transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: config.gmail_app_user,
    pass: config.gmail_app_password,
  },
});

//OTP generated for reseting user password
const sendOTPPasswordEmail = async function (email, otp) {
  try {
    const html = `
        <!DOCTYPE html>
        <html lang="en">

        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset OTP</title>
            <style>
                body {
                    font-family: 'Arial', sans-serif;
                    background-color: #f9f9f9;
                    color: #333;
                    margin: 0;
                    padding: 0;
                }

                .container {
                    max-width: 600px;
                    margin: 20px auto;
                    padding: 20px;
                    background-color: #ffffff;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                    border-radius: 8px;
                }

                h1 {
                    color: #007bff;
                }

                p {
                    font-size: 16px;
                    line-height: 1.6;
                    color: #555;
                }

                .otp-code {
                    font-size: 36px;
                    font-weight: bold;
                    color: #28a745;
                    padding: 12px;
                    background-color: #e1f5e3;
                    border-radius: 8px;
                    margin: 20px 0;
                    text-align: center;
                }

                .expiration-message {
                    font-size: 16px;
                    color: #ff6347;
                    margin-top: 10px;
                }

                .footer {
                    margin-top: 20px;
                    text-align: center;
                    color: #777;
                }
            </style>
        </head>

        <body>
            <div class="container">
                <h1>Password Reset OTP</h1>
                <p>Dear User,</p>
                <p>Your OTP for password reset is:</p>
                <div class="otp-code">${otp}</div>
                <p>Please use this OTP to reset your password.</p>
                <p class="expiration-message">Note: This OTP is valid for 15 minutes.</p>
                <p>If you did not request this password reset, please ignore this email.</p>
                <div class="footer">
                    <p>Best regards,<br>
                </div>
            </div>
        </body>

        </html>
    `;

    let message = {
      from: config.gmail_app_user,
      to: email,
      subject: "Password Reset",
      text: "Your OTP for reseting password",
      html: html,
    };

    await transporter.sendMail(message);
  } catch (err) {
    console.log("Error sending Email: ", err);
  }
};

module.exports = {
  sendOTPPasswordEmail,
};