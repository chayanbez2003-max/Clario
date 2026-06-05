const User = require('../models/User')

/**
 * GET /api/users/me
 * Returns the current user's profile using their Clerk ID
 */
const getMe = async (req, res) => {
  try {
    // clerkId will be populated by the auth middleware (future)
    const user = await User.findOne({ clerkId: req.clerkId })

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    res.json({ success: true, data: user })
  } catch (err) {
    console.error('getMe error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

/**
 * POST /api/users/sync-clerk
 * Creates or updates a user record from Clerk webhook / first login
 */
const syncClerkUser = async (req, res) => {
  try {
    const { clerkId, email, name } = req.body

    if (!clerkId || !email) {
      return res.status(400).json({ success: false, message: 'clerkId and email are required' })
    }

    const user = await User.findOneAndUpdate(
      { clerkId },
      { clerkId, email, name },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    res.json({ success: true, data: user })
  } catch (err) {
    console.error('syncClerkUser error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = { getMe, syncClerkUser }
