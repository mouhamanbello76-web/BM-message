import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import { getFirestore, collection, query, onSnapshot } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

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

// ✅ Attendre que le DOM soit entièrement chargé
document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    const phone = user.phoneNumber.replace(/\D/g, '');
    const info = AUTHORIZED_PHONES[phone];

    if (!info) {
      await signOut(auth);
      window.location.href = 'index.html';
      return;
    }

    currentUserData = { ...info, uid: user.uid, phone: user.phoneNumber };
    
    // ✅ Mise à jour des éléments du profil
    const nameEl = document.getElementById('settings-name');
    const phoneEl = document.getElementById('settings-phone');
    const roleEl = document.getElementById('settings-role');
    
    if (nameEl) nameEl.textContent = info.name;
    if (phoneEl) phoneEl.textContent = user.phoneNumber;
    if (roleEl) {
      roleEl.innerHTML = info.role === 'ceo' 
        ? '<span style="color:#22c55e;">CEO</span>' 
        : '<span style="color:#3b82f6;">Directeur</span>';
    }
    
    loadMembers();
  });
});

function loadMembers() {
  const q = query(collection(db, 'users'));
  
  onSnapshot(q, (snapshot) => {
    const container = document.getElementById('members-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    snapshot.forEach(doc => {
      const user = doc.data();
      const isOnline = user.online === true;
      const statusColor = isOnline ? '#22c55e' : '#666';
      const statusText = isOnline ? '🟢 En ligne' : '⚫ Hors ligne';
      
      const div = document.createElement('div');
      div.className = 'member-item';
      div.innerHTML = `
        <div>
          <i class="fas fa-circle" style="color:${statusColor}; font-size:10px;"></i>
          <strong>${user.name || 'Inconnu'}</strong>
          <span style="color:#888; font-size:11px; margin-left:8px;">${statusText}</span>
        </div>
        <span style="color:${user.role === 'ceo' ? '#22c55e' : '#3b82f6'};">${user.label || user.role || 'Membre'}</span>
      `;
      container.appendChild(div);
    });
  });
}