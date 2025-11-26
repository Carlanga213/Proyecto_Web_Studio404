const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  conversationId: { type: String, required: true }, // ID único de la sala (ej: "idUser1_idUser2")
  sender: { type: String, required: true }, // Username o ID del que envía
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);