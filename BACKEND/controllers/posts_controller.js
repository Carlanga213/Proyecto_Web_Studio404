// BACKEND/controllers/posts_controller.js

const fs = require('fs')
const path = require('path')

const POSTS_DB_PATH = path.join(__dirname, '..', 'database', 'posts.json')
const TOPICS_DB_PATH = path.join(__dirname, '..', 'database', 'topics.json')

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]', 'utf8')
  }
}

function readPosts() {
  ensureFile(POSTS_DB_PATH)
  const raw = fs.readFileSync(POSTS_DB_PATH, 'utf8')
  return JSON.parse(raw)
}

function writePosts(posts) {
  fs.writeFileSync(POSTS_DB_PATH, JSON.stringify(posts, null, 2), 'utf8')
}

function readTopics() {
  ensureFile(TOPICS_DB_PATH)
  const raw = fs.readFileSync(TOPICS_DB_PATH, 'utf8')
  return JSON.parse(raw)
}

function findPost(posts, id) {
  return posts.find(p => p.id === id)
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

function nextId(posts) {
  if (!posts || posts.length === 0) return 1
  return posts[posts.length - 1].id + 1
}

// verifica si el usuario pertenece al topic del estilo r/nombre
function userBelongsToCommunity(username, community) {
  if (!community) {
    // sin topic permitido
    return true
  }

  // comunidad general por si la usas como default
  if (community.toLowerCase() === 'r/general') {
    return true
  }

  const match = /^r\/(.+)$/.exec(String(community))
  if (!match) return false

  const topicName = match[1].toLowerCase()
  const topics = readTopics()

  const topic = topics.find(
    t =>
      typeof t.name === 'string' &&
      t.name.toLowerCase() === topicName
  )

  if (!topic) return false

  if (topic.createdBy === username) return true
  if (Array.isArray(topic.members) && topic.members.includes(username)) return true

  return false
}

// helper para saber si el usuario puede editar o borrar
function isOwner(username, post) {
  if (!username || !post) return false
  if (typeof post.authorDisplay !== 'string') return false

  const display = post.authorDisplay
  const possible = [display]

  if (display.startsWith('u/')) {
    possible.push(display.substring(2))
  } else {
    possible.push('u/' + display)
  }

  return possible.includes(username)
}

// GET api posts
// query opcional tag
exports.listAll = (req, res) => {
  const tag = req.query.tag
  let posts = readPosts()

  posts.sort((a, b) => b.id - a.id)

  if (tag) {
    const tagLower = String(tag).toLowerCase()
    posts = posts.filter(
      p =>
        Array.isArray(p.tags) &&
        p.tags.some(t => String(t).toLowerCase() === tagLower)
    )
  }

  res.json({ ok: true, posts })
}

// GET api posts id
exports.getPostById = (req, res) => {
  const id = parseInt(req.params.id, 10)
  const posts = readPosts()
  const post = findPost(posts, id)

  if (!post) {
    return res.status(404).json({ ok: false, error: 'Post not found' })
  }

  res.json({ ok: true, post })
}

// POST api posts
// crear post estilo rapido
exports.create = (req, res) => {
  const username = getUsername(req)
  if (!username) {
    return res.status(401).json({ ok: false, error: 'User required' })
  }

  const { title, community, image, tags, body } = req.body || {}

  const titleSafe = String(title || '').trim()
  if (titleSafe === '') {
    return res.status(400).json({ ok: false, error: 'Title is required' })
  }

  const bodySafe = String(body || '').trim()
  const communitySafe = String(community || '').trim()
  const imageSafe = String(image || '').trim()

  // validar topic
  if (communitySafe && !userBelongsToCommunity(username, communitySafe)) {
    return res
      .status(400)
      .json({ ok: false, error: 'No estas en ese topic o no existe' })
  }

  let tagsArray = []
  if (Array.isArray(tags)) {
    tagsArray = tags.map(t => String(t).trim()).filter(t => t !== '')
  }

  const posts = readPosts()
  const id = nextId(posts)

  const now = new Date()
  const createdAt = now.toLocaleString()

  const newPost = {
    id,
    title: titleSafe,
    body: bodySafe,
    community: communitySafe || '',
    communityLogo: '',
    image: imageSafe || '',
    authorDisplay: 'u/' + username,
    createdAt,
    likes: 0,
    likedBy: [],
    savedBy: [],
    tags: tagsArray,
    commentsCount: 0
  }

  posts.push(newPost)
  writePosts(posts)

  res.status(201).json({ ok: true, post: newPost })
}

// PUT api posts id
// editar post del usuario
exports.update = (req, res) => {
  const username = getUsername(req)
  if (!username) {
    return res.status(401).json({ ok: false, error: 'User required' })
  }

  const id = parseInt(req.params.id, 10)
  const posts = readPosts()
  const idx = posts.findIndex(p => p.id === id)

  if (idx === -1) {
    return res.status(404).json({ ok: false, error: 'Post not found' })
  }

  const post = posts[idx]

  if (!isOwner(username, post)) {
    return res.status(403).json({ ok: false, error: 'Not allowed' })
  }

  const { title, community, image, tags, body } = req.body || {}

  if (typeof title === 'string' && title.trim() !== '') {
    post.title = title.trim()
  }

  if (typeof body === 'string') {
    post.body = body.trim()
  }

  if (typeof community === 'string') {
    const communitySafe = community.trim()
    if (communitySafe && !userBelongsToCommunity(username, communitySafe)) {
      return res
        .status(400)
        .json({ ok: false, error: 'No estas en ese topic o no existe' })
    }
    post.community = communitySafe
  }

  if (typeof image === 'string') {
    post.image = image.trim()
  }

  if (Array.isArray(tags)) {
    post.tags = tags.map(t => String(t).trim()).filter(t => t !== '')
  }

  posts[idx] = post
  writePosts(posts)

  res.json({ ok: true, post })
}

// DELETE api posts id
// borrar post del usuario
exports.remove = (req, res) => {
  const username = getUsername(req)
  if (!username) {
    return res.status(401).json({ ok: false, error: 'User required' })
  }

  const id = parseInt(req.params.id, 10)
  const posts = readPosts()
  const idx = posts.findIndex(p => p.id === id)

  if (idx === -1) {
    return res.status(404).json({ ok: false, error: 'Post not found' })
  }

  const post = posts[idx]

  if (!isOwner(username, post)) {
    return res.status(403).json({ ok: false, error: 'Not allowed' })
  }

  posts.splice(idx, 1)
  writePosts(posts)

  res.json({ ok: true })
}

// POST api posts id like
exports.toggleLike = (req, res) => {
  const id = parseInt(req.params.id, 10)
  const username = getUsername(req)

  if (!username) {
    return res.status(401).json({ ok: false, error: 'User required' })
  }

  const posts = readPosts()
  const post = findPost(posts, id)

  if (!post) {
    return res.status(404).json({ ok: false, error: 'Post not found' })
  }

  if (!Array.isArray(post.likedBy)) {
    post.likedBy = []
  }
  if (typeof post.likes !== 'number') {
    post.likes = 0
  }

  const alreadyLiked = post.likedBy.includes(username)

  if (alreadyLiked) {
    post.likedBy = post.likedBy.filter(u => u !== username)
    post.likes = Math.max(0, post.likes - 1)
  } else {
    post.likedBy.push(username)
    post.likes += 1
  }

  writePosts(posts)

  res.json({
    ok: true,
    liked: !alreadyLiked,
    likes: post.likes,
    post
  })
}

// POST api posts id save
exports.toggleSave = (req, res) => {
  const id = parseInt(req.params.id, 10)
  const username = getUsername(req)

  if (!username) {
    return res.status(401).json({ ok: false, error: 'User required' })
  }

  const posts = readPosts()
  const post = findPost(posts, id)

  if (!post) {
    return res.status(404).json({ ok: false, error: 'Post not found' })
  }

  if (!Array.isArray(post.savedBy)) {
    post.savedBy = []
  }

  const alreadySaved = post.savedBy.includes(username)

  if (alreadySaved) {
    post.savedBy = post.savedBy.filter(u => u !== username)
  } else {
    post.savedBy.push(username)
  }

  writePosts(posts)

  res.json({
    ok: true,
    saved: !alreadySaved,
    post
  })
}
