import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-storage.js";

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
const storage = getStorage(app);

const AUTHORIZED_PHONES = {
  "691288089": { name: "Mr. Bello", role: "ceo", label: "CEO" },
  "696953696": { name: "Mr. Temate", role: "directeur", label: "Directeur" },
  "681061196": { name: "Mr. Brayan", role: "directeur", label: "Directeur" }
};

// Histoire complète de Where I'm
const DEFAULT_STORY = `Vous vous réveillez dans une ville inconnue, enveloppée d'un brouillard épais et oppressant. Vous ne savez pas qui vous êtes, ni comment vous êtes arrivé ici. Vos seuls souvenirs sont des fragments flous, comme des rêves oubliés.

La ville semble déserte... ou presque. Des ombres se déplacent dans la brume. Des créatures bizarres vous observent depuis les ruelles sombres. Parfois, vous apercevez un objet - une clé, une lettre - mais quand vous vous approchez, il disparaît comme par magie.

Au fil de votre exploration, vous découvrez des indices troublants : les humains ont été enlevés. Des êtres venus d'une autre dimension préparent leur remplacement. Vous êtes peut-être le dernier humain libre.

Vous trouvez des portails dimensionnels, des objets mystérieux aux pouvoirs étranges. Chaque découverte vous rapproche de la vérité, mais aussi du danger. Des lettres anciennes racontent l'histoire d'une civilisation disparue. Des clés énigmatiques ouvrent des portes vers d'autres mondes.

Le brouillard semble vivant. Il murmure. Il vous guide... ou vous égare ? Qui êtes-vous vraiment ? Pourquoi êtes-vous ici ? Et surtout... pourrez-vous sauver l'humanité ?`;

const DEFAULT_PROJECT = {
  title: "Where I'm",
  story: DEFAULT_STORY,
  votes: [],
  imageUrl: "assets/images/where-im.jpg",
  videoUrl: "assets/videos/where-im-trailer.mp4",
  createdAt: new Date().toISOString()
};

let currentUserData = null;
let currentUser = null;

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
    ? '<span style="color:#22c55e;"><i class="fas fa-crown"></i> CEO</span>'
    : '<span style="color:#3b82f6;"><i class="fas fa-user-check"></i> Directeur</span>';
  document.getElementById('user-badge').innerHTML = `${info.name} ${badge}`;

  // Admin section pour le CEO
  if (info.role === 'ceo') {
    document.getElementById('admin-media-section').style.display = 'block';
    setupAdminControls();
    setupImageUpload();
    setupVideoUpload();
  }

  await loadCurrentProject();
});

async function loadCurrentProject() {
  const projectRef = doc(db, 'projects', 'current');
  const snap = await getDoc(projectRef);
  let project = snap.exists() ? snap.data() : DEFAULT_PROJECT;

  if (!snap.exists()) {
    await setDoc(projectRef, DEFAULT_PROJECT);
  }

  // Mettre à jour l'affichage
  const titleInput = document.getElementById('project-title-input');
  const storyInput = document.getElementById('project-story-input');
  const mainImage = document.getElementById('main-game-image');
  const video = document.getElementById('game-trailer');
  const voteCountSpan = document.getElementById('vote-count');

  if (titleInput) titleInput.value = project.title;
  if (storyInput) storyInput.value = project.story;
  if (mainImage) mainImage.src = project.imageUrl || "assets/images/where-im.jpg";
  if (video && project.videoUrl) {
    video.querySelector('source').src = project.videoUrl;
    video.load();
  }

  const voteCount = project.votes?.length || 0;
  if (voteCountSpan) voteCountSpan.textContent = voteCount;

  const hasVoted = project.votes?.includes(currentUserData?.uid) || false;
  const voteBtn = document.getElementById('vote-project-btn');
  if (voteBtn) {
    if (hasVoted) {
      voteBtn.disabled = true;
      voteBtn.innerHTML = '<i class="fas fa-check"></i> Déjà soutenu';
      voteBtn.style.opacity = '0.6';
    } else {
      voteBtn.disabled = false;
      voteBtn.innerHTML = '<i class="fas fa-thumbs-up"></i> Soutenir le projet';
      voteBtn.style.opacity = '1';
    }
  }

  // Event vote
  const newVoteBtn = document.getElementById('vote-project-btn');
  if (newVoteBtn && !hasVoted) {
    newVoteBtn.onclick = async () => {
      if (!currentUserData) return;
      
      const snap = await getDoc(projectRef);
      const data = snap.exists() ? snap.data() : DEFAULT_PROJECT;
      const votes = data.votes || [];
      
      if (votes.includes(currentUserData.uid)) {
        alert("Vous avez déjà voté pour ce projet !");
        return;
      }
      
      votes.push(currentUserData.uid);
      await setDoc(projectRef, { ...data, votes }, { merge: true });
      await loadCurrentProject();
      alert("Merci pour votre soutien ! 🙏");
    };
  }
}

