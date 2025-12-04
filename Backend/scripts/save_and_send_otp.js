require('dotenv').config();
const mongoose = require('mongoose');
const sgMail = require('@sendgrid/mail');
const User = require('../models/User');

async function main() {
  const emailArg = process.argv[2];
  if (!emailArg) {
    console.error('Usage: node save_and_send_otp.js <email> [name]');
    process.exit(1);
  }
  const nameArg = process.argv[3] || 'User';

  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not set in .env');
    process.exit(1);
  }
  if (!process.env.SENDGRID_API_KEY) {
    console.error('SENDGRID_API_KEY not set in .env');
    process.exit(1);
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const email = emailArg.toLowerCase();
  const name = nameArg;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = Date.now() + 10 * 60 * 1000;

  // Upsert user: create if not exists, otherwise update otp fields
  let user = await User.findOne({ email });
  if (!user) {
    user = new User({ name, email, phone: '9999999999', password: 'temporary', otp, otpExpires: otpExpiry, verified: false });
    await user.save();
    console.log('Created new user and set OTP');
  } else {
    user.otp = otp;
    user.otpExpires = otpExpiry;
    user.verified = false;
    await user.save();
    console.log('Updated existing user OTP');
  }

  // Send via SendGrid
  const msg = {
    to: email,
    from: process.env.EMAIL_FROM || 'no-reply@kavyaresto.com',
    subject: 'Your OTP from KavyaResto',
    text: `Hello ${name},\n\nYour OTP is ${otp}. It expires in 10 minutes.\n\nIf you didn't request this, ignore this mail.`,
  };

  try {
    const res = await sgMail.send(msg);
    console.log('SendGrid response status:', res && res[0] && res[0].statusCode);
    console.log('OTP sent:', otp);
    process.exit(0);
  } catch (err) {
    console.error('SendGrid send error:', err);
    if (err.response && err.response.body) console.error('SendGrid body:', err.response.body);
    process.exit(1);
  }
}

main();
