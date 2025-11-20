// FRONTEND/controllers/comments_controller.js

let currentPostId = null
let allComments = []

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search)
  const idParam = params.get('id')

  if (!idParam) {
    showMissingPost()
    return
  }

  const parsed = parseInt(idParam, 10)
  if (Number.isNaN(parsed)) {
    showMissingPost()
    return
  }

  currentPostId = parsed

  setCurrentUserLabel()
  loadPost()
  loadComments()
  setupComposer()
  setupPostLikeHandler()
  setupCommentsActions()
})

function showMissingPost() {
  const titleEl = document.getElementById('postTitle')
  if (titleEl) {
    titleEl.textContent = 'Post not found'
  }
  const composerBtn = document.getElementById('btnSubmitComment')
  if (composerBtn) composerBtn.disabled = true
  const textarea = document.getElementById('commentBody')
  if (textarea) textarea.disabled = true
}

function setCurrentUserLabel() {
  const label = document.getElementById('currentUserLabel')
  if (label) {
    label.textContent = CURRENT_USER || 'guest'
  }
}

// POST DATA

async function loadPost() {
  try {
    const res = await fetch(`${API_URL}/posts/${currentPostId}`)
    const data = await res.json()
    if (!data.ok) {
      console.error('Error loading post', data.error)
      return
    }
    renderPost(data.post)
  } catch (err) {
    console.error('Network error loading post', err)
  }
}

function renderPost(post) {
  const titleEl = document.getElementById('postTitle')
  const imgEl = document.getElementById('postImage')
  const communityNameEl = document.getElementById('communityName')
  const communityLogoEl = document.getElementById('communityLogo')
  const likesCountEl = document.getElementById('likesCount')
  const likeIconEl = document.getElementById('likeIcon')

  if (titleEl) titleEl.textContent = post.title || 'Untitled post'
  if (communityNameEl) communityNameEl.textContent = post.community || 'r/unknown'

  if (communityLogoEl) {
    if (post.communityLogo) {
      communityLogoEl.src = post.communityLogo
    } else {
      communityLogoEl.src = ''
    }
  }

  if (imgEl) {
    if (post.image) {
      imgEl.src = post.image
      imgEl.classList.remove('d-none')
    } else {
      imgEl.src = ''
      imgEl.classList.add('d-none')
    }
  }

  const likes = typeof post.likes === 'number' ? post.likes : 0
  if (likesCountEl) likesCountEl.textContent = likes

  const likedByUser =
    Array.isArray(post.likedBy) && post.likedBy.includes(CURRENT_USER)

  const likeBtn = document.getElementById('btnLike')
  if (likeBtn) {
    if (likedByUser) {
      likeBtn.classList.remove('btn-outline-secondary')
      likeBtn.classList.add('btn-danger')
    } else {
      likeBtn.classList.remove('btn-danger')
      likeBtn.classList.add('btn-outline-secondary')
    }
  }

  if (likeIconEl) {
    if (likedByUser) {
      likeIconEl.classList.remove('bi-heart')
      likeIconEl.classList.add('bi-heart-fill')
    } else {
      likeIconEl.classList.remove('bi-heart-fill')
      likeIconEl.classList.add('bi-heart')
    }
  }
}

