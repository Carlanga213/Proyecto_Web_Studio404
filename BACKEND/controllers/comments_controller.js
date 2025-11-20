const fs = require('fs')
const path = require('path')

const DB_PATH = path.join(__dirname, '..', 'database', 'comments.json')
const POSTS_DB_PATH = path.join(__dirname, '..', 'database', 'posts.json')

function readComments() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, '[]', 'utf8')
  }
  const raw = fs.readFileSync(DB_PATH, 'utf8')
  return JSON.parse(raw)
}

function writeComments(comments) {
  fs.writeFileSync(DB_PATH, JSON.stringify(comments, null, 2), 'utf8')
}

function updatePostCommentsCount(postId, comments) {
  if (!fs.existsSync(POSTS_DB_PATH)) {
    return
  }
  const raw = fs.readFileSync(POSTS_DB_PATH, 'utf8')
  let posts = []
  try {
    posts = JSON.parse(raw)
  } catch {
    posts = []
  }

  const idx = posts.findIndex(p => p.id === postId)
  if (idx === -1) return

  const count = comments.filter(c => c.postId === postId).length
  if (typeof posts[idx].commentsCount !== 'number') {
    posts[idx].commentsCount = 0
  }
  posts[idx].commentsCount = count

  fs.writeFileSync(POSTS_DB_PATH, JSON.stringify(posts, null, 2), 'utf8')
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

function nextId(comments) {
  if (!comments || comments.length === 0) return 1
  return comments[comments.length - 1].id + 1
}

// GET api posts id comments
exports.listForPost = (req, res) => {
  const postId = parseInt(req.params.id, 10)
  const comments = readComments().filter(c => c.postId === postId)
  comments.sort((a, b) => a.id - b.id)
  res.json({ ok: true, comments })
}

// POST api posts id comments
exports.createForPost = (req, res) => {
  const username = getUsername(req)
  if (!username) {
    return res.status(401).json({ ok: false, error: 'User required' })
  }

  const postId = parseInt(req.params.id, 10)
  const bodyRaw = req.body.body || ''
  const parentIdRaw = req.body.parentId

  const body = String(bodyRaw).trim()
  if (body === '') {
    return res.status(400).json({ ok: false, error: 'Comment body required' })
  }

  const comments = readComments()
  const id = nextId(comments)

  let parentId = null
  if (typeof parentIdRaw === 'number') {
    parentId = parentIdRaw
  } else if (typeof parentIdRaw === 'string' && parentIdRaw.trim() !== '') {
    const parsed = parseInt(parentIdRaw, 10)
    if (!Number.isNaN(parsed)) {
      parentId = parsed
    }
  }

  const newComment = {
    id,
    postId,
    parentId,
    author: username,
    body,
    createdAt: new Date().toISOString(),
    likes: 0,
    likedBy: []
  }

  comments.push(newComment)
  writeComments(comments)
  updatePostCommentsCount(postId, comments)

  res.status(201).json({ ok: true, comment: newComment })
}

// PUT api comments id
exports.updateComment = (req, res) => {
  const username = getUsername(req)
  if (!username) {
    return res.status(401).json({ ok: false, error: 'User required' })
  }

  const id = parseInt(req.params.id, 10)
  const comments = readComments()
  const idx = comments.findIndex(c => c.id === id)
  if (idx === -1) {
    return res.status(404).json({ ok: false, error: 'Comment not found' })
  }

  const comment = comments[idx]
  if (comment.author !== username) {
    return res.status(403).json({ ok: false, error: 'Not allowed' })
  }

  const bodyRaw = req.body.body || ''
  const body = String(bodyRaw).trim()
  if (body === '') {
    return res.status(400).json({ ok: false, error: 'Comment body required' })
  }

  comment.body = body
  comments[idx] = comment
  writeComments(comments)

  res.json({ ok: true, comment })
}

// DELETE api comments id
exports.deleteComment = (req, res) => {
  const username = getUsername(req)
  if (!username) {
    return res.status(401).json({ ok: false, error: 'User required' })
  }

  const id = parseInt(req.params.id, 10)
  let comments = readComments()
  const idx = comments.findIndex(c => c.id === id)
  if (idx === -1) {
    return res.status(404).json({ ok: false, error: 'Comment not found' })
  }

  const comment = comments[idx]
  if (comment.author !== username) {
    return res.status(403).json({ ok: false, error: 'Not allowed' })
  }

  const postId = comment.postId

  const idsToDelete = new Set([id])
  let changed = true
  while (changed) {
    changed = false
    for (const c of comments) {
      if (c.parentId && idsToDelete.has(c.parentId)) {
        if (!idsToDelete.has(c.id)) {
          idsToDelete.add(c.id)
          changed = true
        }
      }
    }
  }

  comments = comments.filter(c => !idsToDelete.has(c.id))
  writeComments(comments)
  updatePostCommentsCount(postId, comments)

  res.json({ ok: true })
}

// POST api comments id like
exports.toggleLike = (req, res) => {
  const username = getUsername(req)
  if (!username) {
    return res.status(401).json({ ok: false, error: 'User required' })
  }

  const id = parseInt(req.params.id, 10)
  const comments = readComments()
  const idx = comments.findIndex(c => c.id === id)
  if (idx === -1) {
    return res.status(404).json({ ok: false, error: 'Comment not found' })
  }

  const comment = comments[idx]
  if (!Array.isArray(comment.likedBy)) comment.likedBy = []
  if (typeof comment.likes !== 'number') comment.likes = 0

  const already = comment.likedBy.includes(username)
  if (already) {
    comment.likedBy = comment.likedBy.filter(u => u !== username)
    comment.likes = Math.max(0, comment.likes - 1)
  } else {
    comment.likedBy.push(username)
    comment.likes += 1
  }

  comments[idx] = comment
  writeComments(comments)

  res.json({
    ok: true,
    liked: !already,
    likes: comment.likes,
    comment
  })
}
