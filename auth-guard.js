// ==============================================================
//  AUTH GUARD — compartido por todos los módulos
//  Verifica sesión activa. Si no hay usuario → redirige a login.
//  Incluir DESPUÉS de firebase-config.js
// ==============================================================

// Estado global del usuario (accesible desde cualquier módulo)
window._currentUser  = null;
window._currentRol   = null;
window._currentLocal = null;
window._filtroLocal  = '';

// ==============================================================
//  OBSERVER PRINCIPAL
//  Cada página que incluya auth-guard.js debe definir
//  window._onAuthReady = function(user, rol, local) { ... }
//  para ejecutar su lógica post-login.
// ==============================================================
if (auth) {
  auth.onAuthStateChanged(async user => {
    if (!user) {
      // No hay sesión → ir al login
      window.location.href = getBasePath() + 'index.html';
      return;
    }

    window._currentUser = user;

    // Cargar perfil desde Firestore
    let rol = 'rrhh', localAsignado = '';
    if (db && user.uid) {
      try {
        const snap = await db.collection('usuarios')
          .where('uid', '==', user.uid).limit(1).get();
        if (!snap.empty) {
          const data = snap.docs[0].data();
          rol          = data.rol   || 'rrhh';
          localAsignado = data.local || '';
        }
      } catch(e) { console.warn('No se pudo cargar perfil:', e); }
    }

    window._currentRol   = rol;
    window._currentLocal = localAsignado;
    window._filtroLocal  = rol === 'rrhh' ? '' : localAsignado;

    // Renderizar nav con datos del usuario
    if (typeof renderNav === 'function') renderNav(user, rol, localAsignado);

    // Callback específico de cada página
    if (typeof window._onAuthReady === 'function') {
      window._onAuthReady(user, rol, localAsignado);
    }
  });
}

// ==============================================================
//  HELPERS DE SESIÓN
// ==============================================================
function doLogout() {
  if (auth) auth.signOut();
  window.location.href = getBasePath() + 'index.html';
}

function mapAuthError(code) {
  const map = {
    'auth/user-not-found':    'Usuario no encontrado.',
    'auth/wrong-password':    'Contraseña incorrecta.',
    'auth/invalid-email':     'Email inválido.',
    'auth/too-many-requests': 'Demasiados intentos. Esperá un momento.',
  };
  return map[code] || 'Error de autenticación.';
}

// Detecta si estamos en /modulos/ o en raíz para armar paths relativos
function getBasePath() {
  const path = window.location.pathname;
  return path.includes('/modulos/') ? '../' : './';
}

// ==============================================================
//  FIREBASE STATUS
// ==============================================================
function checkFirebase() {
  const dot    = document.getElementById('fb-dot');
  const status = document.getElementById('fb-status');
  if (!dot || !status) return;
  if (!db) {
    dot.className    = 'status-dot error';
    status.textContent = 'Firebase no configurado · Modo demo';
    return;
  }
  db.collection('_ping').limit(1).get()
    .then(() => {
      dot.className    = 'status-dot connected';
      status.textContent = 'Firebase conectado';
    })
    .catch(() => {
      dot.className    = 'status-dot error';
      status.textContent = 'Error al conectar con Firebase';
    });
}
