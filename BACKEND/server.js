// BACKEND/server.js
const express = require('express')
const cors = require('cors')
const path = require('path')
// 1. Importamos módulos para Socket.IO
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const PORT = 3000

// 2. Creamos el servidor HTTP explícitamente
const server = http.createServer(app)

// 3. Inicializamos Socket.IO adjunto al servidor HTTP
const io = new Server(server, {
  cors: {
    origin: "*", // Permitir conexiones desde cualquier origen (útil para desarrollo)
    methods: ["GET", "POST"]
  }
})

// Middleware para JSON y CORS
app.use(cors())
app.use(express.json())

// 4. Middleware para hacer 'io' accesible en los controladores (API)
app.use((req, res, next) => {
  req.io = io
  next()
})

// Rutas API
const apiRoutes = require('./routes/api')
app.use('/api', apiRoutes)

// --- CONFIGURACIÓN DE ARCHIVOS ESTÁTICOS (CORREGIDA) ---

// A. Servir la carpeta 'views' para que encuentres los HTMLs directamente en la raíz
// Ejemplo: http://localhost:3000/chat_section.html
app.use(express.static(path.join(__dirname, '..', 'FRONTEND', 'views')))

// B. Servir la carpeta 'FRONTEND' para que carguen los assets, scripts y estilos
// Ejemplo: http://localhost:3000/controllers/chat_controller.js
app.use(express.static(path.join(__dirname, '..', 'FRONTEND')))

// -------------------------------------------------------

// 5. Lógica de conexión de Sockets
io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado:', socket.id)

  // Evento: Un usuario se une a su propia "sala" privada usando su username
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

// 6. Usamos 'server.listen' en lugar de 'app.listen' para que funcionen los sockets
server.listen(PORT, () => {
  console.log(`Server running with Socket.IO on http://localhost:${PORT}`)
})