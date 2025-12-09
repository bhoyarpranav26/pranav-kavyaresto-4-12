const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')

// POST /internal/test-email
// body: { email: string }
// Triggers a plain test email using the existing sendOtpEmail helper and
// returns provider details or error. Useful for validating SendGrid/SMTP.
router.post('/test-email', async (req, res) => {
  try {
    // Accept email from JSON body or query string to make testing from curl
    const email = (req.body && req.body.email) || req.query.email
    if (!email) return res.status(400).json({ message: 'email required' })

    // Use a deterministic test OTP (or random) — it's just for send validation
    const testOtp = Math.floor(100000 + Math.random() * 900000).toString()

    const result = await authController.sendOtpEmail('Test User', email, testOtp)
    if (result && result.ok) {
      return res.status(200).json({ message: 'Test email queued/sent', provider: result.provider })
    }

    // If send failed, include useful debug info (non-secret) in response
    return res.status(500).json({ message: 'Test email send failed', error: String(result && result.error) })
  } catch (err) {
    console.error('Test email endpoint error:', err)
    return res.status(500).json({ message: 'Test email internal error', error: err.message })
  }
})

// GET /internal/ping
// Returns basic instance information and CORS configuration to help
// verify that the running service is the updated deployment.
router.get('/ping', (req, res) => {
  try {
    const allowAll = String(process.env.ALLOW_ALL_ORIGINS || '').toLowerCase() === 'true'
    const allowedOrigins = [process.env.FRONTEND_ORIGIN, process.env.FRONTEND_PROD_ORIGIN].filter(Boolean)
    const info = {
      ok: true,
      time: new Date().toISOString(),
      originReceived: req.headers.origin || null,
      allowAll,
      allowedOrigins,
      nodeEnv: process.env.NODE_ENV || 'development'
    }
    return res.status(200).json(info)
  } catch (err) {
    console.error('Ping endpoint error:', err)
    return res.status(500).json({ ok: false, message: 'Ping failed', error: err.message })
  }
})

module.exports = router
