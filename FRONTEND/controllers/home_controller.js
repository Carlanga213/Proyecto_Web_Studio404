// FRONTEND/controllers/home_controller.js

let allPosts = []
let myTopics = []
let joinedTopics = []

document.addEventListener('DOMContentLoaded', async () => {
  loadPosts()
  loadMyTopics()
  loadJoinedTopics()
  setupCommunitiesUi()
  setupTopicToggles()
  setupTopicJoinsFromBrowse()

  // CARGAR AVATAR DEL USUARIO EN EL COMPOSER
  await loadComposerAvatar()
})

// POSTS FEED

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

// Filter by tags selected in Browse topics

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

    // If filter removes everything, show all again
    if (toShow.length === 0) {
      toShow = allPosts
    }
  }

  const html = toShow.map(createPostCardHtml).join('')
  container.innerHTML = html
}

// For backward use if needed
function renderPosts() {
  renderFilteredPosts()
}

function createPostCardHtml(post) {
  const safeTitle = escapeHtml(post.title || '')
  const safeBody = escapeHtml(post.body || '')
  const safeCommunity = escapeHtml(post.community || 'r/random')
  const safeAuthor = escapeHtml(post.authorDisplay || 'u/anonymous')
  const safeTime = escapeHtml(post.createdAt || '')
  const likes = typeof post.likes === 'number' ? post.likes : 0
  const commentsCount =
    typeof post.commentsCount === 'number' ? post.commentsCount : 0
  const commentsLabel =
    commentsCount > 0
      ? `${commentsCount} comment${commentsCount === 1 ? '' : 's'}`
      : 'Comments'

  const likedByUser =
    Array.isArray(post.likedBy) && post.likedBy.includes(CURRENT_USER)
  const savedByUser =
    Array.isArray(post.savedBy) && post.savedBy.includes(CURRENT_USER)

  const likeBtnClass = likedByUser
    ? 'btn btn-danger btn-sm w-100 d-inline-flex align-items-center justify-content-center gap-1 post-like'
    : 'btn btn-outline-secondary btn-sm w-100 d-inline-flex align-items-center justify-content-center gap-1 post-like'
  const likeIconClass = likedByUser ? 'bi-heart-fill' : 'bi-heart'

  const saveBtnClass = savedByUser
    ? 'btn btn-primary btn-sm w-100 d-inline-flex align-items-center justify-content-center gap-1 post-save'
    : 'btn btn-outline-secondary btn-sm w-100 d-inline-flex align-items-center justify-content-center gap-1 post-save'
  const saveIconClass = savedByUser ? 'bi-bookmark-fill' : 'bi-bookmark'

  const imageHtml = post.image
    ? `<img src="${post.image}" alt="Post image" class="img-fluid mb-2 rounded">`
    : ''

  const bodyHtml = safeBody
    ? `<p class="small text-light mb-2">${safeBody}</p>`
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
            class="${likeBtnClass}"
            data-action="like"
          >
            <i class="bi ${likeIconClass} post-like-icon"></i>
            <span class="post-likes-count">${likes}</span>
          </button>
        </div>
        <div class="col-4 text-center">
          <button
            type="button"
            class="btn btn-outline-secondary btn-sm w-100 d-inline-flex align-items-center justify-content-center gap-1 post-comment"
            data-action="comment"
          >
            <i class="bi bi-chat"></i>
            <span>${commentsLabel}</span>
          </button>
        </div>
        <div class="col-4 text-center">
          <button
            type="button"
            class="${saveBtnClass}"
            data-action="save"
          >
            <i class="bi ${saveIconClass} post-save-icon"></i>
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

  if (container.dataset.listenerAttached === 'true') {
    return
  }
  container.dataset.listenerAttached = 'true'

  container.addEventListener('click', handlePostsClick)
}

async function handlePostsClick(event) {
  const article = event.target.closest('article[data-post-id]')
  if (!article) return
  const postId = parseInt(article.dataset.postId, 10)

  const likeBtn = event.target.closest('.post-like')
  if (likeBtn) {
    await handlePostLike(postId, article, likeBtn)
    return
  }

  const saveBtn = event.target.closest('.post-save')
  if (saveBtn) {
    await handlePostSave(postId, article, saveBtn)
    return
  }

  const commentBtn = event.target.closest('.post-comment')
  if (commentBtn) {
    // Aquí se manda a create_post.html con el id del post
    window.location.href = `./create_post.html?id=${postId}`
    return
  }
}

