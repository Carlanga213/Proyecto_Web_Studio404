// FRONTEND/controllers/home_public_controller.js

let allPosts = []

document.addEventListener('DOMContentLoaded', () => {
  loadPosts()
  setupTopicToggles()
})

async function loadPosts() {
  const container = document.getElementById('postsContainer')
  if (!container) return

  container.innerHTML = '<p class="text-muted">Loading feed...</p>'

  try {
    const res = await fetch(`${API_URL}/posts`)
    const data = await res.json()

    if (!data.ok) {
      console.error('Error loading posts', data.error)
      container.innerHTML = '<p class="text-danger">Error loading posts.</p>'
      return
    }

    allPosts = data.posts || []
    renderFilteredPosts()
    setupPostsClick()
  } catch (err) {
    console.error('Network error loading posts', err)
    container.innerHTML = '<p class="text-danger">Network error loading posts.</p>'
  }
}

function setupTopicToggles() {
  const toggles = document.querySelectorAll('.topic-toggle')
  toggles.forEach(toggle => {
    toggle.addEventListener('change', () => {
      renderFilteredPosts()
    })
  })
}

function getActiveTags() {
  const toggles = document.querySelectorAll('.topic-toggle')
  const active = []
  toggles.forEach(t => {
    if (t.checked) {
      const tag = t.dataset.tag
      if (tag) active.push(tag)
    }
  })
  return active
}

function renderFilteredPosts() {
  const container = document.getElementById('postsContainer')
  if (!container) return

  if (!allPosts || allPosts.length === 0) {
    container.innerHTML = '<p class="text-muted">No posts yet.</p>'
    return
  }

  const activeTags = getActiveTags()
  let toShow = allPosts

  if (activeTags.length > 0) {
    toShow = allPosts.filter(post => {
      if (!Array.isArray(post.tags)) return false
      return post.tags.some(tag => activeTags.includes(tag))
    })

    if (toShow.length === 0) {
      toShow = allPosts
    }
  }

  const html = toShow.map(createPostCardHtml).join('')
  container.innerHTML = html
}

function createPostCardHtml(post) {
  const safeTitle = escapeHtml(post.title || '')
  const safeBody = escapeHtml(post.body || '')  // ← NUEVO: leemos el body
  const safeCommunity = escapeHtml(post.community || 'r/random')
  const safeAuthor = escapeHtml(post.authorDisplay || 'u/anonymous')
  const safeTime = escapeHtml(post.createdAt || '')
  const likes = typeof post.likes === 'number' ? post.likes : 0
  const commentsCount = typeof post.commentsCount === 'number' ? post.commentsCount : 0

  const imageHtml = post.image
    ? `<img src="${post.image}" alt="Post image" class="img-fluid mb-2 rounded">`
    : ''

  const bodyHtml = safeBody
    ? `<p class="small mb-2">${safeBody}</p>`  // ← NUEVO: solo si hay contenido
    : ''

  return `
    <article class="border rounded border-dark publicacion mb-3 p-3" data-post-id="${post.id}">
      <div class="small text-muted mb-1">
        <span class="fw-semibold">${safeCommunity}</span>
        · posted by <span class="fw-semibold">${safeAuthor}</span>
        ${safeTime ? `· <span>${safeTime}</span>` : ''}
      </div>

      <h5 class="mb-2">${safeTitle}</h5>

      ${bodyHtml}

      ${imageHtml}

      <div class="row mt-2 g-2">
        <div class="col-4 text-center">
          <button
            type="button"
            class="btn btn-outline-secondary btn-sm w-100 action-login-required"
            data-action="like"
          >
            <i class="bi bi-heart"></i>
            <span>${likes}</span>
          </button>
        </div>
        <div class="col-4 text-center">
          <button
            type="button"
            class="btn btn-outline-secondary btn-sm w-100 action-login-required"
            data-action="comment"
          >
            <i class="bi bi-chat"></i>
            <span>${commentsCount}</span>
          </button>
        </div>
        <div class="col-4 text-center">
          <button
            type="button"
            class="btn btn-outline-secondary btn-sm w-100 action-login-required"
            data-action="save"
          >
            <i class="bi bi-bookmark"></i>
            <span>Save</span>
          </button>
        </div>
      </div>
    </article>
  `
}

function setupPostsClick() {
  const container = document.getElementById('postsContainer')
  if (!container) return

  container.addEventListener('click', handlePostsClick)
}

function handlePostsClick(event) {
  const btn = event.target.closest('.action-login-required')
  if (!btn) return

  const action = btn.dataset.action || 'interact'
  showLoginRequired(action)
}

function showLoginRequired(action) {
  let readableAction = 'interact with this post'

  if (action === 'like') readableAction = 'like this post'
  if (action === 'comment') readableAction = 'comment on this post'
  if (action === 'save') readableAction = 'save this post'

  const goLogin = confirm(
    `To ${readableAction} you need to login or create an account. Go to login page now`
  )

  if (goLogin) {
    window.location.href = '/login.html'
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
