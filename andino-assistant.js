/*!
 * Joaco v1.0 — DOM-only, free roaming, irónico, con voz
 * Lee la página, detecta errores HTML/CSS/JS, y se queja de ellos.
 * Uso: <script src="joaco-assistant.js"></script>
 */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     1. LECTURA DEL DOM — el único origen de conocimiento
  ══════════════════════════════════════════════════════════ */

  function readPage() {
    const safe = (el, prop = 'innerText') => {
      try { return (el?.[prop] || '').trim(); } catch { return ''; }
    };

    // Nombre de la página
    const pageTitle = safe(document, 'title') || location.pathname.split('/').pop() || 'esta página';

    // Headings
    const headings = [...document.querySelectorAll('h1,h2,h3,h4')]
      .map(h => safe(h)).filter(t => t.length > 1 && t.length < 80);

    // Navegación
    const navLinks = [...document.querySelectorAll('nav a, [role="navigation"] a, .nav a, .menu a, .sidebar a')]
      .map(a => safe(a)).filter(t => t.length > 1 && t.length < 40);

    // Botones con texto útil
    const buttons = [...document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]')]
      .map(b => safe(b) || b.value || b.getAttribute('aria-label') || '')
      .filter(t => t.length > 1 && t.length < 50)
      .slice(0, 12);

    // Tabs
    const tabs = [...document.querySelectorAll('[role="tab"], .tab, .nav-tab')]
      .map(t => safe(t)).filter(t => t.length > 1 && t.length < 40);

    // Formularios: detectar qué campos tiene
    const inputs = [...document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), textarea, select')]
      .map(i => {
        const label = i.labels?.[0]?.innerText || i.placeholder || i.name || i.getAttribute('aria-label') || '';
        return label.trim();
      }).filter(Boolean).slice(0, 10);

    // Tablas: encabezados de columna
    const tableHeaders = [...document.querySelectorAll('th, thead td')]
      .map(th => safe(th)).filter(t => t.length > 1 && t.length < 40).slice(0, 8);

    // Tarjetas / stat cards: números y etiquetas
    const statCards = [];
    document.querySelectorAll('[class*="card"], [class*="stat"], [class*="kpi"], [class*="metric"]').forEach(card => {
      const nums = [...card.querySelectorAll('p,span,h2,h3')]
        .map(el => safe(el)).filter(t => /\d/.test(t) && t.length < 30);
      if (nums.length) statCards.push(nums[0]);
    });

    // Alertas / badges / notificaciones visibles
    const alerts = [...document.querySelectorAll('[class*="alert"], [class*="badge"], [class*="notif"], [class*="warn"], [class*="error"], [class*="success"]')]
      .map(a => safe(a)).filter(t => t.length > 2 && t.length < 80).slice(0, 4);

    // Listas de items (ul/ol con textos cortos)
    const listItems = [...document.querySelectorAll('li')]
      .map(li => safe(li)).filter(t => t.length > 2 && t.length < 60).slice(0, 8);

    /* ── Detección de errores / code smells ── */
    const errors = [];

    // Imágenes sin alt
    const imgsSinAlt = [...document.querySelectorAll('img')].filter(i => !i.getAttribute('alt'));
    if (imgsSinAlt.length) errors.push(`${imgsSinAlt.length} imagen(s) sin atributo alt — accesibilidad brillando por su ausencia`);

    // Inputs sin label ni aria-label
    const inputsSinLabel = [...document.querySelectorAll('input:not([type="hidden"]):not([type="submit"])')].filter(i =>
      !i.labels?.length && !i.getAttribute('aria-label') && !i.getAttribute('aria-labelledby') && !i.getAttribute('placeholder')
    );
    if (inputsSinLabel.length) errors.push(`${inputsSinLabel.length} input(s) sin label ni placeholder — telepático el usuario, ¿no?`);

    // IDs duplicados
    const allIds = [...document.querySelectorAll('[id]')].map(el => el.id);
    const dupIds = allIds.filter((id, i) => allIds.indexOf(id) !== i);
    if (dupIds.length) errors.push(`IDs duplicados: ${[...new Set(dupIds)].slice(0,3).join(', ')} — el HTML spec llorando`);

    // Botones sin texto ni aria-label
    const btnsSinTexto = [...document.querySelectorAll('button')].filter(b =>
      !b.innerText.trim() && !b.getAttribute('aria-label')
    );
    if (btnsSinTexto.length) errors.push(`${btnsSinTexto.length} botón(es) vacíos sin aria-label — ¿botones fantasma?`);

    // Links sin href o con href="#" vacío
    const linksMalos = [...document.querySelectorAll('a')].filter(a =>
      !a.getAttribute('href') || a.getAttribute('href') === '#'
    );
    if (linksMalos.length) errors.push(`${linksMalos.length} enlace(s) con href vacío o "#" — ¡que lleven a algún lado!`);

    // Inline styles excesivos
    const inlineStyles = [...document.querySelectorAll('[style]')].length;
    if (inlineStyles > 10) errors.push(`${inlineStyles} elementos con style inline — bienvenido al 2003`);

    // Errores en consola (solo los que quedaron en window.__errors si el host los captura)
    if (window.__jqErrors?.length) errors.push(`Errores JS capturados: ${window.__jqErrors[0]}`);

    // Scripts sin defer/async bloqueando el head
    const scriptsBloqueantes = [...document.querySelectorAll('head script:not([defer]):not([async])[src]')].length;
    if (scriptsBloqueantes) errors.push(`${scriptsBloqueantes} script(s) bloqueante(s) en <head> — render blocking, clásico`);

    // Título vacío
    if (!document.title.trim()) errors.push('La página no tiene <title> — ¿incógnito permanente?');

    // Meta description ausente
    if (!document.querySelector('meta[name="description"]')) errors.push('Sin meta description — el SEO ya se fue');

    // Viewport ausente (posible problema mobile)
    if (!document.querySelector('meta[name="viewport"]')) errors.push('Sin meta viewport — ¿diseñando solo para desktop en 2025?');

    return { pageTitle, headings, navLinks, buttons, tabs, inputs, tableHeaders, statCards, alerts, listItems, errors };
  }

  /* ══════════════════════════════════════════════════════════
     2. CONSTRUCCIÓN DE MENSAJES desde lo leído
  ══════════════════════════════════════════════════════════ */

  function buildMessages(data) {
    const { pageTitle, headings, navLinks, buttons, tabs, inputs, tableHeaders, statCards, alerts, listItems, errors } = data;
    const msgs = [];

    // Saludo irónico
    const mainTitle = headings[0] || pageTitle;
    const saludos = [
      `Buenas. Soy Joaco. Estoy en "${mainTitle}", escaneando el desastre… digo, la interfaz.`,
      `Joaco presente. Aparecí en "${mainTitle}". Leí todo. Tengo opiniones.`,
      `"${mainTitle}". Interesante. Veamos qué encontré.`,
    ];
    msgs.push(saludos[Math.floor(Math.random() * saludos.length)]);

    // Errores primero — son lo más importante
    if (errors.length > 0) {
      msgs.push(`Encontré ${errors.length} problema(s). Empezamos bien: ${errors[0]}`);
      errors.slice(1).forEach(e => msgs.push(`Otro regalito: ${e}`));
      msgs.push(`${errors.length === 1 ? 'Solo uno' : `Los ${errors.length}`}, podría ser peor. O no.`);
    } else {
      msgs.push(`Revisé accesibilidad, IDs, labels, scripts… nada roto. Hoy es un buen día.`);
    }

    // Estructura
    if (headings.length > 1) {
      msgs.push(`Las secciones son: ${headings.slice(0, 4).join(', ')}. Al menos están ordenadas.`);
    }

    // Nav
    if (navLinks.length >= 2) {
      msgs.push(`Menú detectado. Opciones: ${navLinks.slice(0, 5).join(', ')}. Elegí una y hacé algo.`);
    }

    // Tabs
    if (tabs.length >= 2) {
      msgs.push(`Pestañas disponibles: ${tabs.join(', ')}. Sí, hay que hacer clic para que funcionen.`);
    }

    // Botones
    if (buttons.length >= 2) {
      const ab = buttons.filter(b => b.length < 35).slice(0, 4);
      if (ab.length) msgs.push(`Botones visibles: ${ab.join(', ')}. Alguno tiene que hacer algo útil.`);
    }

    // Formulario
    if (inputs.length >= 1) {
      msgs.push(inputs.length === 1
        ? `Un solo campo: "${inputs[0]}". Simple. A veces menos es más. A veces es pereza.`
        : `Formulario con ${inputs.length} campos: ${inputs.slice(0, 4).join(', ')}. Completalos todos, no seas vago.`
      );
    }

    // Tabla
    if (tableHeaders.length >= 2) {
      msgs.push(`Tabla con columnas: ${tableHeaders.slice(0, 5).join(', ')}. Los datos son datos.`);
    }

    // Stats
    if (statCards.length >= 1) {
      msgs.push(`Números que veo: ${statCards.slice(0, 3).join(' — ')}. Espero que sean los correctos.`);
    }

    // Alertas
    if (alerts.length >= 1) {
      msgs.push(`Alerta visible: "${alerts[0]}". Sí, leé eso.`);
    }

    // Lista
    if (listItems.length >= 3 && !tableHeaders.length) {
      msgs.push(`Lista con: ${listItems.slice(0, 4).join(', ')}. Fascinante. Para alguien.`);
    }

    if (msgs.length < 3) {
      msgs.push(`Podés arrastrarme a donde quieras. O dejarme acá, también me da.`);
    }

    msgs.push(`Eso es todo lo que encontré. Podés arrastrarme, o hacer clic para repasar.`);

    return msgs;
  }

  /* ══════════════════════════════════════════════════════════
     3. ESTADO GLOBAL
  ══════════════════════════════════════════════════════════ */

  let messages = [];
  let msgIndex = 0;
  let isOpen = false;
  let isDragging = false;
  let hasGreeted = false;

  // Posición en pantalla
  let posX = window.innerWidth  - 96;
  let posY = window.innerHeight - 96;

  // Estado de movimiento libre
  let roamTarget = { x: posX, y: posY };
  let roamVelX = 0, roamVelY = 0;
  let roamPaused = false;    // pausa cuando burbuja abierta o drag
  let lastRoamTime = 0;
  let nextRoamIn = 0;        // ms hasta el próximo destino

  /* ══════════════════════════════════════════════════════════
     4. ESTILOS
  ══════════════════════════════════════════════════════════ */

  const ACCENT = '#e87a10';
  const ACCENT2 = '#ffcc44';

  const STYLE = `
    #_aw {
      position: fixed;
      z-index: 2147483647;
      user-select: none;
      touch-action: none;
      pointer-events: none;
      width: 74px;
      height: 74px;
    }
    #_aw * { pointer-events: auto; }

    #_abub {
      position: absolute;
      bottom: 84px;
      right: 0;
      width: 240px;
      background: #0a0800;
      color: #f0ece0;
      border: 1.5px solid ${ACCENT};
      border-radius: 16px 16px 4px 16px;
      padding: 13px 14px 11px;
      font-size: 12px;
      line-height: 1.6;
      font-family: 'IBM Plex Mono','Courier New',monospace;
      box-shadow: 0 8px 40px rgba(0,0,0,0.7), 0 0 18px ${ACCENT}22;
      opacity: 0;
      transform: translateY(10px) scale(0.94);
      pointer-events: none;
      transition: opacity .2s, transform .2s;
      transform-origin: bottom right;
    }
    #_abub.open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: all;
    }
    #_atxt { margin-bottom: 10px; min-height: 32px; }
    #_anav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid ${ACCENT}28;
      padding-top: 8px;
    }
    #_anav button {
      background: none;
      border: 1px solid ${ACCENT}44;
      color: ${ACCENT};
      border-radius: 6px;
      padding: 3px 9px;
      font-size: 10px;
      font-family: inherit;
      cursor: pointer;
      transition: background .12s;
    }
    #_anav button:hover { background: ${ACCENT}18; }
    #_acnt { font-size: 9px; color: rgba(240,236,224,.28); }
    #_axbtn {
      position: absolute;
      top: 8px; right: 10px;
      background: none; border: none;
      color: rgba(240,236,224,.3);
      font-size: 13px; cursor: pointer;
      line-height: 1; padding: 0;
      font-family: inherit;
      transition: color .12s;
    }
    #_axbtn:hover { color: #fff; }

    #_abtn {
      width: 74px; height: 74px;
      border-radius: 50%;
      background: #0a0800;
      border: 2px solid ${ACCENT};
      cursor: grab;
      display: flex; align-items: center; justify-content: center;
      position: relative;
      box-shadow: 0 4px 20px rgba(0,0,0,0.65), 0 0 14px ${ACCENT}28;
      transition: box-shadow .3s, transform .15s;
      overflow: visible;
    }
    #_abtn:active { cursor: grabbing; }
    #_abtn:hover {
      box-shadow: 0 6px 28px rgba(0,0,0,0.7), 0 0 22px ${ACCENT}44;
      transform: scale(1.06);
    }
    #_abtn.wiggle { animation: _aw-wig 0.55s ease; }
    #_abtn.pulse::after { content: none; }

    #_adot {
      position: absolute; top: 2px; right: 2px;
      width: 10px; height: 10px;
      background: #ff2244;
      border-radius: 50%;
      border: 2px solid #0a0800;
      display: none;
      animation: _aw-dotpulse 1.6s ease-in-out infinite;
    }
    #_adot.on { display: block; }

    @keyframes _aw-wig {
      0%   { transform: rotate(0deg) scale(1.04); }
      20%  { transform: rotate(-10deg) scale(1.08); }
      40%  { transform: rotate(10deg)  scale(1.08); }
      60%  { transform: rotate(-6deg)  scale(1.05); }
      80%  { transform: rotate(5deg)   scale(1.04); }
      100% { transform: rotate(0deg)   scale(1); }
    }
    @keyframes _aw-pulse {
      0%   { opacity: .9; transform: scale(1); }
      100% { opacity: 0;  transform: scale(1.85); }
    }
    @keyframes _aw-dotpulse {
      0%,100% { box-shadow: 0 0 0 0 #ff224488; }
      50%      { box-shadow: 0 0 0 5px #ff224400; }
    }
    @keyframes _aw-float {
      0%,100% { transform: translateY(0px); }
      50%      { transform: translateY(-5px); }
    }
    @keyframes _aw-flame {
      0%,100% { transform: scaleY(1)    scaleX(1);    opacity: .9; }
      25%      { transform: scaleY(1.2)  scaleX(0.88); opacity: 1; }
      50%      { transform: scaleY(0.86) scaleX(1.1);  opacity: .85; }
      75%      { transform: scaleY(1.14) scaleX(0.91); opacity: 1; }
    }
    @keyframes _aw-iris {
      0%,100% { transform: scale(1); }
      50%      { transform: scale(1.13); }
    }
    @keyframes _aw-blink {
      0%,85%,100% { transform: scaleY(1); }
      92%          { transform: scaleY(0.05); }
    }
    @keyframes _aw-scan {
      0%   { opacity: .6; }
      100% { opacity: 0; }
    }
    #_asvg  { animation: _aw-float 3.8s ease-in-out infinite; }
    #_airis { transform-origin: 27px 26px; animation: _aw-iris 3.2s ease-in-out infinite; }
    #_aeye  { transform-origin: 27px 26px; animation: _aw-blink 6.5s ease-in-out infinite; }
    #_af1   { transform-origin: 27px 50px; animation: _aw-flame .21s ease-in-out infinite; }
    #_af2   { transform-origin: 27px 52px; animation: _aw-flame .27s ease-in-out infinite .05s; }
    #_af3   { transform-origin: 27px 49px; animation: _aw-flame .18s ease-in-out infinite .12s; }

  `;

  /* ══════════════════════════════════════════════════════════
     5. SVG — explorador sin brazos, cohete tri-capa, ojo expresivo
  ══════════════════════════════════════════════════════════ */

  const SVG = `
<svg id="_asvg" width="54" height="62" viewBox="0 0 54 62" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="_ag-body" cx="36%" cy="28%" r="66%">
      <stop offset="0%"  stop-color="#f2efe8"/>
      <stop offset="52%" stop-color="#b8b5ae"/>
      <stop offset="100%" stop-color="#767270"/>
    </radialGradient>
    <radialGradient id="_ag-eye" cx="34%" cy="30%" r="62%">
      <stop offset="0%"  stop-color="#ffe566"/>
      <stop offset="38%" stop-color="#e87a10"/>
      <stop offset="78%" stop-color="#a84000"/>
      <stop offset="100%" stop-color="#381200"/>
    </radialGradient>
    <radialGradient id="_ag-noz" cx="50%" cy="18%" r="72%">
      <stop offset="0%"  stop-color="#8a8682"/>
      <stop offset="100%" stop-color="#38352f"/>
    </radialGradient>
    <radialGradient id="_ag-fc" cx="50%" cy="8%" r="80%">
      <stop offset="0%"  stop-color="#ffffff"/>
      <stop offset="28%" stop-color="#ffee88"/>
      <stop offset="100%" stop-color="#ff8800" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="_ag-fm" cx="50%" cy="8%" r="80%">
      <stop offset="0%"  stop-color="#ffcc44"/>
      <stop offset="52%" stop-color="#e85500"/>
      <stop offset="100%" stop-color="#cc2200" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="_ag-fo" cx="50%" cy="8%" r="80%">
      <stop offset="0%"  stop-color="#e84400" stop-opacity=".72"/>
      <stop offset="100%" stop-color="#880000" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- glow base exhaust -->
  <ellipse cx="27" cy="58" rx="9" ry="3" fill="#e85500" opacity=".2"/>

  <!-- llama exterior -->
  <ellipse id="_af3" cx="27" cy="54" rx="6.8" ry="7.2" fill="url(#_ag-fo)"/>
  <!-- llama media -->
  <ellipse id="_af2" cx="27" cy="52" rx="4.4" ry="5.2" fill="url(#_ag-fm)"/>
  <!-- núcleo -->
  <ellipse id="_af1" cx="27" cy="50" rx="2.2" ry="3.2" fill="url(#_ag-fc)"/>

  <!-- nozzle -->
  <rect x="17" y="43" width="20" height="7.5" rx="3.8" fill="url(#_ag-noz)" stroke="#282420" stroke-width=".7"/>
  <rect x="19.5" y="41.5" width="15" height="4" rx="2" fill="#7a7672" stroke="#484440" stroke-width=".5"/>
  <!-- paneles laterales nozzle -->
  <rect x="13" y="44.5" width="5" height="5.5" rx="2.5" fill="#585450" stroke="#383430" stroke-width=".5"/>
  <rect x="36" y="44.5" width="5" height="5.5" rx="2.5" fill="#585450" stroke="#383430" stroke-width=".5"/>
  <!-- tornillos -->
  <circle cx="21" cy="45.5" r="1.1" fill="#484440"/>
  <circle cx="33" cy="45.5" r="1.1" fill="#484440"/>
  <circle cx="21" cy="48.5" r="1.1" fill="#484440"/>
  <circle cx="33" cy="48.5" r="1.1" fill="#484440"/>

  <!-- cuerpo esférico -->
  <ellipse cx="27" cy="27" rx="19.5" ry="18.5" fill="url(#_ag-body)" stroke="#686460" stroke-width="1"/>
  <!-- panel lines -->
  <path d="M8.5 24 Q27 19 45.5 24" fill="none" stroke="#9a9690" stroke-width=".5" opacity=".45"/>
  <path d="M8.5 30 Q27 35 45.5 30" fill="none" stroke="#9a9690" stroke-width=".5" opacity=".45"/>
  <line x1="27" y1="9.5" x2="27" y2="44.5" stroke="#9a9690" stroke-width=".3" opacity=".2"/>

  <!-- housing ojo -->
  <circle cx="27" cy="26" r="10.5" fill="#141008" stroke="#38342e" stroke-width="1.3"/>
  <circle cx="27" cy="26" r="10.5" fill="none" stroke="#6a5f50" stroke-width=".5" opacity=".55"/>

  <!-- ojo con parpadeo -->
  <g id="_aeye">
    <circle cx="27" cy="26" r="8.5" fill="url(#_ag-eye)"/>
    <circle cx="27" cy="26" r="3.8" fill="#060300"/>
    <!-- iris pulsante -->
    <g id="_airis">
      <circle cx="27" cy="26" r="6.2" fill="none" stroke="#e87a10" stroke-width=".55" opacity=".38"/>
      <circle cx="27" cy="26" r="4.8" fill="none" stroke="#ffcc44" stroke-width=".35" opacity=".3"/>
    </g>
    <!-- reflejos -->
    <circle cx="23.2" cy="22.4" r="2.4" fill="#fff" opacity=".32"/>
    <circle cx="22.2" cy="21.4" r="1.1" fill="#fff" opacity=".58"/>
    <circle cx="30.5" cy="29.5" r=".9" fill="#fff" opacity=".18"/>
  </g>

  <!-- cap superior -->
  <ellipse cx="27" cy="11" rx="11.5" ry="4.4" fill="#d2cfc9" stroke="#888480" stroke-width=".8"/>
  <ellipse cx="27" cy="10.5" rx="9.5" ry="2.8" fill="none" stroke="#b8b5ae" stroke-width=".4" opacity=".5"/>

  <!-- antena izq -->
  <line x1="18" y1="14" x2="8.5" y2="5" stroke="#787470" stroke-width="1.8" stroke-linecap="round"/>
  <circle cx="8" cy="4.5" r="3.4" fill="#e87a10" stroke="#7a3e00" stroke-width=".8"/>
  <circle cx="8" cy="4.5" r="1.4" fill="#ffe066"/>
  <circle cx="6.8" cy="3.4" r=".65" fill="#fff" opacity=".5"/>

  <!-- antena der -->
  <line x1="36" y1="14" x2="45.5" y2="5" stroke="#787470" stroke-width="1.8" stroke-linecap="round"/>
  <circle cx="46" cy="4.5" r="3.4" fill="#e87a10" stroke="#7a3e00" stroke-width=".8"/>
  <circle cx="46" cy="4.5" r="1.4" fill="#ffe066"/>
  <circle cx="44.8" cy="3.4" r=".65" fill="#fff" opacity=".5"/>
</svg>`;

  /* ══════════════════════════════════════════════════════════
     6. BUILD DOM
  ══════════════════════════════════════════════════════════ */

  function build() {
    const styleEl = document.createElement('style');
    styleEl.textContent = STYLE;
    document.head.appendChild(styleEl);

    const wrap = document.createElement('div');
    wrap.id = '_aw';
    wrap.style.left = posX + 'px';
    wrap.style.top  = posY + 'px';

    wrap.innerHTML = `
      <div id="_abub">
        <button id="_axbtn" title="Cerrar">✕</button>
        <div id="_atxt"></div>
        <div id="_anav">
          <button id="_aprev">← Ant</button>
          <span id="_acnt"></span>
          <button id="_anext">Sig →</button>
        </div>
      </div>
      <div id="_abtn">${SVG}<div id="_adot"></div></div>
    `;

    document.body.appendChild(wrap);

    const btn   = wrap.querySelector('#_abtn');
    const bub   = wrap.querySelector('#_abub');
    const txt   = wrap.querySelector('#_atxt');
    const cnt   = wrap.querySelector('#_acnt');
    const dot   = wrap.querySelector('#_adot');
    const xbtn  = wrap.querySelector('#_axbtn');
    const pbtn  = wrap.querySelector('#_aprev');
    const nbtn  = wrap.querySelector('#_anext');

    /* ── Voz estilo JARVIS ── */
    function speak(msg) {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      // Limpiar puntos suspensivos y signos irónicos para que suene más limpio
      const clean = msg.replace(/[¡¿…]/g, '').replace(/—/g, ',');
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = 'es-ES'; // es-ES suena más grave que es-AR en la mayoría de motores
      u.rate = 0.88;    // lento, deliberado
      u.pitch = 0.7;    // grave — lo más JARVIS posible
      u.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      // Prioridad: voz masculina española de Google/Microsoft
      const preferred = voices.find(v =>
        v.lang.startsWith('es') && /google|microsoft|jorge|pablo|diego/i.test(v.name)
      ) || voices.find(v => v.lang.startsWith('es')) || null;
      if (preferred) u.voice = preferred;
      window.speechSynthesis.speak(u);
    }

    /* ── Escritura animada ── */
    let typeTimer = null;
    function typeText(msg) {
      clearInterval(typeTimer);
      txt.textContent = '';
      let i = 0;
      const speed = Math.max(16, Math.min(36, Math.floor(900 / msg.length)));
      typeTimer = setInterval(() => {
        txt.textContent += msg[i++];
        if (i >= msg.length) clearInterval(typeTimer);
      }, speed);
    }

    function showMsg(idx, isGreet) {
      if (!messages.length) return;
      msgIndex = ((idx % messages.length) + messages.length) % messages.length;
      typeText(messages[msgIndex]);
      speak(messages[msgIndex]);
      cnt.textContent = isGreet ? '' : `${msgIndex + 1} / ${messages.length}`;
      bub.classList.add('open');
      isOpen = true;
      roamPaused = true;
      dot.classList.remove('on');
    }

    function closeBub() {
      window.speechSynthesis?.cancel();
      bub.classList.remove('open');
      isOpen = false;
      roamPaused = false;
    }

    function pulse() {
      btn.classList.remove('pulse');
      void btn.offsetWidth;
      btn.classList.add('pulse');
      setTimeout(() => btn.classList.remove('pulse'), 1400);
    }

    function wiggle() {
      btn.classList.remove('wiggle');
      void btn.offsetWidth;
      btn.classList.add('wiggle');
      setTimeout(() => btn.classList.remove('wiggle'), 600);
    }

    /* ── Cargar datos del DOM y abrir saludo ── */
    function loadAndGreet() {
      const data = readPage();
      messages = buildMessages(data);
      msgIndex = 0;
      hasGreeted = true;
      showMsg(0, true);
      pulse();
    }

    /* ── Clicks ── */
    btn.addEventListener('click', e => {
      if (isDragging) return;
      if (!hasGreeted) { loadAndGreet(); return; }
      if (isOpen) { closeBub(); } else { showMsg(msgIndex, false); }
    });
    xbtn.addEventListener('click', e => { e.stopPropagation(); closeBub(); });
    nbtn.addEventListener('click', e => { e.stopPropagation(); showMsg(msgIndex + 1, false); });
    pbtn.addEventListener('click', e => { e.stopPropagation(); showMsg(msgIndex - 1, false); });

    /* ── Auto-saludo: carga inmediata al montar ── */
    function tryGreet() {
      if (!hasGreeted) loadAndGreet();
    }
    // Voces pueden no estar listas en el primer render
    if (window.speechSynthesis) {
      if (window.speechSynthesis.getVoices().length) {
        setTimeout(tryGreet, 1400);
      } else {
        window.speechSynthesis.addEventListener('voiceschanged', () => setTimeout(tryGreet, 200), { once: true });
        setTimeout(tryGreet, 1400); // fallback si voiceschanged no llega
      }
    } else {
      setTimeout(tryGreet, 1400);
    }

    /* ── Dot periódico ── */
    setInterval(() => {
      if (!isOpen) { dot.classList.add('on'); wiggle(); }
    }, 40000);

    /* ══════════════════════════════════════════════════════
       7. MOVIMIENTO LIBRE — deambula por la pantalla
    ══════════════════════════════════════════════════════ */

    const SIZE = 74;
    const MARGIN = 14;

    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    function randomTarget() {
      return {
        x: MARGIN + Math.random() * (window.innerWidth  - SIZE - MARGIN * 2),
        y: MARGIN + Math.random() * (window.innerHeight - SIZE - MARGIN * 2)
      };
    }

    /* Pausa entre 4s y 14s, velocidad variable */
    function scheduleNextRoam() {
      nextRoamIn = 4000 + Math.random() * 10000;
      lastRoamTime = performance.now();
      roamTarget = randomTarget();
    }
    scheduleNextRoam();

    /* Física suave: spring damping hacia el target */
    const SPRING = 0.04;   // fuerza del resorte
    const DAMP   = 0.82;   // amortiguamiento
    const THRESH = 2;      // px — se considera "llegado"

    let lastFrame = performance.now();

    function roamFrame(now) {
      requestAnimationFrame(roamFrame);

      const dt = Math.min(now - lastFrame, 50); // cap 50ms
      lastFrame = now;

      if (!roamPaused && !isDragging) {
        // Esperar pausa antes de ir al próximo target
        if (now - lastRoamTime < nextRoamIn) {
          // quieto — aplicar damping para frenar si tenía inercia
          roamVelX *= DAMP;
          roamVelY *= DAMP;
        } else {
          // moverse hacia target
          const dx = roamTarget.x - posX;
          const dy = roamTarget.y - posY;
          roamVelX = roamVelX * DAMP + dx * SPRING;
          roamVelY = roamVelY * DAMP + dy * SPRING;

          // Llegó al destino
          if (Math.abs(dx) < THRESH && Math.abs(dy) < THRESH) {
            scheduleNextRoam();
          }
        }

        posX = clamp(posX + roamVelX * (dt / 16), MARGIN, window.innerWidth  - SIZE - MARGIN);
        posY = clamp(posY + roamVelY * (dt / 16), MARGIN, window.innerHeight - SIZE - MARGIN);
        wrap.style.left = posX + 'px';
        wrap.style.top  = posY + 'px';
      }
    }
    requestAnimationFrame(roamFrame);

    /* ══════════════════════════════════════════════════════
       8. DRAG — mouse + touch (pausa el roam)
    ══════════════════════════════════════════════════════ */

    let dragStartX, dragStartY, dragOriginX, dragOriginY;

    function onDragStart(cx, cy) {
      isDragging = false;
      dragStartX  = cx; dragStartY  = cy;
      dragOriginX = posX; dragOriginY = posY;
      roamPaused = true;
    }

    function onDragMove(cx, cy) {
      const dx = cx - dragStartX, dy = cy - dragStartY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isDragging = true;
      if (!isDragging) return;
      posX = clamp(dragOriginX + dx, MARGIN, window.innerWidth  - SIZE - MARGIN);
      posY = clamp(dragOriginY + dy, MARGIN, window.innerHeight - SIZE - MARGIN);
      wrap.style.left = posX + 'px';
      wrap.style.top  = posY + 'px';
      roamVelX = 0; roamVelY = 0;
    }

    function onDragEnd() {
      setTimeout(() => {
        isDragging = false;
        if (!isOpen) roamPaused = false;
        // Reiniciar roam desde posición actual
        scheduleNextRoam();
      }, 60);
    }

    btn.addEventListener('mousedown', e => {
      onDragStart(e.clientX, e.clientY);
      const mv = e2 => onDragMove(e2.clientX, e2.clientY);
      const up = ()  => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); onDragEnd(); };
      document.addEventListener('mousemove', mv);
      document.addEventListener('mouseup',   up);
      e.preventDefault();
    });

    btn.addEventListener('touchstart', e => {
      const t = e.touches[0];
      onDragStart(t.clientX, t.clientY);
      const mv = e2 => { const t2 = e2.touches[0]; onDragMove(t2.clientX, t2.clientY); e2.preventDefault(); };
      const up = ()  => { document.removeEventListener('touchmove', mv); document.removeEventListener('touchend', up); onDragEnd(); };
      document.addEventListener('touchmove', mv, { passive: false });
      document.addEventListener('touchend',  up);
    }, { passive: true });

    /* ══════════════════════════════════════════════════════
       9. RE-SCAN en SPAs (cambio de ruta)
    ══════════════════════════════════════════════════════ */
    let lastPath = location.pathname;
    const obs = new MutationObserver(() => {
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        hasGreeted = false;
        setTimeout(() => {
          const data = readPage();
          messages = buildMessages(data);
          msgIndex = 0;
          dot.classList.add('on');
          wiggle();
        }, 700);
      }
    });
    obs.observe(document.body, { childList: true, subtree: false });
  }

  /* ══════════════════════════════════════════════════════════
     10. INIT
  ══════════════════════════════════════════════════════════ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }

})();