function setupPostLikeHandler() {
  const btn = document.getElementById('btnLike')
  if (!btn) return

  btn.addEventListener('click', async () => {
    if (!CURRENT_USER || CURRENT_USER === 'guest') {
      const goLogin = confirm('You need to login to like this post. Go to login page')
      if (goLogin) window.location.href = '/login.html'
      return
    }

    try {
      const res = await fetch(`${API_URL}/posts/${currentPostId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user': CURRENT_USER
        },
        body: JSON.stringify({})
      })
      const data = await res.json()
      if (!data.ok) {
        console.error('Error toggling like', data.error)
        alert('Error toggling like')
        return
      }
      renderPost(data.post)
    } catch (err) {
      console.error('Network error toggling like', err)
      alert('Network error toggling like')
    }
  })
}

// COMMENTS

async function loadComments() {
  const list = document.getElementById('commentsList')
  if (!list) return

  list.innerHTML = '<p class="text-muted">Loading comments...</p>'

  try {
    const res = await fetch(`${API_URL}/posts/${currentPostId}/comments`)
    const data = await res.json()
    if (!data.ok) {
      console.error('Error loading comments', data.error)
      list.innerHTML = '<p class="text-danger">Error loading comments.</p>'
      return
    }
    allComments = data.comments || []
    renderComments()
  } catch (err) {
    console.error('Network error loading comments', err)
    const list2 = document.getElementById('commentsList')
    if (list2) {
      list2.innerHTML = '<p class="text-danger">Network error loading comments.</p>'
    }
  }
}

function renderComments() {
  const list = document.getElementById('commentsList')
  if (!list) return

  if (!allComments || allComments.length === 0) {
    list.innerHTML = '<p class="text-muted mb-0">No comments yet. Be the first one.</p>'
    return
  }

  const byParent = new Map()
  allComments.forEach(c => {
    const key = c.parentId || 0
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key).push(c)
  })

  byParent.forEach(arr => arr.sort((a, b) => a.id - b.id))

  const root = byParent.get(0) || []
  const html = root.map(c => renderCommentRecursive(c, byParent, 0)).join('')
  list.innerHTML = html
}

function renderCommentRecursive(comment, byParent, level) {
  const indentClass = level > 0 ? 'ms-5' : ''
  const likes = typeof comment.likes === 'number' ? comment.likes : 0

  const likedByUser =
    Array.isArray(comment.likedBy) && comment.likedBy.includes(CURRENT_USER)

  const likeIconClass = likedByUser ? 'bi-heart-fill' : 'bi-heart'

  const children = byParent.get(comment.id) || []
  const childrenHtml = children
    .map(c => renderCommentRecursive(c, byParent, level + 1))
    .join('')

  const author = escapeHtml(comment.author || 'user')
  const body = escapeHtml(comment.body || '')
  const created = formatDateShort(comment.createdAt)

  return `
    <div class="${indentClass} mb-3" data-comment-id="${comment.id}">
      <div class="d-flex mb-1">
        <div class="flex-grow-1">
          <div class="d-flex align-items-center gap-2 small text-muted mb-1">
            <span class="fw-semibold">u/${author}</span>
            <span>•</span>
            <span>${created}</span>
          </div>
          <p class="mb-2">${body}</p>
          <div class="d-flex align-items-center gap-3 small">
            <button
              type="button"
              class="btn btn-link btn-sm p-0 d-inline-flex align-items-center gap-1 comment-like-btn"
            >
              <i class="bi ${likeIconClass} comment-like-icon"></i>
              <span class="comment-likes-count">${likes}</span>
            </button>
            <button
              type="button"
              class="btn btn-link btn-sm p-0 comment-reply"
            >
              reply
            </button>
            ${
              comment.author === CURRENT_USER
                ? `
            <button
              type="button"
              class="btn btn-link btn-sm p-0 comment-edit"
            >
              edit
            </button>
            <button
              type="button"
              class="btn btn-link btn-sm p-0 text-danger comment-delete"
            >
              delete
            </button>
            `
                : ''
            }
          </div>
        </div>
      </div>
      ${childrenHtml}
    </div>
  `
}

// COMMENT COMPOSER

function setupComposer() {
  const btn = document.getElementById('btnSubmitComment')
  const textarea = document.getElementById('commentBody')

  if (!btn || !textarea) return

  btn.addEventListener('click', async () => {
    if (!CURRENT_USER || CURRENT_USER === 'guest') {
      const goLogin = confirm('You need to login to comment. Go to login page')
      if (goLogin) window.location.href = '/login.html'
      return
    }

    const body = textarea.value.trim()
    if (body === '') {
      alert('Please write a comment')
      return
    }

    try {
      const res = await fetch(`${API_URL}/posts/${currentPostId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user': CURRENT_USER
        },
        body: JSON.stringify({ body })
      })
      const data = await res.json()
      if (!data.ok) {
        console.error('Error creating comment', data.error)
        alert('Error creating comment')
        return
      }

      textarea.value = ''
      await loadComments()
    } catch (err) {
      console.error('Network error creating comment', err)
      alert('Network error creating comment')
    }
  })
}

