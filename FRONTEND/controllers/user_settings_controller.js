// FRONTEND/controllers/user_settings_controller.js

document.addEventListener('DOMContentLoaded', () => {
  if (typeof getStoredUser !== 'function' || typeof API_URL !== 'string') {
    console.error('Env helpers not available on settings page')
    return
  }

  const user = getStoredUser()
  if (!user) {
    window.location.href = './login.html'
    return
  }

  // Elementos de formulario
  const profileNameInput = document.querySelector('input[placeholder="Your name"]')
  const profileBirthInput = document.querySelector('input[placeholder*="birthdate"], input[type="date"]')
  const profileBioInput = document.getElementById('inputProfileBio')
  const formProfile = document.getElementById('formProfile')
  
  const emailInput = document.getElementById('inputEmail')
  const formAccountEmail = document.getElementById('formAccountEmail')

  const currentPasswordInput = document.getElementById('currentPassword')
  const newPasswordInput = document.getElementById('newPassword')
  const confirmPasswordInput = document.getElementById('confirmPassword')
  const formChangePassword = document.getElementById('formChangePassword')

  // Elementos de eliminación de cuenta
  const deletePasswordInput = document.getElementById('deletePassword')
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn')
  const deleteAccountModal = document.getElementById('deleteAccountModal')

  // Elementos de imagen de perfil
  const profileImagePreview = document.getElementById('profileImagePreview')
  const profileImageInput = document.getElementById('profileImageInput')
  const uploadImageBtn = document.getElementById('uploadImageBtn')
  const removeImageBtn = document.getElementById('removeImageBtn')
  const imageUrlInput = document.getElementById('imageUrlInput')
  const confirmImageUrlBtn = document.getElementById('confirmImageUrlBtn')
  const imageLoadingSpinner = document.getElementById('imageLoadingSpinner')

  let currentImageUrl = null

  function showLoadingSpinner(show = true) {
    if (show) {
      imageLoadingSpinner?.classList.remove('d-none')
    } else {
      imageLoadingSpinner?.classList.add('d-none')
    }
  }

  async function loadProfile() {
    try {
      const res = await fetch(`${API_URL}/profiles/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(user.id)
        }
      })

      const data = await res.json().catch(() => null)
      if (!res.ok || !data || data.ok !== true || !data.profile) {
        console.error('Failed to load profile')
        return
      }

      const profile = data.profile

      // Cargar imagen de perfil
      if (profile.avatarUrl && profile.avatarUrl.trim()) {
        currentImageUrl = profile.avatarUrl
        if (profileImagePreview) {
          profileImagePreview.src = profile.avatarUrl
          profileImagePreview.style.backgroundColor = 'transparent'
        }
      } else {
        if (profileImagePreview) {
          profileImagePreview.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23999%22%3E%3Cpath d=%22M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z%22/%3E%3C/svg%3E'
          profileImagePreview.style.backgroundColor = '#f0f0f0'
        }
      }

      // Cargar email
      if (emailInput) {
        emailInput.value = profile.email || ''
      }

      // Cargar datos de perfil
      if (profileNameInput) {
        profileNameInput.value = profile.name || ''
      }

      if (profileBirthInput) {
        profileBirthInput.value = profile.birthdate || ''
      }

      if (profileBioInput) {
        profileBioInput.value = profile.bio || ''
      }
    } catch (err) {
      console.error('Error loading profile', err)
    }
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  function isValidImageUrl(url) {
    try {
      const urlObj = new URL(url)
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
      const path = urlObj.pathname.toLowerCase()
      return validExtensions.some(ext => path.endsWith(ext))
    } catch {
      return false
    }
  }

  async function updateProfileImage(imageUrl) {
    try {
      showLoadingSpinner(true)
      
      const res = await fetch(`${API_URL}/profiles/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(user.id)
        },
        body: JSON.stringify({
          avatarUrl: imageUrl
        })
      })

      const data = await res.json().catch(() => null)
      
      showLoadingSpinner(false)

      if (!res.ok || !data || data.ok !== true) {
        console.error('Image update failed', data)
        alert(data?.error || 'Could not update profile picture')
        return false
      }

      return true
    } catch (err) {
      console.error('Error updating profile image', err)
      alert('Error updating profile picture')
      showLoadingSpinner(false)
      return false
    }
  }

  async function uploadImage() {
    const file = profileImageInput?.files?.[0]

    if (!file) {
      alert('Please select an image')
      return
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file')
      return
    }

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    try {
      showLoadingSpinner(true)

      // Convertir a base64
      const base64 = await fileToBase64(file)

      // Actualizar inmediatamente en el frontend
      if (profileImagePreview) {
        profileImagePreview.src = base64
        profileImagePreview.alt = 'Profile Picture'
      }

      // Guardar en backend
      const success = await updateProfileImage(base64)

      if (success) {
        currentImageUrl = base64
        alert('Profile picture updated successfully')

        // Limpiar input
        if (profileImageInput) {
          profileImageInput.value = ''
        }
      } else {
        // Revertir cambios si falla
        loadProfile()
      }

    } catch (err) {
      console.error('Error uploading image', err)
      alert('Error uploading image')
      showLoadingSpinner(false)
      loadProfile()
    }
  }

  async function useImageUrl() {
    const url = imageUrlInput?.value.trim()

    if (!url) {
      alert('Please enter an image URL')
      return
    }

    if (!isValidImageUrl(url)) {
      alert('Please enter a valid image URL (JPG, PNG, GIF, or WebP)')
      return
    }

    try {
      showLoadingSpinner(true)

      // Probar que la imagen sea accesible
      const img = new Image()
      
      img.onload = async () => {
        // Actualizar inmediatamente en el frontend
        if (profileImagePreview) {
          profileImagePreview.src = url
          profileImagePreview.alt = 'Profile Picture'
        }

        // Guardar en backend
        const success = await updateProfileImage(url)

        if (success) {
          currentImageUrl = url
          alert('Profile picture updated successfully')

          // Limpiar input y colapsar formulario
          if (imageUrlInput) {
            imageUrlInput.value = ''
          }
          
          const collapseElement = document.getElementById('imageUrlForm')
          if (collapseElement) {
            const collapse = new window.bootstrap.Collapse(collapseElement, { toggle: false })
            collapse.hide()
          }
        } else {
          // Revertir cambios si falla
          loadProfile()
        }
      }

      img.onerror = () => {
        showLoadingSpinner(false)
        alert('Could not load image from URL. Please check the link and try again.')
      }

      img.src = url
    } catch (err) {
      console.error('Error processing image URL', err)
      alert('Error processing image URL')
      showLoadingSpinner(false)
    }
  }

  async function removeImage() {
    const confirmed = confirm('Are you sure you want to remove your profile picture?')
    if (!confirmed) {
      return
    }

    try {
      showLoadingSpinner(true)

      // Actualizar inmediatamente en el frontend
      if (profileImagePreview) {
        profileImagePreview.src = 'https://via.placeholder.com/150?text=No+Image'
        profileImagePreview.alt = 'No Profile Picture'
      }

      // Guardar en backend
      const success = await updateProfileImage(null)

      if (success) {
        currentImageUrl = null
        alert('Profile picture removed successfully')

        if (profileImageInput) {
          profileImageInput.value = ''
        }

        if (imageUrlInput) {
          imageUrlInput.value = ''
        }
      } else {
        // Revertir cambios si falla
        loadProfile()
      }

    } catch (err) {
      console.error('Error removing image', err)
      alert('Error removing image')
      showLoadingSpinner(false)
    }
  }

  async function updateEmail(event) {
    event.preventDefault()

    const newEmail = emailInput?.value.trim()

    if (!newEmail) {
      alert('Please enter a valid email')
      return
    }

    try {
      const res = await fetch(`${API_URL}/profiles/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(user.id)
        },
        body: JSON.stringify({ email: newEmail })
      })

      const data = await res.json().catch(() => null)
      if (!res.ok || !data || data.ok !== true) {
        console.error('Email update failed', data)
        alert(data?.error || 'Could not update email')
        return
      }

      alert('Email updated successfully')
      loadProfile()
    } catch (err) {
      console.error('Error updating email', err)
      alert('Error updating email')
    }
  }

  async function saveProfile(event) {
    event.preventDefault()

    const payload = {
      name: profileNameInput?.value.trim() || '',
      birthdate: profileBirthInput?.value || null,
      bio: profileBioInput?.value.trim() || ''
    }

    try {
      const res = await fetch(`${API_URL}/profiles/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(user.id)
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json().catch(() => null)
      if (!res.ok || !data || data.ok !== true) {
        console.error('Profile update failed', data)
        alert('Could not update profile')
        return
      }

      alert('Profile updated successfully')
      loadProfile()
    } catch (err) {
      console.error('Error updating profile', err)
      alert('Error updating profile')
    }
  }

  async function changePassword(event) {
    event.preventDefault()

    const currentPass = currentPasswordInput?.value.trim()
    const newPass = newPasswordInput?.value.trim()
    const confirmPass = confirmPasswordInput?.value.trim()

    // Validaciones
    if (!currentPass || !newPass || !confirmPass) {
      alert('Please fill in all password fields')
      return
    }

    if (newPass !== confirmPass) {
      alert('New passwords do not match')
      return
    }

    if (newPass.length < 6) {
      alert('New password must be at least 6 characters')
      return
    }

    if (currentPass === newPass) {
      alert('New password cannot be the same as current password')
      return
    }

    try {
      const res = await fetch(`${API_URL}/profiles/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(user.id)
        },
        body: JSON.stringify({
          currentPassword: currentPass,
          newPassword: newPass
        })
      })

      const data = await res.json().catch(() => null)
      if (!res.ok || !data || data.ok !== true) {
        console.error('Password change failed', data)
        alert(data?.error || 'Could not change password')
        return
      }

      alert('Password changed successfully')
      
      // Limpiar campos
      if (currentPasswordInput) currentPasswordInput.value = ''
      if (newPasswordInput) newPasswordInput.value = ''
      if (confirmPasswordInput) confirmPasswordInput.value = ''
      
    } catch (err) {
      console.error('Error changing password', err)
      alert('Error changing password')
    }
  }

  async function deleteAccount() {
    const password = deletePasswordInput?.value.trim()

    if (!password) {
      alert('Please enter your password to confirm deletion')
      return
    }

    const confirmed = confirm('This action cannot be undone. Are you absolutely sure?')
    if (!confirmed) {
      return
    }

    try {
      const res = await fetch(`${API_URL}/profiles/me`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(user.id)
        },
        body: JSON.stringify({ password })
      })

      const data = await res.json().catch(() => null)
      if (!res.ok || !data || data.ok !== true) {
        console.error('Account deletion failed', data)
        alert(data?.error || 'Could not delete account')
        return
      }

      alert('Your account has been deleted successfully')
      
      // Limpiar sesión
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      sessionStorage.removeItem('user')
      sessionStorage.removeItem('token')

      // Redirigir a home sin autenticación
      window.location.href = './home_sin_auth.html'
      
    } catch (err) {
      console.error('Error deleting account', err)
      alert('Error deleting account')
    }
  }

  function goToProfileView() {
    window.location.href = 'profileview.html';
  }

  // Event listeners
  if (uploadImageBtn) {
    uploadImageBtn.addEventListener('click', () => {
      profileImageInput?.click()
    })
  }

  if (profileImageInput) {
    profileImageInput.addEventListener('change', uploadImage)
  }

  if (confirmImageUrlBtn) {
    confirmImageUrlBtn.addEventListener('click', useImageUrl)
  }

  // Permitir Enter en el input de URL
  if (imageUrlInput) {
    imageUrlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        useImageUrl()
      }
    })
  }

  if (removeImageBtn) {
    removeImageBtn.addEventListener('click', removeImage)
  }

  if (formAccountEmail) {
    formAccountEmail.addEventListener('submit', updateEmail)
  }

  if (formProfile) {
    formProfile.addEventListener('submit', saveProfile)
  }

  if (formChangePassword) {
    formChangePassword.addEventListener('submit', changePassword)
  }

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', deleteAccount)
  }

  // Limpiar input al cerrar el modal
  if (deleteAccountModal) {
    deleteAccountModal.addEventListener('hidden.bs.modal', () => {
      if (deletePasswordInput) {
        deletePasswordInput.value = ''
      }
    })
  }

  // Cargar datos al iniciar
  loadProfile()
})
