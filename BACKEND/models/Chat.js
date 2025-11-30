// BACKEND/models/Chat.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  from: { type: String, required: true },
  text: { type: String }, // Opcional, puede ser solo imagen
  read: { type: Boolean, default: false },
  
  // Campos para adjuntos
  type: { type: String, default: 'text' }, // text, image, file
  attachmentUrl: { type: String },
  originalName: { type: String },
  
  createdAt: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema({
  participants: [{ type: String }],
  messages: [messageSchema]
});

chatSchema.index({ participants: 1 });

module.exports = mongoose.model('Chat', chatSchema);