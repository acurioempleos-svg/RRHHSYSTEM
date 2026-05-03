// ==============================================================
//  NAV.JS — Sidebar + TopNav compartido
//  Inyecta el HTML de navegación en cualquier página del sistema.
//  Requiere un <div id="nav-root"></div> en el body.
//  Incluir DESPUÉS de firebase-config.js y auth-guard.js
// ==============================================================

// Mapa de módulos → páginas (para navegación multi-página)
const MODULE_PAGES = {
  'home':          '../dashboard.html',
  'reclutamiento': 'reclutamiento.html',
  'ingresos':      'ingresos.html',
  'formulario':    'formulario.html',
  'info-personal': 'info-personal.html',
  'horarios':      'horarios.html',
  'bajas':         'bajas.html',
  'liquidaciones': 'liquidaciones.html',
  'portal':        'portal.html',
  'indumentaria':  'indumentaria.html',
  'manuales':      'manuales.html',
  'admin-locales': 'admin-locales.html',
  'usuarios':      'usuarios.html',
};

// Detectar qué módulo está activo según la página actual
function getActiveModule() {
  const page = window.location.pathname.split('/').pop().replace('.html', '');
  if (page === 'dashboard' || page === 'index' || page === '') return 'home';
  return page;
}

// Navegar a otra página del sistema
function navigateTo(moduleId) {
  const base = getBasePath() + 'modulos/';
  const target = MODULE_PAGES[moduleId];
  if (!target) return;
  if (moduleId === 'home') {
    window.location.href = getBasePath() + 'dashboard.html';
  } else {
    window.location.href = base + target;
  }
}

// Inyectar el HTML de navegación completo
function injectNav() {
  const root = document.getElementById('nav-root');
  if (!root) return;

  const activeModule = getActiveModule();

  root.innerHTML = `
    <!-- TOP NAV -->
    <header id="topnav">
      <button class="nav-hamburger" onclick="toggleSidebar()">
        <span></span><span></span><span></span>
      </button>
      <div class="nav-brand">RR<span>HH</span></div>
      <div class="nav-module-tag" id="nav-tag">${getModuleLabel(activeModule)}</div>
      <div class="nav-user-btn" id="nav-user-btn" onclick="toggleUserMenu()">?</div>
    </header>

    <!-- USER DROPDOWN -->
    <div class="user-dropdown" id="user-dropdown">
      <div class="dropdown-label" id="dd-email">email</div>
      <div class="dropdown-sep"></div>
      <div class="dropdown-item" onclick="doLogout()">
        <span>←</span> Cerrar sesión
      </div>
    </div>

    <!-- SIDEBAR OVERLAY (mobile) -->
    <div id="sidebar-overlay" onclick="closeSidebar()"></div>

    <!-- SIDEBAR -->
    <nav id="sidebar">
      <div class="sidebar-section-label">Módulos</div>

      ${navItem('home',          '00', 'Inicio',          'var(--accent)', activeModule, false)}
      ${navItem('reclutamiento', '01', 'Reclutamiento',   'var(--m1)',     activeModule, true)}
      ${navItem('ingresos',      '02', 'Ingresos',        'var(--m2)',     activeModule, true)}
      ${navItem('formulario',    '03', 'Form. de Personal','var(--m3)',    activeModule, true)}
      ${navItem('info-personal', '04', 'Info Personal',   'var(--m4)',     activeModule, false)}
      ${navItem('horarios',      '05', 'Horarios',        'var(--m5)',     activeModule, false)}
      ${navItem('bajas',         '06', 'Bajas',           'var(--m6)',     activeModule, true)}
      ${navItem('liquidaciones', '07', 'Liquidaciones',   'var(--m7)',     activeModule, true)}
      ${navItem('portal',        '08', 'Portal Empleados','var(--m8)',     activeModule, false)}
      ${navItem('indumentaria',  '09', 'Indumentaria',    'var(--m9)',     activeModule, true)}
      ${navItem('manuales',      '10', 'Manuales / Docs', 'var(--m9)',     activeModule, true)}

      <div class="sidebar-section-label" id="sidebar-admin-label" style="margin-top:8px">Administración</div>
      ${navItem('admin-locales', '⚙',  'Locales',         '#6b7280',       activeModule, true)}
      ${navItem('usuarios',      '👤', 'Usuarios',         '#f0a0ff',       activeModule, true)}

      <!-- Footer del sidebar -->
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="sidebar-avatar" id="sb-avatar">—</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name" id="sb-name">—</div>
            <div class="sidebar-user-role" id="sb-role">RRHH · Admin</div>
          </div>
          <button class="btn-logout" onclick="doLogout()">Salir</button>
        </div>
        <div class="sidebar-status">
          <span class="status-dot" id="fb-dot"></span>
          <span id="fb-status">Conectando…</span>
        </div>
      </div>
    </nav>
  `;

  // Aplicar permisos según rol ya cargado
  applyNavPermisos(window._currentRol || 'rrhh');

  // Cerrar dropdown al click afuera
  document.addEventListener('click', e => {
    const dd  = document.getElementById('user-dropdown');
    const btn = document.getElementById('nav-user-btn');
    if (dd && btn && !dd.contains(e.target) && !btn.contains(e.target)) {
      dd.classList.remove('show');
    }
  });
}

