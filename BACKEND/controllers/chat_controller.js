// BACKEND/controllers/chat_controller.js
const Chat = require('../models/Chat');

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
  
  // --- AGREGAR ESTOS LOGS PARA DEBUG ---
  console.log("---------------- DEBUG CHAT ----------------");
  console.log("1. Usuario solicitando chats:", username);
  
  if (!username) return res.status(401).json({ ok: false, error: 'User required' })

  try {
    const chats = await Chat.find({ participants: username });
    
    // --- VER QUÉ ENCONTRÓ ---
    console.log(`2. Chats encontrados en la DB para '${username}':`, chats.length);
    if(chats.length === 0) {
       console.log("   (Si es 0, verifica que el nombre en Atlas sea EXACTO al usuario)");
    }

    const previews = chats.map(chat => {
      const otherUser = chat.participants.find(p => p !== username) || username;
      const lastMsg = chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;
      
      const unreadCount = chat.messages.filter(m => m.from !== username && !m.read).length;

      let previewText = '';
      if (lastMsg) {
        if (lastMsg.type === 'image') previewText = '📷 Image';
        else if (lastMsg.type === 'file') previewText = '📎 File';
        else previewText = lastMsg.text;
      }

      return {
        username: otherUser,
        lastMessage: previewText,
        timestamp: lastMsg ? lastMsg.createdAt : null,
        unreadCount: unreadCount
      }
    });

    previews.sort((a, b) => {
      const dateA = a.timestamp ? new Date(a.timestamp) : 0;
      const dateB = b.timestamp ? new Date(b.timestamp) : 0;
      return dateB - dateA;
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
    const chat = await Chat.findOne({ participants: { $all: [username, targetUser] } });
    if (!chat) return res.json({ ok: true, messages: [] });
    res.json({ ok: true, messages: chat.messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error fetching history' });
  }
}

// POST /api/chats/:targetUser (Enviar)
exports.sendMessage = async (req, res) => {
  const username = getUsername(req)
  const targetUser = req.params.targetUser
  const { text, type, attachmentUrl, originalName } = req.body

  if (!username) return res.status(401).json({ ok: false, error: 'User required' })
  
  if ((!type || type === 'text') && (!text || text.trim() === '')) {
    return res.status(400).json({ ok: false, error: 'Message empty' })
  }

  try {
    let chat = await Chat.findOne({ participants: { $all: [username, targetUser] } });

    const newMessage = {
      from: username,
      text: text || '',
      type: type || 'text',
      attachmentUrl: attachmentUrl || null,
      originalName: originalName || null,
      read: false,
      createdAt: new Date()
    };

    if (!chat) {
      chat = new Chat({ participants: [username, targetUser], messages: [newMessage] });
    } else {
      chat.messages.push(newMessage);
    }

    // SI ESTO FALLA (por permisos de IP en Atlas), salta al catch y no envía el socket
    await chat.save(); 

    if (req.io) {
      req.io.to(targetUser).emit('receive_message', { message: newMessage, chatWith: username });
      req.io.to(username).emit('receive_message', { message: newMessage, chatWith: targetUser });
    }

    res.json({ ok: true, message: newMessage });
  } catch (err) {
    console.error("Error saving message:", err);
    res.status(500).json({ ok: false, error: 'Error sending message' });
  }
}

// PUT /read (Marcar leído)
exports.markAsRead = async (req, res) => {
  const username = getUsername(req);
  const targetUser = req.params.targetUser;
  if (!username) return res.status(401).json({ ok: false, error: 'User required' });

  try {
    const chat = await Chat.findOne({ participants: { $all: [username, targetUser] } });
    if (chat) {
      let modified = false;
      chat.messages.forEach(msg => {
        if (msg.from === targetUser && !msg.read) {
          msg.read = true;
          modified = true;
        }
      });

      if (modified) {
        await chat.save();
        if (req.io) {
          req.io.to(targetUser).emit('messages_read_update', { readBy: username });
        }
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error marking read' });
  }
};

// DELETE
exports.deleteConversation = async (req, res) => {
  const username = getUsername(req)
  const targetUser = req.params.targetUser
  if (!username) return res.status(401).json({ ok: false, error: 'User required' })

  try {
    await Chat.findOneAndDelete({ participants: { $all: [username, targetUser] } });
    if (req.io) {
      [username, targetUser].forEach(u => {
        req.io.to(u).emit('chat_deleted', { deletedBy: username, partner: u === username ? targetUser : username })
      });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error deleting chat' });
  }
}