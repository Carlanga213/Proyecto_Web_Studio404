const CURRENT_USER = 'aurora' // usuario “fijo” por ahora

let postsCache = []

function displayCreated(createdAt) {
  if (!createdAt) return ''
  const lower = String(createdAt).toLowerCase()

  if (
    lower.includes('hour') ||
    lower.includes('min') ||
    lower.includes('yesterday') ||
    lower.includes('day') ||
    lower.includes('week') ||
    lower.includes('just now')
  ) {
    return createdAt
  }

  const d = new Date(createdAt)
  if (isNaN(d.getTime())) return createdAt

  const now = new Date()
  const diffMs = now - d
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return diffMin + ' min ago'
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return diffHr + ' hours ago'
  const diffDay = Math.round(diffHr / 24)
  return diffDay + ' days ago'
}

function renderPosts() {
  const listEl = document.getElementById('postsList')
  listEl.innerHTML = ''

  if (!postsCache || postsCache.length === 0) {
    listEl.innerHTML =
      '<li class="list-group-item text-muted">No posts yet. Create the first one.</li>'
    return
  }

  postsCache.forEach(post => {
    const isLiked =
      Array.isArray(post.likedBy) && post.likedBy.includes(CURRENT_USER)
    const isSaved =
      Array.isArray(post.savedBy) && post.savedBy.includes(CURRENT_USER)

    const likesCount =
      typeof post.likes === 'number'
        ? post.likes
        : Array.isArray(post.likedBy)
        ? post.likedBy.length
        : 0

    const created = displayCreated(post.createdAt)
    const canEdit =
      post.author === CURRENT_USER ||
      post.authorDisplay === 'u/' + CURRENT_USER

    const commentsCount = post.commentsCount || 0

    const li = document.createElement('li')
    li.className = 'list-group-item'

    li.innerHTML = `
      <div class="d-flex">
        <!-- columna de votos -->
        <div class="me-3 text-center">
          <button
            class="btn btn-outline-secondary btn-sm d-block mb-1 btn-like-post"
            data-id="${post.id}"
          >
            <i class="bi bi-caret-up-fill"></i>
          </button>
          <div class="fw-semibold">${likesCount}</div>
          <button class="btn btn-outline-secondary btn-sm d-block mt-1" disabled>
            <i class="bi bi-caret-down"></i>
          </button>
        </div>

        <div class="flex-grow-1">
          <!-- VISTA NORMAL DEL POST -->
          <div class="post-view">
            <div class="small text-muted mb-1">
              <a href="#" class="fw-semibold text-decoration-none">
                ${post.community || 'r/AuroraGallery'}
              </a>
              <span>
                · posted by ${
                  post.authorDisplay || 'u/' + (post.author || CURRENT_USER)
                }${created ? ' · ' + created : ''}
              </span>
              ${
                post.topic
                  ? `<span class="badge bg-secondary-subtle text-secondary ms-2">${post.topic}</span>`
                  : ''
              }
            </div>

            <a href="/views/comment_section.html?postId=${post.id}" class="text-decoration-none text-body">
              <h2 class="h6 mb-1">${post.title}</h2>
            </a>

            ${
              post.content
                ? `<p class="mb-2">${post.content}</p>`
                : ''
            }

            ${
              post.imageUrl
                ? `
              <div class="mb-2">
                <img src="${post.imageUrl}" alt="post image" class="img-fluid rounded">
              </div>
            `
                : ''
            }

            ${
              post.linkUrl
                ? `
              <div class="mb-2">
                <a href="${post.linkUrl}" target="_blank"
                  class="small text-decoration-none d-inline-flex align-items-center">
                  <i class="bi bi-link-45deg me-1"></i>${post.linkUrl}
                </a>
              </div>
            `
                : ''
            }

            <div class="d-flex justify-content-between align-items-center small text-muted">
              <div class="d-flex flex-wrap gap-3 align-items-center">
                <button
                  type="button"
                  class="btn btn-sm ${
                    isLiked ? 'btn-primary' : 'btn-outline-secondary'
                  } btn-like-toggle"
                  data-id="${post.id}"
                >
                  Like · <span>${likesCount}</span>
                </button>

                <a href="/views/comment_section.html?postId=${post.id}"
                   class="text-decoration-none">
                  <i class="bi bi-chat"></i> ${commentsCount} comments
                </a>

                <span>
                  <i class="bi bi-share"></i> Share
                </span>

                <button
                  type="button"
                  class="btn btn-sm ${
                    isSaved ? 'btn-success' : 'btn-outline-secondary'
                  } btn-save-post"
                  data-id="${post.id}"
                >
                  ${isSaved ? 'Saved' : 'Save'}
                </button>
              </div>

              <div>
                <button
                  type="button"
                  class="btn btn-outline-secondary btn-sm me-2 btn-edit-post"
                  data-id="${post.id}"
                  style="${canEdit ? '' : 'display:none'}"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="btn btn-outline-danger btn-sm btn-delete-post"
                  data-id="${post.id}"
                  style="${canEdit ? '' : 'display:none'}"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>

          <!-- FORMULARIO DE EDICIÓN INLINE -->
          <form
            class="border rounded p-2 mt-2 d-none form-post-edit"
            data-id="${post.id}"
            enctype="multipart/form-data"
          >
            <div class="mb-2">
              <label class="form-label small">Title</label>
              <input
                type="text"
                class="form-control form-control-sm"
                name="title"
                value="${post.title || ''}"
              >
            </div>

            <div class="mb-2">
              <label class="form-label small">Topic</label>
              <select class="form-select form-select-sm" name="topic">
                <option value="general" ${
                  post.topic === 'general' ? 'selected' : ''
                }>General</option>
                <option value="study" ${
                  post.topic === 'study' ? 'selected' : ''
                }>Study</option>
                <option value="music" ${
                  post.topic === 'music' ? 'selected' : ''
                }>Music</option>
                <option value="design" ${
                  post.topic === 'design' ? 'selected' : ''
                }>Design</option>
                <option value="tech" ${
                  post.topic === 'tech' ? 'selected' : ''
                }>Tech</option>
                <option value="anime" ${
                  post.topic === 'anime' ? 'selected' : ''
                }>Anime</option>
              </select>
            </div>

            <div class="mb-2">
              <label class="form-label small">Content</label>
              <textarea
                class="form-control form-control-sm"
                name="content"
                rows="3"
              >${post.content || ''}</textarea>
            </div>

            <div class="row g-2 mb-2">
              <div class="col-md-6">
                <label class="form-label small">Link</label>
                <input
                  type="url"
                  class="form-control form-control-sm"
                  name="linkUrl"
                  value="${post.linkUrl || ''}"
                >
              </div>
              <div class="col-md-6">
                <label class="form-label small">Image</label>
                <input
                  type="file"
                  class="form-control form-control-sm"
                  name="image"
                  accept="image/*"
                >
                <small class="text-muted">Deja vacío si no quieres cambiarla.</small>
              </div>
            </div>

            <div class="text-end">
              <button
                type="button"
                class="btn btn-outline-secondary btn-sm btn-cancel-edit"
                data-id="${post.id}"
              >
                Cancel
              </button>
              <button type="submit" class="btn btn-primary btn-sm">
                Save changes
              </button>
            </div>
          </form>
        </div>
      </div>
    `

    listEl.appendChild(li)
  })

  // listeners para LIKE (botón "Like · N")
  listEl.querySelectorAll('.btn-like-toggle').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id')
      try {
        const updated = await apiPut('/api/posts/' + id + '/like')
        const idx = postsCache.findIndex(p => p.id === updated.id)
        if (idx !== -1) {
          postsCache[idx] = updated
          renderPosts()
        }
      } catch (err) {
        console.error(err)
        alert('Error toggling like')
      }
    })
  })

  // listeners para LIKE desde la flecha (arriba)
  listEl.querySelectorAll('.btn-like-post').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id')
      try {
        const updated = await apiPut('/api/posts/' + id + '/like')
        const idx = postsCache.findIndex(p => p.id === updated.id)
        if (idx !== -1) {
          postsCache[idx] = updated
          renderPosts()
        }
      } catch (err) {
        console.error(err)
        alert('Error toggling like')
      }
    })
  })

  // listeners SAVE
  listEl.querySelectorAll('.btn-save-post').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id')
      try {
        const updated = await apiPut('/api/posts/' + id + '/save')
        const idx = postsCache.findIndex(p => p.id === updated.id)
        if (idx !== -1) {
          postsCache[idx] = updated
          renderPosts()
        }
      } catch (err) {
        console.error(err)
        alert('Error toggling save')
      }
    })
  })

  // EDIT (mostrar formulario inline)
  listEl.querySelectorAll('.btn-edit-post').forEach(btn => {
    btn.addEventListener('click', () => {
      const li = btn.closest('li')
      if (!li) return
      const view = li.querySelector('.post-view')
      const form = li.querySelector('.form-post-edit')
      if (!view || !form) return
      view.classList.add('d-none')
      form.classList.remove('d-none')
    })
  })

  // CANCEL EDIT
  listEl.querySelectorAll('.btn-cancel-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const li = btn.closest('li')
      if (!li) return
      const view = li.querySelector('.post-view')
      const form = li.querySelector('.form-post-edit')
      if (!view || !form) return
      form.classList.add('d-none')
      view.classList.remove('d-none')
    })
  })

  // SUBMIT EDIT
  listEl.querySelectorAll('.form-post-edit').forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault()
      const id = form.getAttribute('data-id')
      if (!id) return

      const formData = new FormData(form)

      const title = String(formData.get('title') || '').trim()
      if (!title) {
        alert('Title is required')
        return
      }

      try {
        const res = await fetch('/api/posts/' + id, {
          method: 'PUT',
          body: formData
        })

        if (!res.ok) {
          alert('Error updating post')
          return
        }

        const updated = await res.json()
        const idx = postsCache.findIndex(p => p.id === updated.id)
        if (idx !== -1) {
          postsCache[idx] = updated
        }
        renderPosts()
      } catch (err) {
        console.error(err)
        alert('Error updating post')
      }
    })
  })

  // DELETE
  listEl.querySelectorAll('.btn-delete-post').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.getAttribute('data-id'))
      if (!confirm('Delete this post')) return
      try {
        await apiDelete('/api/posts/' + id)
        postsCache = postsCache.filter(p => p.id !== id)
        renderPosts()
      } catch (err) {
        console.error(err)
        alert('Error deleting post')
      }
    })
  })
}

