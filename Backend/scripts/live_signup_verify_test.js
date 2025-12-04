require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const User = require('../models/User');

const API_HOST = 'localhost';
const API_PORT = process.env.PORT || 5000;

function postJson(path, obj){
  const data = JSON.stringify(obj);
  const opts = { hostname: API_HOST, port: API_PORT, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } };
  return new Promise((resolve,reject)=>{
    const req = http.request(opts, res=>{
      let out=''; res.on('data',d=>out+=d); res.on('end',()=>{
        try{ const j = JSON.parse(out||'{}'); resolve({status:res.statusCode, body:j}); }catch(e){ resolve({status:res.statusCode, body:out}); }
      })
    });
    req.on('error', reject);
    req.write(data); req.end();
  })
}

(async ()=>{
  try{
    const testEmail = process.argv[2] || 'sanketkulkarni85@gmail.com';
    const testName = process.argv[3] || 'Sanket Test';
    const testPhone = process.argv[4] || '9657038724';
    const testPass = process.argv[5] || 'Sanket@123';

    console.log('1) POST /api/auth/signup')
    const signup = await postJson('/api/auth/signup', { name: testName, email: testEmail, phone: testPhone, password: testPass });
    console.log('signup:', signup.status, signup.body)

    // wait a moment for DB write
    await new Promise(r=>setTimeout(r,800));

    console.log('2) connect to MongoDB and read OTP for', testEmail)
    await mongoose.connect(process.env.MONGO_URI);
    const u = await User.findOne({ email: testEmail }).lean();
    if(!u){ console.error('User not found in DB'); process.exit(2) }
    console.log('DB user found: verified=', u.verified, 'otp=', u.otp ? '[present]' : '[none]')
    const otp = u.otp;
    if(!otp){ console.error('No OTP present, aborting'); process.exit(3) }

    console.log('3) POST /api/auth/verify-otp with OTP:', otp)
    const verify = await postJson('/api/auth/verify-otp', { email: testEmail, otp });
    console.log('verify:', verify.status, verify.body)

    if(verify.status===200) console.log('E2E signup->verify test succeeded')
    else console.error('E2E verify failed')

    process.exit(0)
  }catch(err){ console.error('TEST ERROR', err); process.exit(1) }
})();
