/**
 * requireAuth middleware
 *
 * Placeholder for Clerk JWT verification.
 * Will be expanded to verify the Clerk session token
 * using @clerk/backend in the next phase.
 *
 * Usage: router.get('/protected', requireAuth, handler)
 */
const requireAuth = (req, res, next) => {
  // TODO: Verify Clerk JWT from Authorization header
  // const { userId } = getAuth(req)
  // if (!userId) return res.status(401).json({ message: 'Unauthorized' })
  // req.clerkId = userId

  // For now, pass through — will be secured in Phase 2
  next()
}

module.exports = { requireAuth }
