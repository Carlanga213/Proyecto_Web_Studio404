// FRONTEND/controllers/post_editor_controller.js

let availableTopics = []
let editingPostId = null

document.addEventListener('DOMContentLoaded', async () => {
  if (!CURRENT_USER || CURRENT_USER === 'guest') {
    alert('Necesitas iniciar sesión para publicar')
    window.location.href = '/login.html'
    return
  }

  // CARGAR AVATAR DEL USUARIO
  await loadUserAvatar()

  initCreatePostPage()
})

async function loadUserAvatar() {
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
    console.error('Error loading user avatar', err)
  }
}

async function initCreatePostPage() {
  setupStaticUi()
  await loadUserTopics()
  setupFormModeFromQuery()
}

function setupStaticUi() {
  const cancelBtn = document.getElementById('btnCancelPost')
  const noTopicBtn = document.getElementById('btnNoTopic')
  const form = document.getElementById('createPostForm')
  const deleteBtn = document.getElementById('btnDeletePost')

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      window.location.href = '/home_con_auth.html'
    })
  }

  if (noTopicBtn) {
    noTopicBtn.addEventListener('click', () => {
      const input = document.getElementById('inputTopicName')
      if (input) input.value = ''
      highlightSelectedTopic('')
    })
  }

  if (form) {
    form.addEventListener('submit', handleSubmitPost)
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', handleDeletePost)
  }
}

async function loadUserTopics() {
  const pillsContainer = document.getElementById('userTopicsPills')
  if (!pillsContainer) return

  pillsContainer.innerHTML =
    '<span class="text-muted small">Loading your topics…</span>'

  try {
    const headers = { 'x-user': CURRENT_USER }

    const [mineRes, joinedRes] = await Promise.all([
      fetch(`${API_URL}/topics/mine`, { headers }),
      fetch(`${API_URL}/topics/joined`, { headers })
    ])

    const mineData = await mineRes.json()
    const joinedData = await joinedRes.json()

    const map = new Map()

    if (mineData.ok && Array.isArray(mineData.topics)) {
      mineData.topics.forEach(t => {
        if (t && typeof t.name === 'string') {
          map.set(t.name, t)
        }
      })
    }

    if (joinedData.ok && Array.isArray(joinedData.topics)) {
      joinedData.topics.forEach(t => {
        if (t && typeof t.name === 'string') {
          map.set(t.name, t)
        }
      })
    }

    availableTopics = Array.from(map.values())
    renderTopicPills()
  } catch (err) {
    console.error('Error loading topics for composer', err)
    pillsContainer.innerHTML =
      '<span class="text-danger small">Error loading topics.</span>'
  }
}

function renderTopicPills() {
  const pillsContainer = document.getElementById('userTopicsPills')
  if (!pillsContainer) return

  if (!availableTopics || availableTopics.length === 0) {
    pillsContainer.innerHTML =
      '<span class="text-muted small">You are not in any community yet.</span>'
    return
  }

  const html = availableTopics
    .map(
      t => `
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary me-1 mb-1 topic-pill"
        data-topic-name="${escapeHtml(t.name)}"
      >
        r/${escapeHtml(t.name)}
      </button>
    `
    )
    .join('')

  pillsContainer.innerHTML = html

  pillsContainer.addEventListener('click', event => {
    const btn = event.target.closest('.topic-pill')
    if (!btn) return
    const name = btn.dataset.topicName || ''
    const input = document.getElementById('inputTopicName')
    if (input) {
      input.value = name
    }
    highlightSelectedTopic(name)
  })
}

function highlightSelectedTopic(selectedName) {
  const pills = document.querySelectorAll('.topic-pill')
  pills.forEach(pill => {
    const name = pill.dataset.topicName || ''
    if (
      selectedName &&
      name.toLowerCase() === selectedName.toLowerCase()
    ) {
      pill.classList.add('btn-primary', 'text-white')
      pill.classList.remove('btn-outline-secondary')
    } else {
      pill.classList.remove('btn-primary', 'text-white')
      pill.classList.add('btn-outline-secondary')
    }
  })
}

function setupFormModeFromQuery() {
  const params = new URLSearchParams(window.location.search)
  const idParam = params.get('id')

  if (idParam) {
    const id = parseInt(idParam, 10)
    if (!isNaN(id)) {
      editingPostId = id
      setupEditMode()
      loadPostForEdit(id)
    }
  }
}

