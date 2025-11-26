// FRONTEND/controllers/chat_controller.js

let allUsers = []; 
let activeConversations = [];
let currentUser = null;
let currentChatPartner = null;
let socket = null; // Variable para guardar la conexión socket

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = typeof getStoredUser === 'function' ? getStoredUser() : null;
  if (currentUser) {
    updateCurrentUserUI(currentUser);
    
    // 1. INICIALIZAR SOCKET.IO
    setupSocketConnection();

    // Cargar lista inicial
    await loadConversationsList();
  } else {
    alert("Please login first");
    window.location.href = './login.html';
    return;
  }

  // Listeners de UI (New Chat, Search, Send, Filter)
  setupUIListeners();
});

// --- SOCKET.IO SETUP ---

function setupSocketConnection() {
  // Conectamos al mismo host donde está el front
  socket = io('http://localhost:3000'); 

  // Al conectar, nos unimos a nuestra "sala personal"
  socket.on('connect', () => {
    console.log('Connected to socket server');
    socket.emit('join_room', currentUser.username);
  });

  // EVENTO: Recibir mensaje en tiempo real
  socket.on('receive_message', (data) => {
    const { message, chatWith } = data;

    // A. Si tengo el chat abierto con esa persona, agrego el mensaje visualmente
    if (currentChatPartner && (chatWith === currentChatPartner.username || message.from === currentChatPartner.username)) {
      appendSingleMessage(message);
    }

    // B. Siempre actualizo la lista lateral (para que suba el chat o muestre "nuevo mensaje")
    loadConversationsList();
  });

  // EVENTO: Chat borrado
  socket.on('chat_deleted', (data) => {
    if (currentChatPartner && currentChatPartner.username === data.partner) {
      closeChatWindow();
      alert('This conversation has been deleted.');
    }
    loadConversationsList();
  });
}

// --- API Interactions ---

async function loadConversationsList() {
  const container = document.getElementById('conversationList');
  const emptyMsg = document.getElementById('emptyChatMsg');
  
  try {
    const res = await fetch(`${API_URL}/chats`, { headers: { 'x-user': currentUser.username } });
    const data = await res.json();

    activeConversations = []; 
    container.innerHTML = ''; 

    if (data.ok && data.conversations.length > 0) {
      if(emptyMsg) emptyMsg.style.display = 'none';

      for (const conv of data.conversations) {
        const userDetails = await fetchProfile(conv.username);
        userDetails._lastMsg = conv.lastMessage;
        userDetails._timestamp = conv.timestamp;
        
        activeConversations.push(userDetails);
        renderSidebarItem(container, userDetails, conv.lastMessage, conv.timestamp);
      }
    } else {
      if(emptyMsg) {
         container.appendChild(emptyMsg);
         emptyMsg.style.display = 'block';
      }
    }
  } catch (err) { console.error(err); }
}

async function loadChatHistory(partnerUser) {
  const msgContainer = document.getElementById('messagesContainer');
  
  if (msgContainer.dataset.chatWith !== partnerUser.username) {
    msgContainer.innerHTML = '<div class="text-center text-muted small mt-3">Loading history...</div>';
    msgContainer.dataset.chatWith = partnerUser.username;
  }

  try {
    const res = await fetch(`${API_URL}/chats/${partnerUser.username}`, { headers: { 'x-user': currentUser.username } });
    const data = await res.json();
    if (data.ok) {
      renderMessages(data.messages, partnerUser);
    }
  } catch (err) { console.error(err); }
}

