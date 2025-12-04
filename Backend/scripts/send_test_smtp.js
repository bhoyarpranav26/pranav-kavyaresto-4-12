/*
  One-off script to test Gmail SMTP transport using nodemailer and the existing
  EMAIL_USER / EMAIL_PASS in .env. Run: node scripts/send_test_smtp.js target@example.com
*/
require('dotenv').config();
const nodemailer = require('nodemailer');
const to = process.argv[2];
if (!to) {
  console.error('Usage: node scripts/send_test_smtp.js recipient@example.com');
  process.exit(1);
}

async function main() {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: 'Test SMTP from Kavyaresto',
    text: 'This is a test email sent from the local dev SMTP script.',
  });
  console.log('SMTP sendInfo:', info);
}

main().catch(err => {
  console.error('SMTP send error:', err);
  process.exit(1);
});
