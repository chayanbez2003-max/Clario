const mongoose = require('mongoose')

/**
 * GmailIntegration
 *
 * Stores all Gmail-related state for a user.
 * One record per user (upsert on userId).
 *
 * userId = Clerk user ID string (not a Mongo ObjectId ref —
 * keeps the model Clerk-agnostic and easy to migrate).
 *
 * Future fields that will be added by later milestones:
 *   - syncCursor      (Step 3 — Manual Sync: last processed historyId)
 *   - syncStatus      (Step 7 — Auto Sync: 'idle' | 'syncing' | 'error')
 *   - lastSyncError   (Step 7 — error message if last sync failed)
 */
const GmailIntegrationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,       // Clerk user ID
      required: true,
      unique: true,
      index: true,
    },
    gmailEmail: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    refreshToken: {
      type: String,
      default: null,
      select: false,      // Never returned in default queries — security
    },
    gmailConnected: {
      type: Boolean,
      default: false,
    },
    lastVerifiedAt: {
      type: Date,
      default: null,      // Updated on every successful Verify Connection
    },
    lastSyncAt: {
      type: Date,
      default: null,      // Updated only by actual sync operations (Step 3+)
    },
    emailsProcessed: {
      type: Number,
      default: 0,         // Incremented by sync engine (Step 3+)
    },
  },
  {
    timestamps: true,
  }
)

module.exports = mongoose.model('GmailIntegration', GmailIntegrationSchema)
