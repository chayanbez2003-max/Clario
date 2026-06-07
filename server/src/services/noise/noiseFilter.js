/**
 * noiseFilter.js — Step 2 of the Email Processing Pipeline
 *
 * Classifies an email as noisy (not job-related) or clean (potentially job-related)
 * using deterministic rule-based logic on metadata only.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Privacy contract:
 *   This filter runs BEFORE any body fetch.
 *   Noisy emails are discarded here — their bodies are NEVER fetched.
 *   Input is only: subject, snippet, sender (metadata only).
 *
 * Design principles:
 *   - Sender domain is the STRONGEST signal — checked first.
 *   - Job signals guard against false positives.
 *   - Patterns are matched as case-insensitive substrings after normalisation.
 *   - False negative (missing noise) is acceptable — email moves to NLP.
 *   - False positive (blocking a real job email) is NOT acceptable.
 *
 * Categories:
 *   otp_verification    — OTP, 2FA, login codes
 *   banking_statement   — bank/card statements, transactions, UPI alerts
 *   ecommerce_order     — orders, shipping, delivery, returns, food delivery
 *   marketing_promotion — sales, discounts, promotions, coupons
 *   social_notification — social media alerts (likes, follows, comments)
 *   newsletter          — digests, weekly roundups, blog posts
 *   other_noise         — any other identified non-job sender
 *   not_noise           — passes through to body fetch + NLP
 * ══════════════════════════════════════════════════════════════════════════
 *
 * @module services/noise/noiseFilter
 */

// ── Utility ───────────────────────────────────────────────────────────────────

/**
 * Normalise text for matching: lowercase and collapse whitespace.
 * @param {string} text
 * @returns {string}
 */
