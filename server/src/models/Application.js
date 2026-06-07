/**
 * Application.js
 *
 * Aggregated application record. Groups CandidateEmail records by
 * { userId, company, role } into a single trackable Application.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Grouping key: { userId, company, role }
 *
 * Multiple applications for the same company are allowed if roles differ.
 * e.g. "Google / SWE L4" and "Google / PM" are separate Application records.
 *
 * Created/updated by: applicationAggregator at the end of every sync.
 * Read by:            applicationsController (dashboard)
 * ══════════════════════════════════════════════════════════════════════════
 *
 * @module models/Application
 */

const mongoose = require('mongoose')

const ApplicationSchema = new mongoose.Schema(
  {
    // ── Grouping key ──────────────────────────────────────────────────────────

    /** Clerk user ID */
    userId: {
      type:     String,
      required: true,
      index:    true,
    },

    /** Company name extracted by NLP */
    company: {
      type:     String,
      required: true,
      index:    true,
    },

    /**
     * Job role/title. Null means role could not be determined.
     * An application can exist with a null role — aggregated on company alone.
     */
    role: {
      type:    String,
      default: null,
    },

    // ── Current stage ─────────────────────────────────────────────────────────

    /**
     * Most recent non-UNKNOWN hiring stage across all candidate emails.
     * Updated on every sync by applicationAggregator.
     */
    currentStage: {
      type:    String,
      enum:    ['APPLIED', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'HIRED', 'WITHDRAWN', 'UNKNOWN'],
      default: 'UNKNOWN',
      index:   true,
    },

    /** Confidence of the currentStage classification */
    currentStageConfidence: {
      type:    String,
      enum:    ['high', 'medium', 'low'],
      default: 'low',
    },

    // ── Email aggregation metadata ─────────────────────────────────────────────

    /** Total number of job-related emails for this application */
    emailCount: {
      type:    Number,
      default: 1,
    },

    /** Date of the earliest email */
    firstEmailDate: {
      type:    Date,
      default: null,
    },

    /**
     * Date of the most recent email.
     * Dashboard sorts by this column — indexed.
     */
    lastEmailDate: {
      type:    Date,
      default: null,
      index:   true,
    },
  },
  {
    timestamps: true,   // createdAt + updatedAt
  }
)

// ── Compound unique index: one application per (user, company, role) ───────────
// role: null is treated as a distinct value in MongoDB — this is intentional.
ApplicationSchema.index({ userId: 1, company: 1, role: 1 }, { unique: true })

module.exports = mongoose.model('Application', ApplicationSchema)
