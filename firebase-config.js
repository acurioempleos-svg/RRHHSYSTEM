// ==============================================================
//  FIREBASE CONFIG — compartido por todos los módulos
//  Incluir SIEMPRE antes de auth-guard.js y del módulo
// ==============================================================

const firebaseConfig = {
  apiKey:            "AIzaSyDL4ezIawX3xryjkKyty82DrAQEizmjli8",
  authDomain:        "rrhhsystem.firebaseapp.com",
  projectId:         "rrhhsystem",
  storageBucket:     "rrhhsystem.firebasestorage.app",
  messagingSenderId: "71511125212",
  appId:             "1:71511125212:web:03a0ad11b281e397a29819"
};

let db, auth;
try {
  firebase.initializeApp(firebaseConfig);
  db   = firebase.firestore();
  auth = firebase.auth();
} catch(e) {
  console.warn('Firebase init error:', e.message);
}

// ==============================================================
//  EMAILJS CONFIG
// ==============================================================
const EMAILJS_PUBLIC_KEY  = 'VGDuLGr6fez402k18';
const EMAILJS_SERVICE_ID  = 'service_6onuqwg';
const EMAILJS_TEMPLATE_ID = 'template_qyjp8ni';
const EMAILJS_TO_EMAIL    = 'acurioempleos@gmail.com';

if (typeof emailjs !== 'undefined' && EMAILJS_PUBLIC_KEY !== 'TU_PUBLIC_KEY') {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

async function enviarMailIngreso(data) {
  if (typeof emailjs === 'undefined' || EMAILJS_PUBLIC_KEY === 'TU_PUBLIC_KEY') {
    console.warn('EmailJS no configurado - mail no enviado');
    return;
  }

  let destinatario = EMAILJS_TO_EMAIL;
  if (data.local && typeof adminLocales !== 'undefined') {
    const loc = adminLocales.getLocales().find(l => l.nombre === data.local);
    if (loc && loc.email && loc.email.trim()) {
      destinatario = loc.email.trim();
    }
  }

  const fecha = data.fecha ? data.fecha.split('-').reverse().join('/') : '-';
  const baseUrl = location.href.split('?')[0];
  const confirmUrl = data._docId ? `${baseUrl}?confirmar=${data._docId}` : '';

  const casillas = destinatario.split(/[\n,]+/).map(e => e.trim()).filter(Boolean);
  for (const casilla of casillas) {
    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email:    casilla,
        empleado:    data.nombre  || '-',
        puesto:      data.puesto  || '-',
        local:       data.local   || '-',
        fecha,
        horario:     data.horario || 'No especificado',
        codigo:      data.codigo  || '-',
        confirm_url: confirmUrl,
      });
      console.log('Mail enviado a', casilla);
    } catch(e) {
      console.error('Error enviando mail a', casilla, e);
    }
  }
}
