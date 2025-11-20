// BACKEND/routes/api.js
const express = require('express')
const router = express.Router()

const posts = require('../controllers/posts_controller')
const comments = require('../controllers/comments_controller')
const topics = require('../controllers/topics_controller')
const auth = require('../controllers/auth_controller')

// Auth
router.post('/auth/register', auth.register)
router.post('/auth/login', auth.login)

// Posts
router.get('/posts', posts.listAll)
router.get('/posts/:id', posts.getPostById)
router.post('/posts', posts.create)
router.put('/posts/:id', posts.update)
router.delete('/posts/:id', posts.remove)
router.post('/posts/:id/like', posts.toggleLike)
router.post('/posts/:id/save', posts.toggleSave)

// Comments by post
router.get('/posts/:id/comments', comments.listForPost)
router.post('/posts/:id/comments', comments.createForPost)

// Direct comment operations
router.put('/comments/:id', comments.updateComment)
router.delete('/comments/:id', comments.deleteComment)
router.post('/comments/:id/like', comments.toggleLike)

// Topics / communities
router.get('/topics/mine', topics.listMine)
router.get('/topics/joined', topics.listJoined)

// join from Browse topics by name
router.post('/topics/join-by-name', topics.joinByName)

// create, edit, leave, delete by id
router.post('/topics', topics.create)
router.put('/topics/:id', topics.update)
router.post('/topics/:id/leave', topics.leave)
router.delete('/topics/:id', topics.remove)

module.exports = router