async function sendMessageToApi(targetUsername, text) {
  try {
    await fetch(`${API_URL}/chats/${targetUsername}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user': currentUser.username },
      body: JSON.stringify({ text })
    });
  } catch (err) { console.error('Error sending message', err); }
}

async function fetchProfile(username) {
  try {
    const res = await fetch(`${API_URL}/profiles`);
    const data = await res.json();
    if (data.ok) return data.profiles.find(p => p.username === username) || { username, name: username };
  } catch (e) { }
  return { username, name: username };
}

// --- UI Rendering & Helpers ---

function setupUIListeners() {
  const btnNewChat = document.getElementById('btnNewChat');
  const newChatModal = new bootstrap.Modal(document.getElementById('newChatModal'));

  btnNewChat.addEventListener('click', async () => {
    newChatModal.show();
    await loadUsersIntoModal();
  });

  // Buscador del Modal (Nuevos usuarios)
  document.getElementById('modalUserSearch').addEventListener('input', (e) => {
    filterModalUsers(e.target.value);
  });

  // --- NUEVO: Filtrado de Chats Activos (Sidebar) ---
  const searchConversationsInput = document.getElementById('searchConversations');
  if (searchConversationsInput) {
    searchConversationsInput.addEventListener('input', (e) => {
      const filterText = e.target.value.toLowerCase().trim();
      const chatItems = document.querySelectorAll('#conversationList .chat-item');

      chatItems.forEach(item => {
        // Buscamos en todo el texto visible del item (Nombre + Último mensaje)
        const textContent = item.textContent.toLowerCase();
        if (textContent.includes(filterText)) {
          item.classList.remove('d-none');
        } else {
          item.classList.add('d-none');
        }
      });
    });
  }
  // --------------------------------------------------

  // Botón Borrar Chat
  const btnDelete = document.getElementById('btnDeleteChat');
  if (btnDelete) {
    btnDelete.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!currentChatPartner) return;

      const confirmDelete = confirm(`Are you sure you want to delete the chat with ${currentChatPartner.name || currentChatPartner.username}?`);
      if (!confirmDelete) return;

      try {
        const res = await fetch(`${API_URL}/chats/${currentChatPartner.username}`, {
          method: 'DELETE',
          headers: { 'x-user': currentUser.username }
        });
        const data = await res.json();
        
        if (data.ok) {
          closeChatWindow();
          // La lista se actualizará sola via socket
        } else {
          alert('Error deleting chat: ' + data.error);
        }
      } catch (err) {
        console.error(err);
        alert('Network error deleting chat');
      }
    });
  }

  // Envío de Mensajes
  document.getElementById('messageForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentChatPartner) return;
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if(text) {
      input.value = '';
      await sendMessageToApi(currentChatPartner.username, text);
    }
  });
}

function renderSidebarItem(container, user, lastMsg, time) {
  const avatar = user.avatarUrl || `https://ui-avatars.com/api/?name=${user.username}&background=random`;
  const displayName = user.name || user.username;
  
  let timeDisplay = '';
  if (time) timeDisplay = new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const div = document.createElement('div');
  div.className = 'chat-item p-2 d-flex align-items-center mb-1';
  if (currentChatPartner && currentChatPartner.username === user.username) div.classList.add('active');
  
  // --- LÓGICA DE FILTRADO AL RENDERIZAR ---
  // Esto asegura que si se actualiza la lista (ej. llega mensaje nuevo),
  // los elementos que no coinciden con la búsqueda actual sigan ocultos.
  const searchInput = document.getElementById('searchConversations');
  if (searchInput && searchInput.value.trim() !== '') {
    const filterText = searchInput.value.toLowerCase().trim();
    // Comprobamos si el nombre o el mensaje coinciden
    const contentToCheck = (displayName + ' ' + (lastMsg || '')).toLowerCase();
    if (!contentToCheck.includes(filterText)) {
      div.classList.add('d-none');
    }
  }
  // -----------------------------------------

  div.innerHTML = `
    <div class="position-relative me-2">
      <img src="${avatar}" class="avatar-md rounded-circle" alt="${displayName}">
      <span class="position-absolute bottom-0 end-0 translate-middle p-1 bg-success border border-dark rounded-circle"></span>
    </div>
    <div class="flex-grow-1 overflow-hidden">
      <div class="d-flex align-items-center">
        <div class="fw-semibold me-auto text-truncate text-light">${displayName}</div>
        <small class="text-muted" style="font-size: 0.7rem;">${timeDisplay}</small>
      </div>
      <div class="chat-snippet small text-truncate text-muted">${escapeHtml(lastMsg || 'Chat started')}</div>
    </div>
  `;
  div.onclick = () => startChatWith(user, false);
  container.appendChild(div);
}

function renderMessages(messages, partner) {
  const container = document.getElementById('messagesContainer');
  container.innerHTML = ''; 

  if (!messages || messages.length === 0) {
    // CORRECCIÓN: Verificar URL válida antes de usarla, sino fallback
    let avatarSrc = `https://ui-avatars.com/api/?name=${partner.name || partner.username}&background=random`;
    if (partner.avatarUrl && partner.avatarUrl.trim() !== '') {
      avatarSrc = partner.avatarUrl;
    }

    container.innerHTML = `
      <div class="text-center small text-muted mt-5 mb-3">
        <img src="${avatarSrc}" class="rounded-circle mb-2" style="width:60px; height:60px; object-fit:cover;">
        <br>Start chatting with <strong>${partner.name || partner.username}</strong>.
      </div>`;
    return;
  }
  messages.forEach(msg => appendSingleMessage(msg));
  container.scrollTop = container.scrollHeight;
}

function appendSingleMessage(msg) {
  const container = document.getElementById('messagesContainer');
  if (container.querySelector('.text-center.small.text-muted')) {
    container.innerHTML = '';
  }

  const isOut = msg.from === currentUser.username;
  const rowDiv = document.createElement('div');
  rowDiv.className = `d-flex align-items-end gap-2 mb-3 ${isOut ? 'justify-content-end' : ''}`;

  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const bubbleHtml = `
    <div class="bubble ${isOut ? 'bubble-out' : 'bubble-in'}">
      ${escapeHtml(msg.text)}
    </div>
    <div class="msg-time mt-1 ${isOut ? 'text-end' : ''}">${time}</div>
  `;

  rowDiv.innerHTML = `<div class="max-w-75">${bubbleHtml}</div>`;
  container.appendChild(rowDiv);
  
  container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}

function startChatWith(targetUser, isNewChat = false) {
  currentChatPartner = targetUser;
  document.getElementById('noChatSelected').classList.add('d-none');
  document.getElementById('noChatSelected').classList.remove('d-flex');
  const chatContainer = document.getElementById('activeChatContainer');
  chatContainer.classList.remove('d-none');
  chatContainer.classList.add('d-flex');

  const partnerName = targetUser.name || targetUser.username || 'User';
  document.getElementById('activeChatName').textContent = partnerName;
  
  const avatarImg = document.getElementById('activeChatAvatar');
  let avatarSrc = `https://ui-avatars.com/api/?name=${partnerName}&background=random`;
  if (targetUser.avatarUrl && targetUser.avatarUrl.trim() !== '') {
    avatarSrc = targetUser.avatarUrl;
  }
  avatarImg.src = avatarSrc;

  if (isNewChat) {
    const msgContainer = document.getElementById('messagesContainer');
    msgContainer.dataset.chatWith = targetUser.username;
    renderMessages([], targetUser);
  } else {
    loadChatHistory(targetUser);
  }
}

function closeChatWindow() {
  currentChatPartner = null;
  document.getElementById('activeChatContainer').classList.remove('d-flex');
  document.getElementById('activeChatContainer').classList.add('d-none');
  document.getElementById('noChatSelected').classList.remove('d-none');
  document.getElementById('noChatSelected').classList.add('d-flex');
  document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
}

async function loadUsersIntoModal() {
  const listContainer = document.getElementById('userResultsList');
  listContainer.innerHTML = '<div class="text-center text-muted small py-3">Loading users...</div>';
  try {
    const res = await fetch(`${API_URL}/profiles`);
    const data = await res.json();
    if (data.ok) {
      allUsers = data.profiles.filter(u => u.username !== currentUser.username);
      renderModalUsers(allUsers);
    }
  } catch (err) { listContainer.innerHTML = 'Error'; }
}

function renderModalUsers(users) {
  const listContainer = document.getElementById('userResultsList');
  listContainer.innerHTML = '';
  users.forEach(user => {
    const item = document.createElement('div');
    item.className = 'list-group-item user-select-item d-flex align-items-center gap-2 p-2 bg-dark text-light border-secondary';
    item.onclick = () => {
      const modal = bootstrap.Modal.getInstance(document.getElementById('newChatModal'));
      modal.hide();
      const alreadyExists = activeConversations.some(u => u.username === user.username);
      startChatWith(user, !alreadyExists);
    };
    
    let avatarSrc = `https://ui-avatars.com/api/?name=${user.username}&background=random`;
    if (user.avatarUrl && user.avatarUrl.trim() !== '') {
      avatarSrc = user.avatarUrl;
    }

    item.innerHTML = `
      <img src="${avatarSrc}" class="rounded-circle" style="width: 40px; height: 40px; object-fit: cover;">
      <div><div class="fw-semibold small">${user.name || user.username}</div><div class="text-muted" style="font-size: 0.75rem;">@${user.username}</div></div>
    `;
    listContainer.appendChild(item);
  });
}

function filterModalUsers(query) {
  const lower = query.toLowerCase();
  renderModalUsers(allUsers.filter(u => u.username.toLowerCase().includes(lower) || (u.name && u.name.toLowerCase().includes(lower))));
}

function updateCurrentUserUI(user) {
  const nameLabel = document.getElementById('currentUserName');
  if (nameLabel) nameLabel.textContent = user.name || user.username;
  
  const avatarImg = document.getElementById('currentUserAvatar');
  const navImg = document.getElementById('navUserImg');
  
  const fallbackSrc = `https://ui-avatars.com/api/?name=${user.username || 'User'}&background=random`;
  if (avatarImg) avatarImg.src = fallbackSrc;
  if (navImg) navImg.src = fallbackSrc;
  
  fetch(`${API_URL}/profiles/me`, { headers: { 'Content-Type': 'application/json', 'x-user': user.username } })
  .then(res => res.json())
  .then(data => {
    if(data.ok && data.profile && data.profile.avatarUrl && data.profile.avatarUrl.trim() !== '') {
      if(avatarImg) avatarImg.src = data.profile.avatarUrl;
      if(navImg) navImg.src = data.profile.avatarUrl;
    }
  })
  .catch(() => {});
}

function escapeHtml(text) { return text ? text.replace(/</g, "&lt;") : ''; }