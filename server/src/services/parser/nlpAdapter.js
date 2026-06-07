/**
 * nlpAdapter.js — Temporary Deterministic NLP Adapter
 *
 * Extracts structured job application data from email text using
 * deterministic rule-based logic.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * This adapter is intentionally stable in its interface.
 * When the FastAPI + spaCy + Sentence Transformers service is ready:
 *   1. Create `fastApiNlpAdapter.js` with the same interface.
 *   2. Swap the import in syncService.js — zero other changes needed.
 *
 * Input:  { subject, snippet, bodyText }
 * Output: { company, role, stage, confidence, dateSignals }
 *
 * Privacy contract:
 *   - bodyText is used in-memory for extraction only.
 *   - This function NEVER persists bodyText or returns it.
 *   - The caller (syncService) nulls out bodyText after this call.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * @module services/parser/nlpAdapter
 */

const { classifyNoise }  = require('../noise/noiseFilter')

// ── Stage keyword rules (deterministic — mirrors architecture diagram) ─────────
// Ordered by specificity: more specific phrases first.

const STAGE_PATTERNS = [
  {
    stage: 'HIRED',
    patterns: [
      'welcome aboard', 'welcome to the team', 'your first day',
      'employee onboarding', 'joining formalities', 'joining kit',
      'joining instructions', 'pre-joining', 'bgv', 'background verification',
      'employment contract', 'new hire', 'new employee',
    ],
  },
  {
    stage: 'OFFER',
    patterns: [
      'offer letter', 'job offer', 'offer of employment', 'formal offer',
      'we are pleased to offer', 'extend an offer', 'offer has been extended',
      'pleased to offer you', 'compensation package', 'total compensation',
      'salary offer', 'joining date', 'annual ctc', 'review your offer',
      'sign your offer', 'accept the offer',
    ],
  },
  {
    stage: 'INTERVIEW',
    patterns: [
      'invite you to interview', 'invitation to interview', 'interview invitation',
      'we would like to interview', 'selected for interview', 'selected to interview',
      'schedule interview', 'schedule your interview', 'confirm your interview',
      'interview confirmation', 'interview scheduled', 'technical interview',
      'technical round', 'phone screen', 'phone screening', 'video interview',
      'onsite interview', 'panel interview', 'final round', 'final interview',
      'recruiter screen', 'hr round', 'bar raiser', 'loop interview',
    ],
  },
  {
    stage: 'ASSESSMENT',
    patterns: [
      'hackerrank', 'codesignal', 'codility', 'testgorilla', 'xobin',
      'mettl', 'hackerearth', 'hirevue', 'imocha', 'pymetrics',
      'complete the assessment', 'complete the test', 'take the test',
      'coding challenge', 'coding assessment', 'online assessment',
      'technical assessment', 'technical test', 'skills assessment',
      'one-way video interview', 'video screening', 'assessment link',
    ],
  },
  {
    stage: 'REJECTED',
    patterns: [
      'not moving forward', 'we will not be moving forward',
      'we are not moving forward', 'unable to move forward',
      'decided to move forward with other candidates',
      'decided to pursue other candidates',
      'not selected for this role', 'not selected for this position',
      'not selected to move forward', 'you were not selected',
      'unfortunately, we will not', 'unfortunately we will not',
      'unfortunately, we are not', 'unfortunately we are not',
      'regret to inform', 'your application was not successful',
      'application was unsuccessful', 'no longer being considered',
      'position has been filled', 'role has been filled',
    ],
  },
  {
    stage: 'WITHDRAWN',
    patterns: [
      'withdraw my application', 'withdrawing my application',
      'wish to withdraw', 'would like to withdraw',
      'no longer interested', 'please remove my application',
      'accepted another offer', 'accepted a position elsewhere',
      'pursuing other opportunities',
    ],
  },
  {
    stage: 'APPLIED',
    patterns: [
      'application received', 'application submitted', 'application confirmation',
      'thank you for applying', 'thank you for your application',
      'thanks for applying', 'we have received your application',
      'your application has been received', 'successfully applied',
      'your application to', 'your application for',
      'application is under review', 'we will review your application',
    ],
  },
]

// ── Company extraction (reuse from stage service if available, else simple) ────
// We try to import the existing companyExtractor if it exists.
let _extractCompanyFn = null
try {
  const { extractCompany } = require('../stage/companyExtractor')
  _extractCompanyFn = extractCompany
} catch (_) {
  // companyExtractor not available — use simple fallback
}