async function loadPosts() {
  try {
    const posts = await apiGet('/api/posts')
    postsCache = posts
    renderPosts()
  } catch (err) {
    console.error(err)
    const listEl = document.getElementById('postsList')
    listEl.innerHTML =
      '<li class="list-group-item text-danger">Error loading posts.</li>'
  }
}

function setupCreateForm() {
  const form = document.getElementById('createPostForm')
  const btnFocusImage = document.getElementById('btnFocusImage')
  const btnFocusLink = document.getElementById('btnFocusLink')
  const imageInput = document.getElementById('postImage')
  const linkInput = document.getElementById('postLink')

  form.addEventListener('submit', async e => {
    e.preventDefault()

    const title = document.getElementById('postTitleInput').value.trim()
    if (!title) {
      alert('Title is required')
      return
    }

    const formData = new FormData(form)
    formData.append('author', CURRENT_USER)
    formData.append('community', 'r/AuroraGallery')

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        alert('Error creating post')
        return
      }

      const saved = await res.json()
      postsCache.unshift(saved)
      form.reset()
      document.getElementById('postTopic').value = 'general'
      renderPosts()
    } catch (err) {
      console.error(err)
      alert('Error creating post')
    }
  })

  btnFocusImage.addEventListener('click', () => {
    imageInput.click()
  })

  btnFocusLink.addEventListener('click', () => {
    linkInput.focus()
  })
}

document.addEventListener('DOMContentLoaded', () => {
  setupCreateForm()
  loadPosts()
})
