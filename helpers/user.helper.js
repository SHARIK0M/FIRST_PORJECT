const nodemailer = require("nodemailer");
const argon2 = require("argon2");

// Function to send an OTP to the provided email and store it in session
const verifyEmail = async (email) => {
  try {
    if (!email) {
      console.error("❌ Email is required for OTP verification.");
      return { otp: null, otpTimestamp: null };
    }

    const otp = generateOtp();
    const otpTimestamp = Date.now();
    console.log("✅ Sending OTP to:", email);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.USER_MAIL,
        pass: process.env.USER_PASS,
      },
    });

    const mailOptions = {
      from: process.env.USER_MAIL,
      to: email, // Ensure email is correctly passed
      subject: "OTP Verification",
      text: `Your OTP for Floritta is: ${otp}`,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ OTP email sent successfully:", otp);

    return { otp, otpTimestamp };
  } catch (error) {
    console.error("❌ Error in verifyEmail function:", error);
    return { otp: null, otpTimestamp: null }; // Return null values on failure
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
