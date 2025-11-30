// FRONTEND/controllers/chat_controller.js

let allUsers = []; 
let activeConversations = [];
let currentUser = null;
let currentChatPartner = null;
let socket = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = typeof getStoredUser === 'function' ? getStoredUser() : null;
  if (currentUser) {
    updateCurrentUserUI(currentUser);
    setupSocketConnection();
    await loadConversationsList();
  } else {
    alert("Please login first");
    window.location.href = './login.html';
    return;
  }
  setupUIListeners();
});

function setupSocketConnection() {
  socket = io(); 
  socket.on('connect', () => socket.emit('join_room', currentUser.username));

  socket.on('receive_message', async (data) => {
    const { message, chatWith } = data;
    if (currentChatPartner && (chatWith === currentChatPartner.username || message.from === currentChatPartner.username)) {
      appendSingleMessage(message);
      if (message.from === currentChatPartner.username) await markMessagesAsRead(currentChatPartner.username);
    }
    await loadConversationsList();
  });

  socket.on('chat_deleted', (data) => {
    if (currentChatPartner && currentChatPartner.username === data.partner) {
      closeChatWindow();
      alert('This conversation has been deleted.');
    }
    loadConversationsList();
  });

  socket.on('messages_read_update', (data) => {
    if (currentChatPartner && currentChatPartner.username === data.readBy) {
      document.querySelectorAll('.msg-check').forEach(icon => {
        icon.classList.replace('text-muted', 'text-primary');
        icon.classList.replace('bi-check', 'bi-check-all');
      });
    }
  });
}

// --- LOGICA ARCHIVOS ---
async function handleFileUpload(file) {
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
    const data = await res.json();
    if (data.ok) {
      const isImage = file.type.startsWith('image/');
      const type = isImage ? 'image' : 'file';
      await sendMessageToApi(currentChatPartner.username, '', type, data.url, data.originalName);
    } else { alert('Upload failed: ' + data.error); }
  } catch (err) { alert('Error uploading file'); }
}

