/*!
 * Andino Assistant v1.0
 * Cóndor flotante con contexto por página.
 * Uso: <script src="andino-assistant.js" data-page="admin"></script>
 *   Páginas válidas: "admin", "game", "index", "ranking", "login"
 */
(function () {
  'use strict';

  // ── DETECCIÓN DE PÁGINA ──────────────────────────────────────────────────
  function detectPage() {
    const attr = document.currentScript?.getAttribute('data-page');
    if (attr) return attr;
    const path = location.pathname.toLowerCase();
    if (path.includes('admin'))   return 'admin';
    if (path.includes('ranking')) return 'ranking';
    if (path.includes('login'))   return 'login';
    if (path.includes('game') || path.includes('camarero') || path.includes('andino')) return 'game';
    return 'index';
  }

  const PAGE = detectPage();

  // ── CONTEXTO POR PÁGINA ──────────────────────────────────────────────────
  const PAGE_CONTEXT = {
    admin: {
      greeting: '¡Hola, admin! Soy Cóndor, tu asistente.',
      tips: [
        '📊 En el Dashboard podés ver quién estuvo activo esta semana.',
        '📚 En el Banco podés agregar preguntas nuevas de Trivia, Carta o Simulador.',
        '⬇ Con el botón PDF podés exportar todas las preguntas de una sección.',
        '🔥 "Trivia de Hoy" te muestra las preguntas que más fallan los camareros.',
        '🏆 No te olvides de configurar el Premio Quincenal para motivar al equipo.',
        '👤 En Tracking podés ver el historial completo de cada jugador.',
        '📥 Usá la Carga Masiva para subir muchas preguntas en formato JSON de una vez.',
        '🗑 Podés eliminar preguntas sueltas o todas de una sección desde el Banco.',
      ],
      color: '#D4A800',
    },
    game: {
      greeting: '¡Hola! Soy Cóndor. ¡A jugar!',
      tips: [
        '🧠 En la Trivia la primera opción no siempre es la correcta — pensalo bien.',
        '🍽️ Carta pone a prueba tu conocimiento de los platos. ¡Repasá el menú!',
        '🎭 En el Simulador no hay respuesta mala… pero sí hay una mejor.',
        '🔥 Jugá todos los días para mantener tu racha activa.',
        '⚡ Cuanto más rápido respondés, más XP ganás.',
        '🏅 Desbloqueás logros al alcanzar ciertos hitos de XP y racha.',
        '📈 Tu nivel sube con XP — ¿podés llegar a Maître Ejecutivo?',
        '💡 Después de cada respuesta aparece una explicación — leéla, te ayuda.',
      ],
      color: '#1A7A3A',
    },
    ranking: {
      greeting: '¡Mirá dónde estás en el ranking!',
      tips: [
        '🥇 El puesto 1 de la quincena gana el premio especial.',
        '📅 El ranking se reinicia cada 15 días.',
        '🔥 Una buena racha diaria suma XP extra.',
        '🧠 Los mejores jugadores combinan Trivia, Carta y Simulador.',
        '👀 Vigilá la diferencia de XP con el de arriba tuyo.',
      ],
      color: '#4A7AD4',
    },
    login: {
      greeting: '¡Bienvenido a Andino! Ingresá tu DNI para empezar.',
      tips: [
        '🔑 Ingresá tu número de DNI para acceder al juego.',
        '❓ Si tenés problemas para entrar, hablá con tu encargado.',
        '🆕 Primera vez? Solo ingresá tu DNI y el sistema te registra solo.',
      ],
      color: '#D4A800',
    },
    index: {
      greeting: '¡Hola! Soy Cóndor, tu guía en Andino.',
      tips: [
        '🎮 Elegí un módulo para empezar.',
        '📊 El Admin Panel es solo para encargados.',
        '🏆 El Ranking muestra los mejores del período.',
        '❓ Si algo no funciona, recargá la página.',
      ],
      color: '#D4A800',
    },
  };

  const ctx = PAGE_CONTEXT[PAGE] || PAGE_CONTEXT.index;
  let tipIndex = 0;
  let isOpen = false;
  let isDragging = false;
  let dragOffX = 0, dragOffY = 0;
  let idleTimer = null;
  let wiggleTimer = null;
  let hasGreeted = false;

  // ── ESTILOS ──────────────────────────────────────────────────────────────
  const STYLE = `
    #cndor-wrap {
      position: fixed;
      bottom: 28px;
      right: 22px;
      z-index: 99999;
      user-select: none;
      font-family: 'IBM Plex Mono', 'Courier New', monospace;
    }

    /* Bubble */
    #cndor-bubble {
      position: absolute;
      bottom: 86px;
      right: 0;
      width: 240px;
      background: #1A1400;
      color: #FDF8EE;
      border: 1.5px solid ${ctx.color};
      border-radius: 18px 18px 4px 18px;
      padding: 13px 14px 11px;
      font-size: 12px;
      line-height: 1.55;
      box-shadow: 0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(212,168,0,0.08);
      opacity: 0;
      transform: translateY(10px) scale(0.95);
      pointer-events: none;
      transition: opacity .25s ease, transform .25s ease;
      transform-origin: bottom right;
    }
    #cndor-bubble.open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: all;
    }
    #cndor-bubble-text {
      margin-bottom: 10px;
      min-height: 36px;
    }
    #cndor-bubble-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 6px;
      border-top: 1px solid rgba(212,168,0,0.18);
      padding-top: 8px;
      margin-top: 2px;
    }
    #cndor-bubble-nav button {
      background: none;
      border: 1px solid rgba(212,168,0,0.35);
      color: ${ctx.color};
      border-radius: 7px;
      padding: 4px 9px;
      font-size: 10px;
      font-family: inherit;
      cursor: pointer;
      transition: background .15s;
    }
    #cndor-bubble-nav button:hover {
      background: rgba(212,168,0,0.12);
    }
    #cndor-tip-counter {
      font-size: 9px;
      color: rgba(253,248,238,0.35);
    }
    #cndor-close-btn {
      position: absolute;
      top: 8px;
      right: 10px;
      background: none;
      border: none;
      color: rgba(253,248,238,0.4);
      font-size: 14px;
      cursor: pointer;
      line-height: 1;
      padding: 0;
      font-family: inherit;
    }
    #cndor-close-btn:hover { color: #fff; }

    /* Avatar button */
    #cndor-btn {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: #1a1814;
      border: 2px solid #e87a10;
      background: #1A1400;
      border: 2px solid ${ctx.color};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      box-shadow: 0 4px 18px rgba(0,0,0,0.5), 0 0 0 0 ${ctx.color}44;
      transition: box-shadow .3s, transform .2s;
      overflow: visible;
    }
    #cndor-btn:hover {
      transform: scale(1.07);
      box-shadow: 0 6px 24px rgba(0,0,0,0.55), 0 0 0 5px ${ctx.color}22;
    }
    #cndor-btn.wiggle {
      animation: cndor-wiggle 0.55s ease;
    }
    #cndor-btn.pulse-ring::after {
      content: '';
      position: absolute;
      inset: -6px;
      border-radius: 50%;
      border: 2px solid ${ctx.color};
      animation: cndor-pulse 1.2s ease-out forwards;
    }

    /* Dot de notificación */
    #cndor-dot {
      position: absolute;
      top: 1px;
      right: 1px;
      width: 10px;
      height: 10px;
      background: #C8001A;
      border-radius: 50%;
      border: 2px solid #1A1400;
      display: none;
    }
    #cndor-dot.visible { display: block; }

    /* Label de página */
    #cndor-page-tag {
      position: absolute;
      bottom: -18px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 8px;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: ${ctx.color};
      font-family: inherit;
      white-space: nowrap;
      opacity: 0.7;
    }

    @keyframes cndor-wiggle {
      0%   { transform: rotate(0deg) scale(1.05); }
      20%  { transform: rotate(-8deg) scale(1.08); }
      40%  { transform: rotate(8deg) scale(1.08); }
      60%  { transform: rotate(-5deg) scale(1.06); }
      80%  { transform: rotate(4deg) scale(1.05); }
      100% { transform: rotate(0deg) scale(1); }
    }
    @keyframes cndor-pulse {
      0%   { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(1.7); }
    }
    @keyframes cndor-float {
      0%, 100% { transform: translateY(0px); }
      50%       { transform: translateY(-5px); }
    }
    @keyframes cndor-blink {
      0%, 92%, 100% { transform: scaleY(1); }
      96%           { transform: scaleY(0.08); }
    }
    #cndor-bird {
      animation: cndor-float 3.6s ease-in-out infinite;
    }
  `;

  // ── SVG CENTINELA EXPLORADOR (inspirado en NMS Sentinel) ─────────────────
  // Cuerpo esférico gris-blanco, ojo central naranja con scan ring,
  // antenas laterales con orbes, brazos articulados con garras de 3 dedos,
  // propulsor inferior con llama naranja.
  const CONDOR_SVG = `
  <svg id="cndor-bird" width="52" height="58" viewBox="0 0 52 58" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="sg-body" cx="40%" cy="34%" r="62%">
        <stop offset="0%"   stop-color="#edeae4"/>
        <stop offset="55%"  stop-color="#b8b5ae"/>
        <stop offset="100%" stop-color="#7a7874"/>
      </radialGradient>
      <radialGradient id="sg-eye" cx="36%" cy="34%" r="62%">
        <stop offset="0%"   stop-color="#ffcc44"/>
        <stop offset="42%"  stop-color="#e87a10"/>
        <stop offset="100%" stop-color="#5a2400"/>
      </radialGradient>
    </defs>

    <!-- propulsor llama -->
    <ellipse cx="26" cy="53" rx="7" ry="3.5" fill="#e87a10" opacity="0.45"/>
    <ellipse cx="26" cy="51" rx="4" ry="2" fill="#ffcc44" opacity="0.6"/>

    <!-- nozzle -->
    <rect x="20" y="47" width="12" height="5" rx="2.5" fill="#6a6660"/>
    <rect x="22" y="46" width="8" height="3" rx="1.5" fill="#888480"/>

    <!-- cuerpo esférico -->
    <ellipse cx="26" cy="28" rx="18" ry="17" fill="url(#sg-body)" stroke="#7a7672" stroke-width="1"/>

    <!-- líneas de panel -->
    <path d="M9 25 Q26 21 43 25" fill="none" stroke="#9a9690" stroke-width="0.6" opacity="0.55"/>
    <path d="M9 31 Q26 35 43 31" fill="none" stroke="#9a9690" stroke-width="0.6" opacity="0.55"/>

    <!-- housing del ojo -->
    <circle cx="26" cy="27" r="9" fill="#28241e" stroke="#4a4642" stroke-width="1"/>
    <circle cx="26" cy="27" r="7.5" fill="url(#sg-eye)"/>
    <circle cx="26" cy="27" r="4"   fill="#0a0500"/>
    <circle cx="23" cy="24" r="1.8" fill="#fff" opacity="0.4"/>
    <circle cx="22" cy="23" r="0.9" fill="#fff" opacity="0.6"/>

    <!-- scan ring animado -->
    <circle cx="26" cy="27" r="7" fill="none" stroke="#e87a10" stroke-width="0.8" opacity="0">
      <animate attributeName="r"       from="7"   to="13"  dur="2.5s" repeatCount="indefinite"/>
      <animate attributeName="opacity" from="0.55" to="0"  dur="2.5s" repeatCount="indefinite"/>
    </circle>

    <!-- cap superior -->
    <ellipse cx="26" cy="13" rx="10" ry="4" fill="#d4d1cb" stroke="#9a9690" stroke-width="0.8"/>

    <!-- antena izquierda -->
    <line x1="17" y1="16" x2="9" y2="7" stroke="#8a8680" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="8.5" cy="6.5" r="2.8" fill="#e87a10" stroke="#b05800" stroke-width="0.8"/>
    <circle cx="8.5" cy="6.5" r="1.1" fill="#ffcc44"/>

    <!-- antena derecha -->
    <line x1="35" y1="16" x2="43" y2="7" stroke="#8a8680" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="43.5" cy="6.5" r="2.8" fill="#e87a10" stroke="#b05800" stroke-width="0.8"/>
    <circle cx="43.5" cy="6.5" r="1.1" fill="#ffcc44"/>

    <!-- brazo izquierdo -->
    <rect x="3"  y="30" width="11" height="5" rx="2.5" fill="#b0ada8" stroke="#8a8782" stroke-width="0.8"/>
    <circle cx="4" cy="32.5" r="3.2" fill="#9a9793" stroke="#7a7772" stroke-width="0.8"/>
    <!-- garra izq -->
    <path d="M3 32 Q-2 28 -4 24" fill="none" stroke="#5a5752" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M3 32 Q-3 32 -5 30" fill="none" stroke="#5a5752" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M3 32 Q-2 36 -3 39" fill="none" stroke="#5a5752" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="-4" cy="24" r="1.5" fill="#e87a10"/>
    <circle cx="-5" cy="30" r="1.5" fill="#e87a10"/>
    <circle cx="-3" cy="39" r="1.5" fill="#e87a10"/>

    <!-- brazo derecho -->
    <rect x="38" y="30" width="11" height="5" rx="2.5" fill="#b0ada8" stroke="#8a8782" stroke-width="0.8"/>
    <circle cx="48" cy="32.5" r="3.2" fill="#9a9793" stroke="#7a7772" stroke-width="0.8"/>
    <!-- garra der -->
    <path d="M49 32 Q54 28 56 24" fill="none" stroke="#5a5752" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M49 32 Q55 32 57 30" fill="none" stroke="#5a5752" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M49 32 Q54 36 55 39" fill="none" stroke="#5a5752" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="56" cy="24" r="1.5" fill="#e87a10"/>
    <circle cx="57" cy="30" r="1.5" fill="#e87a10"/>
    <circle cx="55" cy="39" r="1.5" fill="#e87a10"/>

  </svg>`;

  // ── BUILD DOM ─────────────────────────────────────────────────────────────
  function build() {
    // Style
    const styleEl = document.createElement('style');
    styleEl.textContent = STYLE;
    document.head.appendChild(styleEl);

    // Wrapper
    const wrap = document.createElement('div');
    wrap.id = 'cndor-wrap';

    // Bubble
    wrap.innerHTML = `
      <div id="cndor-bubble">
        <button id="cndor-close-btn" title="Cerrar">✕</button>
        <div id="cndor-bubble-text"></div>
        <div id="cndor-bubble-nav">
          <button id="cndor-prev-btn">← Anterior</button>
          <span id="cndor-tip-counter"></span>
          <button id="cndor-next-btn">Siguiente →</button>
        </div>
      </div>
      <div id="cndor-btn">
        ${CONDOR_SVG}
        <div id="cndor-dot"></div>
        <div id="cndor-page-tag">${PAGE}</div>
      </div>
    `;

    document.body.appendChild(wrap);

    // Referencias
    const btn    = document.getElementById('cndor-btn');
    const bubble = document.getElementById('cndor-bubble');
    const text   = document.getElementById('cndor-bubble-text');
    const counter= document.getElementById('cndor-tip-counter');
    const dot    = document.getElementById('cndor-dot');
    const closeB = document.getElementById('cndor-close-btn');
    const prevB  = document.getElementById('cndor-prev-btn');
    const nextB  = document.getElementById('cndor-next-btn');

    // ── LÓGICA DE BUBBLE ────────────────────────────────────────────────
    function showMessage(msg, isGreet) {
      text.textContent = msg;
      if (!isGreet) {
        counter.textContent = `${tipIndex + 1} / ${ctx.tips.length}`;
      } else {
        counter.textContent = '';
      }
      bubble.classList.add('open');
      isOpen = true;
      dot.classList.remove('visible');
    }

    function openGreeting() {
      hasGreeted = true;
      tipIndex = 0;
      showMessage(ctx.greeting, true);
      pulse();
    }

    function openTip(idx) {
      tipIndex = ((idx % ctx.tips.length) + ctx.tips.length) % ctx.tips.length;
      showMessage(ctx.tips[tipIndex], false);
    }

    function closeBubble() {
      bubble.classList.remove('open');
      isOpen = false;
    }

    function pulse() {
      btn.classList.remove('pulse-ring');
      void btn.offsetWidth; // reflow
      btn.classList.add('pulse-ring');
      setTimeout(() => btn.classList.remove('pulse-ring'), 1300);
    }

    function wiggle() {
      btn.classList.remove('wiggle');
      void btn.offsetWidth;
      btn.classList.add('wiggle');
      setTimeout(() => btn.classList.remove('wiggle'), 600);
    }

    // Click en botón
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

    closeB.addEventListener('click', closeBubble);
    nextB.addEventListener('click', () => openTip(tipIndex + 1));
    prevB.addEventListener('click', () => openTip(tipIndex - 1));

    // ── IDLE → wiggle + dot ──────────────────────────────────────────────
    function resetIdleTimer() {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (!isOpen) {
          wiggle();
          dot.classList.add('visible');
        }
        idleTimer = setTimeout(() => {
          if (!isOpen) {
            wiggle();
          }
          resetIdleTimer();
        }, 20000);
      }, 30000);
    }

    ['mousemove', 'click', 'keydown', 'scroll', 'touchstart'].forEach(ev =>
      document.addEventListener(ev, resetIdleTimer, { passive: true })
    );
    resetIdleTimer();

    // ── SALUDO AUTOMÁTICO al cargar (1.5s delay) ────────────────────────
    setTimeout(() => {
      if (!hasGreeted) openGreeting();
    }, 1500);

    // Tip rotativo cada 45s si está cerrado
    setInterval(() => {
      if (!isOpen) {
        tipIndex = (tipIndex + 1) % ctx.tips.length;
        dot.classList.add('visible');
      }
    }, 45000);

    // ── DRAG ────────────────────────────────────────────────────────────
    let startX, startY, startRight, startBottom;
    const wrap_ = document.getElementById('cndor-wrap');

    function getRight()  { return parseInt(wrap_.style.right  || '22', 10); }
    function getBottom() { return parseInt(wrap_.style.bottom || '28', 10); }

    btn.addEventListener('mousedown', (e) => {
      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;
      startRight  = getRight();
      startBottom = getBottom();

      function onMove(e2) {
        const dx = e2.clientX - startX;
        const dy = e2.clientY - startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isDragging = true;
        if (!isDragging) return;
        const newRight  = Math.max(10, Math.min(window.innerWidth  - 80, startRight  - dx));
        const newBottom = Math.max(10, Math.min(window.innerHeight - 80, startBottom + dy));
        wrap_.style.right  = newRight  + 'px';
        wrap_.style.bottom = newBottom + 'px';
      }

      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onUp);
        setTimeout(() => { isDragging = false; }, 50);
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
      e.preventDefault();
    });

    // Touch drag
    btn.addEventListener('touchstart', (e) => {
      isDragging = false;
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startRight  = getRight();
      startBottom = getBottom();

      function onTMove(e2) {
        const t2 = e2.touches[0];
        const dx = t2.clientX - startX;
        const dy = t2.clientY - startY;
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) isDragging = true;
        if (!isDragging) return;
        const newRight  = Math.max(10, Math.min(window.innerWidth  - 80, startRight  - dx));
        const newBottom = Math.max(10, Math.min(window.innerHeight - 80, startBottom + dy));
        wrap_.style.right  = newRight  + 'px';
        wrap_.style.bottom = newBottom + 'px';
        e2.preventDefault();
      }

      function onTEnd() {
        document.removeEventListener('touchmove',  onTMove);
        document.removeEventListener('touchend',   onTEnd);
        setTimeout(() => { isDragging = false; }, 50);
      }

      document.addEventListener('touchmove',  onTMove, { passive: false });
      document.addEventListener('touchend',   onTEnd);
    }, { passive: true });
  }

  // ── INIT ─────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }

})();
