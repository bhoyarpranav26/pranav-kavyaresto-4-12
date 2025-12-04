const http = require('http');
const data = JSON.stringify({ email: 'sanketkulkarni469@gmail.com' });

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/resend-otp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    try {
      console.log('STATUS', res.statusCode);
      console.log(JSON.stringify(JSON.parse(body), null, 2));
    } catch (e) {
      console.log('RESPONSE BODY', body);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error', e);
});

req.write(data);
req.end();
