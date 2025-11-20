// FRONTEND/controllers/env.js
// Global config for frontend

const API_URL = 'http://localhost:3000/api'

function getStoredUser() {
  try {
    const raw = window.localStorage.getItem('currentUser')
    if (!raw) return null
    return JSON.parse(raw)
  } catch (err) {
    console.error('Error reading currentUser from localStorage', err)
    return null
  }
}

function setStoredUser(user) {
  try {
    if (!user) {
      window.localStorage.removeItem('currentUser')
      return
    }
    window.localStorage.setItem('currentUser', JSON.stringify(user))
  } catch (err) {
    console.error('Error saving currentUser to localStorage', err)
  }
}

function getCurrentUsername() {
  const user = getStoredUser()
  if (user && typeof user.username === 'string') {
    return user.username
  }
  return 'guest'
}

const CURRENT_USER = getCurrentUsername()

window.API_URL = API_URL
window.CURRENT_USER = CURRENT_USER
window.setStoredUser = setStoredUser
window.getStoredUser = getStoredUser
