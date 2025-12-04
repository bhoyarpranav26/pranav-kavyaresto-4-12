/*
  Upsert user, generate OTP, save to DB, and send via SMTP transport (nodemailer).
  Usage: node scripts/send_otp_and_save.js recipient@example.com
*/
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const nodemailer = require('nodemailer');

const to = process.argv[2];
if (!to) {
  console.error('Usage: node scripts/send_otp_and_save.js recipient@example.com');
  process.exit(1);
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Upsert user (fill required fields minimally)
  const user = await User.findOneAndUpdate(
    { email: to },
    {
      $set: {
        name: to.split('@')[0],
        phone: '0000000000',
        password: otp, // placeholder (not used for OTP flow)
        otp,
        otpExpires,
        verified: false,
      },
    },
    { upsert: true, new: true }
  );

  console.log('Saved OTP to DB for', to, 'OTP=', otp);

  // create SMTP transport (Gmail) - use NODE_TLS_REJECT_UNAUTHORIZED=0 if needed
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // allow self-signed certs in local dev if user has explicitly set the env var
    tls: {
      rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0',
    },
  });

  const mail = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: 'Your OTP for Kavyaresto',
    text: `Your OTP is ${otp}. It expires in 10 minutes.`,
  };

  const info = await transporter.sendMail(mail);
  console.log('SMTP sendInfo:', info.response || info);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error in send_otp_and_save:', err);
  process.exit(1);
});
