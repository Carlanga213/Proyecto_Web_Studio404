

const fs = require('fs')
const path = require('path')

const DB_PATH = path.join(__dirname, '..', 'database', 'topics.json')

function readTopics() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, '[]', 'utf8')
  }
  const raw = fs.readFileSync(DB_PATH, 'utf8')
  return JSON.parse(raw)
}

function writeTopics(topics) {
  fs.writeFileSync(DB_PATH, JSON.stringify(topics, null, 2), 'utf8')
}

function getUsername(req) {
  const headerUser = req.headers['x-user']
  if (headerUser && typeof headerUser === 'string' && headerUser.trim() !== '') {
    return headerUser.trim()
  }
  if (req.body && typeof req.body.username === 'string' && req.body.username.trim() !== '') {
    return req.body.username.trim()
  }
  return null
}

// GET /api/topics/mine
// Topics created by current user
exports.listMine = (req, res) => {
  const username = getUsername(req)
  if (!username) {
    return res.status(401).json({ ok: false, error: 'User required' })
  }

  const topics = readTopics().filter(t => t.createdBy === username)
  res.json({ ok: true, topics })
}

// GET /api/topics/joined
// Topics where current user is member
exports.listJoined = (req, res) => {
  const username = getUsername(req)
  if (!username) {
    return res.status(401).json({ ok: false, error: 'User required' })
  }

  const topics = readTopics().filter(
    t => Array.isArray(t.members) && t.members.includes(username)
  )
  res.json({ ok: true, topics })
}

// POST /api/topics
// Create new topic and join it
exports.create = (req, res) => {
  const username = getUsername(req)
  if (!username) {
    return res.status(401).json({ ok: false, error: 'User required' })
  }

  const nameRaw = req.body.name || ''
  const titleRaw = req.body.title || ''
  const descriptionRaw = req.body.description || ''

  const name = String(nameRaw).trim()
  const title = String(titleRaw).trim()
  const description = String(descriptionRaw).trim()

  if (name === '') {
    return res.status(400).json({ ok: false, error: 'Name is required' })
  }

  const topics = readTopics()

  const exists = topics.some(
    t => typeof t.name === 'string' && t.name.toLowerCase() === name.toLowerCase()
  )
  if (exists) {
    return res.status(409).json({ ok: false, error: 'Topic name already exists' })
  }

  const newId = topics.length > 0 ? topics[topics.length - 1].id + 1 : 1

  const newTopic = {
    id: newId,
    name,
    title: title !== '' ? title : name,
    description,
    createdBy: username,
    members: [username]
  }

  topics.push(newTopic)
  writeTopics(topics)

  res.status(201).json({ ok: true, topic: newTopic })
}

// PUT /api/topics/:id
// Edit topic only if current user is creator
exports.update = (req, res) => {
  const username = getUsername(req)
  if (!username) {
    return res.status(401).json({ ok: false, error: 'User required' })
  }

  const id = parseInt(req.params.id, 10)
  const topics = readTopics()
  const idx = topics.findIndex(t => t.id === id)

  if (idx === -1) {
    return res.status(404).json({ ok: false, error: 'Topic not found' })
  }

  const topic = topics[idx]

  if (topic.createdBy !== username) {
    return res.status(403).json({ ok: false, error: 'Not allowed' })
  }

  const nameRaw = req.body.name
  const titleRaw = req.body.title
  const descriptionRaw = req.body.description

  if (typeof nameRaw === 'string' && nameRaw.trim() !== '') {
    topic.name = nameRaw.trim()
  }
  if (typeof titleRaw === 'string' && titleRaw.trim() !== '') {
    topic.title = titleRaw.trim()
  }
  if (typeof descriptionRaw === 'string') {
    topic.description = descriptionRaw.trim()
  }

  topics[idx] = topic
  writeTopics(topics)

  res.json({ ok: true, topic })
}

// POST /api/topics/:id/leave
// Remove current user from members
exports.leave = (req, res) => {
  const username = getUsername(req)
  if (!username) {
    return res.status(401).json({ ok: false, error: 'User required' })
  }

  const id = parseInt(req.params.id, 10)
  const topics = readTopics()
  const idx = topics.findIndex(t => t.id === id)

  if (idx === -1) {
    return res.status(404).json({ ok: false, error: 'Topic not found' })
  }

  const topic = topics[idx]

  if (!Array.isArray(topic.members)) {
    topic.members = []
  }

  if (!topic.members.includes(username)) {
    return res.status(400).json({ ok: false, error: 'User is not a member' })
  }

  topic.members = topic.members.filter(m => m !== username)
  topics[idx] = topic
  writeTopics(topics)

  res.json({ ok: true, topic })
}

// POST /api/topics/join-by-name
// Join a predefined topic from Browse topics card
// If it does not exist yet it is created with createdBy "system"
exports.joinByName = (req, res) => {
  const username = getUsername(req)
  if (!username) {
    return res.status(401).json({ ok: false, error: 'User required' })
  }

  const nameRaw = req.body.name || ''
  const titleRaw = req.body.title || ''
  const descriptionRaw = req.body.description || ''

  const name = String(nameRaw).trim()
  const title = String(titleRaw).trim()
  const description = String(descriptionRaw).trim()

  if (name === '') {
    return res.status(400).json({ ok: false, error: 'Name is required' })
  }

  const topics = readTopics()

  let topic = topics.find(
    t => typeof t.name === 'string' && t.name.toLowerCase() === name.toLowerCase()
  )

  if (!topic) {
    const newId = topics.length > 0 ? topics[topics.length - 1].id + 1 : 1
    topic = {
      id: newId,
      name,
      title: title !== '' ? title : name,
      description,
      createdBy: 'system',
      members: []
    }
    topics.push(topic)
  }

  if (!Array.isArray(topic.members)) {
    topic.members = []
  }
  if (!topic.members.includes(username)) {
    topic.members.push(username)
  }

  writeTopics(topics)

  res.json({ ok: true, topic })
}

// DELETE /api/topics/:id
// Delete topic if current user is creator
exports.remove = (req, res) => {
  const username = getUsername(req)
  if (!username) {
    return res.status(401).json({ ok: false, error: 'User required' })
  }

  const id = parseInt(req.params.id, 10)
  const topics = readTopics()
  const idx = topics.findIndex(t => t.id === id)

  if (idx === -1) {
    return res.status(404).json({ ok: false, error: 'Topic not found' })
  }

  const topic = topics[idx]

  if (topic.createdBy !== username) {
    return res.status(403).json({ ok: false, error: 'Not allowed' })
  }

  topics.splice(idx, 1)
  writeTopics(topics)

  res.json({ ok: true })
}
