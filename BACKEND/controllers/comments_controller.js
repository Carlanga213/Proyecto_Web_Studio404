const fs = require('fs')
const path = require('path')

const USERS_PATH = path.join(__dirname, '..', 'database', 'users.json')
const DB_PATH = path.join(__dirname, '..', 'database', 'comments.json')
const POSTS_DB_PATH = path.join(__dirname, '..', 'database', 'posts.json')

function readUsers() {
  if (!fs.existsSync(USERS_PATH)) return []
  try {
    const raw = fs.readFileSync(USERS_PATH, 'utf8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function getAvatarUrlByUsername(username) {
  if (!username) return null
  const users = readUsers()
  const user = users.find(u => 
    u.username && u.username.toLowerCase() === username.toLowerCase()
  )
  return user && user.avatarUrl ? user.avatarUrl : null
}

function readComments() {
  if (!fs.existsSync(DB_PATH)) return []
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function writeComments(comments) {
  fs.writeFileSync(DB_PATH, JSON.stringify(comments, null, 2), 'utf8')
}

function updatePostCommentsCount(postId, comments) {
  if (!fs.existsSync(POSTS_DB_PATH)) return
  try {
    const raw = fs.readFileSync(POSTS_DB_PATH, 'utf8')
    let posts = JSON.parse(raw)
    const idx = posts.findIndex(p => p.id === postId)
    if (idx === -1) return
    posts[idx].commentsCount = comments.filter(c => c.postId === postId).length
    fs.writeFileSync(POSTS_DB_PATH, JSON.stringify(posts, null, 2), 'utf8')
  } catch {
    return
  }
}

function getUsername(req) {
  const headerUser = req.headers['x-user']
  if (headerUser && typeof headerUser === 'string' && headerUser.trim() !== '') {
    return headerUser.trim()
  }
  return null
}

function nextId(comments) {
  if (comments.length === 0) return 1
  return Math.max(...comments.map(c => c.id)) + 1
}

exports.listForPost = (req, res) => {
  const postId = parseInt(req.params.id, 10)
  if (Number.isNaN(postId)) {
    return res.status(400).json({ ok: false, error: 'Invalid post id' })
  }

  const comments = readComments().filter(c => c.postId === postId)
  
  const commentsWithAvatar = comments.map(c => ({
    ...c,
    avatarUrl: getAvatarUrlByUsername(c.author)
  }))

  res.json({ ok: true, comments: commentsWithAvatar })
}

exports.createForPost = (req, res) => {
  const postId = parseInt(req.params.id, 10)
  const { body, parentId } = req.body
  const author = getUsername(req)

  if (Number.isNaN(postId) || !body || !author) {
    return res.status(400).json({ ok: false, error: 'postId, body and author required' })
  }

  const comments = readComments()

  const newComment = {
    id: nextId(comments),
    postId,
    parentId: parentId ? parseInt(parentId, 10) : null,
    author,
    body,
    likes: 0,
    likedBy: [],
    createdAt: new Date().toISOString()
  }

  comments.push(newComment)
  writeComments(comments)
  updatePostCommentsCount(postId, comments)

  const avatarUrl = getAvatarUrlByUsername(author)
  res.status(201).json({ ok: true, comment: { ...newComment, avatarUrl } })
}

exports.updateComment = (req, res) => {
  const id = parseInt(req.params.id, 10)
  const { body } = req.body
  const author = getUsername(req)

  if (Number.isNaN(id)) {
    return res.status(400).json({ ok: false, error: 'Invalid id' })
  }

  const comments = readComments()
  const idx = comments.findIndex(c => c.id === id)

  if (idx === -1) {
    return res.status(404).json({ ok: false, error: 'Comment not found' })
  }

  if (comments[idx].author !== author) {
    return res.status(403).json({ ok: false, error: 'Not authorized' })
  }

  comments[idx].body = body
  comments[idx].updatedAt = new Date().toISOString()
  writeComments(comments)

  const avatarUrl = getAvatarUrlByUsername(comments[idx].author)
  res.json({ ok: true, comment: { ...comments[idx], avatarUrl } })
}

exports.deleteComment = (req, res) => {
  const id = parseInt(req.params.id, 10)
  const author = getUsername(req)

  if (Number.isNaN(id)) {
    return res.status(400).json({ ok: false, error: 'Invalid id' })
  }

  const comments = readComments()
  const comment = comments.find(c => c.id === id)

  if (!comment) {
    return res.status(404).json({ ok: false, error: 'Comment not found' })
  }

  if (comment.author !== author) {
    return res.status(403).json({ ok: false, error: 'Not authorized' })
  }

  const idsToDelete = new Set([id])
  let changed = true
  while (changed) {
    changed = false
    for (const c of comments) {
      if (c.parentId && idsToDelete.has(c.parentId) && !idsToDelete.has(c.id)) {
        idsToDelete.add(c.id)
        changed = true
      }
    }
  }

  const remaining = comments.filter(c => !idsToDelete.has(c.id))
  writeComments(remaining)
  updatePostCommentsCount(comment.postId, remaining)

  res.json({ ok: true })
}

exports.toggleLike = (req, res) => {
  const id = parseInt(req.params.id, 10)
  const user = getUsername(req)

  if (Number.isNaN(id) || !user) {
    return res.status(400).json({ ok: false, error: 'Invalid request' })
  }

  const comments = readComments()
  const comment = comments.find(c => c.id === id)

  if (!comment) {
    return res.status(404).json({ ok: false, error: 'Comment not found' })
  }

  if (!Array.isArray(comment.likedBy)) {
    comment.likedBy = []
  }

  const alreadyLiked = comment.likedBy.includes(user)

  if (alreadyLiked) {
    comment.likedBy = comment.likedBy.filter(u => u !== user)
    comment.likes = Math.max(0, (comment.likes || 0) - 1)
  } else {
    comment.likedBy.push(user)
    comment.likes = (comment.likes || 0) + 1
  }

  writeComments(comments)

  res.json({ ok: true, liked: !alreadyLiked, likes: comment.likes })
}