async function sendMessageToApi(targetUsername, text, type = 'text', attachmentUrl = null, originalName = null) {
  try {
    await fetch(`${API_URL}/chats/${targetUsername}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user': currentUser.username },
      body: JSON.stringify({ text, type, attachmentUrl, originalName })
    });
  } catch (err) { console.error('Error sending message', err); }
}

// --- UI ---
function appendSingleMessage(msg) {
  const container = document.getElementById('messagesContainer');
  if (container.querySelector('.text-center.small.text-muted')) container.innerHTML = '';

  const isOut = msg.from === currentUser.username;
  const rowDiv = document.createElement('div');
  rowDiv.className = `d-flex align-items-end gap-2 mb-3 ${isOut ? 'justify-content-end' : ''}`;

  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  let checkIcon = '';
  if (isOut) {
    const iconClass = msg.read ? 'bi-check-all text-primary' : 'bi-check text-muted';
    checkIcon = `<i class="bi ${iconClass} ms-1 msg-check" style="font-size: 1.1rem;"></i>`;
  }

  let contentHtml = '';
  if (msg.type === 'image') {
    contentHtml = `<div class="mb-1"><img src="${msg.attachmentUrl}" class="img-fluid rounded border border-secondary" style="max-width: 250px; cursor: pointer;" onclick="window.open(this.src, '_blank')"></div>${msg.text ? `<div>${escapeHtml(msg.text)}</div>` : ''}`;
  } else if (msg.type === 'file') {
    contentHtml = `<div class="mb-1"><a href="${msg.attachmentUrl}" target="_blank" class="btn btn-sm btn-dark border border-secondary d-flex align-items-center text-decoration-none"><i class="bi bi-file-earmark-fill fs-4 me-2 text-warning"></i><div class="text-start"><div class="fw-bold small text-light">${escapeHtml(msg.originalName || 'File')}</div><div class="small text-muted" style="font-size:0.7rem;">Click to download</div></div></a></div>${msg.text ? `<div>${escapeHtml(msg.text)}</div>` : ''}`;
  } else {
    contentHtml = escapeHtml(msg.text);
  }

  const bubbleHtml = `<div class="bubble ${isOut ? 'bubble-out' : 'bubble-in'}">${contentHtml}</div><div class="msg-time mt-1 ${isOut ? 'text-end' : ''}">${time} ${checkIcon}</div>`;
  rowDiv.innerHTML = `<div class="max-w-75">${bubbleHtml}</div>`;
  container.appendChild(rowDiv);
  container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}

function renderMessages(messages, partner) {
  const container = document.getElementById('messagesContainer');
  container.innerHTML = ''; 
  if (!messages || messages.length === 0) {
    let avatarSrc = `https://ui-avatars.com/api/?name=${partner.name || partner.username}&background=random`;
    if (partner.avatarUrl && partner.avatarUrl.trim() !== '') avatarSrc = partner.avatarUrl;
    container.innerHTML = `<div class="text-center small text-muted mt-5 mb-3"><img src="${avatarSrc}" class="rounded-circle mb-2" style="width:60px; height:60px; object-fit:cover;"><br>Start chatting with <strong>${partner.name || partner.username}</strong>.</div>`;
    return;
  }
  messages.forEach(msg => appendSingleMessage(msg));
  container.scrollTop = container.scrollHeight;
}

function setupUIListeners() {
  const btnNewChat = document.getElementById('btnNewChat');
  const newChatModal = new bootstrap.Modal(document.getElementById('newChatModal'));
  btnNewChat.addEventListener('click', async () => { newChatModal.show(); await loadUsersIntoModal(); });
  document.getElementById('modalUserSearch').addEventListener('input', (e) => filterModalUsers(e.target.value));
  
  const searchInput = document.getElementById('searchConversations');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const filterText = e.target.value.toLowerCase().trim();
      document.querySelectorAll('#conversationList .chat-item').forEach(item => {
        item.classList.toggle('d-none', !item.textContent.toLowerCase().includes(filterText));
      });
    });
  }

  const btnDelete = document.getElementById('btnDeleteChat');
  if (btnDelete) {
    btnDelete.addEventListener('click', async (e) => {
      e.preventDefault(); if (!currentChatPartner) return;
      if (!confirm(`Delete chat with ${currentChatPartner.name}?`)) return;
      try {
        const res = await fetch(`${API_URL}/chats/${currentChatPartner.username}`, { method: 'DELETE', headers: { 'x-user': currentUser.username } });
        if ((await res.json()).ok) closeChatWindow();
      } catch (err) { alert('Error deleting'); }
    });
  }

  const fileInput = document.getElementById('hiddenFileInput');
  const btnAttach = document.getElementById('btnAttach');
  if (btnAttach && fileInput) {
    btnAttach.addEventListener('click', () => { if(currentChatPartner) fileInput.click(); });
    fileInput.addEventListener('change', async () => {
      if (fileInput.files.length > 0) { await handleFileUpload(fileInput.files[0]); fileInput.value = ''; }
    });
  }

  // --- LÓGICA EMOJIS (NUEVA) ---
  const btnEmoji = document.getElementById('btnEmoji');
  const picker = document.getElementById('emojiPicker');
  const msgInput = document.getElementById('messageInput');

  if (btnEmoji && picker) {
    btnEmoji.addEventListener('click', (e) => {
      e.stopPropagation();
      picker.classList.toggle('d-none');
    });
    picker.addEventListener('emoji-click', event => {
      msgInput.value += event.detail.unicode;
      msgInput.focus();
    });
    document.addEventListener('click', (e) => {
      if (!picker.contains(e.target) && e.target !== btnEmoji && !btnEmoji.contains(e.target)) {
        picker.classList.add('d-none');
      }
    });
  }
  // -----------------------------

  document.getElementById('messageForm').addEventListener('submit', async (e) => {
    e.preventDefault(); if (!currentChatPartner) return;
    const input = document.getElementById('messageInput'); const text = input.value.trim();
    if(text) { input.value = ''; await sendMessageToApi(currentChatPartner.username, text); }
  });
}

