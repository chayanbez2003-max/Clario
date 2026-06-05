const express = require('express')
const router = express.Router()
const { getMe, syncClerkUser } = require('../controllers/userController')

// GET  /api/users/me          → get current user profile
router.get('/me', getMe)

// POST /api/users/sync-clerk  → create or update user from Clerk
router.post('/sync-clerk', syncClerkUser)

module.exports = router
