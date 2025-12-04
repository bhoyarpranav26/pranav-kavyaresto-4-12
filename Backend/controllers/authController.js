// controllers/authController.js
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
let sendgrid;
try { sendgrid = require('@sendgrid/mail'); } catch (e) { sendgrid = null }

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Build a nodemailer SMTP transporter (used as fallback)
const smtpTransport = (process.env.EMAIL_USER && process.env.EMAIL_PASS) ? nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  tls: {
    // Allow turning off TLS verification in development when the environment
    // performs TLS interception (corporate proxy) or uses self-signed certs.
    // Set NODE_TLS_REJECT_UNAUTHORIZED=0 in your .env to disable verification.
    rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0'
  }
}) : null;

// Note: we prefer SendGrid if configured; we will attempt SendGrid first and
// automatically fallback to SMTP transport on failure so devs always get emails.
let sendgridEnabled = !!(process.env.SENDGRID_API_KEY && sendgrid);
if (sendgridEnabled) {
  sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
}

// Console-only fallback when no transport available
const mockTransport = {
  sendMail: async (mailOptions) => {
    console.log('--- Mock sendMail called (no transport configured) ---');
    console.log(mailOptions);
    return Promise.resolve();
  }
};

// Unified send helper that will try SendGrid then SMTP then mock
async function trySendWithFallback(mailOptions) {
  // Try SendGrid first if enabled
  if (sendgridEnabled && sendgrid) {
    try {
      const msg = {
        to: mailOptions.to,
        from: mailOptions.from || (process.env.EMAIL_FROM || 'no-reply@kavyaresto.com'),
        subject: mailOptions.subject,
        text: mailOptions.text,
      };
      const res = await sendgrid.send(msg);
      return { provider: 'sendgrid', result: res };
    } catch (err) {
      console.error('SendGrid send failed, falling back to SMTP:', err && err.message ? err.message : err);
      // fallthrough to SMTP fallback
    }
  }

  // Try SMTP fallback if available
  if (smtpTransport) {
    try {
      const res = await smtpTransport.sendMail({
        from: mailOptions.from || process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: mailOptions.to,
        subject: mailOptions.subject,
        text: mailOptions.text,
      });
      return { provider: 'smtp', result: res };
    } catch (err) {
      console.error('SMTP send failed as fallback:', err && err.message ? err.message : err);
      throw err; // bubble up so callers can decide how to handle
    }
  }

  // Last resort: mock log
  await mockTransport.sendMail(mailOptions);
  return { provider: 'mock', result: null };
}

// SIGNUP: save user (unverified) and send OTP by email
exports.signup = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // check existing
    let existing = await User.findOne({ email });
    if (existing && existing.verified) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    let user;
    if (existing) {
      user = await User.findOneAndUpdate({ email }, {
        name, phone, password: hashed, otp, otpExpires: otpExpiry, verified: false
      }, { new: true });
    } else {
      user = new User({ name, email, phone, password: hashed, otp, otpExpires: otpExpiry });
      await user.save();
    }

    // send email using helper
    const sendResult = await sendOtpEmail(name, email, otp)
    if (!sendResult.ok) {
      console.error('Failed to send OTP email during signup (OTP stored in DB):', sendResult.error)
      // If developer mode requests OTP returned, allow returning it for local testing
      if (process.env.DEV_RETURN_OTP === 'true') {
        return res.status(200).json({ message: 'OTP saved (email send failed, dev mode)', otp, provider: sendResult.provider || 'none', error: String(sendResult.error) })
      }
      return res.status(500).json({ message: 'OTP stored but sending email failed', error: String(sendResult.error) })
    }

    // In dev, optionally return the OTP for testing convenience
    const responsePayload = { message: 'OTP sent to email', provider: sendResult.provider }
    if (process.env.DEV_RETURN_OTP === 'true') responsePayload.otp = otp
    return res.status(200).json(responsePayload);
  } catch (err) {
    console.error("Signup error:", err);
    // handle validation error (like phone required)
    return res.status(500).json({ message: "Signup failed", error: err.message });
  }
};

// helper: send OTP email (reusable). Tries SendGrid then SMTP fallback.
async function sendOtpEmail(name, email, otp) {
  try {
    const sendResult = await trySendWithFallback({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@kavyaresto.local',
      to: email,
      subject: 'Your OTP from KavyaServe',
      text: `Hello ${name},\n\nYour OTP is ${otp}. It expires in 10 minutes.\n\nIf you didn't request this, ignore this mail.`,
    });
    return { ok: true, provider: sendResult.provider, result: sendResult.result };
  } catch (err) {
    console.error('sendOtpEmail error (after fallbacks):', err);
    return { ok: false, error: err };
  }
}

// RESEND OTP: generate new OTP and email it
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: 'Email required' })
    const user = await User.findOne({ email })
    if (!user) return res.status(404).json({ message: 'User not found' })

    // generate new OTP if expired or missing
    const now = Date.now()
    let otp = user.otp
    if (!otp || !user.otpExpires || now > user.otpExpires) {
      otp = generateOTP()
      user.otp = otp
      user.otpExpires = now + 10 * 60 * 1000
      user.verified = false
      await user.save()
    }

    const result = await sendOtpEmail(user.name || 'User', email, otp)
    if (!result.ok) {
      const err = result.error
      console.error('Resend OTP send error:', err)
      const errMessage = err && err.message ? err.message : String(err)
      const sgBody = err && err.response && err.response.body ? err.response.body : undefined
      if (process.env.DEV_RETURN_OTP === 'true') {
        return res.status(200).json({ message: 'OTP saved (email send failed, dev mode)', otp, provider: result.provider || 'none', error: errMessage, details: sgBody })
      }
      return res.status(500).json({ message: 'Failed to send OTP email', error: errMessage, details: sgBody })
    }
    const payload = { message: 'OTP resent', provider: result.provider }
    if (process.env.DEV_RETURN_OTP === 'true') payload.otp = otp
    return res.status(200).json(payload)
  } catch (err) {
    console.error('Resend OTP error:', err)
    return res.status(500).json({ message: 'Resend OTP failed' })
  }
}

// VERIFY OTP
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and OTP required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.verified) return res.status(400).json({ message: "User already verified" });
    if (user.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });
    if (Date.now() > user.otpExpires) return res.status(400).json({ message: "OTP expired" });

    user.verified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Issue JWT so client can auto-login immediately after verification
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "secret", { expiresIn: "7d" });
    const userSafe = { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role };
    return res.status(200).json({ message: "Account verified successfully", token, user: userSafe });
  } catch (err) {
    console.error("Verify OTP error:", err);
    return res.status(500).json({ message: "OTP verification failed" });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.verified) return res.status(403).json({ message: "Email not verified" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "secret", { expiresIn: "7d" });

    return res.status(200).json({
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone }
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Login failed" });
  }
};

// PROFILE (protected) - small helper for route usage
exports.getProfile = async (req, res) => {
  try {
    const userId = req.userId; // from middleware
    const user = await User.findById(userId).select("-password -otp -otpExpires");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ user });
  } catch (err) {
    console.error("GetProfile error:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};