async function handlePostLike(postId, article, button) {
  if (!CURRENT_USER || CURRENT_USER === 'guest') {
    const goLogin = confirm('You need to login to like posts. Go to login page')
    if (goLogin) window.location.href = '/login.html'
    return
  }

  try {
    const res = await fetch(`${API_URL}/posts/${postId}/like`, {
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

    const post = data.post
    const likes = data.likes

    const idx = allPosts.findIndex(p => p.id === postId)
    if (idx !== -1) {
      allPosts[idx] = post
    }

    const countSpan = article.querySelector('.post-likes-count')
    const icon = article.querySelector('.post-like-icon')

    if (countSpan) {
      countSpan.textContent = likes
    }

    if (data.liked) {
      button.classList.remove('btn-outline-secondary')
      button.classList.add('btn-danger')
      if (icon) {
        icon.classList.remove('bi-heart')
        icon.classList.add('bi-heart-fill')
      }
    } else {
      button.classList.remove('btn-danger')
      button.classList.add('btn-outline-secondary')
      if (icon) {
        icon.classList.remove('bi-heart-fill')
        icon.classList.add('bi-heart')
      }
    }
  } catch (err) {
    console.error('Network error toggling like', err)
    alert('Network error toggling like')
  }
}

async function handlePostSave(postId, article, button) {
  if (!CURRENT_USER || CURRENT_USER === 'guest') {
    const goLogin = confirm('You need to login to save posts. Go to login page')
    if (goLogin) window.location.href = '/login.html'
    return
  }

  try {
    const res = await fetch(`${API_URL}/posts/${postId}/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user': CURRENT_USER
      },
      body: JSON.stringify({})
    })
    const data = await res.json()
    if (!data.ok) {
      console.error('Error toggling save', data.error)
      alert('Error toggling save')
      return
    }

    const post = data.post
    const idx = allPosts.findIndex(p => p.id === postId)
    if (idx !== -1) {
      allPosts[idx] = post
    }

    const icon = article.querySelector('.post-save-icon')

    if (data.saved) {
      button.classList.remove('btn-outline-secondary')
      button.classList.add('btn-primary')
      if (icon) {
        icon.classList.remove('bi-bookmark')
        icon.classList.add('bi-bookmark-fill')
      }
    } else {
      button.classList.remove('btn-primary')
      button.classList.add('btn-outline-secondary')
      if (icon) {
        icon.classList.remove('bi-bookmark-fill')
        icon.classList.add('bi-bookmark')
      }
    }
  } catch (err) {
    console.error('Network error toggling save', err)
    alert('Network error toggling save')
  }
}

// TOPICS AND COMMUNITIES

async function loadMyTopics() {
  const list = document.getElementById('myTopicsList')
  const empty = document.getElementById('myTopicsEmpty')
  const manageList = document.getElementById('myTopicsManageList')

  if (!list || !empty || !manageList) return

  list.innerHTML = '<span class="text-muted small">Loading...</span>'

  try {
    const res = await fetch(`${API_URL}/topics/mine`, {
      headers: { 'x-user': CURRENT_USER }
    })
    const data = await res.json()
    if (!data.ok) {
      console.error('Error loading my topics', data.error)
      list.innerHTML = '<span class="text-danger small">Error loading topics.</span>'
      return
    }

    myTopics = data.topics || []
    renderMyTopics()
  } catch (err) {
    console.error('Network error loading my topics', err)
    list.innerHTML = '<span class="text-danger small">Network error loading topics.</span>'
  }
}

function renderMyTopics() {
  const list = document.getElementById('myTopicsList')
  const empty = document.getElementById('myTopicsEmpty')
  const manageList = document.getElementById('myTopicsManageList')

  if (!list || !empty || !manageList) return

  if (!myTopics || myTopics.length === 0) {
    list.innerHTML = ''
    empty.classList.remove('d-none')
    manageList.innerHTML = ''
    return
  }

  empty.classList.add('d-none')

  const pills = myTopics
    .map(
      t =>
        `<span class="badge rounded-pill text-bg-secondary me-1 mb-1">r/${escapeHtml(
          t.name
        )}</span>`
    )
    .join('')

  list.innerHTML = pills

  const manageHtml = myTopics
    .map(
      t => `
      <div class="d-flex align-items-center mb-1" data-topic-id="${t.id}">
        <span class="me-2">r/${escapeHtml(t.name)}</span>
        <span class="text-muted small flex-grow-1 text-truncate">
          ${escapeHtml(t.title || '')}
        </span>
        <button
          type="button"
          class="btn btn-link btn-sm p-0 ms-1 btn-edit-topic"
          data-topic-id="${t.id}"
        >
          <i class="bi bi-pencil-square"></i>
        </button>
        <button
          type="button"
          class="btn btn-link btn-sm text-danger p-0 ms-1 btn-delete-topic"
          data-topic-id="${t.id}"
        >
          Delete
        </button>
      </div>
    `
    )
    .join('')

  manageList.innerHTML = manageHtml
}

async function loadJoinedTopics() {
  const list = document.getElementById('joinedTopicsList')
  const empty = document.getElementById('joinedTopicsEmpty')
  const manageList = document.getElementById('joinedTopicsManageList')

  if (!list || !empty || !manageList) return

  list.innerHTML = '<span class="text-muted small">Loading...</span>'

  try {
    const res = await fetch(`${API_URL}/topics/joined`, {
      headers: { 'x-user': CURRENT_USER }
    })
    const data = await res.json()
    if (!data.ok) {
      console.error('Error loading joined topics', data.error)
      list.innerHTML =
        '<span class="text-danger small">Error loading communities.</span>'
      return
    }

    joinedTopics = data.topics || []
    renderJoinedTopics()
    markJoinedTopicsInBrowse()
  } catch (err) {
    console.error('Network error loading joined topics', err)
    list.innerHTML =
      '<span class="text-danger small">Network error loading communities.</span>'
  }
}

function renderJoinedTopics() {
  const list = document.getElementById('joinedTopicsList')
  const empty = document.getElementById('joinedTopicsEmpty')
  const manageList = document.getElementById('joinedTopicsManageList')

  if (!list || !empty || !manageList) return

  if (!joinedTopics || joinedTopics.length === 0) {
    list.innerHTML = ''
    empty.classList.remove('d-none')
    manageList.innerHTML = ''
    return
  }

  empty.classList.add('d-none')

  const pills = joinedTopics
    .map(
      t =>
        `<span class="badge rounded-pill text-bg-light border me-1 mb-1">r/${escapeHtml(
          t.name
        )}</span>`
    )
    .join('')

  list.innerHTML = pills

  const manageHtml = joinedTopics
    .map(
      t => `
      <div class="d-flex align-items-center mb-1" data-topic-id="${t.id}">
        <span class="me-2">r/${escapeHtml(t.name)}</span>
        <span class="text-muted small flex-grow-1 text-truncate">
          ${escapeHtml(t.title || '')}
        </span>
        <button
          type="button"
          class="btn btn-link btn-sm text-danger p-0 ms-1 btn-leave-topic"
          data-topic-id="${t.id}"
        >
          Leave
        </button>
      </div>
    `
    )
    .join('')

  manageList.innerHTML = manageHtml
}

function setupCommunitiesUi() {
  const btnManageMy = document.getElementById('btnManageMyTopics')
  const btnManageJoined = document.getElementById('btnManageJoinedTopics')
  const myManage = document.getElementById('myTopicsManage')
  const joinedManage = document.getElementById('joinedTopicsManage')
  const formCreate = document.getElementById('formCreateTopic')
  const myManageList = document.getElementById('myTopicsManageList')
  const joinedManageList = document.getElementById('joinedTopicsManageList')

  if (btnManageMy && myManage) {
    btnManageMy.addEventListener('click', () => {
      const hidden = myManage.classList.contains('d-none')
      if (hidden) {
        myManage.classList.remove('d-none')
      } else {
        myManage.classList.add('d-none')
      }
    })
  }

  if (btnManageJoined && joinedManage) {
    btnManageJoined.addEventListener('click', () => {
      const hidden = joinedManage.classList.contains('d-none')
      if (hidden) {
        joinedManage.classList.remove('d-none')
      } else {
        joinedManage.classList.add('d-none')
      }
    })
  }

  if (formCreate) {
    formCreate.addEventListener('submit', handleCreateTopic)
  }

  if (myManageList) {
    myManageList.addEventListener('click', async event => {
      const editBtn = event.target.closest('.btn-edit-topic')
      if (editBtn) {
        const id = parseInt(editBtn.dataset.topicId, 10)
        await handleEditTopic(id)
        return
      }

      const deleteBtn = event.target.closest('.btn-delete-topic')
      if (deleteBtn) {
        const id = parseInt(deleteBtn.dataset.topicId, 10)
        await handleDeleteTopic(id)
        return
      }
    })
  }

  if (joinedManageList) {
    joinedManageList.addEventListener('click', async event => {
      const btn = event.target.closest('.btn-leave-topic')
      if (!btn) return
      const id = parseInt(btn.dataset.topicId, 10)
      await handleLeaveTopic(id)
    })
  }
}

async function handleCreateTopic(event) {
  event.preventDefault()

  const nameInput = document.getElementById('inputTopicName')
  const titleInput = document.getElementById('inputTopicTitle')
  const descInput = document.getElementById('inputTopicDescription')

  if (!nameInput) return

  const name = nameInput.value.trim()
  const title = titleInput ? titleInput.value.trim() : ''
  const description = descInput ? descInput.value.trim() : ''

  if (name === '') {
    alert('Topic name is required')
    return
  }

  try {
    const res = await fetch(`${API_URL}/topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user': CURRENT_USER
      },
      body: JSON.stringify({ name, title, description })
    })
    const data = await res.json()
    if (!data.ok) {
      console.error('Error creating topic', data.error)
      alert('Error creating topic: ' + data.error)
      return
    }

    nameInput.value = ''
    if (titleInput) titleInput.value = ''
    if (descInput) descInput.value = ''

    await loadMyTopics()
    await loadJoinedTopics()
  } catch (err) {
    console.error('Network error creating topic', err)
    alert('Network error creating topic')
  }
}

