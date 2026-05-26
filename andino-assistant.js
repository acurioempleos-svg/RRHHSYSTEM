/*!
 * Andino Assistant v2.0
 * Explorador flotante adaptable a cualquier página.
 * Uso: <script src="andino-assistant.js"></script>
 * Opcional: <script src="andino-assistant.js" data-page="admin" data-name="MiApp"></script>
 */
(function () {
  'use strict';

  // ── DETECCIÓN INTELIGENTE DE PÁGINA ─────────────────────────────────────────
  function detectPage() {
    const attr = document.currentScript?.getAttribute('data-page');
    if (attr) return attr;

    const path  = location.pathname.toLowerCase();
    const title = document.title.toLowerCase();
    const body  = document.body?.innerText?.toLowerCase() || '';

    // Orden: más específico primero
    if (path.includes('admin')   || title.includes('admin'))   return 'admin';
    if (path.includes('ranking') || title.includes('ranking') || title.includes('tabla')) return 'ranking';
    if (path.includes('login')   || title.includes('login')   || title.includes('ingres')) return 'login';
    if (path.includes('game')    || path.includes('camarero') || path.includes('andino')
      || title.includes('juego') || title.includes('trivia')) return 'game';
    if (path.includes('index')   || path === '/' || path === '') return 'index';

    // Fallback: analizar DOM en busca de pistas
    return detectFromDOM();
  }

  function detectFromDOM() {
    const headings = [...document.querySelectorAll('h1,h2,h3')]
      .map(h => h.innerText.toLowerCase()).join(' ');
    const navItems = [...document.querySelectorAll('nav a, .nav a, .sidebar a, .menu a')]
      .map(a => a.innerText.toLowerCase()).join(' ');
    const combined = headings + ' ' + navItems;

    if (combined.match(/trivia|pregunta|quiz/))              return 'game';
    if (combined.match(/ranking|puntaje|leaderboard|tabla/)) return 'ranking';
    if (combined.match(/admin|panel|dashboard|gestión/))     return 'admin';
    if (combined.match(/login|ingres|acceso|dni|contraseña/)) return 'login';
    return 'unknown';
  }

  // ── ANÁLISIS DINÁMICO DEL DOM PARA TIPS CONTEXTUALES ─────────────────────────
  function scanPageForHints() {
    const hints = [];

    // Detectar botones/acciones principales
    const buttons = [...document.querySelectorAll('button, [role="button"], .btn')]
      .filter(b => b.innerText?.trim().length > 1 && b.innerText.trim().length < 40)
      .slice(0, 8);
    buttons.forEach(b => {
      const txt = b.innerText.trim();
      if (txt) hints.push({ type: 'button', text: txt, el: b });
    });

    // Detectar secciones/tabs
    const tabs = [...document.querySelectorAll('[role="tab"], .tab, .nav-tab, .tab-button')]
      .map(t => t.innerText?.trim()).filter(Boolean).slice(0, 6);
    if (tabs.length) hints.push({ type: 'tabs', list: tabs });

    // Detectar formularios
    const forms = [...document.querySelectorAll('form, .form-group')];
    if (forms.length) hints.push({ type: 'form', count: forms.length });

    // Detectar tablas
    const tables = [...document.querySelectorAll('table, .table')];
    if (tables.length) hints.push({ type: 'table', count: tables.length });

    // Detectar secciones con ID o data-section
    const sections = [...document.querySelectorAll('[id], [data-section]')]
      .filter(s => ['section','article','main','div'].includes(s.tagName.toLowerCase()))
      .map(s => s.id || s.dataset.section)
      .filter(Boolean).slice(0, 5);
    if (sections.length) hints.push({ type: 'sections', list: sections });

    return hints;
  }

  function buildDynamicTips(hints, pageName) {
    const tips = [];

    hints.forEach(h => {
      if (h.type === 'button') {
        tips.push(`💡 El botón "${h.text}" está disponible en esta pantalla.`);
      }
      if (h.type === 'tabs' && h.list.length) {
        tips.push(`📂 Podés navegar entre: ${h.list.join(', ')}.`);
      }
      if (h.type === 'form') {
        tips.push(`📝 Hay ${h.count > 1 ? h.count + ' formularios' : 'un formulario'} en esta página. Completá todos los campos antes de guardar.`);
      }
      if (h.type === 'table') {
        tips.push(`📊 La tabla muestra datos de esta sección. Podés ordenar o buscar si tiene esa opción.`);
      }
      if (h.type === 'sections' && h.list.length) {
        tips.push(`🗂 Esta página tiene secciones: ${h.list.join(', ')}.`);
      }
    });

    // Tip genérico de orientación
    if (pageName === 'unknown' || tips.length < 2) {
      tips.push('🧭 Explorá la página — cada sección tiene funciones específicas.');
      tips.push('❓ Si algo no funciona como esperás, intentá recargar la página.');
      tips.push('🖱 Hacé clic en los elementos para interactuar con ellos.');
    }

    return tips.length ? tips : ['💡 Explorá las opciones disponibles en esta pantalla.'];
  }

  const PAGE = detectPage();
  const APP_NAME = document.currentScript?.getAttribute('data-name') || 'Andino';

  // ── CONTEXTO POR PÁGINA (ESTÁTICO + DINÁMICO) ────────────────────────────────
  const PAGE_CONTEXT = {
    admin: {
      greeting: `¡Hola, admin! Soy el Explorador de ${APP_NAME}.`,
      tips: [
        '📊 En el Dashboard podés ver quién estuvo activo esta semana.',
        '📚 En el Banco podés agregar preguntas nuevas de Trivia, Carta o Simulador.',
        '⬇ Con el botón PDF exportás todas las preguntas de una sección.',
        '🔥 "Trivia de Hoy" muestra las preguntas que más fallan los camareros.',
        '🏆 Configurá el Premio Quincenal para mantener motivado al equipo.',
        '👤 En Tracking ves el historial completo de cada jugador.',
        '📥 Usá la Carga Masiva para subir preguntas en formato JSON de una vez.',
        '🗑 Podés eliminar preguntas sueltas o toda una sección desde el Banco.',
        '⚠️ Las alertas de inactividad te avisan si alguien dejó de jugar.',
        '📈 Los KPIs del dashboard se actualizan en tiempo real.',
      ],
      color: '#D4A800',
    },
    game: {
      greeting: `¡Hola! Soy el Explorador. ¡A jugar en ${APP_NAME}!`,
      tips: [
        '🧠 En la Trivia la primera opción no siempre es la correcta — pensalo bien.',
        '🍽️ Carta pone a prueba tu conocimiento del menú. ¡Repasalo!',
        '🎭 En el Simulador no hay respuesta mala… pero sí hay una mejor.',
        '🔥 Jugá todos los días para mantener tu racha activa.',
        '⚡ Cuanto más rápido respondés, más XP ganás.',
        '🏅 Desbloqueás logros al alcanzar hitos de XP y racha.',
        '📈 Tu nivel sube con XP — ¿podés llegar a Maître Ejecutivo?',
        '💡 Después de cada respuesta aparece una explicación — leéla, te ayuda.',
        '🏆 Los mejores 3 de la quincena obtienen reconocimiento especial.',
      ],
      color: '#1A7A3A',
    },
    ranking: {
      greeting: '¡Mirá dónde estás parado en el ranking!',
      tips: [
        '🥇 El puesto 1 de la quincena gana el premio especial.',
        '📅 El ranking se reinicia cada 15 días — arrancás de cero.',
        '🔥 Una buena racha diaria suma XP extra al marcador.',
        '🧠 Los mejores combinan Trivia, Carta y Simulador.',
        '👀 Fijate la diferencia de XP con el jugador de arriba tuyo.',
        '💪 Un par de sesiones intensas pueden cambiar todo el cuadro.',
      ],
      color: '#4A7AD4',
    },
    login: {
      greeting: `¡Bienvenido a ${APP_NAME}! Ingresá para empezar.`,
      tips: [
        '🔑 Ingresá tu número de DNI para acceder al juego.',
        '❓ Si tenés problemas para entrar, hablá con tu encargado.',
        '🆕 ¿Primera vez? Solo ingresá tu DNI — el sistema te registra solo.',
        '🔒 Tu acceso es personal, no lo compartas con otros.',
      ],
      color: '#D4A800',
    },
    index: {
      greeting: `¡Hola! Soy el Explorador de ${APP_NAME}. ¿Por dónde arrancamos?`,
      tips: [
        '🎮 Elegí un módulo del menú para empezar.',
        '📊 El Admin Panel es solo para encargados.',
        '🏆 El Ranking muestra los mejores del período actual.',
        '❓ Si algo no funciona, recargá la página primero.',
        '👆 Podés arrastrarme a cualquier lugar de la pantalla.',
      ],
      color: '#D4A800',
    },
    unknown: {
      greeting: `¡Hola! Soy el Explorador. Estoy analizando esta página...`,
      tips: [],  // se llenan dinámicamente
      color: '#7A6AD4',
    },
  };

  let ctx = PAGE_CONTEXT[PAGE] || PAGE_CONTEXT.unknown;

  // Para páginas desconocidas o sin suficientes tips, escanear el DOM
  let dynamicTipsLoaded = false;
  function ensureTips() {
    if (dynamicTipsLoaded) return;
    dynamicTipsLoaded = true;
    if (ctx.tips.length < 3) {
      const hints = scanPageForHints();
      const dynamic = buildDynamicTips(hints, PAGE);
      ctx = Object.assign({}, ctx, { tips: [...ctx.tips, ...dynamic] });
    }
  }

  let tipIndex = 0;
  let isOpen = false;
  let isDragging = false;
  let idleTimer = null;
  let hasGreeted = false;

  // ── ESTILOS ─────────────────────────────────────────────────────────────────
  const STYLE = `
    #cndor-wrap {
      position: fixed;
      bottom: 28px;
      right: 22px;
      z-index: 2147483647;
      user-select: none;
      font-family: 'IBM Plex Mono', 'Courier New', monospace;
      touch-action: none;
    }

    #cndor-bubble {
      position: absolute;
      bottom: 90px;
      right: 0;
      width: 250px;
      background: #0f0d09;
      color: #FDF8EE;
      border: 1.5px solid ${ctx.color};
      border-radius: 18px 18px 4px 18px;
      padding: 14px 15px 12px;
      font-size: 12px;
      line-height: 1.6;
      box-shadow: 0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px ${ctx.color}14, 0 0 20px ${ctx.color}18;
      opacity: 0;
      transform: translateY(12px) scale(0.93);
      pointer-events: none;
      transition: opacity .22s ease, transform .22s ease;
      transform-origin: bottom right;
    }
    #cndor-bubble.open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: all;
    }
    #cndor-bubble-text {
      margin-bottom: 11px;
      min-height: 36px;
    }
    #cndor-bubble-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 6px;
      border-top: 1px solid ${ctx.color}28;
      padding-top: 9px;
      margin-top: 4px;
    }
    #cndor-bubble-nav button {
      background: none;
      border: 1px solid ${ctx.color}44;
      color: ${ctx.color};
      border-radius: 7px;
      padding: 4px 10px;
      font-size: 10px;
      font-family: inherit;
      cursor: pointer;
      transition: background .15s, border-color .15s;
    }
    #cndor-bubble-nav button:hover {
      background: ${ctx.color}18;
      border-color: ${ctx.color}88;
    }
    #cndor-tip-counter {
      font-size: 9px;
      color: rgba(253,248,238,0.3);
      flex-shrink: 0;
    }
    #cndor-close-btn {
      position: absolute;
      top: 9px;
      right: 11px;
      background: none;
      border: none;
      color: rgba(253,248,238,0.35);
      font-size: 13px;
      cursor: pointer;
      line-height: 1;
      padding: 0;
      font-family: inherit;
      transition: color .15s;
    }
    #cndor-close-btn:hover { color: #fff; }

    /* Avatar */
    #cndor-btn {
      width: 74px;
      height: 74px;
      border-radius: 50%;
      background: #0f0d09;
      border: 2px solid ${ctx.color};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      box-shadow: 0 4px 20px rgba(0,0,0,0.6), 0 0 0 0 ${ctx.color}44, 0 0 14px ${ctx.color}22;
      transition: box-shadow .3s, transform .2s;
      overflow: visible;
    }
    #cndor-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 28px rgba(0,0,0,0.65), 0 0 0 6px ${ctx.color}1a, 0 0 22px ${ctx.color}33;
    }
    #cndor-btn.wiggle {
      animation: cndor-wiggle 0.6s ease;
    }
    #cndor-btn.pulse-ring::after {
      content: '';
      position: absolute;
      inset: -6px;
      border-radius: 50%;
      border: 2px solid ${ctx.color};
      animation: cndor-pulse 1.3s ease-out forwards;
    }

    /* Dot notificación */
    #cndor-dot {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 10px;
      height: 10px;
      background: #ff2244;
      border-radius: 50%;
      border: 2px solid #0f0d09;
      display: none;
      animation: cndor-dot-pulse 1.5s ease-in-out infinite;
    }
    #cndor-dot.visible { display: block; }

    @keyframes cndor-dot-pulse {
      0%, 100% { box-shadow: 0 0 0 0 #ff224488; }
      50%       { box-shadow: 0 0 0 5px #ff224400; }
    }

    /* Page tag */
    #cndor-page-tag {
      position: absolute;
      bottom: -20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 8px;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: ${ctx.color};
      font-family: inherit;
      white-space: nowrap;
      opacity: 0.6;
    }

    @keyframes cndor-wiggle {
      0%   { transform: rotate(0deg) scale(1.05); }
      18%  { transform: rotate(-9deg) scale(1.09); }
      36%  { transform: rotate(9deg)  scale(1.09); }
      54%  { transform: rotate(-5deg) scale(1.06); }
      72%  { transform: rotate(4deg)  scale(1.05); }
      100% { transform: rotate(0deg)  scale(1); }
    }
    @keyframes cndor-pulse {
      0%   { opacity: 0.9; transform: scale(1); }
      100% { opacity: 0;   transform: scale(1.8); }
    }
    @keyframes cndor-float {
      0%, 100% { transform: translateY(0px); }
      50%       { transform: translateY(-6px); }
    }
    @keyframes cndor-flame {
      0%, 100% { transform: scaleY(1)   scaleX(1); opacity: 0.9; }
      25%       { transform: scaleY(1.18) scaleX(0.9); opacity: 1; }
      50%       { transform: scaleY(0.88) scaleX(1.08); opacity: 0.85; }
      75%       { transform: scaleY(1.12) scaleX(0.92); opacity: 1; }
    }
    @keyframes cndor-scan {
      0%   { r: 7; opacity: 0.6; }
      100% { r: 14; opacity: 0; }
    }
    @keyframes cndor-iris-pulse {
      0%, 100% { transform: scale(1); }
      50%       { transform: scale(1.12); }
    }
    @keyframes cndor-blink {
      0%, 88%, 100% { transform: scaleY(1); }
      93%           { transform: scaleY(0.06); }
    }
    #cndor-bird {
      animation: cndor-float 3.8s ease-in-out infinite;
    }
    #cndor-iris-group {
      transform-origin: 26px 26px;
      animation: cndor-iris-pulse 3s ease-in-out infinite;
    }
    #cndor-eye-group {
      transform-origin: 26px 26px;
      animation: cndor-blink 6s ease-in-out infinite;
    }
    #cndor-flame-1 { transform-origin: 26px 50px; animation: cndor-flame 0.22s ease-in-out infinite; }
    #cndor-flame-2 { transform-origin: 26px 52px; animation: cndor-flame 0.28s ease-in-out infinite 0.05s; }
    #cndor-flame-3 { transform-origin: 26px 49px; animation: cndor-flame 0.19s ease-in-out infinite 0.11s; }
  `;

  // ── SVG: EXPLORADOR SIN BRAZOS ──────────────────────────────────────────────
  // Cuerpo esférico, sin brazos, cohete con llama tri-capa animada,
  // ojo con iris pulsante y parpadeo, antenas con orbes.
  const CONDOR_SVG = `
  <svg id="cndor-bird" width="54" height="62" viewBox="0 0 54 62" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="sg-body" cx="38%" cy="30%" r="65%">
        <stop offset="0%"   stop-color="#f0ede6"/>
        <stop offset="50%"  stop-color="#bab7b0"/>
        <stop offset="100%" stop-color="#787472"/>
      </radialGradient>
      <radialGradient id="sg-eye-bg" cx="36%" cy="32%" r="60%">
        <stop offset="0%"   stop-color="#ffe066"/>
        <stop offset="40%"  stop-color="#e87a10"/>
        <stop offset="80%"  stop-color="#a84400"/>
        <stop offset="100%" stop-color="#3a1400"/>
      </radialGradient>
      <radialGradient id="sg-nozzle" cx="50%" cy="20%" r="70%">
        <stop offset="0%"  stop-color="#888480"/>
        <stop offset="100%" stop-color="#3a3734"/>
      </radialGradient>
      <radialGradient id="sg-flame-core" cx="50%" cy="10%" r="80%">
        <stop offset="0%"  stop-color="#ffffff"/>
        <stop offset="30%" stop-color="#ffee88"/>
        <stop offset="100%" stop-color="#ff8800" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="sg-flame-mid" cx="50%" cy="10%" r="80%">
        <stop offset="0%"  stop-color="#ffcc44"/>
        <stop offset="55%" stop-color="#e85500"/>
        <stop offset="100%" stop-color="#cc220000" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="sg-flame-out" cx="50%" cy="10%" r="80%">
        <stop offset="0%"  stop-color="#e84400" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="#88000000" stop-opacity="0"/>
      </radialGradient>
      <filter id="sg-glow">
        <feGaussianBlur stdDeviation="1.5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <!-- ═══ COHETE / PROPULSORES ═══ -->

    <!-- exhaust glow base -->
    <ellipse cx="27" cy="57" rx="9" ry="3.5" fill="#e85500" opacity="0.25"/>

    <!-- llama exterior (grande, difusa) -->
    <ellipse id="cndor-flame-3" cx="27" cy="53.5" rx="6.5" ry="7"
      fill="url(#sg-flame-out)" filter="url(#sg-glow)"/>

    <!-- llama media -->
    <ellipse id="cndor-flame-2" cx="27" cy="51.5" rx="4.2" ry="5"
      fill="url(#sg-flame-mid)"/>

    <!-- llama interior (núcleo brillante) -->
    <ellipse id="cndor-flame-1" cx="27" cy="49.5" rx="2.2" ry="3"
      fill="url(#sg-flame-core)"/>

    <!-- nozzle principal -->
    <rect x="18" y="43" width="18" height="7" rx="3.5" fill="url(#sg-nozzle)" stroke="#2a2724" stroke-width="0.7"/>
    <!-- reborde superior nozzle -->
    <rect x="20" y="42" width="14" height="3.5" rx="1.8" fill="#787472" stroke="#4a4744" stroke-width="0.5"/>
    <!-- panel lateral nozzle izq -->
    <rect x="15" y="44.5" width="4" height="5" rx="2" fill="#5a5754" stroke="#3a3734" stroke-width="0.5"/>
    <!-- panel lateral nozzle der -->
    <rect x="35" y="44.5" width="4" height="5" rx="2" fill="#5a5754" stroke="#3a3734" stroke-width="0.5"/>
    <!-- detalle tornillos nozzle -->
    <circle cx="21.5" cy="45" r="1" fill="#4a4744"/>
    <circle cx="32.5" cy="45" r="1" fill="#4a4744"/>
    <circle cx="21.5" cy="48" r="1" fill="#4a4744"/>
    <circle cx="32.5" cy="48" r="1" fill="#4a4744"/>

    <!-- ═══ CUERPO ═══ -->

    <!-- cuerpo esférico principal -->
    <ellipse cx="27" cy="27" rx="19" ry="18" fill="url(#sg-body)" stroke="#6a6662" stroke-width="1"/>

    <!-- líneas de panel horizontales -->
    <path d="M9 24 Q27 19.5 45 24" fill="none" stroke="#9a9690" stroke-width="0.55" opacity="0.5"/>
    <path d="M9 30 Q27 34.5 45 30" fill="none" stroke="#9a9690" stroke-width="0.55" opacity="0.5"/>
    <!-- línea vertical central leve -->
    <line x1="27" y1="10" x2="27" y2="44" stroke="#9a9690" stroke-width="0.35" opacity="0.25"/>

    <!-- ═══ OJO ═══ -->

    <!-- housing del ojo (aro exterior) -->
    <circle cx="27" cy="26" r="10" fill="#18140c" stroke="#3a3630" stroke-width="1.2"/>
    <!-- ribete metálico ojo -->
    <circle cx="27" cy="26" r="10" fill="none" stroke="#6a6250" stroke-width="0.5" opacity="0.6"/>

    <!-- iris (con gradiente y parpadeo) -->
    <g id="cndor-eye-group">
      <!-- iris principal -->
      <circle cx="27" cy="26" r="8.2" fill="url(#sg-eye-bg)"/>
      <!-- pupila -->
      <circle cx="27" cy="26" r="3.5" fill="#080400"/>
      <!-- iris pulsante group -->
      <g id="cndor-iris-group">
        <!-- anillos del iris -->
        <circle cx="27" cy="26" r="6" fill="none" stroke="#e87a10" stroke-width="0.5" opacity="0.4"/>
        <circle cx="27" cy="26" r="4.5" fill="none" stroke="#ffcc44" stroke-width="0.3" opacity="0.35"/>
      </g>
      <!-- reflejos oculares -->
      <circle cx="23.5" cy="22.5" r="2.2" fill="#fff" opacity="0.35"/>
      <circle cx="22.5" cy="21.5" r="1"   fill="#fff" opacity="0.6"/>
      <circle cx="30"   cy="29"   r="0.8" fill="#fff" opacity="0.2"/>
    </g>

    <!-- scan ring animado -->
    <circle cx="27" cy="26" r="8" fill="none" stroke="#e87a10" stroke-width="0.7" opacity="0">
      <animate attributeName="r"       from="8"    to="15"  dur="2.8s" repeatCount="indefinite"/>
      <animate attributeName="opacity" from="0.5"  to="0"   dur="2.8s" repeatCount="indefinite"/>
    </circle>
    <!-- segundo scan ring, desfasado -->
    <circle cx="27" cy="26" r="8" fill="none" stroke="#ffcc44" stroke-width="0.4" opacity="0">
      <animate attributeName="r"       from="8"    to="15"  dur="2.8s" begin="1.4s" repeatCount="indefinite"/>
      <animate attributeName="opacity" from="0.3"  to="0"   dur="2.8s" begin="1.4s" repeatCount="indefinite"/>
    </circle>

    <!-- ═══ CAP SUPERIOR ═══ -->

    <ellipse cx="27" cy="11.5" rx="11" ry="4.2" fill="#d4d1cb" stroke="#8a8680" stroke-width="0.8"/>
    <!-- reborde cap -->
    <ellipse cx="27" cy="11" rx="9.5" ry="2.8" fill="none" stroke="#bab7b0" stroke-width="0.4" opacity="0.5"/>

    <!-- ═══ ANTENAS ═══ -->

    <!-- antena izquierda -->
    <line x1="18" y1="14.5" x2="9"  y2="5.5" stroke="#7a7670" stroke-width="1.8" stroke-linecap="round"/>
    <!-- orbe izq -->
    <circle cx="8.5" cy="5" r="3.2" fill="#e87a10" stroke="#804000" stroke-width="0.8" filter="url(#sg-glow)"/>
    <circle cx="8.5" cy="5" r="1.3" fill="#ffe066"/>
    <circle cx="7.2" cy="3.8" r="0.6" fill="#fff" opacity="0.5"/>

    <!-- antena derecha -->
    <line x1="36" y1="14.5" x2="45" y2="5.5" stroke="#7a7670" stroke-width="1.8" stroke-linecap="round"/>
    <!-- orbe der -->
    <circle cx="45.5" cy="5" r="3.2" fill="#e87a10" stroke="#804000" stroke-width="0.8" filter="url(#sg-glow)"/>
    <circle cx="45.5" cy="5" r="1.3" fill="#ffe066"/>
    <circle cx="44.2" cy="3.8" r="0.6" fill="#fff" opacity="0.5"/>

  </svg>`;

  // ── BUILD DOM ────────────────────────────────────────────────────────────────
  function build() {
    const styleEl = document.createElement('style');
    styleEl.textContent = STYLE;
    document.head.appendChild(styleEl);

    const wrap = document.createElement('div');
    wrap.id = 'cndor-wrap';

    wrap.innerHTML = `
      <div id="cndor-bubble">
        <button id="cndor-close-btn" title="Cerrar">✕</button>
        <div id="cndor-bubble-text"></div>
        <div id="cndor-bubble-nav">
          <button id="cndor-prev-btn">← Ant</button>
          <span id="cndor-tip-counter"></span>
          <button id="cndor-next-btn">Sig →</button>
        </div>
      </div>
      <div id="cndor-btn" title="Asistente">
        ${CONDOR_SVG}
        <div id="cndor-dot"></div>
        <div id="cndor-page-tag">${PAGE}</div>
      </div>
    `;

    document.body.appendChild(wrap);

    const btn    = document.getElementById('cndor-btn');
    const bubble = document.getElementById('cndor-bubble');
    const text   = document.getElementById('cndor-bubble-text');
    const counter= document.getElementById('cndor-tip-counter');
    const dot    = document.getElementById('cndor-dot');
    const closeB = document.getElementById('cndor-close-btn');
    const prevB  = document.getElementById('cndor-prev-btn');
    const nextB  = document.getElementById('cndor-next-btn');

    // ── LÓGICA DE BUBBLE ──────────────────────────────────────────────────────

    function typeMessage(msg) {
      text.textContent = '';
      let i = 0;
      const speed = Math.max(18, Math.min(38, Math.floor(1100 / msg.length)));
      const interval = setInterval(() => {
        text.textContent += msg[i++];
        if (i >= msg.length) clearInterval(interval);
      }, speed);
    }

    function showMessage(msg, isGreet) {
      typeMessage(msg);
      counter.textContent = isGreet ? '' : `${tipIndex + 1} / ${ctx.tips.length}`;
      bubble.classList.add('open');
      isOpen = true;
      dot.classList.remove('visible');
    }

    function openGreeting() {
      ensureTips();
      hasGreeted = true;
      tipIndex = 0;
      showMessage(ctx.greeting, true);
      pulse();
    }

    function openTip(idx) {
      ensureTips();
      tipIndex = ((idx % ctx.tips.length) + ctx.tips.length) % ctx.tips.length;
      showMessage(ctx.tips[tipIndex], false);
    }

    function closeBubble() {
      bubble.classList.remove('open');
      isOpen = false;
    }

    function pulse() {
      btn.classList.remove('pulse-ring');
      void btn.offsetWidth;
      btn.classList.add('pulse-ring');
      setTimeout(() => btn.classList.remove('pulse-ring'), 1400);
    }

    function wiggle() {
      btn.classList.remove('wiggle');
      void btn.offsetWidth;
      btn.classList.add('wiggle');
      setTimeout(() => btn.classList.remove('wiggle'), 650);
    }

    btn.addEventListener('click', (e) => {
      if (isDragging) return;
      if (!hasGreeted) {
        openGreeting();
      } else if (isOpen) {
        closeBubble();
      } else {
        openTip(tipIndex);
      }
    });

    closeB.addEventListener('click', (e) => { e.stopPropagation(); closeBubble(); });
    nextB.addEventListener('click', (e) => { e.stopPropagation(); openTip(tipIndex + 1); });
    prevB.addEventListener('click', (e) => { e.stopPropagation(); openTip(tipIndex - 1); });

    // ── IDLE WATCHER ──────────────────────────────────────────────────────────
    function resetIdleTimer() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (!isOpen) { wiggle(); dot.classList.add('visible'); }
        idleTimer = setTimeout(() => {
          if (!isOpen) wiggle();
          resetIdleTimer();
        }, 22000);
      }, 32000);
    }

    ['mousemove','click','keydown','scroll','touchstart'].forEach(ev =>
      document.addEventListener(ev, resetIdleTimer, { passive: true })
    );
    resetIdleTimer();

    // ── AUTO-SALUDO ───────────────────────────────────────────────────────────
    setTimeout(() => { if (!hasGreeted) openGreeting(); }, 1500);

    // Rotar tip dot cada 50s si está cerrado
    setInterval(() => {
      if (!isOpen) {
        ensureTips();
        tipIndex = (tipIndex + 1) % ctx.tips.length;
        dot.classList.add('visible');
      }
    }, 50000);

    // ── DRAG (mouse + touch) ──────────────────────────────────────────────────
    let startX, startY, startRight, startBottom;
    const wrap_ = wrap;

    function getRight()  { return parseInt(wrap_.style.right  || '22', 10); }
    function getBottom() { return parseInt(wrap_.style.bottom || '28', 10); }

    function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

    btn.addEventListener('mousedown', (e) => {
      isDragging = false;
      startX = e.clientX; startY = e.clientY;
      startRight  = getRight();
      startBottom = getBottom();

      function onMove(e2) {
        const dx = e2.clientX - startX, dy = e2.clientY - startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isDragging = true;
        if (!isDragging) return;
        wrap_.style.right  = clamp(startRight  - dx, 8, window.innerWidth  - 82) + 'px';
        wrap_.style.bottom = clamp(startBottom + dy, 8, window.innerHeight - 82) + 'px';
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onUp);
        setTimeout(() => { isDragging = false; }, 60);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
      e.preventDefault();
    });

    btn.addEventListener('touchstart', (e) => {
      isDragging = false;
      const t = e.touches[0];
      startX = t.clientX; startY = t.clientY;
      startRight  = getRight();
      startBottom = getBottom();

      function onTMove(e2) {
        const t2 = e2.touches[0];
        const dx = t2.clientX - startX, dy = t2.clientY - startY;
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) isDragging = true;
        if (!isDragging) return;
        wrap_.style.right  = clamp(startRight  - dx, 8, window.innerWidth  - 82) + 'px';
        wrap_.style.bottom = clamp(startBottom + dy, 8, window.innerHeight - 82) + 'px';
        e2.preventDefault();
      }
      function onTEnd() {
        document.removeEventListener('touchmove', onTMove);
        document.removeEventListener('touchend',  onTEnd);
        setTimeout(() => { isDragging = false; }, 60);
      }
      document.addEventListener('touchmove',  onTMove, { passive: false });
      document.addEventListener('touchend',   onTEnd);
    }, { passive: true });

    // ── OBSERVER: detectar cambios de página (SPA) ────────────────────────────
    // Si el título o la URL cambia, re-analizar tips dinámicos
    let lastPath = location.pathname;
    const observer = new MutationObserver(() => {
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        dynamicTipsLoaded = false;
        setTimeout(ensureTips, 600); // dar tiempo a que cargue el DOM nuevo
      }
    });
    observer.observe(document.body, { childList: true, subtree: false });
  }

  // ── INIT ─────────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }

})();
