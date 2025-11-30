const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  from: { type: String, required: true },
  text: { type: String }, // Ya no es obligatorio (puede ser solo imagen)
  read: { type: Boolean, default: false },
  
  // --- NUEVOS CAMPOS ---
  type: { type: String, default: 'text' }, // 'text', 'image', 'file'
  attachmentUrl: { type: String },         // URL del archivo (ej: /uploads/foto.png)
  originalName: { type: String },          // Nombre original (ej: Tarea.pdf)
  // ---------------------
  
  createdAt: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema({
  participants: [{ type: String }],
  messages: [messageSchema]
});

chatSchema.index({ participants: 1 });

module.exports = mongoose.model('Chat', chatSchema);