async function handleEditTopic(topicId) {
  const topic = myTopics.find(t => t.id === topicId)
  if (!topic) return

  const newName = prompt('Edit topic name', topic.name)
  if (newName === null) return
  const trimmed = newName.trim()
  if (trimmed === '') return

  try {
    const res = await fetch(`${API_URL}/topics/${topicId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user': CURRENT_USER
      },
      body: JSON.stringify({ name: trimmed })
    })
    const data = await res.json()
    if (!data.ok) {
      console.error('Error updating topic', data.error)
      alert('Error updating topic: ' + data.error)
      return
    }

    await loadMyTopics()
    await loadJoinedTopics()
  } catch (err) {
    console.error('Network error updating topic', err)
    alert('Network error updating topic')
  }
}

async function handleDeleteTopic(topicId) {
  const topic = myTopics.find(t => t.id === topicId)
  if (!topic) return

  const confirmDelete = confirm(
    `Delete topic r/${topic.name}? This will remove it from your list.`
  )
  if (!confirmDelete) return

  try {
    const res = await fetch(`${API_URL}/topics/${topicId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-user': CURRENT_USER
      }
    })
    const data = await res.json()
    if (!data.ok) {
      console.error('Error deleting topic', data.error)
      alert('Error deleting topic: ' + data.error)
      return
    }

    await loadMyTopics()
    await loadJoinedTopics()
  } catch (err) {
    console.error('Network error deleting topic', err)
    alert('Network error deleting topic')
  }
}

