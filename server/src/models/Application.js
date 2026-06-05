/**
 * Application.js — Milestone 4.2
 *
 * Aggregated application record. Groups all emails from the same hiring
 * process (same company + user) into a single trackable Application.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Grouping key:  { userId, companyName }
 *
 * One Application per company per user, regardless of:
 *   - Which platform the emails arrived from (LinkedIn, Xobin, Direct, etc.)
 *   - How many emails belong to the process
 *
 * This model is created/updated by applicationAggregator.js at the end
 * of every Gmail sync.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * @module models/Application
 */

const mongoose = require('mongoose')

const ApplicationSchema = new mongoose.Schema(
  {
    // ── Identity ─────────────────────────────────────────────────────────────

    /** Clerk user ID. Links this application to a Clario user. */
    userId: {
      type:     String,
      required: true,
      index:    true,
    },

    /**
     * Normalized company name extracted by companyExtractor.
     * This is the grouping key — all emails with the same companyName
     * are merged into this record.
     */
    companyName: {
      type:     String,
      required: true,
      index:    true,
    },

    // ── Platform ──────────────────────────────────────────────────────────────

    /**
     * Application platform — where most emails originated from.
     * Resolved using platform priority:
     *   Direct > ATS/Assessment > Job Board > Unknown
     *
     * Examples: 'Direct', 'LinkedIn', 'Xobin', 'HackerRank', 'Indeed'
     */
    platform: {
      type:    String,
      default: 'Unknown',
    },

    // ── Current Stage ─────────────────────────────────────────────────────────

    /**
     * The most advanced/recent hiring stage seen across all emails
     * for this application.
     * Updated every sync by applicationAggregator.
     */
    currentStage: {
      type:    String,
      enum:    ['APPLIED', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'HIRED', 'WITHDRAWN', 'UNKNOWN'],
      default: 'UNKNOWN',
      index:   true,
    },

    /**
     * Confidence of the currentStage classification.
     */
    currentStageConfidence: {
      type:    String,
      enum:    ['high', 'medium', 'low'],
      default: 'low',
    },

    // ── Email aggregation metadata ─────────────────────────────────────────────

    /** Total number of job-related emails from this company. */
    emailCount: {
      type:    Number,
      default: 1,
    },

    /** Date of the earliest email from this company. */
    firstEmailDate: {
      type:    Date,
      default: null,
    },

    /**
     * Date of the most recent email from this company.
     * This is the value shown in the "Last Update" column on the dashboard.
     */
    lastEmailDate: {
      type:    Date,
      default: null,
      index:   true,      // Indexed — dashboard sorts by most recently active
    },

    /**
     * Array of JobEmailCandidate ObjectIds that belong to this application.
     * Used for drill-down view (future Milestone 5 email timeline).
     * Limited to 50 most recent to avoid unbounded document growth.
     */
    sourceEmails: {
      type:    [mongoose.Schema.Types.ObjectId],
      ref:     'JobEmailCandidate',
      default: [],
    },
  },
  {
    timestamps: true,     // createdAt + updatedAt managed by Mongoose
  }
)

// ── Compound unique index ──────────────────────────────────────────────────────
// One application per (user, company). Aggregator upserts on this key.
ApplicationSchema.index({ userId: 1, companyName: 1 }, { unique: true })

module.exports = mongoose.model('Application', ApplicationSchema)
