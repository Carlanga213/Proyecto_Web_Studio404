const fs = require('fs')
const path = require('path')

const DB_PATH = path.join(__dirname, '..', 'database', 'users.json')

function readUsers() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, '[]', 'utf8')
  }
  const raw = fs.readFileSync(DB_PATH, 'utf8')
  return JSON.parse(raw)
}

function writeUsers(users) {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2), 'utf8')
}

// POST api auth register
exports.register = (req, res) => {
  const { username, name, email, password } = req.body || {}

  if (!username || !email || !password) {
    return res.status(400).json({ ok: false, error: 'Missing fields' })
  }

  const users = readUsers()

  const emailExists = users.some(u => u.email === email)
  if (emailExists) {
    return res.status(400).json({ ok: false, error: 'Email already registered' })
  }

  const usernameExists = users.some(u => u.username === username)
  if (usernameExists) {
    return res.status(400).json({ ok: false, error: 'Username already taken' })
  }

  const newId = users.length > 0 ? users[users.length - 1].id + 1 : 1

  const user = {
    id: newId,
    username,
    name: name || username,
    email,
    password
  }

  users.push(user)
  writeUsers(users)

  const safeUser = {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email
  }

  res.status(201).json({ ok: true, user: safeUser })
}

// POST api auth login
exports.login = (req, res) => {
  const { email, password } = req.body || {}

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'Missing email or password' })
  }

  const users = readUsers()
  const user = users.find(u => u.email === email && u.password === password)

  if (!user) {
    return res.status(401).json({ ok: false, error: 'Invalid credentials' })
  }

  const safeUser = {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email
  }

  res.json({ ok: true, user: safeUser })
}
