// BACKEND/routes/api.js
const express = require('express')
const router = express.Router()
const path = require('path')
const multer = require('multer') // 1. Importar Multer

// Importar controladores
const posts = require('../controllers/posts_controller')
const comments = require('../controllers/comments_controller')
const topics = require('../controllers/topics_controller')
const auth = require('../controllers/auth_controller')
const profile = require('../controllers/profile_controller')
const chat = require('../controllers/chat_controller')

// --- 2. CONFIGURACIÓN MULTER ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Los archivos se guardarán en BACKEND/uploads
    cb(null, path.join(__dirname, '..', 'uploads'))
  },
  filename: (req, file, cb) => {
    // Nombre único para evitar sobrescribir: fecha + nombre original
    // Reemplazamos espacios por guiones bajos para evitar problemas de URL
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
  }
})
const upload = multer({ storage })
// ----------------------------

// --- RUTAS ---

// Auth
router.post('/auth/register', auth.register)
router.post('/auth/login', auth.login)

// Posts
router.get('/posts', posts.listAll)
router.get('/posts/:id', posts.getPostById)
router.post('/posts', posts.create)
router.put('/posts/:id', posts.update)
router.delete('/posts/:id', posts.remove)
router.post('/posts/:id/like', posts.toggleLike)
router.post('/posts/:id/save', posts.toggleSave)

// Comments
router.get('/posts/:id/comments', comments.listForPost)
router.post('/posts/:id/comments', comments.createForPost)
router.put('/comments/:id', comments.updateComment)
router.delete('/comments/:id', comments.deleteComment)
router.post('/comments/:id/like', comments.toggleLike)

// Topics
router.get('/topics/mine', topics.listMine)
router.get('/topics/joined', topics.listJoined)
router.post('/topics/join-by-name', topics.joinByName)
router.post('/topics', topics.create)
router.put('/topics/:id', topics.update)
router.post('/topics/:id/leave', topics.leave)
router.delete('/topics/:id', topics.remove)

// Profiles
router.get('/profiles/me', profile.getMe)
router.put('/profiles/me', profile.updateMe)
router.delete('/profiles/me', profile.deleteMe)
router.get('/profiles', profile.listAll)

// --- CHAT ROUTES ---
router.get('/chats', chat.listConversations)
router.get('/chats/:targetUser', chat.getHistory)
// Actualizado: Ahora sendMessage recibe datos de archivos
router.post('/chats/:targetUser', chat.sendMessage)
router.put('/chats/:targetUser/read', chat.markAsRead)
router.delete('/chats/:targetUser', chat.deleteConversation)

// --- NUEVA RUTA: SUBIDA DE ARCHIVOS ---
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, error: 'No file uploaded' })
  }
  // Devolvemos la URL pública del archivo
  res.json({
    ok: true,
    url: '/uploads/' + req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype
  })
})
// -------------------------------------

module.exports = router