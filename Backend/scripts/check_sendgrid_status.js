require('dotenv').config();
const client = require('@sendgrid/client');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node check_sendgrid_status.js user@example.com');
  process.exit(1);
}

if (!process.env.SENDGRID_API_KEY) {
  console.error('SENDGRID_API_KEY not set in .env');
  process.exit(1);
}

client.setApiKey(process.env.SENDGRID_API_KEY);

const endpoints = [
  `/v3/suppression/blocks/${encodeURIComponent(email)}`,
  `/v3/suppression/bounces/${encodeURIComponent(email)}`,
  `/v3/suppression/spam_reports/${encodeURIComponent(email)}`,
  `/v3/suppression/invalid_emails/${encodeURIComponent(email)}`,
];

(async () => {
  console.log('Checking SendGrid suppression status for', email);
  for (const url of endpoints) {
    try {
      const [response, body] = await client.request({ method: 'GET', url });
      console.log('\n==', url, '==');
      console.log('Status:', response.statusCode);
      console.log('Body:', JSON.stringify(body, null, 2));
    } catch (err) {
      console.error('\n==', url, '==');
      if (err && err.response && err.response.body) {
        console.error('Error response:', JSON.stringify(err.response.body, null, 2));
      } else {
        console.error('Error:', err.message || err);
      }
    }
  }
})();
