// BACKEND/server.js
const express = require('express')
const path = require('path')

const app = express()
const PORT = 3000

// Aumentar límite de JSON para imágenes en base64
app.use(express.json({ limit: '50mb' }))

// parse JSON body
app.use(express.json())

// api routes
const apiRoutes = require('./routes/api')
app.use('/api', apiRoutes)

// static files for frontend
app.use('/assets', express.static(path.join(__dirname, '../FRONTEND/assets')))
app.use('/controllers', express.static(path.join(__dirname, '../FRONTEND/controllers')))

// 👉 Nuevo: ruta raíz que manda a home_sin_auth.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../FRONTEND/views', 'home_sin_auth.html'))
})

// después de eso puedes seguir sirviendo el resto de views estáticas
app.use('/', express.static(path.join(__dirname, '../FRONTEND/views')))

// health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
