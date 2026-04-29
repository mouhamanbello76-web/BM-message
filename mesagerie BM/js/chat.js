import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, getDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBh1j2UfJonhElz9I1u9gD00DO1TE9V5Xc",
  authDomain: "bm-message-522d3.firebaseapp.com",
  projectId: "bm-message-522d3",
  storageBucket: "bm-message-522d3.firebasestorage.app",
  messagingSenderId: "562131595038",
  appId: "1:562131595038:web:f2f14235b26b5db510a30f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const AUTHORIZED_PHONES = {
  "691288089": { name: "Mr. Bello", role: "ceo", label: "CEO" },
  "696953696": { name: "Mr. Temate", role: "directeur", label: "Directeur" },
  "681061196": { name: "Mr. Brayan", role: "directeur", label: "Directeur" }
};

let currentUserData = null;
let currentUser = null;
let messagesUnsubscribe = null;

const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const replyPreview = document.getElementById('reply-preview');
const cancelReplyBtn = document.getElementById('cancel-reply');
const currentUserDisplay = document.getElementById('current-user-display');
const reactionMenu = document.getElementById('reaction-menu');

let replyToMsg = null;
let welcomeSent = false;

// ----- Petite fonction pour afficher un retour utilisateur -----
function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: ${isError ? '#ff0000' : '#22c55e'};
    color: white;
    padding: 10px 20px;
    border-radius: 20px;
    font-size: 14px;
    z-index: 9999;
    opacity: 0;
    transition: opacity 0.3s;
    pointer-events: none;
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// ================== AUTH STATE ==================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  
  currentUser = user;
  const phone = user.phoneNumber.replace(/\D/g, '');
  const info = AUTHORIZED_PHONES[phone];
  
  if (!info) {
    await signOut(auth);
    window.location.href = 'index.html';
    return;
  }
  
  currentUserData = { ...info, uid: user.uid, phone: user.phoneNumber };
  
  const badge = info.role === 'ceo' 
    ? '<span class="badge ceo"><i class="fas fa-check-circle"></i> CEO</span>' 
    : '<span class="badge directeur"><i class="fas fa-check-circle"></i> Directeur</span>';
  currentUserDisplay.innerHTML = `${info.name} ${badge}`;
  
  if (!welcomeSent) {
    welcomeSent = true;
    const welcomeText = info.role === 'ceo'
      ? `👑 Bienvenue Mr. Bello ! Le CEO est en ligne.`
      : `👋 Bienvenue ${info.name} ! Vous êtes connecté en tant que ${info.label}.`;
    
    try {
      await addDoc(collection(db, 'messages'), {
        senderPhone: currentUserData.phone,
        senderName: 'Système',
        role: 'system',
        type: 'system',
        content: welcomeText,
        timestamp: serverTimestamp(),
        reactions: {}
      });
      showToast("Bienvenue !");
    } catch (err) {
      console.error("Erreur bienvenue:", err);
    }
  }
  
  loadMessages();
});

// ================== CHARGEMENT DES MESSAGES ==================
function loadMessages() {
  if (messagesUnsubscribe) messagesUnsubscribe();
  
  const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
  
  messagesUnsubscribe = onSnapshot(q, (snapshot) => {
    messagesContainer.innerHTML = '';
    
    snapshot.forEach(doc => {
      renderMessage({ id: doc.id, ...doc.data() });
    });
    
    // Scroll automatique
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }, (error) => {
    console.error("Erreur chargement messages:", error);
    showToast("Impossible de charger les messages. Vérifiez votre connexion.", true);
  });
}

