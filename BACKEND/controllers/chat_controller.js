// BACKEND/controllers/chat_controller.js
const fs = require('fs')
const path = require('path')

const DB_PATH = path.join(__dirname, '..', 'database', 'messages.json')

// Helper: Leer DB
function readMessages() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, '[]', 'utf8')
  }
  const raw = fs.readFileSync(DB_PATH, 'utf8')
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

// Helper: Escribir DB
function writeMessages(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8')
}

// Helper: Obtener usuario del request (Igual que en tus otros controladores)
function getUsername(req) {
  const headerUser = req.headers['x-user']
  if (headerUser && typeof headerUser === 'string' && headerUser.trim() !== '') {
    return headerUser.trim()
  }
  return null
}

// GET /api/chats -> Lista de conversaciones recientes del usuario
exports.listConversations = (req, res) => {
  const username = getUsername(req)
  if (!username) return res.status(401).json({ ok: false, error: 'User required' })

  const allChats = readMessages()
  
  // Filtramos chats donde el usuario es participante
  const myChats = allChats.filter(c => Array.isArray(c.participants) && c.participants.includes(username))

  // Para cada chat, identificamos quién es el "otro" usuario para mostrarlo en el frontend
  const previews = myChats.map(chat => {
    const otherUser = chat.participants.find(p => p !== username) || username // Fallback si es chat consigo mismo
    const lastMsg = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null
    
    return {
      username: otherUser, // El frontend usará esto para pedir los detalles del perfil
      lastMessage: lastMsg ? lastMsg.text : '',
      timestamp: lastMsg ? lastMsg.createdAt : null
    }
  })

  res.json({ ok: true, conversations: previews })
}

// GET /api/chats/:targetUser -> Obtener historial completo con un usuario específico
exports.getHistory = (req, res) => {
  const username = getUsername(req)
  const targetUser = req.params.targetUser
  
  if (!username) return res.status(401).json({ ok: false, error: 'User required' })

  const allChats = readMessages()

  // Buscamos una conversación que tenga a AMBOS participantes
  const chat = allChats.find(c => 
    c.participants.includes(username) && 
    c.participants.includes(targetUser)
  )

  if (!chat) {
    // Si no existe, devolvemos array vacío, no es error
    return res.json({ ok: true, messages: [] })
  }

  res.json({ ok: true, messages: chat.messages })
}

// POST /api/chats/:targetUser -> Enviar mensaje
exports.sendMessage = (req, res) => {
  const username = getUsername(req)
  const targetUser = req.params.targetUser
  const { text } = req.body

  if (!username) return res.status(401).json({ ok: false, error: 'User required' })
  if (!text || text.trim() === '') return res.status(400).json({ ok: false, error: 'Message cannot be empty' })

  let allChats = readMessages()

  let chatIndex = allChats.findIndex(c => 
    c.participants.includes(username) && 
    c.participants.includes(targetUser)
  )

  const newMessage = {
    from: username,
    text: text.trim(),
    createdAt: new Date().toISOString()
  }

  if (chatIndex === -1) {
    const newChat = {
      id: Date.now(),
      participants: [username, targetUser],
      messages: [newMessage]
    }
    allChats.push(newChat)
  } else {
    allChats[chatIndex].messages.push(newMessage)
  }

  writeMessages(allChats)

  // --- LÓGICA SOCKET.IO NUEVA ---
  if (req.io) {
    // 1. Enviar evento al DESTINATARIO (para que le aparezca el mensaje)
    req.io.to(targetUser).emit('receive_message', {
      message: newMessage,
      chatWith: username // Para el destinatario, el chat es con el remitente
    })

    // 2. Enviar evento al REMITENTE (para sincronizar si tiene varias pestañas abiertas)
    req.io.to(username).emit('receive_message', {
      message: newMessage,
      chatWith: targetUser
    })
  }
  // ------------------------------

  res.json({ ok: true, message: newMessage })
}

exports.deleteConversation = (req, res) => {
  const username = getUsername(req)
  const targetUser = req.params.targetUser

  if (!username) return res.status(401).json({ ok: false, error: 'User required' })

  let allChats = readMessages()
  
  // Filtramos para EXCLUIR la conversación actual (así se borra)
  const initialLength = allChats.length
  allChats = allChats.filter(c => 
    !(c.participants.includes(username) && c.participants.includes(targetUser))
  )

  // Guardamos los cambios
  writeMessages(allChats)

  // Notificar en tiempo real a ambos usuarios que el chat fue borrado
  if (req.io) {
    [username, targetUser].forEach(u => {
      req.io.to(u).emit('chat_deleted', { 
        deletedBy: username,
        partner: u === username ? targetUser : username 
      })
    })
  }

  res.json({ ok: true })
}