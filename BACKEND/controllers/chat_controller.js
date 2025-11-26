// BACKEND/controllers/chat_controller.js
const Chat = require('../models/Chat'); // Importamos el modelo

// Helper: Obtener usuario
function getUsername(req) {
  const headerUser = req.headers['x-user']
  if (headerUser && typeof headerUser === 'string' && headerUser.trim() !== '') {
    return headerUser.trim()
  }
  return null
}

// GET /api/chats
exports.listConversations = async (req, res) => {
  const username = getUsername(req)
  if (!username) return res.status(401).json({ ok: false, error: 'User required' })

  try {
    // Buscamos chats donde el usuario sea participante
    const chats = await Chat.find({ participants: username });

    const previews = chats.map(chat => {
      // Identificar al otro participante
      const otherUser = chat.participants.find(p => p !== username) || username;
      // Obtener último mensaje
      const lastMsg = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;
      
      return {
        username: otherUser,
        lastMessage: lastMsg ? lastMsg.text : '',
        timestamp: lastMsg ? lastMsg.createdAt : null
      }
    });

    res.json({ ok: true, conversations: previews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error fetching chats' });
  }
}

// GET /api/chats/:targetUser
exports.getHistory = async (req, res) => {
  const username = getUsername(req)
  const targetUser = req.params.targetUser
  
  if (!username) return res.status(401).json({ ok: false, error: 'User required' })

  try {
    // Buscamos el chat específico entre estos dos usuarios
    const chat = await Chat.findOne({
      participants: { $all: [username, targetUser] }
    });

    if (!chat) {
      return res.json({ ok: true, messages: [] });
    }

    res.json({ ok: true, messages: chat.messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error fetching history' });
  }
}

// POST /api/chats/:targetUser
exports.sendMessage = async (req, res) => {
  const username = getUsername(req)
  const targetUser = req.params.targetUser
  const { text } = req.body

  if (!username) return res.status(401).json({ ok: false, error: 'User required' })
  if (!text || text.trim() === '') return res.status(400).json({ ok: false, error: 'Message empty' })

  try {
    // 1. Buscar chat existente
    let chat = await Chat.findOne({
      participants: { $all: [username, targetUser] }
    });

    const newMessage = {
      from: username,
      text: text.trim(),
      createdAt: new Date()
    };

    if (!chat) {
      // 2. Si no existe, crear uno nuevo
      chat = new Chat({
        participants: [username, targetUser],
        messages: [newMessage]
      });
    } else {
      // 3. Si existe, agregar mensaje (push)
      chat.messages.push(newMessage);
    }

    await chat.save();

    // Notificación Socket.IO
    if (req.io) {
      req.io.to(targetUser).emit('receive_message', {
        message: newMessage,
        chatWith: username
      });
      req.io.to(username).emit('receive_message', {
        message: newMessage,
        chatWith: targetUser
      });
    }

    res.json({ ok: true, message: newMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error sending message' });
  }
}

// DELETE /api/chats/:targetUser
exports.deleteConversation = async (req, res) => {
  const username = getUsername(req)
  const targetUser = req.params.targetUser

  if (!username) return res.status(401).json({ ok: false, error: 'User required' })

  try {
    // Eliminar documento de la colección
    await Chat.findOneAndDelete({
      participants: { $all: [username, targetUser] }
    });

    if (req.io) {
      [username, targetUser].forEach(u => {
        req.io.to(u).emit('chat_deleted', { 
          deletedBy: username,
          partner: u === username ? targetUser : username 
        })
      });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error deleting chat' });
  }
}