const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')

// POST /internal/test-email
// body: { email: string }
// Triggers a plain test email using the existing sendOtpEmail helper and
// returns provider details or error. Useful for validating SendGrid/SMTP.
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body
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

module.exports = router