// ================== AFFICHAGE D'UN MESSAGE ==================
function renderMessage(msg) {
  const isOwn = currentUserData && msg.senderPhone === currentUserData.phone;
  const isSystem = msg.type === 'system';
  
  const div = document.createElement('div');
  
  if (isSystem) {
    div.className = 'system-message';
    div.innerHTML = `<div style="text-align:center; padding:10px; color:#888; font-size:13px; font-style:italic;">${escapeHtml(msg.content)}</div>`;
  } else {
    div.className = `message-bubble ${isOwn ? 'own' : ''}`;
    div.dataset.id = msg.id;
    
    const timeStr = msg.timestamp?.toDate ? formatTime(msg.timestamp.toDate()) : '';
    
    let contentHtml = escapeHtml(msg.content || '');
    if (msg.replyTo) {
      contentHtml = `<div style="border-left:3px solid #ff0000; padding-left:8px; margin-bottom:6px; color:#aaa; font-size:11px;"><i class="fas fa-reply"></i> En réponse à un message</div>` + contentHtml;
    }
    
    const roleHtml = msg.role === 'ceo' 
      ? '<span style="color:#22c55e; font-size:11px;"><i class="fas fa-crown"></i> CEO</span>' 
      : (msg.role === 'directeur' ? '<span style="color:#3b82f6; font-size:11px;"><i class="fas fa-user-check"></i> Directeur</span>' : '');
    
    const reactionsHtml = renderReactions(msg);
    
    div.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:5px; font-size:12px; flex-wrap:wrap;">
        <span class="sender-name">${escapeHtml(msg.senderName)}</span>
        ${roleHtml}
        <span class="message-time">${timeStr}</span>
      </div>
      <div class="message-content">${contentHtml}</div>
      <div style="display:flex; gap:5px; margin-top:8px; flex-wrap:wrap;">${reactionsHtml}</div>
    `;
    
    if (isOwn) {
      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.innerHTML = '<i class="fas fa-trash"></i>';
      delBtn.onclick = async (e) => {
        e.stopPropagation();
        if (confirm("Supprimer ce message ?")) {
          await deleteDoc(doc(db, 'messages', msg.id));
          showToast("Message supprimé");
        }
      };
      div.appendChild(delBtn);
    }
    
    div.addEventListener('click', () => {
      replyToMsg = msg;
      replyPreview.style.display = 'block';
      document.querySelector('.reply-preview-text').innerHTML = `<i class="fas fa-reply"></i> En réponse à ${escapeHtml(msg.senderName)}`;
    });
    
    div.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showReactionMenu(msg.id, e.clientX, e.clientY);
    });
  }
  
  messagesContainer.appendChild(div);
}

// ================== RÉACTIONS ==================
function renderReactions(msg) {
  if (!msg.reactions || Object.keys(msg.reactions).length === 0) return '';
  return Object.entries(msg.reactions).map(([emoji, users]) => {
    const isActive = currentUser && users.includes(currentUser.uid);
    return `<span class="reaction-badge ${isActive ? 'active' : ''}" data-emoji="${emoji}">${emoji} ${users.length}</span>`;
  }).join('');
}

function showReactionMenu(msgId, x, y) {
  reactionMenu.style.display = 'flex';
  reactionMenu.style.left = Math.min(x, window.innerWidth - 180) + 'px';
  reactionMenu.style.top = (y - 50) + 'px';
  reactionMenu.dataset.msgId = msgId;
}

async function toggleReaction(msgId, emoji) {
  if (!currentUserData) return;
  const msgRef = doc(db, 'messages', msgId);
  const snap = await getDoc(msgRef);
  if (!snap.exists()) return;
  const data = snap.data();
  const reactions = data.reactions || {};
  const userList = reactions[emoji] || [];
  const newList = userList.includes(currentUser.uid) 
    ? userList.filter(id => id !== currentUser.uid)
    : [...userList, currentUser.uid];
  if (newList.length === 0) delete reactions[emoji];
  else reactions[emoji] = newList;
  await updateDoc(msgRef, { reactions });
  reactionMenu.style.display = 'none';
}

reactionMenu.addEventListener('click', async (e) => {
  const emoji = e.target.dataset.reaction;
  const msgId = reactionMenu.dataset.msgId;
  if (emoji && msgId) await toggleReaction(msgId, emoji);
});

document.addEventListener('click', (e) => {
  if (!reactionMenu.contains(e.target)) reactionMenu.style.display = 'none';
});

cancelReplyBtn.addEventListener('click', () => {
  replyToMsg = null;
  replyPreview.style.display = 'none';
});

// ================== ENVOI D'UN MESSAGE ==================
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !currentUserData) return;

  // Désactiver temporairement le bouton pour éviter les doubles envois
  sendBtn.disabled = true;
  const originalText = sendBtn.innerHTML;
  sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  const messageData = {
    senderPhone: currentUserData.phone,
    senderName: currentUserData.name,
    role: currentUserData.role,
    type: 'text',
    content: text,
    timestamp: serverTimestamp(),
    reactions: {}
  };
  if (replyToMsg) messageData.replyTo = replyToMsg.id;
  
  try {
    await addDoc(collection(db, 'messages'), messageData);
    messageInput.value = '';
    if (replyToMsg) {
      replyToMsg = null;
      replyPreview.style.display = 'none';
    }
    messageInput.focus();
    // Retour visuel
    showToast("Message envoyé ✉️");
    
    // Forcer le scroll tout en bas après un court délai (temps d'ajout dans la base)
    setTimeout(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 300);
    
  } catch (error) {
    console.error("Erreur envoi:", error);
    showToast("Erreur d'envoi : " + error.message, true);
  } finally {
    // Réactiver le bouton
    sendBtn.disabled = false;
    sendBtn.innerHTML = originalText;
  }
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Empêcher le rechargement de la page quand on appuie sur Entrée dans le footer
document.querySelector('footer').addEventListener('submit', (e) => {
  e.preventDefault();
});

// ================== UTILITAIRES ==================
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}