// BACKEND/controllers/profile_controller.js

const fs = require('fs')
const path = require('path')

const DB_PATH = path.join(__dirname, '..', 'database', 'users.json')

function ensureUsersFile() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, '[]', 'utf8')
  }
}

function readUsers() {
  ensureUsersFile()
  const raw = fs.readFileSync(DB_PATH, 'utf8')
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function writeUsers(users) {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2), 'utf8')
}

function findCurrentUser(req, users) {
  if (!Array.isArray(users)) {
    users = []
  }

  const idHeader = req.headers['x-user-id']
  if (idHeader) {
    const idNum = parseInt(idHeader, 10)
    if (!Number.isNaN(idNum)) {
      const byId = users.find(u => u.id === idNum)
      if (byId) return byId
    }
  }

  const usernameHeader = req.headers['x-user']
  if (usernameHeader && typeof usernameHeader === 'string') {
    const trimmed = usernameHeader.trim()
    if (trimmed !== '') {
      const byUsername = users.find(u => u.username === trimmed)
      if (byUsername) return byUsername
    }
  }

  const body = req.body || {}

  if (body.id != null) {
    const idNum = parseInt(body.id, 10)
    if (!Number.isNaN(idNum)) {
      const byId = users.find(u => u.id === idNum)
      if (byId) return byId
    }
  }

  if (typeof body.username === 'string') {
    const trimmed = body.username.trim()
    if (trimmed !== '') {
      const byUsername = users.find(u => u.username === trimmed)
      if (byUsername) return byUsername
    }
  }

  return null
}

function toProfileDto(user) {
  if (!user) return null
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    birthdate: user.birthdate || null,
    bio: user.bio || '',
    avatarUrl: user.avatarUrl || null
  }
}

// GET api profile me
exports.getMe = (req, res) => {
  const users = readUsers()
  const current = findCurrentUser(req, users)

  if (!current) {
    return res
      .status(401)
      .json({ ok: false, error: 'User not found for this request' })
  }

  return res.json({
    ok: true,
    profile: toProfileDto(current)
  })
}

// PUT api profile me - ACTUALIZAR CON SOPORTE PARA PASSWORD Y AVATAR
exports.updateMe = (req, res) => {
  const users = readUsers()
  const current = findCurrentUser(req, users)

  if (!current) {
    return res
      .status(401)
      .json({ ok: false, error: 'User not found for this request' })
  }

  const body = req.body || {}
  const { name, email, birthdate, bio, avatarUrl, currentPassword, newPassword } = body

  // Cambio de contraseña
  if (currentPassword && newPassword) {
    if (currentPassword === newPassword) {
      return res
        .status(400)
        .json({ ok: false, error: 'New password cannot be the same as current password' })
    }

    if (current.password !== currentPassword) {
      return res
        .status(400)
        .json({ ok: false, error: 'Current password is incorrect' })
    }

    if (newPassword.trim().length < 6) {
      return res
        .status(400)
        .json({ ok: false, error: 'New password must be at least 6 characters' })
    }

    current.password = newPassword
  }

  // Email update
  if (email && email !== current.email) {
    const emailExists = users.some(
      u => u.email === email && u.id !== current.id
    )
    if (emailExists) {
      return res
        .status(400)
        .json({ ok: false, error: 'Email already in use by another user' })
    }
    current.email = email
  }

  // Actualizar otros campos del perfil
  if (typeof name === 'string' && name.trim() !== '') {
    current.name = name.trim()
  }

  if (birthdate !== undefined) {
    current.birthdate = birthdate || null
  }

  if (typeof bio === 'string') {
    current.bio = bio
  }

  // Actualizar avatar URL (puede ser base64 o null)
  if (avatarUrl !== undefined) {
    if (avatarUrl === null) {
      current.avatarUrl = null
    } else if (typeof avatarUrl === 'string') {
      current.avatarUrl = avatarUrl
    }
  }

  // IMPORTANTE: Guardar cambios en la base de datos
  writeUsers(users)

  return res.json({
    ok: true,
    profile: toProfileDto(current)
  })
}

// DELETE api profile me
exports.deleteMe = (req, res) => {
  const users = readUsers()
  const current = findCurrentUser(req, users)

  if (!current) {
    return res
      .status(401)
      .json({ ok: false, error: 'User not found for this request' })
  }

  // Validar contraseña
  const body = req.body || {}
  const { password } = body

  if (!password) {
    return res
      .status(400)
      .json({ ok: false, error: 'Password is required to delete account' })
  }

  if (current.password !== password) {
    return res
      .status(401)
      .json({ ok: false, error: 'Password is incorrect' })
  }

  // Eliminar usuario
  const updatedUsers = users.filter(u => u.id !== current.id)
  writeUsers(updatedUsers)

  return res.json({
    ok: true,
    message: 'Account deleted successfully'
  })
}

// GET all profiles
exports.listAll = (req, res) => {
  const users = readUsers()
  const profiles = users.map(toProfileDto)

  return res.json({
    ok: true,
    profiles
  })
}
