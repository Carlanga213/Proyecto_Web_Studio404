// FRONTEND/controllers/auth_controller.js

// Switch views

function showLoginForm() {
  const loginForm = document.getElementById('formLogin')
  const registerForm = document.getElementById('formRegister')
  if (!loginForm || !registerForm) return
  loginForm.style.display = 'block'
  registerForm.style.display = 'none'
}

function showRegisterForm() {
  const loginForm = document.getElementById('formLogin')
  const registerForm = document.getElementById('formRegister')
  if (!loginForm || !registerForm) return
  loginForm.style.display = 'none'
  registerForm.style.display = 'block'
}

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('formLogin')
  const registerForm = document.getElementById('formRegister')
  const btnShowRegister = document.getElementById('btnShowRegister')
  const btnShowLogin = document.getElementById('btnShowLogin')

  if (btnShowRegister) {
    btnShowRegister.addEventListener('click', event => {
      event.preventDefault()
      showRegisterForm()
    })
  }

  if (btnShowLogin) {
    btnShowLogin.addEventListener('click', event => {
      event.preventDefault()
      showLoginForm()
    })
  }

  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginSubmit)
  }
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegisterSubmit)
  }

  // default view
  showLoginForm()
})

// Login

async function handleLoginSubmit(event) {
  event.preventDefault()

  const emailInput = document.getElementById('loginEmail')
  const passwordInput = document.getElementById('loginPassword')

  const email = emailInput ? emailInput.value.trim() : ''
  const password = passwordInput ? passwordInput.value.trim() : ''

  if (!email || !password) {
    alert('Please fill email and password')
    return
  }

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    const data = await res.json()

    if (!data.ok) {
      alert(data.error || 'Login failed')
      return
    }

    if (typeof setStoredUser === 'function') {
      setStoredUser(data.user)
    }

    window.location.href = './home_con_auth.html'
  } catch (err) {
    console.error('Network error during login', err)
    alert('Network error during login')
  }
}

// Register

async function handleRegisterSubmit(event) {
  event.preventDefault()

  const usernameInput = document.getElementById('registerUsername')
  const nameInput = document.getElementById('registerName')
  const emailInput = document.getElementById('registerEmail')
  const passwordInput = document.getElementById('registerPassword')
  const confirmInput = document.getElementById('registerConfirmPassword')

  const username = usernameInput ? usernameInput.value.trim() : ''
  const name = nameInput ? nameInput.value.trim() : ''
  const email = emailInput ? emailInput.value.trim() : ''
  const password = passwordInput ? passwordInput.value.trim() : ''
  const confirm = confirmInput ? confirmInput.value.trim() : ''

  if (!username || !email || !password) {
    alert('Username, email and password are required')
    return
  }

  if (password !== confirm) {
    alert('Password and confirm password do not match')
    return
  }

  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, name, email, password })
    })

    const data = await res.json()

    if (!data.ok) {
      alert(data.error || 'Register failed')
      return
    }

    alert('Register successful, you can log in now')
    showLoginForm()
  } catch (err) {
    console.error('Network error during register', err)
    alert('Network error during register')
  }
}
