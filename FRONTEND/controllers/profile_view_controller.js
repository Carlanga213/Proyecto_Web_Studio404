const PLACEHOLDER_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23999'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E"

let userProfile = null
let userPosts = []
let userComments = []
let savedPosts = []
let allPosts = []

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof getStoredUser !== 'function' || typeof API_URL !== 'string') {
    return
  }

  const user = getStoredUser()
  if (!user) {
    window.location.href = './login.html'
    return
  }

  await loadUserProfile()
  await loadAllPosts()
  await loadUserComments()
  renderProfileCard()
  setupLogout()
  setupPostLikeHandlers()
  setupTabHandlers()
})

async function loadUserProfile() {
  try {
    const user = getStoredUser()
    const res = await fetch(`${API_URL}/profiles/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': String(user?.id || '')
      }
    })
    const data = await res.json()
    
    if (data.ok && data.profile) {
      userProfile = data.profile
    }
  } catch (err) {
    // Error loading profile
  }
}

async function loadAllPosts() {
  try {
    const res = await fetch(`${API_URL}/posts`)
    const data = await res.json()
    
    if (data.ok && Array.isArray(data.posts)) {
      allPosts = data.posts
      const username = userProfile?.username || getStoredUser()?.username
      if (!username) return

      userPosts = data.posts.filter(p => {
        if (p.author && p.author.toLowerCase() === username.toLowerCase()) {
          return true
        }
        if (p.authorDisplay) {
          const displayName = p.authorDisplay.replace(/^u\//, '').toLowerCase()
          if (displayName === username.toLowerCase()) {
            return true
          }
        }
        return false
      })

      savedPosts = data.posts.filter(p => {
        return Array.isArray(p.savedBy) && p.savedBy.includes(username)
      })
    }
  } catch (err) {
    // Error loading posts
  }
}

async function loadUserComments() {
  try {
    const username = userProfile?.username || getStoredUser()?.username
    if (!username) return

    const commentsPromises = allPosts.map(async (post) => {
      try {
        const res = await fetch(`${API_URL}/posts/${post.id}/comments`)
        const data = await res.json()
        if (data.ok && Array.isArray(data.comments)) {
          return data.comments
            .filter(c => c.author && c.author.toLowerCase() === username.toLowerCase())
            .map(c => ({ ...c, post }))
        }
      } catch {
        return []
      }
      return []
    })

    const results = await Promise.all(commentsPromises)
    userComments = results.flat().sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    )
  } catch (err) {
    // Error loading comments
  }
}

function renderProfileCard() {
  if (!userProfile) return

  const avatarImg = document.getElementById('profileAvatar')
  if (avatarImg) {
    if (userProfile.avatarUrl && userProfile.avatarUrl.trim()) {
      avatarImg.src = userProfile.avatarUrl
    } else {
      avatarImg.src = PLACEHOLDER_AVATAR
    }
    avatarImg.onerror = function() {
      this.src = PLACEHOLDER_AVATAR
    }
  }

  const usernameEl = document.querySelector('.profile-username')
  if (usernameEl) {
    usernameEl.textContent = userProfile.username || 'Username'
  }

  const welcomeEl = document.querySelector('.overview-header-text h5')
  if (welcomeEl) {
    const displayName = userProfile.name || userProfile.username || 'there'
    welcomeEl.textContent = `Welcome back, ${displayName}`
  }

  const metaEl = document.querySelector('.profile-meta')
  if (metaEl) {
    if (userProfile.birthdate && userProfile.birthdate.trim()) {
      const [year, month, day] = userProfile.birthdate.split('-').map(Number)
      const date = new Date(Date.UTC(year, month - 1, day))
      const options = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }
      const formatted = date.toLocaleDateString('en-US', options)
      metaEl.innerHTML = `<i class="bi bi-cake2 me-1"></i> ${formatted}`
    } else {
      metaEl.innerHTML = `<a href="UserSettings.html#profile" class="text-warning text-decoration-none"><i class="bi bi-cake2 me-1"></i> Add your birthday</a>`
    }
  }

  const bioEl = document.querySelector('.profile-bio')
  if (bioEl) {
    if (userProfile.bio && userProfile.bio.trim()) {
      bioEl.textContent = userProfile.bio
      bioEl.classList.remove('text-muted')
      bioEl.classList.add('text-light')
    } else {
      bioEl.innerHTML = `<a href="UserSettings.html#profile" class="text-warning text-decoration-none">Add a bio to tell others about yourself</a>`
    }
  }

  const statsContainer = document.querySelector('.profile-stats')
  if (statsContainer) {
    const count = userPosts.length
    statsContainer.innerHTML = `
      <span class="pill-stat">
        <i class="bi bi-file-post me-1"></i> ${count} ${count === 1 ? 'post' : 'posts'}
      </span>
    `
  }

  renderUserPosts()
  renderOverviewPosts()
  renderUserComments()
  renderSavedPosts()
}

function renderUserPosts() {
  const postsTab = document.getElementById('tabPosts')
  if (!postsTab) return

  if (userPosts.length === 0) {
    postsTab.innerHTML = `
      <div class="card card-soft p-3">
        <p class="tab-empty mb-0">
          No posts yet. <a href="post_editor.html" class="text-primary"><strong>Share something on Studio404!</strong></a>
        </p>
      </div>
    `
    return
  }

  const currentUser = userProfile?.username || getStoredUser()?.username || ''

  const postsHtml = userPosts.map(post => {
    const authorName = post.author || post.authorDisplay?.replace(/^u\//, '') || 'user'
    const isLiked = Array.isArray(post.likedBy) && post.likedBy.includes(currentUser)
    const likeIconClass = isLiked ? 'bi-heart-fill text-danger' : 'bi-heart'
    
    return `
      <div class="card card-soft mb-3" data-post-id="${post.id}">
        <div class="card-body">
          <div class="small text-muted mb-1">
            ${post.community ? `<span class="post-chip"><i class="bi bi-hash"></i> ${escapeHtml(post.community.replace(/^r\//, ''))}</span>` : ''}
            <span class="ms-2">posted ${formatTimeAgo(post.createdAt)}</span>
          </div>
          <a href="create_post.html?id=${post.id}" class="text-decoration-none">
            <h6 class="mb-2 text-light">${escapeHtml(post.title)}</h6>
          </a>
          <p class="mb-3">${escapeHtml(post.body?.substring(0, 150) || '')}${post.body?.length > 150 ? '...' : ''}</p>
          ${post.image ? `<img src="${post.image}" alt="Post image" class="img-fluid rounded mb-3" style="max-height: 200px; object-fit: cover;">` : ''}
          <div class="d-flex align-items-center gap-2 post-actions">
            <a href="create_post.html?id=${post.id}" class="btn btn-sm btn-outline-secondary">
              <i class="bi bi-chat-left-text me-1"></i> ${post.commentsCount || 0}
            </a>
            <button type="button" class="btn btn-sm btn-outline-secondary post-like-btn" data-post-id="${post.id}">
              <i class="bi ${likeIconClass} me-1 post-like-icon"></i>
              <span class="post-likes-count">${post.likes || 0}</span>
            </button>
          </div>
        </div>
      </div>
    `
  }).join('')

  postsTab.innerHTML = postsHtml
}

function renderOverviewPosts() {
  const overviewContainer = document.querySelector('#tabOverview .card-body')
  if (!overviewContainer) return

  const headerEl = overviewContainer.querySelector('.overview-header')
  const headerHtml = headerEl ? headerEl.outerHTML : ''

  if (userPosts.length === 0) {
    overviewContainer.innerHTML = `
      ${headerHtml}
      <div class="text-center py-4">
        <p class="text-muted mb-2">You haven't posted anything yet.</p>
        <a href="post_editor.html" class="btn btn-primary btn-sm">
          <i class="bi bi-plus-lg me-1"></i> Create your first post
        </a>
      </div>
    `
    return
  }

  const currentUser = userProfile?.username || getStoredUser()?.username || ''
  const recentPosts = userPosts.slice(0, 3)
  const colors = ['primary', 'success', 'info', 'warning']

  const postsHtml = recentPosts.map((post, idx) => {
    const authorName = post.author || post.authorDisplay?.replace(/^u\//, '') || 'user'
    const isLiked = Array.isArray(post.likedBy) && post.likedBy.includes(currentUser)
    const likeIconClass = isLiked ? 'bi-heart-fill text-danger' : 'bi-heart'
    
    return `
      <div class="post-card mb-3 p-3 border-start border-4 border-${colors[idx % colors.length]} border-opacity-75" data-post-id="${post.id}">
        <div class="small text-muted mb-1">
          ${post.community ? `<span class="post-chip"><i class="bi bi-hash"></i> ${escapeHtml(post.community.replace(/^r\//, ''))}</span>` : ''}
          <span class="ms-2">posted by <span class="text-light fw-semibold">u/${escapeHtml(authorName)}</span> · ${formatTimeAgo(post.createdAt)}</span>
        </div>
        <a href="create_post.html?id=${post.id}" class="text-decoration-none">
          <h6 class="mb-2 text-light">${escapeHtml(post.title)}</h6>
        </a>
        <p class="mb-3">${escapeHtml(post.body?.substring(0, 100) || '')}${post.body?.length > 100 ? '...' : ''}</p>
        <div class="d-flex align-items-center gap-2 post-actions">
          <a href="create_post.html?id=${post.id}" class="btn btn-sm btn-outline-secondary">
            <i class="bi bi-chat-left-text me-1"></i> ${post.commentsCount || 0}
          </a>
          <button type="button" class="btn btn-sm btn-outline-secondary post-like-btn" data-post-id="${post.id}">
            <i class="bi ${likeIconClass} me-1 post-like-icon"></i>
            <span class="post-likes-count">${post.likes || 0}</span>
          </button>
        </div>
      </div>
    `
  }).join('')

  overviewContainer.innerHTML = `
    ${headerHtml}
    ${postsHtml}
  `
}

function renderUserComments() {
  const commentsTab = document.getElementById('tabComments')
  if (!commentsTab) return

  if (userComments.length === 0) {
    commentsTab.innerHTML = `
      <div class="card card-soft p-3">
        <p class="tab-empty mb-0">
          No comments yet. <a href="home_con_auth.html" class="text-primary"><strong>Join the conversation!</strong></a>
        </p>
      </div>
    `
    return
  }

  const commentsHtml = userComments.map(comment => {
    const post = comment.post
    const postTitle = post?.title || 'Unknown post'
    const postId = post?.id
    const community = post?.community?.replace(/^r\//, '') || ''
    
    return `
      <div class="card card-soft mb-3">
        <div class="card-body">
          <div class="small text-muted mb-2">
            <i class="bi bi-reply me-1"></i> Commented on 
            <a href="create_post.html?id=${postId}" class="text-primary text-decoration-none fw-semibold">
              ${escapeHtml(postTitle)}
            </a>
            ${community ? `<span class="ms-1">in <span class="post-chip"><i class="bi bi-hash"></i> ${escapeHtml(community)}</span></span>` : ''}
            <span class="ms-2">· ${formatTimeAgo(comment.createdAt)}</span>
          </div>
          <p class="mb-2 text-light">${escapeHtml(comment.body)}</p>
          <div class="d-flex align-items-center gap-3 small text-muted">
            <span><i class="bi bi-heart me-1"></i> ${comment.likes || 0}</span>
            <a href="create_post.html?id=${postId}" class="text-muted text-decoration-none">
              <i class="bi bi-box-arrow-up-right me-1"></i> View post
            </a>
          </div>
        </div>
      </div>
    `
  }).join('')

  commentsTab.innerHTML = commentsHtml
}

function renderSavedPosts() {
  const savedTab = document.getElementById('tabSaved')
  if (!savedTab) return

  if (savedPosts.length === 0) {
    savedTab.innerHTML = `
      <div class="card card-soft p-3">
        <p class="tab-empty mb-0">
          No saved posts yet. <a href="home_con_auth.html" class="text-primary"><strong>Browse posts and save your favorites!</strong></a>
        </p>
      </div>
    `
    return
  }

  const currentUser = userProfile?.username || getStoredUser()?.username || ''

  const savedHtml = savedPosts.map(post => {
    const authorName = post.author || post.authorDisplay?.replace(/^u\//, '') || 'user'
    const isLiked = Array.isArray(post.likedBy) && post.likedBy.includes(currentUser)
    const likeIconClass = isLiked ? 'bi-heart-fill text-danger' : 'bi-heart'
    
    return `
      <div class="card card-soft mb-3" data-post-id="${post.id}">
        <div class="card-body">
          <div class="small text-muted mb-1">
            ${post.community ? `<span class="post-chip"><i class="bi bi-hash"></i> ${escapeHtml(post.community.replace(/^r\//, ''))}</span>` : ''}
            <span class="ms-2">posted by <span class="text-light">u/${escapeHtml(authorName)}</span> · ${formatTimeAgo(post.createdAt)}</span>
          </div>
          <a href="create_post.html?id=${post.id}" class="text-decoration-none">
            <h6 class="mb-2 text-light">${escapeHtml(post.title)}</h6>
          </a>
          <p class="mb-3">${escapeHtml(post.body?.substring(0, 150) || '')}${post.body?.length > 150 ? '...' : ''}</p>
          ${post.image ? `<img src="${post.image}" alt="Post image" class="img-fluid rounded mb-3" style="max-height: 200px; object-fit: cover;">` : ''}
          <div class="d-flex align-items-center gap-2 post-actions">
            <a href="create_post.html?id=${post.id}" class="btn btn-sm btn-outline-secondary">
              <i class="bi bi-chat-left-text me-1"></i> ${post.commentsCount || 0}
            </a>
            <button type="button" class="btn btn-sm btn-outline-secondary post-like-btn" data-post-id="${post.id}">
              <i class="bi ${likeIconClass} me-1 post-like-icon"></i>
              <span class="post-likes-count">${post.likes || 0}</span>
            </button>
            <button type="button" class="btn btn-sm btn-outline-warning unsave-btn" data-post-id="${post.id}">
              <i class="bi bi-bookmark-fill me-1"></i> Saved
            </button>
          </div>
        </div>
      </div>
    `
  }).join('')

  savedTab.innerHTML = savedHtml
}

function setupTabHandlers() {
  document.addEventListener('click', async (e) => {
    const unsaveBtn = e.target.closest('.unsave-btn')
    if (!unsaveBtn) return

    e.preventDefault()
    const postId = unsaveBtn.dataset.postId
    const currentUser = userProfile?.username || getStoredUser()?.username

    if (!postId || !currentUser) return

    try {
      const res = await fetch(`${API_URL}/posts/${postId}/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User': currentUser
        }
      })
      const data = await res.json()

      if (data.ok && !data.saved) {
        savedPosts = savedPosts.filter(p => p.id !== parseInt(postId, 10))
        renderSavedPosts()
      }
    } catch (err) {
      // Error unsaving post
    }
  })
}

