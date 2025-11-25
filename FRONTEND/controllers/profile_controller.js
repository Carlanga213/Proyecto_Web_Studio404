// BACKEND/controllers/profile_controller.js
const fs = require('fs')
const path = require('path')

const USERS_DB_PATH = path.join(__dirname, '..', 'database', 'users.json')
const PROFILES_DB_PATH = path.join(__dirname, '..', 'database', 'profiles.json')

function ensureProfilesFile() {
  if (!fs.existsSync(PROFILES_DB_PATH)) {
    fs.writeFileSync(PROFILES_DB_PATH, '[]', 'utf8')
  }
}

function readUsers() {
  if (!fs.existsSync(USERS_DB_PATH)) {
    fs.writeFileSync(USERS_DB_PATH, '[]', 'utf8')
  }
  const raw = fs.readFileSync(USERS_DB_PATH, 'utf8')
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function readProfiles() {
  ensureProfilesFile()
  const raw = fs.readFileSync(PROFILES_DB_PATH, 'utf8')
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function writeProfiles(profiles) {
  fs.writeFileSync(PROFILES_DB_PATH, JSON.stringify(profiles, null, 2), 'utf8')
}

function getCurrentUser(req) {
  const users = readUsers()
  let user = null

  const idHeader = req.headers['x-user-id']
  if (idHeader) {
    const idNum = parseInt(idHeader, 10)
    if (!Number.isNaN(idNum)) {
      user = users.find(u => u.id === idNum)
    }
  }

  if (!user) {
    const usernameHeader = req.headers['x-user']
    if (usernameHeader && typeof usernameHeader === 'string') {
      const trimmed = usernameHeader.trim()
      if (trimmed !== '') {
        user = users.find(u => u.username === trimmed)
      }
    }
  }

  if (!user) {
    const body = req.body || {}

    if (body.id != null) {
      const idNum = parseInt(body.id, 10)
      if (!Number.isNaN(idNum)) {
        user = users.find(u => u.id === idNum)
      }
    }

    if (!user && typeof body.username === 'string') {
      const trimmed = body.username.trim()
      if (trimmed !== '') {
        user = users.find(u => u.username === trimmed)
      }
    }
  }

  return user
}

function findProfileByUserId(profiles, userId) {
  return profiles.find(p => p.userId === userId)
}

function createDefaultProfileForUser(user, profiles) {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  const nextId =
    profiles.length > 0
      ? Math.max(...profiles.map(p => p.id || 0)) + 1
      : 1

  const profile = {
    id: nextId,
    userId: user.id,
    username: user.username,
    displayName: user.name || user.username,
    bio: '',
    cakeDay: today,
    birthdate: null,
    location: '',
    website: '',
    pronouns: ''
  }

  profiles.push(profile)
  return profile
}

function toDto(profile) {
  if (!profile) return null
  return {
    id: profile.id,
    userId: profile.userId,
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.bio || '',
    cakeDay: profile.cakeDay || null,
    birthdate: profile.birthdate || null,
    location: profile.location || '',
    website: profile.website || '',
    pronouns: profile.pronouns || ''
  }
}

// READ del perfil del usuario actual
exports.getMe = (req, res) => {
  const user = getCurrentUser(req)
  if (!user) {
    return res
      .status(401)
      .json({ ok: false, error: 'User not found for this request' })
  }

  const profiles = readProfiles()
  let profile = findProfileByUserId(profiles, user.id)

  if (!profile) {
    profile = createDefaultProfileForUser(user, profiles)
    writeProfiles(profiles)
  }

  return res.json({
    ok: true,
    profile: toDto(profile)
  })
}

// UPDATE para crear o actualizar datos del perfil
exports.updateMe = (req, res) => {
  const user = getCurrentUser(req)
  if (!user) {
    return res
      .status(401)
      .json({ ok: false, error: 'User not found for this request' })
  }

  const profiles = readProfiles()
  let profile = findProfileByUserId(profiles, user.id)

  if (!profile) {
    profile = createDefaultProfileForUser(user, profiles)
  }

  const body = req.body || {}
  const {
    displayName,
    bio,
    birthdate,
    location,
    website,
    pronouns,
    cakeDay
  } = body

  if (typeof displayName === 'string' && displayName.trim() !== '') {
    profile.displayName = displayName.trim()
  }

  if (typeof bio === 'string') {
    profile.bio = bio
  }

  if (birthdate !== undefined) {
    profile.birthdate = birthdate || null
  }

  if (typeof location === 'string') {
    profile.location = location
  }

  if (typeof website === 'string') {
    profile.website = website
  }

  if (typeof pronouns === 'string') {
    profile.pronouns = pronouns
  }

  if (typeof cakeDay === 'string' && cakeDay.trim() !== '') {
    profile.cakeDay = cakeDay.trim()
  }

  writeProfiles(profiles)

  return res.json({
    ok: true,
    profile: toDto(profile)
  })
}

// DELETE del perfil del usuario actual
exports.deleteMe = (req, res) => {
  const user = getCurrentUser(req)
  if (!user) {
    return res
      .status(401)
      .json({ ok: false, error: 'User not found for this request' })
  }

  const profiles = readProfiles()
  const remaining = profiles.filter(p => p.userId !== user.id)
  writeProfiles(remaining)

  return res.json({ ok: true })
}

// LIST de todos los perfiles, para que sea CRUD completo
exports.listAll = (req, res) => {
  const profiles = readProfiles()
  return res.json({
    ok: true,
    profiles: profiles.map(toDto)
  })
}
