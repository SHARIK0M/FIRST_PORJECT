const nodemailer = require("nodemailer");
const argon2 = require("argon2");

// Function to send an OTP to the provided email
const verifyEmail = async (email) => {
  try {
    const otp = generateOtp();
    console.log("Sending OTP to:", email);

    // Email transporter configuration
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.USER_MAIL,
        pass: process.env.USER_PASS,
      },
    });

    // Email content
    const mailOptions = {
      from: process.env.USER_MAIL,
      to: email,
      subject: "OTP Verification",
      text: `Welcome to Floritta! Your OTP is: ${otp}`,
    };

    // Send OTP email
    transporter.sendMail(mailOptions, (error) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("OTP email has been sent successfully:", otp);
      }
    });

    return otp;
  } catch (error) {
    console.error("Error in verifyEmail function:", error);
  }
};

// Function to generate a 4-digit OTP
const generateOtp = () => {
  return `${Math.floor(1000 + Math.random() * 9000)}`;
};

// Function to hash a password using Argon2
const hashPassword = async (password) => {
  try {
    return await argon2.hash(password);
  } catch (error) {
    console.error("Error hashing password:", error);
  }
};

module.exports = { verifyEmail, generateOtp, hashPassword };