// ... Resto de funciones (MANTENER IGUAL QUE ANTES) ...
async function startChatWith(targetUser, isNewChat = false) {
  currentChatPartner = targetUser;
  document.getElementById('noChatSelected').classList.add('d-none');
  document.getElementById('noChatSelected').classList.remove('d-flex');
  const chatContainer = document.getElementById('activeChatContainer');
  chatContainer.classList.remove('d-none');
  chatContainer.classList.add('d-flex');
  document.getElementById('activeChatName').textContent = targetUser.name || targetUser.username || 'User';
  const avatarImg = document.getElementById('activeChatAvatar');
  let avatarSrc = `https://ui-avatars.com/api/?name=${targetUser.username}&background=random`;
  if (targetUser.avatarUrl && targetUser.avatarUrl.trim() !== '') avatarSrc = targetUser.avatarUrl;
  avatarImg.src = avatarSrc;
  if (isNewChat) {
    const msgContainer = document.getElementById('messagesContainer');
    msgContainer.dataset.chatWith = targetUser.username;
    renderMessages([], targetUser);
  } else {
    loadChatHistory(targetUser);
    await markMessagesAsRead(targetUser.username);
    await loadConversationsList();
  }
}

function renderSidebarItem(container, user, lastMsg, time, unreadCount = 0) {
  const avatar = user.avatarUrl || `https://ui-avatars.com/api/?name=${user.username}&background=random`;
  let timeDisplay = time ? new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const div = document.createElement('div');
  div.className = 'chat-item p-2 d-flex align-items-center mb-1';
  if (currentChatPartner && currentChatPartner.username === user.username) div.classList.add('active');
  const searchInput = document.getElementById('searchConversations');
  if (searchInput && searchInput.value.trim() !== '') {
    if (!(user.name + ' ' + (lastMsg||'')).toLowerCase().includes(searchInput.value.toLowerCase())) div.classList.add('d-none');
  }
  let badgeHtml = '', msgClass = 'text-muted', timeClass = 'text-muted';
  if (unreadCount > 0) {
    badgeHtml = `<span class="badge rounded-pill bg-danger ms-2">${unreadCount}</span>`;
    msgClass = 'text-white fw-bold'; timeClass = 'text-primary fw-bold';
  }
  div.innerHTML = `<div class="position-relative me-2"><img src="${avatar}" class="avatar-md rounded-circle" style="object-fit:cover;"><span class="position-absolute bottom-0 end-0 translate-middle p-1 bg-success border border-dark rounded-circle"></span></div><div class="flex-grow-1 overflow-hidden"><div class="d-flex align-items-center"><div class="fw-semibold me-auto text-truncate text-light">${user.name||user.username}</div><small class="${timeClass}" style="font-size: 0.7rem;">${timeDisplay}</small></div><div class="d-flex justify-content-between align-items-center"><div class="chat-snippet small text-truncate ${msgClass}" style="max-width: 85%;">${escapeHtml(lastMsg || 'Chat started')}</div>${badgeHtml}</div></div>`;
  div.onclick = () => startChatWith(user, false);
  container.appendChild(div);
}