function setupAdminControls() {
  const updateStoryBtn = document.getElementById('update-story-btn');
  const titleInput = document.getElementById('project-title-input');
  const storyInput = document.getElementById('project-story-input');

  if (updateStoryBtn) {
    updateStoryBtn.addEventListener('click', async () => {
      const title = titleInput.value.trim();
      const story = storyInput.value.trim();
      
      if (!title || !story) {
        alert("Veuillez remplir le titre et l'histoire");
        return;
      }

      const projectRef = doc(db, 'projects', 'current');
      await updateDoc(projectRef, {
        title: title,
        story: story,
        updatedAt: serverTimestamp()
      });

      alert("✅ Histoire mise à jour !");
      await loadCurrentProject();
    });
  }
}

function setupImageUpload() {
  const imageHint = document.getElementById('image-upload-hint');
  const imageInput = document.getElementById('image-upload-input');
  const updateImageBtn = document.getElementById('update-image-btn');

  if (imageHint) {
    imageHint.addEventListener('click', () => {
      if (currentUserData?.role === 'ceo') imageInput.click();
    });
  }

  if (updateImageBtn) {
    updateImageBtn.addEventListener('click', () => imageInput.click());
  }

  if (imageInput) {
    imageInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file || currentUserData?.role !== 'ceo') return;

      const loadingToast = showToast("Upload en cours...");
      
      try {
        const storageRef = ref(storage, `projects/where-im-cover-${Date.now()}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        
        const projectRef = doc(db, 'projects', 'current');
        await updateDoc(projectRef, { imageUrl: url });
        
        document.getElementById('main-game-image').src = url;
        hideToast(loadingToast);
        showToast("✅ Image mise à jour !", "success");
      } catch (error) {
        console.error(error);
        hideToast(loadingToast);
        showToast("❌ Erreur lors de l'upload", "error");
      }
    });
  }
}

function setupVideoUpload() {
  const videoHint = document.getElementById('video-upload-hint');
  const videoInput = document.getElementById('video-upload-input');
  const updateVideoBtn = document.getElementById('update-video-btn');

  if (videoHint) {
    videoHint.addEventListener('click', () => {
      if (currentUserData?.role === 'ceo') videoInput.click();
    });
  }

  if (updateVideoBtn) {
    updateVideoBtn.addEventListener('click', () => videoInput.click());
  }

  if (videoInput) {
    videoInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file || currentUserData?.role !== 'ceo') return;

      const loadingToast = showToast("Upload vidéo...");
      
      try {
        const storageRef = ref(storage, `projects/where-im-trailer-${Date.now()}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        
        const projectRef = doc(db, 'projects', 'current');
        await updateDoc(projectRef, { videoUrl: url });
        
        const video = document.getElementById('game-trailer');
        video.querySelector('source').src = url;
        video.load();
        
        hideToast(loadingToast);
        showToast("✅ Vidéo mise à jour !", "success");
      } catch (error) {
        console.error(error);
        hideToast(loadingToast);
        showToast("❌ Erreur lors de l'upload vidéo", "error");
      }
    });
  }
}

// Toast helper
function showToast(message, type = "info") {
  const toast = document.createElement('div');
  toast.className = `toast-notification ${type}`;
  toast.innerHTML = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.backgroundColor = type === 'success' ? '#22c55e' : (type === 'error' ? '#ff0000' : '#333');
  toast.style.color = 'white';
  toast.style.padding = '12px 24px';
  toast.style.borderRadius = '8px';
  toast.style.zIndex = '1000';
  toast.style.fontSize = '14px';
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), 3000);
  return toast;
}

function hideToast(toast) {
  if (toast) toast.remove();
}