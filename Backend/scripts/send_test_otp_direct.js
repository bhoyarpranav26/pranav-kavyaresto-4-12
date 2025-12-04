require('dotenv').config();
const sgMail = require('@sendgrid/mail');
const crypto = require('crypto');

if (!process.env.SENDGRID_API_KEY) {
  console.error('SENDGRID_API_KEY not set in .env');
  process.exit(1);
}
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const emailTo = process.argv[2] || 'sanketkulkarni85@gmail.com';
const otp = Math.floor(100000 + Math.random() * 900000).toString();

const msg = {
  to: emailTo,
  from: process.env.EMAIL_FROM || 'no-reply@kavyaresto.com',
  subject: 'Test OTP from KavyaResto',
  text: `Your test OTP is ${otp}. It expires in 10 minutes.`,
};

(async () => {
  try {
    const res = await sgMail.send(msg);
    console.log('SendGrid response status:', res && res[0] && res[0].statusCode);
    console.log('OTP:', otp);
  } catch (err) {
    console.error('SendGrid send error:', err);
    if (err.response && err.response.body) console.error('SendGrid body:', err.response.body);
    process.exit(1);
  }
})();
