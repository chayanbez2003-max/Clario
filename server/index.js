require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const morgan  = require('morgan')
const connectDB = require('./src/config/db')

// ── Route imports ──
const userRoutes         = require('./src/routes/userRoutes')
const gmailRoutes        = require('./src/routes/gmailRoutes')
const applicationsRoutes = require('./src/routes/applicationsRoutes')
const stageRoutes        = require('./src/routes/stageRoutes')

const app  = express()
const PORT = process.env.PORT || 5000

// ── Connect to MongoDB ──
connectDB()

// ── Middleware ──
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

// ── Routes ──
app.get('/', (req, res) => {
  res.json({ message: '🚀 Clario API is running', version: '2.0.0' })
})

app.use('/api/users',        userRoutes)
app.use('/api/gmail',        gmailRoutes)
app.use('/api/applications', applicationsRoutes)
app.use('/api/stages',       stageRoutes)

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` })
})

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  })
})

// ── Start server ──
app.listen(PORT, () => {
  console.log(`✅ Clario server running on http://localhost:${PORT}`)
})