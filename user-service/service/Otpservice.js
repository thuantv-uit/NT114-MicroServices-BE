const nodemailer = require('nodemailer');

// Create transporter using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

/**
 * Generate a 6-digit OTP code
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Set OTP expiry to 5 minutes from now
 */
const generateOTPExpiry = () => {
  return new Date(Date.now() + 5 * 60 * 1000);
};

/**
 * Send OTP verification email
 * @param {string} toEmail - Recipient email address
 * @param {string} otp - OTP code
 */
const sendOTPEmail = async (toEmail, otp) => {
  const mailOptions = {
    from: `"Account Verification" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Your OTP Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #111827;">Verify Your Account</h2>
        <p style="color: #6b7280;">Your OTP code is:</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #4f46e5; text-align: center; padding: 16px 0;">
          ${otp}
        </div>
        <p style="color: #6b7280;">This code will expire in <strong>5 minutes</strong>.</p>
        <p style="color: #9ca3af; font-size: 12px;">If you did not request this, please ignore this email.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  generateOTP,
  generateOTPExpiry,
  sendOTPEmail
};