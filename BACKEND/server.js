// BACKEND/server.js
const express = require('express')
const cors = require('cors')
const path = require('path')
const http = require('http')
const { Server } = require('socket.io')
const mongoose = require('mongoose')

const app = express()
const PORT = 3000

// --- CONEXIÓN A MONGODB ---
// Asegúrate de que esta IP (0.0.0.0/0) esté permitida en MongoDB Atlas -> Network Access
const MONGO_URI = 'mongodb+srv://admin:Studio404@studio404.lsegwoz.mongodb.net/Studio404'; 

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Conectado exitosamente a MongoDB'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

app.use(cors())
app.use(express.json())

app.use((req, res, next) => {
  req.io = io
  next()
})

const apiRoutes = require('./routes/api')
app.use('/api', apiRoutes)

// --- CONFIGURACIÓN DE ARCHIVOS ESTÁTICOS ---

// 1. IMPORTANTE: Permitir acceso a la carpeta de cargas (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// 2. Servir Vistas HTML
app.use(express.static(path.join(__dirname, '..', 'FRONTEND', 'views')))

// 3. Servir Assets (CSS, JS)
app.use(express.static(path.join(__dirname, '..', 'FRONTEND')))

app.get('/', (req, res) => {
  res.redirect('/home_sin_auth.html')
})

// Sockets
io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado:', socket.id)
  socket.on('join_room', (username) => {
    if (username) {
      socket.join(username)
      console.log(`Usuario ${username} unido a la sala: ${username}`)
    }
  })
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id)
  })
})

server.listen(PORT, () => {
  console.log(`Server running with Socket.IO on http://localhost:${PORT}`)
})