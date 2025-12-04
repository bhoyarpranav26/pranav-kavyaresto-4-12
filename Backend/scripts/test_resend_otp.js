require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const User = require('../models/User');

function postJson(path, obj){
  const data = JSON.stringify(obj);
  const opts = { hostname: 'localhost', port: process.env.PORT || 5000, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } };
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
    const email = process.argv[2] || 'sanketkulkarni85@gmail.com';
    console.log('Calling /api/auth/resend-otp for', email)
    const res = await postJson('/api/auth/resend-otp', { email });
    console.log('resend API:', res.status, res.body)
    await mongoose.connect(process.env.MONGO_URI);
    const u = await User.findOne({ email }).lean();
    if(!u) { console.error('User not found'); process.exit(2) }
    console.log('DB OTP:', u.otp)
    process.exit(0)
  }catch(err){ console.error('ERR', err); process.exit(1) }
})();
