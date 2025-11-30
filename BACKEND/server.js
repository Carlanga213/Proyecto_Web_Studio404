// BACKEND/server.js
const express = require('express')
const cors = require('cors')
const path = require('path')
const http = require('http')
const { Server } = require('socket.io')
const mongoose = require('mongoose') // <--- 1. IMPORTAR MONGOOSE

const app = express()
const PORT = 3000

// --- 2. CONEXIÓN A MONGODB ---
// REEMPLAZA 'TU_LIGA_AQUI' con tu connection string real de MongoDB Atlas o Local
// Ejemplo: 'mongodb+srv://usuario:password@cluster0.mongodb.net/mi_chat_db'
const MONGO_URI = 'mongodb+srv://admin:Studio404@studio404.lsegwoz.mongodb.net/Studio404'; 

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Conectado exitosamente a MongoDB'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));
// -----------------------------

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

// Archivos estáticos
app.use(express.static(path.join(__dirname, '..', 'FRONTEND', 'views')))
app.use(express.static(path.join(__dirname, '..', 'FRONTEND')))

app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

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