// ── Role extraction patterns ───────────────────────────────────────────────────
// Matches common role title patterns in email subjects.
const ROLE_PATTERNS = [
  // "for the [Role] position/role/opening"
  /for\s+(?:the\s+)?(?:position|role|opening|job)\s+(?:of\s+)?([A-Za-z][A-Za-z0-9\s\-/,&.()]+?)(?:\s+at\b|\s+with\b|\s+in\b|\s*[-|]|\s*$)/i,
  // "[Role] at Company" — leading role
  /^([A-Za-z][A-Za-z0-9\s\-/,&.()]{2,40}?)\s+(?:at|@)\s+[A-Z]/,
  // "Application for [Role]"
  /application\s+for\s+([A-Za-z][A-Za-z0-9\s\-/,&.()]+?)(?:\s+at\b|\s+with\b|\s*[-|]|\s*$)/i,
  // "Position: [Role]" or "Role: [Role]"
  /(?:position|role|title)\s*[:\-]\s*([A-Za-z][A-Za-z0-9\s\-/,&.()]+?)(?:\s*\n|\s*$)/i,
]

// ── Internal helpers ──────────────────────────────────────────────────────────

function _norm(text) {
  if (!text) return ''
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * _extractStage
 * Scores the combined text against stage patterns and returns the best match.
 *
 * @param {{ subject: string, snippet: string, bodyText: string }} fields
 * @returns {{ stage: string, confidence: string }}
 */
function _extractStage({ subject, snippet, bodyText }) {
  const normSubject = _norm(subject)
  const normSnippet = _norm(snippet)
  const normBody    = _norm(bodyText)

  // Subject match = weight 3, snippet = weight 2, body = weight 1
  const scores = {}

  for (const { stage, patterns } of STAGE_PATTERNS) {
    let score = 0
    for (const pattern of patterns) {
      if (normSubject.includes(pattern)) score += 3
      if (normSnippet.includes(pattern)) score += 2
      if (normBody.includes(pattern))    score += 1
    }
    if (score > 0) scores[stage] = score
  }

  if (Object.keys(scores).length === 0) {
    return { stage: 'UNKNOWN', confidence: 'low' }
  }

  // Pick highest score
  const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
  const [stage, score] = winner

  let confidence = 'low'
  if (score >= 6)      confidence = 'high'
  else if (score >= 3) confidence = 'medium'

  return { stage, confidence }
}

/**
 * _extractRole
 * Attempts to extract a job role from the subject line.
 *
 * @param {string} subject
 * @returns {string|null}
 */
function _extractRole(subject) {
  if (!subject) return null
  for (const pattern of ROLE_PATTERNS) {
    const match = subject.match(pattern)
    if (match && match[1]) {
      const role = match[1].trim()
      // Sanity check: role should be 3–60 chars
      if (role.length >= 3 && role.length <= 60) return role
    }
  }
  return null
}

/**
 * _extractCompany
 * Delegates to the existing companyExtractor if available,
 * otherwise uses a simple sender-domain heuristic.
 *
 * @param {{ sender: string, subject: string }} input
 * @returns {{ company: string|null, platform: string }}
 */
function _extractCompany({ sender, subject }) {
  if (_extractCompanyFn) {
    return _extractCompanyFn({ sender, subject })
  }
  // Simple fallback: domain → company name
  const match = sender.match(/@([^>.]+\.[^>.]+)/)
  if (match) {
    const domain = match[1].split('.')[0]
    if (domain && domain.length >= 2) {
      return { company: domain.charAt(0).toUpperCase() + domain.slice(1), platform: 'Unknown' }
    }
  }
  return { company: null, platform: 'Unknown' }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * extractCandidateData
 *
 * Main function: extracts structured data from a single email.
 *
 * @param {{
 *   subject:   string,
 *   snippet:   string,
 *   sender:    string,
 *   bodyText:  string,   — in-memory only, NOT stored
 * }} input
 *
 * @returns {{
 *   company:     string|null,
 *   role:        string|null,
 *   stage:       string,
 *   confidence:  string,
 *   dateSignals: Array<{ label: string, date: Date }>,
 * }}
 */
function extractCandidateData({ subject = '', snippet = '', sender = '', bodyText = '' }) {
  const { stage, confidence } = _extractStage({ subject, snippet, bodyText })
  const { company }           = _extractCompany({ sender, subject })
  const role                  = _extractRole(subject)
  const dateSignals           = _extractDateSignals(bodyText)

  return {
    company:     company || null,
    role:        role    || null,
    stage,
    confidence,
    dateSignals,
  }
}

/**
 * _extractDateSignals
 * Extracts date mentions from body text.
 * Only extracts structured Date objects — never stores raw body text.
 *
 * @param {string} bodyText
 * @returns {Array<{ label: string, date: Date }>}
 */
function _extractDateSignals(bodyText) {
  if (!bodyText) return []
  const signals = []

  // Simple ISO date pattern: YYYY-MM-DD
  const isoPattern = /(\b\d{4}-\d{2}-\d{2}\b)/g
  let match
  while ((match = isoPattern.exec(bodyText)) !== null) {
    const d = new Date(match[1])
    if (!isNaN(d.getTime())) {
      signals.push({ label: 'date_mentioned', date: d })
    }
    if (signals.length >= 3) break   // cap at 3 date signals
  }

  return signals
}

module.exports = { extractCandidateData }