// COMMENT ACTIONS: reply, edit, delete, like

function setupCommentsActions() {
  const list = document.getElementById('commentsList')
  if (!list) return

  list.addEventListener('click', async event => {
    const commentEl = event.target.closest('[data-comment-id]')
    if (!commentEl) return
    const commentId = parseInt(commentEl.getAttribute('data-comment-id'), 10)

    if (event.target.closest('.comment-like-btn')) {
      await handleCommentLike(commentId, commentEl)
      return
    }

    if (event.target.closest('.comment-reply')) {
      await handleCommentReply(commentId)
      return
    }

    if (event.target.closest('.comment-edit')) {
      await handleCommentEdit(commentId)
      return
    }

    if (event.target.closest('.comment-delete')) {
      await handleCommentDelete(commentId)
      return
    }
  })
}

async function handleCommentLike(commentId) {
  if (!CURRENT_USER || CURRENT_USER === 'guest') {
    const goLogin = confirm('You need to login to like comments. Go to login page')
    if (goLogin) window.location.href = '/login.html'
    return
  }

  try {
    const res = await fetch(`${API_URL}/comments/${commentId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user': CURRENT_USER
      },
      body: JSON.stringify({})
    })
    const data = await res.json()
    if (!data.ok) {
      console.error('Error toggling comment like', data.error)
      alert('Error toggling comment like')
      return
    }

    await loadComments()
  } catch (err) {
    console.error('Network error toggling comment like', err)
    alert('Network error toggling comment like')
  }
}

async function handleCommentReply(parentId) {
  if (!CURRENT_USER || CURRENT_USER === 'guest') {
    const goLogin = confirm('You need to login to reply. Go to login page')
    if (goLogin) window.location.href = '/login.html'
    return
  }

  const text = prompt('Write your reply')
  if (text === null) return
  const body = text.trim()
  if (body === '') return

  try {
    const res = await fetch(`${API_URL}/posts/${currentPostId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user': CURRENT_USER
      },
      body: JSON.stringify({ body, parentId })
    })
    const data = await res.json()
    if (!data.ok) {
      console.error('Error creating reply', data.error)
      alert('Error creating reply')
      return
    }

    await loadComments()
  } catch (err) {
    console.error('Network error creating reply', err)
    alert('Network error creating reply')
  }
}

async function handleCommentEdit(commentId) {
  const comment = allComments.find(c => c.id === commentId)
  if (!comment) return
  if (comment.author !== CURRENT_USER) {
    alert('You can only edit your own comments')
    return
  }

  const text = prompt('Edit your comment', comment.body || '')
  if (text === null) return
  const body = text.trim()
  if (body === '') return

  try {
    const res = await fetch(`${API_URL}/comments/${commentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user': CURRENT_USER
      },
      body: JSON.stringify({ body })
    })
    const data = await res.json()
    if (!data.ok) {
      console.error('Error updating comment', data.error)
      alert('Error updating comment')
      return
    }

    await loadComments()
  } catch (err) {
    console.error('Network error updating comment', err)
    alert('Network error updating comment')
  }
}

async function handleCommentDelete(commentId) {
  const ok = confirm('Delete this comment and its replies')
  if (!ok) return

  try {
    const res = await fetch(`${API_URL}/comments/${commentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-user': CURRENT_USER
      }
    })
    const data = await res.json()
    if (!data.ok) {
      console.error('Error deleting comment', data.error)
      alert('Error deleting comment')
      return
    }

    await loadComments()
  } catch (err) {
    console.error('Network error deleting comment', err)
    alert('Network error deleting comment')
  }
}

// HELPERS

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function formatDateShort(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString()
}