// ... Helpers finales ...
async function markMessagesAsRead(targetUsername) { try { await fetch(`${API_URL}/chats/${targetUsername}/read`, { method: 'PUT', headers: { 'x-user': currentUser.username } }); } catch (err) {} }
async function loadConversationsList() { const container = document.getElementById('conversationList'); try { const res = await fetch(`${API_URL}/chats`, { headers: { 'x-user': currentUser.username } }); const data = await res.json(); activeConversations = []; container.innerHTML = ''; if (data.ok && data.conversations.length > 0) { document.getElementById('emptyChatMsg').style.display = 'none'; for (const conv of data.conversations) { const userDetails = await fetchProfile(conv.username); userDetails._lastMsg = conv.lastMessage; userDetails._timestamp = conv.timestamp; userDetails._unread = conv.unreadCount; activeConversations.push(userDetails); renderSidebarItem(container, userDetails, conv.lastMessage, conv.timestamp, conv.unreadCount); } } else { container.appendChild(document.getElementById('emptyChatMsg')); document.getElementById('emptyChatMsg').style.display = 'block'; } } catch (err) {} }
async function loadChatHistory(partnerUser) { const msgContainer = document.getElementById('messagesContainer'); if (msgContainer.dataset.chatWith !== partnerUser.username) { msgContainer.innerHTML = '<div class="text-center text-muted small mt-3">Loading history...</div>'; msgContainer.dataset.chatWith = partnerUser.username; } try { const res = await fetch(`${API_URL}/chats/${partnerUser.username}`, { headers: { 'x-user': currentUser.username } }); const data = await res.json(); if (data.ok) renderMessages(data.messages, partnerUser); } catch (err) {} }
async function fetchProfile(username) { try { const res = await fetch(`${API_URL}/profiles`); const data = await res.json(); if (data.ok) return data.profiles.find(p => p.username === username) || { username, name: username }; } catch (e) {} return { username, name: username }; }
function closeChatWindow() { currentChatPartner = null; document.getElementById('activeChatContainer').classList.remove('d-flex'); document.getElementById('activeChatContainer').classList.add('d-none'); document.getElementById('noChatSelected').classList.remove('d-none'); document.getElementById('noChatSelected').classList.add('d-flex'); document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active')); }
async function loadUsersIntoModal() { const list = document.getElementById('userResultsList'); list.innerHTML = 'Loading...'; try { const res = await fetch(`${API_URL}/profiles`); const data = await res.json(); if(data.ok) { allUsers = data.profiles.filter(u => u.username !== currentUser.username); renderModalUsers(allUsers); } } catch(e) { list.innerHTML = 'Error'; } }
function renderModalUsers(users) { const list = document.getElementById('userResultsList'); list.innerHTML = ''; users.forEach(user => { const d = document.createElement('div'); d.className = 'list-group-item user-select-item d-flex align-items-center gap-2 p-2 bg-dark text-light border-secondary'; d.onclick = () => { bootstrap.Modal.getInstance(document.getElementById('newChatModal')).hide(); startChatWith(user, !activeConversations.some(u => u.username === user.username)); }; const src = user.avatarUrl || `https://ui-avatars.com/api/?name=${user.username}`; d.innerHTML = `<img src="${src}" class="rounded-circle" style="width:40px;"><div><div class="fw-semibold small">${user.name||user.username}</div><div class="text-muted" style="font-size:0.75rem;">@${user.username}</div></div>`; list.appendChild(d); }); }
function filterModalUsers(q) { renderModalUsers(allUsers.filter(u => u.username.toLowerCase().includes(q.toLowerCase()) || (u.name||'').toLowerCase().includes(q.toLowerCase()))); }
function updateCurrentUserUI(user) { document.getElementById('currentUserName').textContent = user.name || user.username; const img = document.getElementById('currentUserAvatar'); const fallback = `https://ui-avatars.com/api/?name=${user.username}&background=random`; if(img) img.src = fallback; document.getElementById('navUserImg').src = fallback; fetch(`${API_URL}/profiles/me`, { headers: { 'Content-Type': 'application/json', 'x-user': user.username } }).then(r=>r.json()).then(d=>{ if(d.ok && d.profile?.avatarUrl && d.profile.avatarUrl.trim() !== '') { if(img) img.src = d.profile.avatarUrl; document.getElementById('navUserImg').src = d.profile.avatarUrl; } }); }
function escapeHtml(text) { return text ? text.replace(/</g, "&lt;") : ''; }