function setupEditMode() {
  const titleEl = document.getElementById('createPostTitle')
  const submitBtn = document.getElementById('btnSubmitPost')
  const deleteBtn = document.getElementById('btnDeletePost')

  if (titleEl) {
    titleEl.textContent = 'Edit post'
  }
  if (submitBtn) {
    submitBtn.textContent = 'Save changes'
  }
  if (deleteBtn) {
    deleteBtn.classList.remove('d-none')
  }
}

async function loadPostForEdit(id) {
  try {
    const res = await fetch(`${API_URL}/posts/${id}`)
    const data = await res.json()
    if (!data.ok || !data.post) {
      console.error('Error loading post for edit', data.error)
      alert('Error loading post')
      return
    }

    const post = data.post

    const titleInput = document.getElementById('inputPostTitle')
    const bodyInput = document.getElementById('inputPostBody')
    const imageInput = document.getElementById('inputImageUrl')
    const topicInput = document.getElementById('inputTopicName')

    if (titleInput) titleInput.value = post.title || ''
    if (bodyInput) bodyInput.value = post.body || ''

    if (
      imageInput &&
      typeof post.image === 'string' &&
      /^https?:\/\//i.test(post.image)
    ) {
      imageInput.value = post.image
    }

    let topicName = ''
    if (post.community && typeof post.community === 'string') {
      const c = post.community
      if (c.toLowerCase().startsWith('r/')) {
        topicName = c.substring(2)
      } else {
        topicName = c
      }
    }

    if (topicInput) {
      topicInput.value = topicName
    }

    highlightSelectedTopic(topicName)
  } catch (err) {
    console.error('Network error loading post for edit', err)
    alert('Network error loading post')
  }
}

async function handleSubmitPost(event) {
  event.preventDefault()

  const titleInput = document.getElementById('inputPostTitle')
  const bodyInput = document.getElementById('inputPostBody')
  const imageUrlInput = document.getElementById('inputImageUrl')
  const imageFileInput = document.getElementById('inputImageFile')
  const topicInput = document.getElementById('inputTopicName')

  const title = titleInput ? titleInput.value.trim() : ''
  const body = bodyInput ? bodyInput.value.trim() : ''
  const imageUrl = imageUrlInput ? imageUrlInput.value.trim() : ''
  let topicName = topicInput ? topicInput.value.trim() : ''

  if (!title) {
    alert('Add a title to your post')
    return
  }

  if (!body) {
    alert('Write something before publishing')
    return
  }

  let community = ''

  if (topicName) {
    if (topicName.toLowerCase().startsWith('r/')) {
      topicName = topicName.substring(2)
    }

    const valid = availableTopics.some(
      t =>
        t &&
        typeof t.name === 'string' &&
        t.name.toLowerCase() === topicName.toLowerCase()
    )

    if (!valid) {
      alert('No estas en ese topic o no existe')
      return
    }

    community = 'r/' + topicName
  }

  let image = imageUrl

  const file =
    imageFileInput &&
    imageFileInput.files &&
    imageFileInput.files[0]
      ? imageFileInput.files[0]
      : null

  if (file) {
    try {
      image = await readFileAsDataUrl(file)
    } catch (err) {
      console.error('Error reading image file', err)
      alert('Error reading image file')
      return
    }
  }

  const payload = {
    title,
    body,
    community,
    image,
    tags: []
  }

  const url = editingPostId
    ? `${API_URL}/posts/${editingPostId}`
    : `${API_URL}/posts`
  const method = editingPostId ? 'PUT' : 'POST'

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-user': CURRENT_USER
      },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (!data.ok) {
      console.error('Error saving post', data.error)
      alert('Error saving post: ' + data.error)
      return
    }

    window.location.href = '/home_con_auth.html'
  } catch (err) {
    console.error('Network error saving post', err)
    alert('Network error saving post')
  }
}

async function handleDeletePost() {
  if (!editingPostId) return

  const confirmDelete = confirm('Delete this post')
  if (!confirmDelete) return

  try {
    const res = await fetch(`${API_URL}/posts/${editingPostId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-user': CURRENT_USER
      }
    })

    const data = await res.json()
    if (!data.ok) {
      console.error('Error deleting post', data.error)
      alert('Error deleting post: ' + data.error)
      return
    }

    window.location.href = '/home_con_auth.html'
  } catch (err) {
    console.error('Network error deleting post', err)
    alert('Network error deleting post')
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Error reading file'))
    reader.readAsDataURL(file)
  })
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