// Helper que genera un <a> del sidebar
function navItem(moduleId, num, label, color, activeModule, soloRrhh) {
  const isActive  = moduleId === activeModule ? 'active' : '';
  const rolAttr   = soloRrhh ? 'data-rol="rrhh"' : '';
  return `
    <a class="nav-item ${isActive}" ${rolAttr} data-module="${moduleId}"
       style="--item-color: ${color}" onclick="navigateTo('${moduleId}')">
      <span class="nav-dot"></span>
      <span class="nav-item-text">${label}</span>
      <span class="nav-item-num">${num}</span>
    </a>`;
}

// Labels de módulos para el nav-tag
function getModuleLabel(moduleId) {
  const labels = {
    'home':          'Inicio',
    'reclutamiento': 'Reclutamiento',
    'ingresos':      'Ingresos',
    'formulario':    'Form. de Personal',
    'info-personal': 'Info Personal',
    'horarios':      'Horarios',
    'bajas':         'Bajas',
    'liquidaciones': 'Liquidaciones',
    'portal':        'Portal Empleados',
    'indumentaria':  'Indumentaria',
    'manuales':      'Manuales / Docs',
    'admin-locales': 'Locales · Admin',
    'usuarios':      'Usuarios',
  };
  return labels[moduleId] || moduleId;
}

// Aplicar visibilidad según rol
function applyNavPermisos(rol) {
  const esRrhh = rol === 'rrhh';
  document.querySelectorAll('[data-rol="rrhh"]').forEach(el => {
    el.style.display = esRrhh ? '' : 'none';
  });
  const adminLabel = document.getElementById('sidebar-admin-label');
  if (adminLabel) adminLabel.style.display = esRrhh ? '' : 'none';
}

// ==============================================================
//  SIDEBAR TOGGLE
// ==============================================================
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar) return;
  const isOpen = sidebar.classList.toggle('open');
  overlay.classList.toggle('show', isOpen);
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
}

// ==============================================================
//  USER DROPDOWN
// ==============================================================
function toggleUserMenu() {
  document.getElementById('user-dropdown')?.classList.toggle('show');
}

// ==============================================================
//  RENDER NAV — llamado por auth-guard.js al confirmar sesión
// ==============================================================
function renderNav(user, rol, localAsignado) {
  injectNav();
  applyNavPermisos(rol);

  const name     = user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario');
  const initials = name.slice(0, 2).toUpperCase();

  const sbName   = document.getElementById('sb-name');
  const sbRole   = document.getElementById('sb-role');
  const sbAvatar = document.getElementById('sb-avatar');
  const navBtn   = document.getElementById('nav-user-btn');
  const ddEmail  = document.getElementById('dd-email');

  if (sbName)   sbName.textContent   = name;
  if (sbRole)   sbRole.textContent   = rol === 'gerente' ? `Gerente · ${localAsignado}` : 'RRHH · Admin';
  if (sbAvatar) sbAvatar.textContent = initials;
  if (navBtn)   navBtn.textContent   = initials;
  if (ddEmail)  ddEmail.textContent  = user.email || name;

  checkFirebase();
}