async function handleLeaveTopic(topicId) {
  const confirmLeave = confirm('Leave this community')
  if (!confirmLeave) return

  try {
    const res = await fetch(`${API_URL}/topics/${topicId}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user': CURRENT_USER
      },
      body: JSON.stringify({})
    })
    const data = await res.json()
    if (!data.ok) {
      console.error('Error leaving topic', data.error)
      alert('Error leaving topic: ' + data.error)
      return
    }

    await loadJoinedTopics()
  } catch (err) {
    console.error('Network error leaving topic', err)
    alert('Network error leaving topic')
  }
}

// JOIN FROM BROWSE TOPICS CARD

function setupTopicJoinsFromBrowse() {
  const card = document.getElementById('browseTopicsCard')
  if (!card) return

  card.addEventListener('click', async event => {
    const btn = event.target.closest('.topic-join-btn')
    if (!btn) return

    if (!CURRENT_USER || CURRENT_USER === 'guest') {
      const goLogin = confirm(
        'You need to login to join communities. Go to login page'
      )
      if (goLogin) window.location.href = '/login.html'
      return
    }

    const name = btn.dataset.topicName || ''
    const title = btn.dataset.topicTitle || ''
    const description = btn.dataset.topicDescription || ''

    if (!name) return

    try {
      const res = await fetch(`${API_URL}/topics/join-by-name`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user': CURRENT_USER
        },
        body: JSON.stringify({ name, title, description })
      })
      const data = await res.json()
      if (!data.ok) {
        console.error('Error joining topic', data.error)
        alert('Error joining topic: ' + data.error)
        return
      }

      btn.textContent = 'Joined'
      btn.disabled = true

      await loadJoinedTopics()
    } catch (err) {
      console.error('Network error joining topic', err)
      alert('Network error joining topic')
    }
  })
}

function markJoinedTopicsInBrowse() {
  const buttons = document.querySelectorAll('.topic-join-btn')
  if (!buttons.length) return

  const joinedNames = new Set(
    (joinedTopics || [])
      .filter(t => typeof t.name === 'string')
      .map(t => t.name.toLowerCase())
  )

  buttons.forEach(btn => {
    const name = (btn.dataset.topicName || '').toLowerCase()
    if (joinedNames.has(name)) {
      btn.textContent = 'Joined'
      btn.disabled = true
    } else {
      btn.textContent = 'Join'
      btn.disabled = false
    }
  })
}

// HELPERS

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

async function loadComposerAvatar() {
  if (!CURRENT_USER || CURRENT_USER === 'guest') return

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
    if (data.ok && data.profile?.avatarUrl) {
      const avatarImg = document.getElementById('composerUserAvatar')
      if (avatarImg) {
        avatarImg.src = data.profile.avatarUrl
      }
    }
  } catch (err) {
    console.error('Error loading composer avatar', err)
  }
}
