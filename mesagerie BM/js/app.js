import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

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

const AUTHORIZED_PHONES = {
  "691288089": { name: "Mr. Bello", role: "ceo", label: "CEO" },
  "696953696": { name: "Mr. Temate", role: "directeur", label: "Directeur" },
  "681061196": { name: "Mr. Brayan", role: "directeur", label: "Directeur" }
};

const phoneInput = document.getElementById('auth-phone');
const sendCodeBtn = document.getElementById('send-code-btn');
const codeSection = document.getElementById('code-section');
const codeInput = document.getElementById('auth-code');
const verifyCodeBtn = document.getElementById('verify-code-btn');
const debugInfo = document.getElementById('debug-info');
const loginForm = document.getElementById('login-form');
const loaderContainer = document.getElementById('loader-container');

let recaptchaVerifier = null;
let confirmationResult = null;

function initRecaptcha() {
  if (recaptchaVerifier) return;
  recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 
    size: 'invisible',
    'callback': () => {}
  });
}

// 🔥 Vérifier si l'utilisateur est déjà connecté
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Déjà connecté, rediriger vers home
    window.location.href = 'home.html';
  }
});

sendCodeBtn.addEventListener('click', async () => {
  const phone = phoneInput.value.trim();
  if (!phone) {
    debugInfo.textContent = "Veuillez entrer un numéro.";
    return;
  }
  
  const cleanPhone = phone.replace(/\D/g, '');
  if (!AUTHORIZED_PHONES[cleanPhone]) {
    debugInfo.textContent = "Numéro non autorisé.";
    return;
  }
  
  const fullPhone = '+237' + cleanPhone;
  showLoader();
  
  try {
    if (!recaptchaVerifier) initRecaptcha();
    confirmationResult = await signInWithPhoneNumber(auth, fullPhone, recaptchaVerifier);
    hideLoader();
    codeSection.style.display = 'block';
    sendCodeBtn.style.display = 'none';
    debugInfo.textContent = "Code envoyé ! Utilisez 123456 (numéro de test).";
  } catch (err) {
    hideLoader();
    debugInfo.textContent = "Erreur: " + err.message;
    console.error(err);
    // Réinitialiser reCAPTCHA en cas d'erreur
    if (recaptchaVerifier) {
      recaptchaVerifier.render().then(wid => grecaptcha.reset(wid));
    }
  }
});

verifyCodeBtn.addEventListener('click', async () => {
  const code = codeInput.value.trim();
  if (!code) {
    debugInfo.textContent = "Entrez le code reçu par SMS";
    return;
  }
  
  showLoader();
  try {
    await confirmationResult.confirm(code);
    // La redirection est gérée par onAuthStateChanged
  } catch (err) {
    hideLoader();
    debugInfo.textContent = "Code incorrect.";
  }
});

function showLoader() { 
  loginForm.style.display = 'none'; 
  loaderContainer.style.display = 'flex'; 
}

function hideLoader() { 
  loginForm.style.display = 'block'; 
  loaderContainer.style.display = 'none'; 
}

initRecaptcha();