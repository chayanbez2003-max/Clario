/**
 * testNoiseFilter.js
 *
 * Quick local test for the noise filter service.
 * Run from the server directory:
 *   node scripts/testNoiseFilter.js
 *
 * Expected results are listed inline for each case.
 */

const { classifyNoise } = require('../src/services/noise/noiseFilter')

const TEST_CASES = [
  // ── OTP / Verification ──────────────────────────────────────────────────────
  {
    label:    'OTP email',
    input:    { subject: 'Your OTP for login is 482910', snippet: 'Use this code to login', sender: 'noreply@accounts.google.com' },
    expected: { isNoisy: true, category: 'otp_verification' },
  },
  {
    label:    'Verification code email',
    input:    { subject: 'Your verification code: 123456', snippet: 'Enter this code to verify', sender: 'security@twitter.com' },
    expected: { isNoisy: true, category: 'otp_verification' },
  },
  {
    label:    'Two-factor authentication email',
    input:    { subject: 'Two-factor authentication code', snippet: 'Your 2FA code expires in 10 minutes', sender: 'auth@example.com' },
    expected: { isNoisy: true, category: 'otp_verification' },
  },

  // ── Banking / Finance ───────────────────────────────────────────────────────
  {
    label:    'Bank transaction alert',
    input:    { subject: 'Transaction alert: Rs 2500 debited', snippet: 'Amount debited from your account', sender: 'alerts@hdfcbank.com' },
    expected: { isNoisy: true, category: 'banking_statement' },
  },
  {
    label:    'Credit card statement',
    input:    { subject: 'Your credit card statement is ready', snippet: 'View your monthly statement', sender: 'noreply@icicibank.com' },
    expected: { isNoisy: true, category: 'banking_statement' },
  },
  {
    label:    'UPI transaction',
    input:    { subject: 'UPI transaction successful', snippet: 'Rs 500 sent to merchant', sender: 'noreply@paytm.com' },
    expected: { isNoisy: true, category: 'banking_statement' },
  },

  // ── E-commerce / Orders ─────────────────────────────────────────────────────
  {
    label:    'Amazon order confirmation',
    input:    { subject: 'Your order has been confirmed', snippet: 'Track your order on Amazon', sender: 'shipment-tracking@amazon.in' },
    expected: { isNoisy: true, category: 'ecommerce_order' },
  },
  {
    label:    'Delivery update',
    input:    { subject: 'Your package is out for delivery', snippet: 'Expected delivery today', sender: 'noreply@flipkart.com' },
    expected: { isNoisy: true, category: 'ecommerce_order' },
  },
  {
    label:    'Zomato order',
    input:    { subject: 'Your order is on its way!', snippet: 'Your food will arrive in 30 mins', sender: 'noreply@zomato.com' },
    expected: { isNoisy: true, category: 'ecommerce_order' },
  },

  // ── Marketing / Promotions ──────────────────────────────────────────────────
  {
    label:    'Sale promotion from e-commerce domain',
    input:    { subject: 'Flash sale ends in 2 hours! 50% off', snippet: 'Shop now and save big', sender: 'deals@myntra.com' },
    expected: { isNoisy: true, category: 'ecommerce_order' },  // myntra.com is an e-commerce domain
  },
  {
    label:    'Promo code email',
    input:    { subject: 'Use code SAVE20 for 20% discount', snippet: 'Limited time offer', sender: 'promos@somestore.com' },
    expected: { isNoisy: true, category: 'marketing_promotion' },
  },

  // ── Social Notifications ────────────────────────────────────────────────────
  {
    label:    'LinkedIn connection',
    input:    { subject: 'John Doe wants to connect on LinkedIn', snippet: 'Accept or decline', sender: 'noreply@facebookmail.com' },
    expected: { isNoisy: true, category: 'social_notification' },
  },
  {
    label:    'Twitter notification',
    input:    { subject: 'Someone liked your tweet', snippet: '@user liked your tweet', sender: 'notify@twitter.com' },
    expected: { isNoisy: true, category: 'social_notification' },
  },

  // ── Newsletter / Digest ─────────────────────────────────────────────────────
  {
    label:    'Weekly digest',
    input:    { subject: 'Your weekly digest is ready', snippet: 'Top stories from this week', sender: 'newsletter@somesite.com' },
    expected: { isNoisy: true, category: 'newsletter' },
  },
  {
    label:    'Blog post notification',
    input:    { subject: 'New blog post: 10 tips for developers', snippet: 'Read our latest article', sender: 'blog@devsite.com' },
    expected: { isNoisy: true, category: 'newsletter' },
  },

  // ── Job emails — MUST NOT be filtered ──────────────────────────────────────
  {
    label:    'Application confirmation',
    input:    { subject: 'Application received for Software Engineer at Google', snippet: 'Thank you for applying', sender: 'careers@google.com' },
    expected: { isNoisy: false, category: 'not_noise' },
  },
  {
    label:    'Interview invitation',
    input:    { subject: 'Interview invitation for SWE role at Stripe', snippet: 'We would like to schedule an interview', sender: 'recruiting@stripe.com' },
    expected: { isNoisy: false, category: 'not_noise' },
  },
  {
    label:    'HackerRank assessment',
    input:    { subject: 'Complete your HackerRank assessment for Amazon', snippet: 'Click to start the coding challenge', sender: 'no-reply@hackerrank.com' },
    expected: { isNoisy: false, category: 'not_noise' },
  },
  {
    label:    'Rejection email',
    input:    { subject: 'Update on your application to Microsoft', snippet: 'Unfortunately we will not be moving forward with your application', sender: 'jobs@microsoft.com' },
    expected: { isNoisy: false, category: 'not_noise' },
  },
  {
    label:    'Offer letter',
    input:    { subject: 'Offer Letter - Software Engineer', snippet: 'We are pleased to offer you the position', sender: 'hr@startup.com' },
    expected: { isNoisy: false, category: 'not_noise' },
  },
  {
    label:    'Greenhouse ATS email',
    input:    { subject: 'Your application to Notion', snippet: 'Application submitted successfully', sender: 'no-reply@greenhouse.io' },
    expected: { isNoisy: false, category: 'not_noise' },
  },
  {
    label:    'LinkedIn job application',
    input:    { subject: 'Thank you for applying to Backend Engineer at Flipkart', snippet: 'Application received', sender: 'jobs-noreply@linkedin.com' },
    expected: { isNoisy: false, category: 'not_noise' },
  },
]

