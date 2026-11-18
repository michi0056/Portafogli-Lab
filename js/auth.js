// Accesso con email e password. Non c'è registrazione pubblica: l'account si crea dalla console Firebase.
import { onAuthStateChanged, signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { auth } from './firebase.js';

const $ = s => document.querySelector(s);

export function watchAuth(onIn) {
  const msg = $('#login-msg');
  $('#login-form').addEventListener('submit', async ev => {
    ev.preventDefault(); msg.textContent = '';
    try { await signInWithEmailAndPassword(auth, $('#login-email').value.trim(), $('#login-pwd').value); }
    catch { msg.textContent = 'Email o password non corrette.'; }
  });
  $('#login-reset').addEventListener('click', async () => {
    const email = $('#login-email').value.trim();
    if (!email) { msg.textContent = 'Scrivi prima la tua email.'; return; }
    try { await sendPasswordResetEmail(auth, email); msg.textContent = 'Email per il reset inviata: controlla la posta.'; }
    catch { msg.textContent = 'Impossibile inviare il reset.'; }
  });
  $('#btn-logout').addEventListener('click', async () => { await signOut(auth); location.reload(); });
  onAuthStateChanged(auth, user => {
    $('#login').hidden = !!user;
    $('#app').hidden = !user;
    if (user) onIn(user);
  });
}