function setupPostLikeHandlers() {
  document.addEventListener('click', async (e) => {
    const likeBtn = e.target.closest('.post-like-btn')
    if (!likeBtn) return

    e.preventDefault()
    e.stopPropagation()

    const postId = likeBtn.dataset.postId
    if (!postId) return

    const currentUser = userProfile?.username || getStoredUser()?.username
    if (!currentUser) {
      alert('Please log in to like posts')
      return
    }

    try {
      const res = await fetch(`${API_URL}/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User': currentUser
        }
      })
      const data = await res.json()

      if (data.ok) {
        const allBtns = document.querySelectorAll(`.post-like-btn[data-post-id="${postId}"]`)
        allBtns.forEach(btn => {
          const icon = btn.querySelector('.post-like-icon')
          const countSpan = btn.querySelector('.post-likes-count')

          if (icon) {
            if (data.liked) {
              icon.classList.remove('bi-heart')
              icon.classList.add('bi-heart-fill', 'text-danger')
            } else {
              icon.classList.remove('bi-heart-fill', 'text-danger')
              icon.classList.add('bi-heart')
            }
          }

          if (countSpan) {
            countSpan.textContent = data.likes
          }
        })

        const updatePost = (arr) => {
          const post = arr.find(p => p.id === parseInt(postId, 10))
          if (post) {
            post.likes = data.likes
            if (data.liked) {
              if (!post.likedBy) post.likedBy = []
              if (!post.likedBy.includes(currentUser)) post.likedBy.push(currentUser)
            } else {
              if (post.likedBy) {
                post.likedBy = post.likedBy.filter(u => u !== currentUser)
              }
            }
          }
        }
        updatePost(userPosts)
        updatePost(savedPosts)
        updatePost(allPosts)
      }
    } catch (err) {
      // Error liking post
    }
  })
}

function setupLogout() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="logout"]')
    if (btn) {
      e.preventDefault()
      localStorage.removeItem('studio404_user')
      window.location.href = './home_sin_auth.html'
    }
  })
}

function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return ''
  
  if (typeof dateStr === 'string' && !dateStr.includes('T') && !dateStr.includes('/')) {
    return dateStr
  }
  
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)

  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  
  const options = { month: 'short', day: 'numeric' }
  return date.toLocaleDateString('en-US', options)
}