// ── Run tests ─────────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

console.log('\n🧪 Noise Filter Test Results\n' + '─'.repeat(60))

for (const tc of TEST_CASES) {
  const result = classifyNoise(tc.input)
  const isNoisyOk   = result.isNoisy === tc.expected.isNoisy
  const categoryOk  = result.category === tc.expected.category
  const ok          = isNoisyOk && categoryOk

  const icon = ok ? '✅' : '❌'
  if (ok) {
    passed++
    console.log(`${icon} ${tc.label}`)
    console.log(`   → ${result.category} (${result.confidence}) — ${result.reasons[0]}`)
  } else {
    failed++
    console.log(`${icon} ${tc.label}`)
    console.log(`   Expected: isNoisy=${tc.expected.isNoisy} category=${tc.expected.category}`)
    console.log(`   Got:      isNoisy=${result.isNoisy} category=${result.category}`)
    console.log(`   Reason:   ${result.reasons[0]}`)
  }
  console.log()
}

console.log('─'.repeat(60))
console.log(`Results: ${passed} passed, ${failed} failed out of ${TEST_CASES.length} tests`)
if (failed === 0) {
  console.log('🎉 All tests passed!\n')
} else {
  console.log(`⚠️  ${failed} test(s) failed — review noise filter rules.\n`)
  process.exit(1)
}
