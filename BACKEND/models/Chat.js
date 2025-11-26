// BACKEND/models/Chat.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  from: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema({
  participants: [{ type: String }], // Array con los usernames de los participantes
  messages: [messageSchema]         // Array con los mensajes de la conversación
});

// Creamos un índice para buscar rápido por participantes
chatSchema.index({ participants: 1 });

module.exports = mongoose.model('Chat', chatSchema);