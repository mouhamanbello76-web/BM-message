import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

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

const userGreeting = document.getElementById('user-greeting');
const assistantMessage = document.getElementById('assistant-message');
const logoutBtn = document.getElementById('logout-btn');
let currentUserData = null;
let currentUser = null;
let presenceInterval = null;

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

  // Mise à jour de la présence
  const userRef = doc(db, 'users', user.uid);
  await setDoc(userRef, {
    phone: user.phoneNumber,
    name: info.name,
    role: info.role,
    label: info.label,
    online: true,
    lastSeen: serverTimestamp()
  }, { merge: true });

  // Affichage
  const badge = info.role === 'ceo' 
    ? '<span style="color:#22c55e;"><i class="fas fa-check-circle"></i> CEO</span>' 
    : '<span style="color:#3b82f6;"><i class="fas fa-check-circle"></i> Directeur</span>';
  userGreeting.innerHTML = `${info.name} ${badge}`;

  if (info.role === 'ceo') {
    assistantMessage.innerHTML = `
      <strong>Bienvenue Mr. Bello !</strong><br><br>
      Je suis votre assistant virtuel. Vous avez accès à toutes les fonctionnalités.<br>
      Vous pouvez gérer les projets, modérer la messagerie et consulter les statistiques.<br><br>
      <em>Bonne journée chef ! 👑</em>
    `;
  } else {
    assistantMessage.innerHTML = `
      <strong>Bienvenue dans BM Studio !</strong><br><br>
      Vous pouvez discuter avec l'équipe, consulter les projets en cours et voter pour les prochains jeux.<br><br>
      <em>Bonne journée ! 🎮</em>
    `;
  }

  // Rafraîchir la présence toutes les 60 secondes
  if (presenceInterval) clearInterval(presenceInterval);
  presenceInterval = setInterval(async () => {
    if (currentUser) {
      await setDoc(doc(db, 'users', currentUser.uid), {
        online: true,
        lastSeen: serverTimestamp()
      }, { merge: true });
    }
  }, 60000);
});

logoutBtn.addEventListener('click', async () => {
  if (currentUser) {
    await setDoc(doc(db, 'users', currentUser.uid), { online: false }, { merge: true });
  }
  if (presenceInterval) clearInterval(presenceInterval);
  await signOut(auth);
  window.location.href = 'index.html';
});

window.addEventListener('beforeunload', () => {
  if (currentUser) {
    // Tentative de mise à jour asynchrone lors de la fermeture (peut échouer)
    setDoc(doc(db, 'users', currentUser.uid), { online: false }, { merge: true }).catch(() => {});
  }
});