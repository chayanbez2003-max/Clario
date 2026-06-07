/**
 * CandidateEmail.js
 *
 * Stores structured NLP-extracted data from a single Gmail message that
 * passed the noise filter and was processed by the NLP adapter.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Privacy contract:
 *   - No email body is stored.
 *   - No raw Gmail payload is stored.
 *   - No HTML is stored.
 *   - No attachments are stored.
 *   - Only structured data extracted in memory is persisted.
 *
 * Deduplication key: { userId, gmailMessageId } (unique index)
 * Aggregation key:   { userId, company, role }
 *
 * Created by: syncService.runManualSync()
 * Read by:    applicationAggregator (groups by company + role → Application)
 * ══════════════════════════════════════════════════════════════════════════
 *
 * @module models/CandidateEmail
 */

const mongoose = require('mongoose')

const CandidateEmailSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────

    /** Clerk user ID */
    userId: {
      type:     String,
      required: true,
      index:    true,
    },

    /**
     * Gmail message ID — deduplication key.
     * Prevents re-processing the same email across multiple syncs.
     */
    gmailMessageId: {
      type:     String,
      required: true,
    },

    // ── Safe metadata (from Gmail API metadata call — no body) ────────────────

    subject: {
      type:    String,
      default: '',
    },

    sender: {
      type:    String,
      default: '',
    },

    /** Date the email was received (from Gmail headers) */
    receivedAt: {
      type:    Date,
      default: null,
      index:   true,
    },

    // ── NLP-extracted structured data ─────────────────────────────────────────

    /**
     * Company name extracted from the email.
     * Null if NLP could not determine a company.
     */
    company: {
      type:    String,
      default: null,
      index:   true,
    },

    /**
     * Job role/title extracted from the email.
     * Null if NLP could not determine a role.
     */
    role: {
      type:    String,
      default: null,
    },

    /**
     * Hiring pipeline stage detected by NLP.
     */
    stage: {
      type:    String,
      enum:    ['APPLIED', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'HIRED', 'WITHDRAWN', 'UNKNOWN'],
      default: 'UNKNOWN',
      index:   true,
    },

    /**
     * Confidence level of the stage classification.
     */
    confidence: {
      type:    String,
      enum:    ['high', 'medium', 'low'],
      default: 'low',
    },

    /**
     * Date signals extracted from the email body.
     * e.g. interview date, offer expiry date.
     * Stored as an array of { label, date } objects.
     * Never contains raw body text — only parsed date values.
     */
    dateSignals: {
      type:    [{ label: String, date: Date }],
      default: [],
    },

    /**
     * Which component produced this NLP result.
     * 'rule_engine'  — deterministic stage extractor
     * 'nlp_adapter'  — NLP adapter (deterministic mock or FastAPI)
     */
    processingSource: {
      type:    String,
      enum:    ['rule_engine', 'nlp_adapter'],
      default: 'nlp_adapter',
    },

    /** When this record was created/updated by the sync engine */
    processedAt: {
      type:    Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,   // createdAt + updatedAt
  }
)

// ── Unique index: one record per email per user ────────────────────────────────
CandidateEmailSchema.index({ userId: 1, gmailMessageId: 1 }, { unique: true })

// ── Query index: aggregate by company + role ──────────────────────────────────
CandidateEmailSchema.index({ userId: 1, company: 1, role: 1 })

module.exports = mongoose.model('CandidateEmail', CandidateEmailSchema)