function _norm(text) {
  if (!text) return ''
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Check if any phrase from the list appears in the text.
 * @param {string} text - already normalised
 * @param {string[]} phrases
 * @returns {{ matched: boolean, phrase: string|null }}
 */
function _matchesAny(text, phrases) {
  for (const phrase of phrases) {
    if (text.includes(phrase)) return { matched: true, phrase }
  }
  return { matched: false, phrase: null }
}

/**
 * Extract the domain from an email address in a sender string.
 * e.g. "Amazon India <noreply@amazon.in>" → "amazon.in"
 * Falls back to the full normalised sender string if no email found.
 *
 * @param {string} normSender - already normalised sender string
 * @returns {string}
 */
function _extractDomain(normSender) {
  const match = normSender.match(/@([a-z0-9._-]+\.[a-z]{2,})/)
  return match ? match[1] : normSender
}

/**
 * Check if the extracted sender domain matches any known domain.
 * Supports subdomain matching: "email.amazon.in" matches "amazon.in".
 *
 * @param {string} senderDomain - extracted domain
 * @param {string[]} knownDomains
 * @returns {{ matched: boolean, domain: string|null }}
 */
function _domainMatches(senderDomain, knownDomains) {
  for (const known of knownDomains) {
    // Exact match or subdomain match (amazon.in matches email.amazon.in)
    if (senderDomain === known || senderDomain.endsWith('.' + known)) {
      return { matched: true, domain: known }
    }
  }
  return { matched: false, domain: null }
}

// ── Job signal patterns — these ALWAYS pass through ───────────────────────────
// These guard against false positives in every noise category below.

const JOB_SIGNAL_SUBJECT = [
  'application received',
  'application submitted',
  'application confirmation',
  'thank you for applying',
  'thank you for your application',
  'thanks for applying',
  'we received your application',
  'your application to',
  'your application for',
  'application for the position',
  'application for the role',
  'interview invitation',
  'interview scheduled',
  'interview confirmation',
  'schedule an interview',
  'schedule your interview',
  'invitation to interview',
  'invite you to interview',
  'selected for interview',
  'shortlisted for',
  'shortlisted for interview',
  'technical interview',
  'technical round',
  'coding challenge',
  'coding assessment',
  'online assessment',
  'online test',
  'offer letter',
  'job offer',
  'offer of employment',
  'we are pleased to offer',
  'pleased to extend an offer',
  'not moving forward',
  'not selected',
  'regret to inform',
  'your application was not successful',
  'welcome aboard',
  'welcome to the team',
  'joining formalities',
  'background verification',
  'bgv initiated',
]

// ATS platforms, job boards, assessment tools — always job-related
const JOB_SIGNAL_SENDER_DOMAINS = [
  'greenhouse.io',
  'lever.co',
  'workday.com',
  'workdayjobs.com',
  'myworkdayjobs.com',
  'taleo.net',
  'icims.com',
  'successfactors.com',
  'bamboohr.com',
  'jobvite.com',
  'smartrecruiters.com',
  'ashbyhq.com',
  'recruitee.com',
  'breezy.hr',
  'freshteam.com',
  'xobin.com',
  'hackerrank.com',
  'codesignal.com',
  'mettl.com',
  'codility.com',
  'testgorilla.com',
  'hackerearth.com',
  'naukri.com',
  'instahyre.com',
  'cutshort.io',
  'hirist.tech',
  'linkedin.com',
]

// These EMAIL PREFIXES in the sender always indicate job emails
// Use exact prefix matching (must appear right after @ or at start)
const JOB_SIGNAL_SENDER_PREFIXES = [
  'recruiting@',
  'recruiter@',
  'talent@',
  'hiring@',
  'careers@',
  'career@',
  'jobs@',
  'apply@',
  'applications@',
  'noreply@greenhouse',
  'noreply@lever',
  'noreply@ashby',
]

// ── OTP / Verification ────────────────────────────────────────────────────────

const OTP_SUBJECT = [
  // Most common OTP patterns — with and without "your"
  ' otp ',           // " otp " catches "login otp", "transaction otp", "otp is"
  'otp:',            // "OTP: 123456"
  'otp is',          // "Your OTP is 123456"
  'otp for',         // "OTP for login"
  'your otp',        // "Your OTP"
  'otp -',           // "OTP - HDFC Bank"
  'one-time password',
  'one time password',
  '(otp)',           // "(OTP) for your account"
  // Verification codes
  'verification code',
  'your verification code',
  'login code',
  'sign-in code',
  'signin code',
  'your code is',
  'use this code',
  'use code to',
  '2fa code',
  'two-factor',
  'two factor authentication',
  'authentication code',
  'security code',
  'your pin is',
  'enter the code',
  // Account verification (not job-related)
  'confirm your email address',
  'confirm your account',
  'activate your account',
  'verify your email',
  'verify your account',
  'verify your phone',
  'phone verification',
  'confirm your phone',
]

const OTP_SENDER_DOMAINS = [
  'alerts.google.com',
  'accounts.google.com',
]

// Known OTP-sending platforms (sender string contains these)
const OTP_SENDER_CONTAINS = [
  'noreply@facebook.com',
  'security@twitter.com',
  'security@x.com',
  'no-reply@accounts.google.com',
]

// ── Banking / Finance ─────────────────────────────────────────────────────────

const BANKING_SUBJECT = [
  // Transaction alerts — most common Indian banking emails
  'debited from a/c',
  'debited from your a/c',
  'debited from your account',
  'credited to a/c',
  'credited to your a/c',
  'credited to your account',
  'debited rs',
  'credited rs',
  'debited inr',
  'credited inr',
  'debit of rs',
  'credit of rs',
  'a/c no.',
  'acct no.',
  'a/c ending',
  'account ending',
  // Standard alerts
  'transaction alert',
  'debit alert',
  'credit alert',
  'alert: debit',
  'alert: credit',
  'alert! debit',
  'spending alert',
  'purchase alert',
  // Statements
  'account statement',
  'bank statement',
  'credit card statement',
  'monthly statement',
  'statement of account',
  'your statement is ready',
  'e-statement',
  'view your statement',
  // Payment related
  'upi transaction',
  'upi credit',
  'upi debit',
  'payment received',
  'payment successful',
  'payment failed',
  'payment declined',
  'imps transaction',
  'neft transaction',
  'rtgs transaction',
  'fund transfer',
  'money transfer',
  // EMI / Loans
  'emi payment',
  'emi reminder',
  'emi due',
  'loan repayment',
  'loan emi',
  // Card related
  'credit limit',
  'outstanding balance',
  'minimum payment due',
  'minimum amount due',
  'bill payment',
  'bill generated',
  'card bill',
  'your bill for',
  'payment due',
  // Balance
  'avail bal',
  'available balance',
  'account balance',
  'low balance',
  // General
  'net banking',
  'paytm cashback',
  'cashback credited',
  'reward points',
]

const BANKING_SENDER_DOMAINS = [
  // Indian private banks
  'hdfcbank.com',
  'icicibank.com',
  'axisbank.com',
  'kotak.com',
  'kotakbank.com',
  'yesbank.in',
  'indusind.com',
  'rbl.co.in',
  'idfcfirstbank.com',
  // Indian public sector banks
  'sbi.co.in',
  'onlinesbi.com',
  'pnb.co.in',
  'bankofbaroda.co.in',
  'canarabank.in',
  'unionbankofindia.co.in',
  'bankofindia.co.in',
  'centralbankofindia.co.in',
  'idbibank.com',
  'federalbank.co.in',
  'southindianbank.com',
  'kvb.co.in',
  'karurbank.com',
  // Cards
  'sbicard.com',
  'hdfcbanksmartbuy.com',
  // Payment platforms
  'paytm.com',
  'phonepe.com',
  'gpay.com',
  'googlepay.com',
  'amazonpay.in',
  'mobikwik.com',
  'freecharge.in',
  'bhim.net',
  // International
  'amex.com',
  'americanexpress.com',
  'citibank.com',
  'chase.com',
  'bankofamerica.com',
  'wisealerts.com',
  'wise.com',
  'revolut.com',
]

// ── E-commerce / Orders ───────────────────────────────────────────────────────

const ECOMMERCE_SUBJECT = [
  // Generic order patterns
  'your order',
  'order confirmed',
  'order confirmation',
  'order placed',
  'order shipped',
  'order delivered',
  'order cancelled',
  'order has been',
  'order #',
  'order update',
  'track your order',
  'order is out',
  // Delivery
  'out for delivery',
  'delivery by',
  'delivery today',
  'expected delivery',
  'arriving today',
  'arriving tomorrow',
  'shipment update',
  'shipment has been',
  'item shipped',
  'item delivered',
  'package delivered',
  'package is out',
  'delivery attempt',
  // Invoice / Returns
  'invoice for your order',
  'your invoice',
  'return request',
  'return initiated',
  'return approved',
  'refund initiated',
  'refund processed',
  'refund status',
  'refund of',
  'exchange request',
  // Cart / Purchase
  'your cart',
  'items in your cart',
  'complete your purchase',
  'complete your order',
  // Subscriptions
  'your subscription',
  'subscription renewed',
  'subscription expires',
  'subscription cancelled',
  'subscription payment',
  // Food delivery
  'your food',
  'your order is being prepared',
  'your order is on the way',
  'rider is on the way',
  'delivery partner',
  'estimated time of arrival',
  // Travel
  'your booking',
  'booking confirmed',
  'flight confirmation',
  'hotel confirmation',
  'ticket booked',
  'boarding pass',
  'pnr number',
  'e-ticket',
]

const ECOMMERCE_SENDER_DOMAINS = [
  // Indian e-commerce
  'amazon.in',
  'amazon.com',
  'flipkart.com',
  'myntra.com',
  'meesho.com',
  'snapdeal.com',
  'nykaa.com',
  'nykaabeauty.com',
  'ajio.com',
  'tatacliq.com',
  'jiomart.com',
  'bigbasket.com',
  'blinkit.com',
  'instamart.swiggy.in',
  'swiggy.in',
  'swiggy.com',
  'zomato.com',
  'dunzo.com',
  'zepto.com',
  'magicpin.in',
  // Transport / Travel
  'uber.com',
  'ubereats.com',
  'rapido.bike',
  'ola.com',
  'olacabs.com',
  'irctc.co.in',
  'makemytrip.com',
  'goibibo.com',
  'cleartrip.com',
  'yatra.com',
  'redbus.in',
  'ixigo.com',
  // Entertainment
  'bookmyshow.com',
  'paytminsider.com',
  'insider.in',
  'district.in',
  // International
  'ebay.com',
  'etsy.com',
  'shopify.com',
  'bestbuy.com',
  'walmart.com',
  'target.com',
  'doordash.com',
  'grubhub.com',
  'instacart.com',
]

// ── Marketing / Promotions ────────────────────────────────────────────────────

const MARKETING_SUBJECT = [
  // Discount patterns
  '% off',
  '% discount',
  'flat off',
  'flat rs',
  'upto off',
  'up to off',
  'save up to',
  'save big',
  'save more',
  'extra off',
  'additional off',
  'cashback on',
  'earn cashback',
  // Sale patterns
  'sale ends',
  'sale is live',
  'sale is on',
  'flash sale',
  'mega sale',
  'big sale',
  'super sale',
  'end of season sale',
  'last chance sale',
  'clearance sale',
  // Urgency
  'limited time offer',
  'limited time only',
  'offer expires',
  'offer ending',
  'hurry',
  'today only',
  'last chance',
  'ends tonight',
  'don\'t miss out',
  // Deal patterns
  'exclusive offer',
  'special offer',
  'best deals',
  'deal of the day',
  'deal of the week',
  'hot deal',
  'shop now',
  // Promo codes
  'use code',
  'promo code',
  'coupon code',
  'discount code',
  'voucher code',
  'redeem now',
  'gift card',
  // Refer & earn
  'refer and earn',
  'referral bonus',
  'invite friends',
  'earn rewards',
  'reward points',
  'loyalty points',
  // Win/prize
  'congratulations, you\'ve won',
  'you have been chosen',
  'you\'ve won',
  'claim your prize',
  'claim your reward',
  'lucky winner',
]

// ── Social Notifications ──────────────────────────────────────────────────────

const SOCIAL_SUBJECT = [
  'liked your post',
  'liked your photo',
  'liked your comment',
  'commented on your',
  'replied to your',
  'tagged you in',
  'mentioned you in',
  'sent you a message',
  'sent you a connection request',
  'wants to connect',
  'accepted your connection',
  'new follower',
  'started following you',
  'following you on',
  'is following you',
  'friend request',
  'group invitation',
  'event invitation',
  'birthday reminder',
  'new comment on',
  'someone shared your',
  'reaction to your',
  'retweeted your',
  'reposted your',
  'story mention',
  'sent you a dm',
  'direct message',
  'posted in your group',
  'live video',
  'going live',
  'check out this video',
  'you have been invited',
]

const SOCIAL_SENDER_DOMAINS = [
  'facebookmail.com',
  'fb.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'tiktok.com',
  'snapchat.com',
  'pinterest.com',
  'reddit.com',
  'discord.com',
  'telegram.org',
  'youtube.com',
  'quora.com',
  'sharechat.com',
  'moj.com',
]

// ── Newsletter / Digest ───────────────────────────────────────────────────────

const NEWSLETTER_SUBJECT = [
  'weekly digest',
  'daily digest',
  'weekly roundup',
  'daily roundup',
  'monthly digest',
  'monthly roundup',
  'this week in',
  'this month in',
  'top stories',
  'top reads',
  'top picks',
  'news you might',
  'what you missed',
  'highlights from',
  'new blog post',
  'new article',
  'read our latest',
  'check out our latest',
  'we published',
  'newsletter',
  'new episode',
  'latest episode',
  'podcast is live',
  'in today\'s edition',
  'morning brief',
  'evening brief',
  'daily brief',
  'the daily',
  'issue #',
  'edition #',
  'this week\'s',
  'this month\'s',
]

// ── Other known noise sender domains ──────────────────────────────────────────

const OTHER_NOISE_SENDER_DOMAINS = [
  // Indian utility / services
  'airtel.in',
  'jio.com',
  'vodafone.in',
  'reliancejio.com',
  'bsnl.co.in',
  'tataplay.com',
  'tatacommunications.com',
  'hathway.com',
  'act.in',
  // Healthcare
  'apollohospitals.com',
  'practo.com',
  'tatahealth.com',
  'healthians.com',
  // Insurance
  'icicilombard.com',
  'hdfclife.com',
  'lici.in',
  'maxlifeinsurance.com',
  'reliancegeneral.co.in',
  'sbilife.co.in',
  'bajajfinserv.in',
  'bajajallianz.com',
  // Government
  'uidai.gov.in',
  'incometax.gov.in',
  'gst.gov.in',
  'epfindia.gov.in',
  'digitalindia.gov.in',
]

// ── Aggressive snippet-level noise signals ────────────────────────────────────
// Used only when sender domain and subject don't match anything else.

const SNIPPET_NOISE_SIGNALS = [
  'unsubscribe',
  'click here to unsubscribe',
  'manage your preferences',
  'opt out',
  'to stop receiving',
  'update email preferences',
  'view in browser',
  'having trouble viewing',
]

// Job-related snippet signals — prevent false positives from snippet checks
// These must be specific enough to not collide with marketing text like "limited time offer"
const SNIPPET_JOB_SIGNALS = [
  'interview',
  'application',
  'position',
  'hiring',
  'recruit',
  'candidate',
  'job offer',          // specific — not just "offer"
  'offer letter',       // specific — not just "offer"
]

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * classifyNoise
 *
 * Determines whether an email is noise or potentially job-related.
 *
 * @param {{
 *   subject?: string,
 *   snippet?: string,
 *   sender?:  string,
 * }} input
 *
 * @returns {{
 *   isNoisy:    boolean,
 *   category:   string,
 *   confidence: string,   — 'high' | 'medium' | 'low'
 *   reasons:    string[],
 * }}
 */
function classifyNoise({ subject = '', snippet = '', sender = '' } = {}) {
  const normSubject   = _norm(subject)
  const normSnippet   = _norm(snippet)
  const normSender    = _norm(sender)
  const senderDomain  = _extractDomain(normSender)
  const combined      = `${normSubject} ${normSnippet}`

  // ── Guard 1: known ATS / job platform sender domain ───────────────────────
  const jobDomainHit = _domainMatches(senderDomain, JOB_SIGNAL_SENDER_DOMAINS)
  if (jobDomainHit.matched) {
    return _notNoise(`Job platform sender domain: "${jobDomainHit.domain}"`)
  }

  // ── Guard 2: known job email prefix (recruiting@, hiring@, etc.) ──────────
  for (const prefix of JOB_SIGNAL_SENDER_PREFIXES) {
    if (normSender.includes(prefix)) {
      return _notNoise(`Job email prefix in sender: "${prefix}"`)
    }
  }

  // ── Guard 3: strong job signal in subject line ────────────────────────────
  const jobSubjectHit = _matchesAny(normSubject, JOB_SIGNAL_SUBJECT)
  if (jobSubjectHit.matched) {
    return _notNoise(`Job-signal phrase in subject: "${jobSubjectHit.phrase}"`)
  }

  // ── OTP / Verification ─────────────────────────────────────────────────────
  // Check OTP sender domains first
  const otpDomainHit = _domainMatches(senderDomain, OTP_SENDER_DOMAINS)
  if (otpDomainHit.matched) {
    return _noise('otp_verification', 'high', `OTP sender domain: "${otpDomainHit.domain}"`)
  }
  for (const senderStr of OTP_SENDER_CONTAINS) {
    if (normSender.includes(senderStr)) {
      return _noise('otp_verification', 'high', `Known OTP sender: "${senderStr}"`)
    }
  }
  // Check OTP subject patterns — run against " subject " with padding to help word-boundary matching
  const paddedSubject = ` ${normSubject} `
  const otpSubjectHit = _matchesAny(paddedSubject, OTP_SUBJECT)
  if (otpSubjectHit.matched) {
    return _noise('otp_verification', 'high', `OTP pattern in subject: "${otpSubjectHit.phrase.trim()}"`)
  }

  // ── Banking / Finance ──────────────────────────────────────────────────────
  const bankDomainHit = _domainMatches(senderDomain, BANKING_SENDER_DOMAINS)
  if (bankDomainHit.matched) {
    return _noise('banking_statement', 'high', `Banking sender domain: "${bankDomainHit.domain}"`)
  }
  const bankSubjectHit = _matchesAny(normSubject, BANKING_SUBJECT)
  if (bankSubjectHit.matched) {
    return _noise('banking_statement', 'high', `Banking pattern in subject: "${bankSubjectHit.phrase}"`)
  }
  // Also check snippet for banking alerts (they often appear in preview)
  const bankSnippetHit = _matchesAny(normSnippet, BANKING_SUBJECT)
  if (bankSnippetHit.matched) {
    return _noise('banking_statement', 'medium', `Banking pattern in snippet: "${bankSnippetHit.phrase}"`)
  }

  // ── E-commerce / Orders ────────────────────────────────────────────────────
  const ecomDomainHit = _domainMatches(senderDomain, ECOMMERCE_SENDER_DOMAINS)
  if (ecomDomainHit.matched) {
    return _noise('ecommerce_order', 'high', `E-commerce sender domain: "${ecomDomainHit.domain}"`)
  }
  const ecomSubjectHit = _matchesAny(normSubject, ECOMMERCE_SUBJECT)
  if (ecomSubjectHit.matched) {
    return _noise('ecommerce_order', 'high', `E-commerce pattern in subject: "${ecomSubjectHit.phrase}"`)
  }

  // ── Social Notifications ───────────────────────────────────────────────────
  const socialDomainHit = _domainMatches(senderDomain, SOCIAL_SENDER_DOMAINS)
  if (socialDomainHit.matched) {
    return _noise('social_notification', 'high', `Social media sender domain: "${socialDomainHit.domain}"`)
  }
  const socialSubjectHit = _matchesAny(normSubject, SOCIAL_SUBJECT)
  if (socialSubjectHit.matched) {
    return _noise('social_notification', 'high', `Social notification pattern: "${socialSubjectHit.phrase}"`)
  }

  // ── Marketing / Promotions ─────────────────────────────────────────────────
  // Run on combined subject+snippet because promotions often hide signals in snippet
  const marketingHit = _matchesAny(combined, MARKETING_SUBJECT)
  if (marketingHit.matched) {
    // Safety: if snippet has strong job signals, let it through
    const snippetJobHit = _matchesAny(normSnippet, SNIPPET_JOB_SIGNALS)
    if (!snippetJobHit.matched) {
      return _noise('marketing_promotion', 'medium', `Marketing pattern: "${marketingHit.phrase}"`)
    }
  }

  // ── Newsletter / Digest ────────────────────────────────────────────────────
  const newsletterHit = _matchesAny(normSubject, NEWSLETTER_SUBJECT)
  if (newsletterHit.matched) {
    return _noise('newsletter', 'high', `Newsletter pattern in subject: "${newsletterHit.phrase}"`)
  }

  // ── Other known noise domains ──────────────────────────────────────────────
  const otherDomainHit = _domainMatches(senderDomain, OTHER_NOISE_SENDER_DOMAINS)
  if (otherDomainHit.matched) {
    return _noise('other_noise', 'high', `Known non-job service domain: "${otherDomainHit.domain}"`)
  }

  // ── Snippet-level catch: unsubscribe / email preferences ──────────────────
  // Only trigger if snippet has no job signals
  const snippetNoiseHit = _matchesAny(normSnippet, SNIPPET_NOISE_SIGNALS)
  if (snippetNoiseHit.matched) {
    const snippetJobHit = _matchesAny(normSnippet, SNIPPET_JOB_SIGNALS)
    if (!snippetJobHit.matched) {
      return _noise('marketing_promotion', 'low', `Snippet has noise signal: "${snippetNoiseHit.phrase}"`)
    }
  }

  // ── Default: not_noise ─────────────────────────────────────────────────────
  return {
    isNoisy:    false,
    category:   'not_noise',
    confidence: 'low',
    reasons:    ['No noise patterns matched — passing to NLP pipeline'],
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _noise(category, confidence, reason) {
  return { isNoisy: true, category, confidence, reasons: [reason] }
}

function _notNoise(reason) {
  return { isNoisy: false, category: 'not_noise', confidence: 'high', reasons: [reason] }
}

module.exports = { classifyNoise }
