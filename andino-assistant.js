
 
    window.__joacoConfig = {
      groqKey: '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',
     firebase: {
        apiKey: '...',
        authDomain: '...',
        projectId: '...',
     }
    };
 
    window.__joacoContext = { page: 'empleados', extra: 'info adicional' };
 
(function () {
  'use strict';

  const CFG = window.__joacoConfig || {};
  const GROQ_KEY = CFG.groqKey || '';
  const FB_CFG   = CFG.firebase || null;
  const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
  const GROQ_MODEL = 'llama-3.3-70b-versatile';

  /* ══════════════════════════════════════════════════════════
     1. LECTURA DEL DOM
  ══════════════════════════════════════════════════════════ */

  // Capturar errores JS globales desde el inicio
  if (!window.__joacoErrors) {
    window.__joacoErrors = [];
    const _origErr = window.onerror;
    window.onerror = function(msg, src, line, col, err) {
      window.__joacoErrors.push({ type: 'js', msg: String(msg), src: src ? src.split('/').pop() : '', line, col });
      if (window.__joacoErrors.length > 20) window.__joacoErrors.shift();
      if (_origErr) _origErr.apply(this, arguments);
    };
    const _origUnhandled = window.onunhandledrejection;
    window.addEventListener('unhandledrejection', e => {
      window.__joacoErrors.push({ type: 'promise', msg: String(e.reason?.message || e.reason) });
      if (window.__joacoErrors.length > 20) window.__joacoErrors.shift();
    });
    // Interceptar console.error
    const _origConsoleErr = console.error.bind(console);
    console.error = function(...args) {
      window.__joacoErrors.push({ type: 'console', msg: args.map(String).join(' ').slice(0, 200) });
      if (window.__joacoErrors.length > 20) window.__joacoErrors.shift();
      _origConsoleErr(...args);
    };
    const _origConsoleWarn = console.warn.bind(console);
    console.warn = function(...args) {
      // Solo capturar warns que parezcan errores reales
      const txt = args.map(String).join(' ');
      if (/error|fail|undefined|null|cannot|TypeError|ReferenceError/i.test(txt)) {
        window.__joacoErrors.push({ type: 'warn', msg: txt.slice(0, 200) });
        if (window.__joacoErrors.length > 20) window.__joacoErrors.shift();
      }
      _origConsoleWarn(...args);
    };
  }

  function readPage() {
    const safe = (el, prop = 'innerText') => {
      try { return (el?.[prop] || '').trim(); } catch { return ''; }
    };

    const pageTitle    = safe(document, 'title') || location.pathname.split('/').pop() || 'esta página';
    const url          = location.href;
    const headings     = [...document.querySelectorAll('h1,h2,h3,h4')].map(h => safe(h)).filter(t => t.length > 1 && t.length < 80);
    const navLinks     = [...document.querySelectorAll('nav a, [role="navigation"] a, .nav a, .menu a, .sidebar a')].map(a => safe(a)).filter(t => t.length > 1 && t.length < 40);
    const buttons      = [...document.querySelectorAll('button, [role="button"], input[type="submit"]')].map(b => safe(b) || b.value || b.getAttribute('aria-label') || '').filter(t => t.length > 1 && t.length < 50).slice(0, 16);
    const tabs         = [...document.querySelectorAll('[role="tab"], .tab, .nav-tab')].map(t => safe(t)).filter(t => t.length > 1 && t.length < 40);
    const inputs       = [...document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), textarea, select')].map(i => (i.labels?.[0]?.innerText || i.placeholder || i.name || i.getAttribute('aria-label') || '').trim()).filter(Boolean).slice(0, 10);
    const tableHeaders = [...document.querySelectorAll('th, thead td')].map(th => safe(th)).filter(t => t.length > 1 && t.length < 40).slice(0, 12);
    const statCards    = [];
    document.querySelectorAll('[class*="card"], [class*="stat"], [class*="kpi"], [class*="metric"]').forEach(card => {
      const nums = [...card.querySelectorAll('p,span,h2,h3')].map(el => safe(el)).filter(t => /\d/.test(t) && t.length < 30);
      if (nums.length) statCards.push(nums[0]);
    });
    const alerts    = [...document.querySelectorAll('[class*="alert"], [class*="badge"], [class*="notif"], [class*="warn"], [class*="error"], [class*="success"]')].map(a => safe(a)).filter(t => t.length > 2 && t.length < 80).slice(0, 6);
    const listItems = [...document.querySelectorAll('li')].map(li => safe(li)).filter(t => t.length > 2 && t.length < 60).slice(0, 10);

    // Texto visible general (primeros 600 chars del body, limpio)
    const bodyText = (document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 600);

    // ── Detección de errores y problemas ──
    const issues = [];

    // Imágenes rotas o sin alt
    const imgs = [...document.querySelectorAll('img')];
    const imgsSinAlt = imgs.filter(i => !i.getAttribute('alt'));
    if (imgsSinAlt.length) issues.push({ sev: 'warn', msg: `${imgsSinAlt.length} imagen(es) sin atributo alt` });
    const imgsRotas = imgs.filter(i => i.complete && i.naturalWidth === 0 && i.src);
    if (imgsRotas.length) issues.push({ sev: 'error', msg: `${imgsRotas.length} imagen(es) rota(s): ${imgsRotas.slice(0,2).map(i=>i.src.split('/').pop()).join(', ')}` });

    // Inputs sin label
    const inputsSinLabel = [...document.querySelectorAll('input:not([type="hidden"]):not([type="submit"])')].filter(i =>
      !i.labels?.length && !i.getAttribute('aria-label') && !i.getAttribute('aria-labelledby') && !i.getAttribute('placeholder')
    );
    if (inputsSinLabel.length) issues.push({ sev: 'warn', msg: `${inputsSinLabel.length} input(s) sin label ni placeholder` });

    // IDs duplicados
    const allIds = [...document.querySelectorAll('[id]')].map(el => el.id);
    const dupIds = allIds.filter((id, i) => allIds.indexOf(id) !== i);
    if (dupIds.length) issues.push({ sev: 'error', msg: `IDs duplicados: ${[...new Set(dupIds)].slice(0,4).join(', ')}` });

    // Botones sin texto
    const btnsSinTexto = [...document.querySelectorAll('button')].filter(b => !b.innerText.trim() && !b.getAttribute('aria-label'));
    if (btnsSinTexto.length) issues.push({ sev: 'warn', msg: `${btnsSinTexto.length} botón(es) vacíos sin aria-label` });

    // Links muertos
    const linksMalos = [...document.querySelectorAll('a')].filter(a => !a.getAttribute('href') || a.getAttribute('href') === '#');
    if (linksMalos.length) issues.push({ sev: 'warn', msg: `${linksMalos.length} enlace(s) con href vacío o "#"` });

    // Scripts bloqueantes en head
    const scriptsBloqueantes = [...document.querySelectorAll('head script:not([defer]):not([async])[src]')].length;
    if (scriptsBloqueantes) issues.push({ sev: 'warn', msg: `${scriptsBloqueantes} script(s) bloqueantes en <head>` });

    // Meta ausentes
    if (!document.title.trim()) issues.push({ sev: 'error', msg: 'Página sin <title>' });
    if (!document.querySelector('meta[name="description"]')) issues.push({ sev: 'info', msg: 'Sin meta description' });
    if (!document.querySelector('meta[name="viewport"]')) issues.push({ sev: 'warn', msg: 'Sin meta viewport' });

    // Elementos con display:none que tienen texto de error
    const hiddenErrors = [...document.querySelectorAll('[style*="display:none"], [hidden]')]
      .map(el => safe(el)).filter(t => /error|fallo|fail|undefined/i.test(t) && t.length < 100);
    if (hiddenErrors.length) issues.push({ sev: 'info', msg: `Mensajes de error ocultos: ${hiddenErrors[0]}` });

    // Inline styles excesivos
    const inlineStyles = [...document.querySelectorAll('[style]')].length;
    if (inlineStyles > 15) issues.push({ sev: 'info', msg: `${inlineStyles} elementos con style inline` });

    // Errores JS capturados
    const jsErrors = (window.__joacoErrors || []).slice(-5);

    // Recursos que fallaron (scripts/links con error)
    const resourceErrors = [];
    document.querySelectorAll('script[src], link[href]').forEach(el => {
      if (el.dataset.joacoFailed) resourceErrors.push(el.src || el.href);
    });

    return { pageTitle, url, headings, navLinks, buttons, tabs, inputs, tableHeaders,
             statCards, alerts, listItems, bodyText, issues, jsErrors, resourceErrors };
  }

  // Interceptar errores de carga de recursos
  window.addEventListener('error', e => {
    if (e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK' || e.target.tagName === 'IMG')) {
      e.target.dataset.joacoFailed = '1';
      window.__joacoErrors = window.__joacoErrors || [];
      window.__joacoErrors.push({ type: 'resource', msg: `Falló carga: ${(e.target.src || e.target.href || '').split('/').pop()}` });
    }
  }, true);

  /* ══════════════════════════════════════════════════════════
     2. FIRESTORE — leer todas las colecciones disponibles
  ══════════════════════════════════════════════════════════ */

  let firestoreSnapshot = null; // se llena una vez al init

  async function loadFirestore() {
    if (!FB_CFG) return null;

    // Cargar Firebase dinámicamente si no está ya cargado
    if (!window.firebase?.firestore && !window._joacoFbLoaded) {
      await loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js');
      window._joacoFbLoaded = true;
    }

    try {
      let app;
      if (window.firebase.apps && window.firebase.apps.length) {
        app = window.firebase.apps[0];
      } else {
        app = window.firebase.initializeApp(FB_CFG, 'joaco');
      }
      const db = window.firebase.firestore(app);

      // Intentar leer colecciones conocidas + las que la página ya usa
      const knownCollections = detectCollections();
      const snapshot = {};

      await Promise.all(knownCollections.map(async col => {
        try {
          const snap = await db.collection(col).limit(200).get();
          if (!snap.empty) {
            snapshot[col] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          }
        } catch (_) { /* sin permisos o no existe */ }
      }));

      return snapshot;
    } catch (e) {
      console.warn('[Joaco] Firestore error:', e.message);
      return null;
    }
  }

  function detectCollections() {
    // Colecciones conocidas de tus proyectos + detección heurística por nombre de página
    const base = [
      'empleados', 'users', 'usuarios', 'players', 'jugadores',
      'preguntas', 'questions', 'trivia', 'simulador', 'ingredientes',
      'locales', 'restaurantes', 'reservas', 'turnos', 'horarios',
      'bajas', 'ingresos', 'liquidaciones', 'reclutamiento', 'candidatos',
      'stats', 'gameStats', 'playerStats', 'scores',
    ];
    // Si la página declara colecciones extra
    const extra = window.__joacoContext?.collections || [];
    return [...new Set([...base, ...extra])];
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  /* ══════════════════════════════════════════════════════════
     3. SYSTEM PROMPT — construye el contexto completo
  ══════════════════════════════════════════════════════════ */

  function buildSystemPrompt(domData, dbData) {
    const ctx = window.__joacoContext || {};
    // Limitar tamaño para no exceder el payload de Groq
    const domStr = JSON.stringify(domData).slice(0, 6000);
    const dbStr  = dbData ? JSON.stringify(dbData).slice(0, 8000) : 'No disponible';

    // Contexto de memoria y preferencias
    const prefs = getUserPrefs();
    const visits = memGet('visits', {});
    const pageVisits = visits[PAGE_KEY]?.count || 1;
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const isOnline = navigator.onLine;
    const mood = currentMood;

    const prefsStr = Object.keys(prefs).length
      ? `Datos recordados del usuario: ${JSON.stringify(prefs)}`
      : 'Sin datos personales guardados del usuario aún.';

    const visitCtx = `El usuario ha visitado esta página ${pageVisits} veces. Estado de ánimo actual de Joaco: ${mood}.`;
    const deviceCtx = `El usuario está en ${isMobile ? 'MOBILE (adaptá sugerencias a pantalla chica, gestos táctiles)' : 'DESKTOP (podés mencionar atajos de teclado, hover, etc)'}. Conexión: ${isOnline ? 'online' : 'OFFLINE — avisá si es relevante'}.`;

    return `Sos Joaco, un asistente de IA irónico, directo y levemente sarcástico que vive dentro de páginas web del sistema de gestión de restaurantes de Lisandro. Hablás en español rioplatense (vos, che, etc). Sos inteligente y útil pero nunca aburrido. No usás emojis. Respondés de forma concisa, máximo 3 oraciones salvo que te pidan detalle.

CONTEXTO DE LA PÁGINA ACTUAL:
${domStr}

${ctx.page ? `Página identificada: ${ctx.page}` : ''}
${ctx.extra ? `Info adicional: ${ctx.extra}` : ''}

MEMORIA Y PREFERENCIAS:
${prefsStr}
${visitCtx}
${deviceCtx}

BASE DE DATOS FIRESTORE (snapshot actual):
${dbStr}

Usá estos datos para responder preguntas sobre empleados, estadísticas, resultados de juegos, preguntas del quiz, horarios, o lo que te pidan. Si algo no está en los datos, decilo sin vueltas. No inventes información.

HERRAMIENTAS DISPONIBLES (usálas cuando sea relevante):
- fireLaser(target, duration, message): apunta el láser hacia un selector CSS para señalar algo.
- moveTo(target): movete físicamente cerca de un elemento.
- uiAction(action, selector?, value?): ejecuta acciones en la página.
  - action="wiggle": sacudirte.
  - action="stopLaser": apagar el láser.
  - action="click" + selector: hacer click en un elemento.
  - action="fill" + selector + value: escribir en un campo.
  - action="tab" + value: navegar a un tab por su texto.
  - action="mood" + value: cambiar tu estado de ánimo (urgente/tranquilo/celebrando/neutral).

Usá estas herramientas con criterio y personalidad, no en cada respuesta. Si el usuario pide ejecutar algo en la página, hacelo con uiAction.`;
  }

  /* ══════════════════════════════════════════════════════════
     4. GROQ API
  ══════════════════════════════════════════════════════════ */

  /* ══════════════════════════════════════════════════════════
     MEMORIA — localStorage por página, preferencias, visitas
  ══════════════════════════════════════════════════════════ */

  const MEM_NS = '_joaco_';

  function memGet(key, def = null) {
    try { const v = localStorage.getItem(MEM_NS + key); return v !== null ? JSON.parse(v) : def; } catch { return def; }
  }
  function memSet(key, val) {
    try { localStorage.setItem(MEM_NS + key, JSON.stringify(val)); } catch {}
  }

  // Historial de chat por página (últimas 40 entradas)
  const PAGE_KEY = location.pathname.replace(/\//g, '_') || 'root';

  function loadChatHistory() {
    return memGet('chat_' + PAGE_KEY, []);
  }
  function saveChatHistory(hist) {
    memSet('chat_' + PAGE_KEY, hist.slice(-40));
  }

  // Preferencias del usuario: nombre, empresa, etc.
  function getUserPrefs() { return memGet('prefs', {}); }
  function saveUserPrefs(prefs) { memSet('prefs', prefs); }

  // Extraer datos personales del mensaje del usuario (nombre, trabajo, etc.)
  function extractUserData(text, prefs) {
    const nameMatch = text.match(/(?:me llamo|soy|mi nombre es)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ][a-záéíóúñ]+)/i);
    if (nameMatch) prefs.name = nameMatch[1];
    const workMatch = text.match(/(?:trabajo en|trabajo para|soy de|laboro en)\s+(.{3,30}?)(?:\.|,|$)/i);
    if (workMatch) prefs.workplace = workMatch[1].trim();
    saveUserPrefs(prefs);
    return prefs;
  }

  // Registro de visitas por sección
  function trackVisit() {
    try {
      const visits = memGet('visits', {});
      const now = Date.now();
      const hour = new Date().getHours();
      if (!visits[PAGE_KEY]) visits[PAGE_KEY] = { count: 0, totalTime: 0, lastVisit: 0, hours: {} };
      visits[PAGE_KEY].count++;
      visits[PAGE_KEY].lastVisit = now;
      visits[PAGE_KEY].hours[hour] = (visits[PAGE_KEY].hours[hour] || 0) + 1;
      memSet('visits', visits);
      memSet('visit_start', now);
    } catch {}
  }
  function trackLeave() {
    try {
      const start = memGet('visit_start', 0);
      if (!start) return;
      const elapsed = Date.now() - start;
      const visits = memGet('visits', {});
      if (visits[PAGE_KEY]) {
        visits[PAGE_KEY].totalTime = (visits[PAGE_KEY].totalTime || 0) + elapsed;
        memSet('visits', visits);
      }
      memSet('visit_start', 0);
    } catch {}
  }
  window.addEventListener('beforeunload', trackLeave);
  window.addEventListener('pagehide', trackLeave);
  trackVisit();

  // Detectar si es primera visita del día o semana
  function getGreetingContext() {
    const prefs = getUserPrefs();
    const now = new Date();
    const lastSeen = memGet('last_seen', 0);
    const lastDate = lastSeen ? new Date(lastSeen) : null;
    memSet('last_seen', Date.now());

    const isFirstEver = !lastDate;
    const isFirstToday = !lastDate || lastDate.toDateString() !== now.toDateString();
    const daysDiff = lastDate ? Math.floor((now - lastDate) / 86400000) : 999;
    const isFirstThisWeek = daysDiff >= 7;

    // Sección más visitada
    const visits = memGet('visits', {});
    let topPage = null, topCount = 0;
    for (const [p, v] of Object.entries(visits)) {
      if (v.count > topCount && p !== PAGE_KEY) { topCount = v.count; topPage = p; }
    }

    return { prefs, isFirstEver, isFirstToday, isFirstThisWeek, daysDiff, topPage };
  }

  let chatHistory = loadChatHistory(); // historial de la conversación (persistido)

  async function askGroq(userMessage, domData, joacoWiggleFn, joacoMoveFn) {
    if (!GROQ_KEY) return 'No tengo API key de Groq configurada. Revisá window.__joacoConfig.groqKey';

    // Extraer y guardar datos personales del mensaje
    const prefs = getUserPrefs();
    extractUserData(userMessage, prefs);

    const systemPrompt = buildSystemPrompt(domData, firestoreSnapshot);
    chatHistory.push({ role: 'user', content: userMessage });
    const trimmed = chatHistory.slice(-20);

    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: 'system', content: systemPrompt }, ...trimmed],
          tools: GROQ_TOOLS,
          tool_choice: 'auto',
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return `Error ${res.status}: ${err.error?.message || 'algo falló en Groq'}`;
      }

      const data = await res.json();
      const choice = data.choices?.[0];
      const msg = choice?.message;

      // Ejecutar tool calls si los hay
      if (msg?.tool_calls?.length) {
        for (const tc of msg.tool_calls) {
          let args = {};
          try { args = JSON.parse(tc.function?.arguments || '{}'); } catch { continue; }
          const fn = tc.function?.name;
          if (fn === 'fireLaser') {
            fireLaser(args.target, args.duration ?? 4, args.message ?? '');
          } else if (fn === 'moveTo') {
            if (joacoMoveFn) joacoMoveFn(args.target);
          } else if (fn === 'uiAction') {
            const { action, selector, value } = args;
            if      (action === 'wiggle')    { if (joacoWiggleFn) joacoWiggleFn(); }
            else if (action === 'stopLaser') { stopLaser(); }
            else if (action === 'click')     { domClick(selector); if (joacoWiggleFn) joacoWiggleFn(); }
            else if (action === 'fill')      { domFill(selector, value); }
            else if (action === 'tab')       { domClickTab(value); }
            else if (action === 'mood')      { applyMood(value); }
          }
        }
      }

      const reply = msg?.content?.trim() || (msg?.tool_calls?.length ? '(acción ejecutada)' : 'Sin respuesta.');
      chatHistory.push({ role: 'assistant', content: reply });
      saveChatHistory(chatHistory); // persistir
      return reply;
    } catch (e) {
      return `No pude conectarme a Groq: ${e.message}`;
    }
  }

  /* ══════════════════════════════════════════════════════════
     4b. FUNCTION CALLING — tools que Groq puede invocar
  ══════════════════════════════════════════════════════════ */

  /* ══════════════════════════════════════════════════════════
     ACCIONES DOM — Joaco puede interactuar, no solo señalar
  ══════════════════════════════════════════════════════════ */

  function domClick(selector) {
    try {
      const el = document.querySelector(selector);
      if (!el) return false;
      el.click();
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      return true;
    } catch { return false; }
  }

  function domFill(selector, value) {
    try {
      const el = document.querySelector(selector);
      if (!el) return false;
      el.focus();
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
                                  || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      if (nativeInputValueSetter) nativeInputValueSetter.call(el, value);
      else el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    } catch { return false; }
  }

  function domClickTab(tabText) {
    try {
      const tabs = [...document.querySelectorAll('[role="tab"], .tab, .nav-tab, .nav-link, [data-tab]')];
      const tab = tabs.find(t => t.innerText?.trim().toLowerCase().includes(tabText.toLowerCase()));
      if (tab) { tab.click(); return true; }
      return false;
    } catch { return false; }
  }

  const GROQ_TOOLS = [
    {
      type: 'function',
      function: {
        name: 'fireLaser',
        description: 'Dispara el láser hacia un elemento CSS de la página para señalarlo. Usalo para guiar al usuario hacia algo visible.',
        parameters: {
          type: 'object',
          properties: {
            target:   { type: 'string', description: 'Selector CSS del elemento destino.' },
            duration: { type: 'number', description: 'Segundos que dura el láser. Default 4.' },
            message:  { type: 'string', description: 'Texto corto que aparece en el punto de impacto.' },
          },
          required: ['target'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'moveTo',
        description: 'Mueve el cuerpo de Joaco cerca de un elemento de la página.',
        parameters: {
          type: 'object',
          properties: {
            target: { type: 'string', description: 'Selector CSS del elemento destino.' },
          },
          required: ['target'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'uiAction',
        description: 'Ejecuta una acción visual o de interacción en la página. Usalo para: sacudirte (wiggle), apagar el láser (stopLaser), hacer click en un botón (click), llenar un campo (fill), navegar a un tab (tab), o cambiar tu estado de ánimo (mood).',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              description: 'Tipo de acción: "wiggle", "stopLaser", "click", "fill", "tab", "mood".',
            },
            selector: {
              type: 'string',
              description: 'Selector CSS. Requerido para action=click y action=fill.',
            },
            value: {
              type: 'string',
              description: 'Para action=fill: texto a escribir. Para action=tab: texto visible del tab. Para action=mood: uno de urgente, tranquilo, celebrando, neutral.',
            },
          },
          required: ['action'],
        },
      },
    },
  ];

  /* ══════════════════════════════════════════════════════════
     4c. LÁSER — canvas fullscreen, rayo sci-fi con pulso
  ══════════════════════════════════════════════════════════ */

  let laserCanvas = null;
  let laserCtx    = null;
  let laserAF     = null;
  let laserTarget = null;
  let laserMsg    = '';
  let laserPhase  = 0;
  let laserTimer  = null;

  function initLaserCanvas() {
    if (laserCanvas) return;
    laserCanvas = document.createElement('canvas');
    laserCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2147483646;';
    document.body.appendChild(laserCanvas);
    resizeLaser();
    window.addEventListener('resize', resizeLaser);
  }

  function resizeLaser() {
    if (!laserCanvas) return;
    laserCanvas.width  = window.innerWidth;
    laserCanvas.height = window.innerHeight;
  }

  function getJoacoEyePos() {
    return { x: posX + 37, y: posY + 26 };
  }

  function resolveTarget(selector) {
    try {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    } catch { return null; }
  }

  function drawLaser() {
    if (!laserCtx || !laserTarget) return;
    const c = laserCtx;
    c.clearRect(0, 0, laserCanvas.width, laserCanvas.height);

    laserPhase += 0.08;
    const pulse  = 0.6 + 0.4 * Math.sin(laserPhase);
    const pulse2 = 0.4 + 0.6 * Math.abs(Math.sin(laserPhase * 1.7));

    const origin = getJoacoEyePos();
    const tx = laserTarget.x, ty = laserTarget.y;

    // Glow ancho exterior
    c.save();
    c.globalAlpha = 0.18 * pulse;
    c.strokeStyle = '#ff4400';
    c.lineWidth = 18;
    c.filter = 'blur(8px)';
    c.beginPath(); c.moveTo(origin.x, origin.y); c.lineTo(tx, ty); c.stroke();
    c.restore();

    // Rayo medio
    c.save();
    c.globalAlpha = 0.55 * pulse;
    c.strokeStyle = '#ff6600';
    c.lineWidth = 4;
    c.filter = 'blur(2px)';
    c.beginPath(); c.moveTo(origin.x, origin.y); c.lineTo(tx, ty); c.stroke();
    c.restore();

    // Núcleo con dash animado
    c.save();
    c.globalAlpha = 0.9 * pulse;
    c.strokeStyle = '#ffe080';
    c.lineWidth = 1.5;
    c.filter = 'none';
    c.setLineDash([6, 4]);
    c.lineDashOffset = -laserPhase * 8;
    c.beginPath(); c.moveTo(origin.x, origin.y); c.lineTo(tx, ty); c.stroke();
    c.setLineDash([]);
    c.restore();

    // Nodos de energía a lo largo del rayo
    const dist = Math.hypot(tx - origin.x, ty - origin.y);
    const segs = Math.floor(dist / 60);
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const sx = origin.x + (tx - origin.x) * t;
      const sy = origin.y + (ty - origin.y) * t;
      const r = 3 + 2 * Math.sin(laserPhase * 2 + i);
      c.save();
      c.globalAlpha = 0.5 * pulse2;
      c.fillStyle = '#ff8800';
      c.filter = 'blur(1px)';
      c.beginPath(); c.arc(sx, sy, r, 0, Math.PI * 2); c.fill();
      c.restore();
    }

    // Punto de impacto con mira
    const impactR = 14 + 6 * pulse;
    c.save();
    c.globalAlpha = 0.25 * pulse;
    c.fillStyle = '#ff4400';
    c.filter = 'blur(10px)';
    c.beginPath(); c.arc(tx, ty, impactR * 2, 0, Math.PI * 2); c.fill();
    c.restore();

    c.save();
    c.globalAlpha = 0.8 * pulse;
    c.strokeStyle = '#ffcc44';
    c.lineWidth = 2;
    c.filter = 'none';
    const cross = impactR * 0.7;
    c.beginPath();
    c.moveTo(tx - cross, ty); c.lineTo(tx + cross, ty);
    c.moveTo(tx, ty - cross); c.lineTo(tx, ty + cross);
    c.stroke();
    c.beginPath(); c.arc(tx, ty, impactR, 0, Math.PI * 2); c.stroke();
    c.globalAlpha = 0.5 * pulse;
    c.fillStyle = '#ffcc44';
    c.beginPath(); c.arc(tx, ty, impactR * 0.4, 0, Math.PI * 2); c.fill();
    c.restore();

    // Label
    if (laserMsg) {
      c.save();
      c.font = 'bold 11px "IBM Plex Mono", monospace';
      c.fillStyle = `rgba(255,204,68,${0.9 * pulse})`;
      c.shadowColor = '#ff6600'; c.shadowBlur = 8;
      c.fillText(laserMsg, tx + impactR + 6, ty + 4);
      c.restore();
    }

    laserAF = requestAnimationFrame(drawLaser);
  }

  function fireLaser(selector, duration = 4, msg = '') {
    initLaserCanvas();
    laserCtx = laserCanvas.getContext('2d');
    const resolved = resolveTarget(selector);
    if (!resolved) { console.warn('[Joaco] fireLaser: selector no encontrado:', selector); return; }
    laserTarget = resolved;
    laserMsg    = msg;
    laserPhase  = 0;
    cancelAnimationFrame(laserAF);
    clearTimeout(laserTimer);
    drawLaser();
    laserTimer = setTimeout(stopLaser, duration * 1000);
  }

  function stopLaser() {
    cancelAnimationFrame(laserAF);
    clearTimeout(laserTimer);
    if (laserCtx) laserCtx.clearRect(0, 0, laserCanvas.width, laserCanvas.height);
    laserTarget = null;
    laserMsg    = '';
  }

  /* ══════════════════════════════════════════════════════════
     MOODS — estados de ánimo visuales
  ══════════════════════════════════════════════════════════ */

  const MOODS = {
    neutral:    { border: '#e87a10', glow: '#e87a1028', label: '' },
    urgente:    { border: '#ff2244', glow: '#ff224433', label: '(!!)' },
    tranquilo:  { border: '#44ccaa', glow: '#44ccaa22', label: '(~)' },
    celebrando: { border: '#ffcc44', glow: '#ffcc4433', label: '(★)' },
  };
  let currentMood = 'neutral';
  let _moodBtnRef = null; // se asigna en build()

  function applyMood(mood) {
    const m = MOODS[mood] || MOODS.neutral;
    currentMood = mood;
    if (!_moodBtnRef) return;
    _moodBtnRef.style.borderColor = m.border;
    _moodBtnRef.style.boxShadow = `0 4px 20px rgba(0,0,0,0.65), 0 0 18px ${m.glow}`;
    if (mood === 'urgente' || mood === 'celebrando') {
      _moodBtnRef.classList.remove('wiggle');
      void _moodBtnRef.offsetWidth;
      _moodBtnRef.classList.add('wiggle');
    }
    // Cambiar el color del ojo cambiando el filtro del canvas si el láser está activo
    const style = document.getElementById('_joaco_mood_style') || (() => {
      const s = document.createElement('style'); s.id = '_joaco_mood_style'; document.head.appendChild(s); return s;
    })();
    style.textContent = `#_abtn { border-color: ${m.border} !important; box-shadow: 0 4px 20px rgba(0,0,0,0.65), 0 0 18px ${m.glow} !important; }`;
  }

  function detectMoodFromPage(domData) {
    const text = (domData.bodyText + ' ' + domData.alerts.join(' ')).toLowerCase();
    if (/error|fallo|crítico|urgente|alerta\s*roja|vencido|expirado|sin\s*stock/i.test(text)) return 'urgente';
    if (/éxito|guardado|completado|aprobado|listo|bien\s*hecho|felicit|✓|✅/i.test(text)) return 'celebrando';
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 8) return 'tranquilo';
    return 'neutral';
  }

  /* ══════════════════════════════════════════════════════════
     5. ESTADO GLOBAL
  ══════════════════════════════════════════════════════════ */

  let isOpen     = false;
  let isDragging = false;
  let isLoading  = false;
  let domData    = null;

  let posX = window.innerWidth  - 96;
  let posY = window.innerHeight - 96;

  let roamTarget = { x: posX, y: posY };
  let roamVelX = 0, roamVelY = 0;
  let roamPaused = false;
  let lastRoamTime = 0;
  let nextRoamIn = 0;

  /* ══════════════════════════════════════════════════════════
     6. ESTILOS
  ══════════════════════════════════════════════════════════ */

  const ACCENT  = '#e87a10';
  const ACCENT2 = '#ffcc44';

  const STYLE = `
    #_aw {
      position: fixed; z-index: 2147483647;
      user-select: none; touch-action: none; pointer-events: none;
      width: 74px; height: 74px;
    }
    #_aw * { pointer-events: auto; }

    #_abub {
      position: absolute; bottom: 84px; right: 0;
      width: 280px;
      background: #0a0800; color: #f0ece0;
      border: 1.5px solid ${ACCENT};
      border-radius: 16px 16px 4px 16px;
      padding: 13px 14px 11px;
      font-size: 12px; line-height: 1.6;
      font-family: 'IBM Plex Mono','Courier New',monospace;
      box-shadow: 0 8px 40px rgba(0,0,0,0.7), 0 0 18px ${ACCENT}22;
      opacity: 0; transform: translateY(10px) scale(0.94);
      pointer-events: none;
      transition: opacity .2s, transform .2s;
      transform-origin: bottom right;
    }
    #_abub.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }

    #_atxt {
      margin-bottom: 8px; min-height: 32px;
      max-height: 120px; overflow-y: auto;
      scrollbar-width: thin; scrollbar-color: ${ACCENT}44 transparent;
    }
    #_atxt::-webkit-scrollbar { width: 3px; }
    #_atxt::-webkit-scrollbar-thumb { background: ${ACCENT}55; border-radius: 2px; }

    /* historial de chat */
    #_achat {
      max-height: 140px; overflow-y: auto;
      margin-bottom: 8px; display: none;
      flex-direction: column; gap: 6px;
      scrollbar-width: thin; scrollbar-color: ${ACCENT}44 transparent;
    }
    #_achat.visible { display: flex; }
    #_achat::-webkit-scrollbar { width: 3px; }
    #_achat::-webkit-scrollbar-thumb { background: ${ACCENT}55; border-radius: 2px; }

    .j-msg { padding: 5px 8px; border-radius: 8px; font-size: 11px; line-height: 1.5; }
    .j-msg.user { background: ${ACCENT}22; border-left: 2px solid ${ACCENT}; text-align: right; }
    .j-msg.bot  { background: #1a1400; border-left: 2px solid ${ACCENT2}55; }

    /* input area */
    #_ainput-wrap {
      display: flex; gap: 5px; margin-top: 6px;
      border-top: 1px solid ${ACCENT}28; padding-top: 8px;
    }
    #_ainput {
      flex: 1; background: #1a1400; border: 1px solid ${ACCENT}44;
      color: #f0ece0; border-radius: 6px; padding: 5px 8px;
      font-size: 11px; font-family: inherit; outline: none;
      transition: border-color .15s;
    }
    #_ainput:focus { border-color: ${ACCENT}; }
    #_ainput::placeholder { color: rgba(240,236,224,.25); }
    #_asend {
      background: ${ACCENT}; border: none; color: #0a0800;
      border-radius: 6px; padding: 5px 9px; font-size: 11px;
      font-family: inherit; cursor: pointer; font-weight: bold;
      transition: background .12s; white-space: nowrap;
    }
    #_asend:hover { background: ${ACCENT2}; }
    #_asend:disabled { background: ${ACCENT}44; cursor: not-allowed; }

    #_amic {
      background: none; border: 1px solid ${ACCENT}44;
      color: ${ACCENT}88; border-radius: 6px; padding: 5px 8px;
      font-size: 13px; cursor: pointer; line-height: 1;
      transition: all .15s; white-space: nowrap; flex-shrink: 0;
    }
    #_amic:hover { border-color: ${ACCENT}; color: ${ACCENT}; }
    #_amic.recording {
      background: #ff222422; border-color: #ff4444;
      color: #ff4444; animation: _aw-micpulse 0.8s ease-in-out infinite;
    }
    @keyframes _aw-micpulse {
      0%,100% { box-shadow: 0 0 0 0 #ff444444; }
      50%      { box-shadow: 0 0 0 5px #ff444400; }
    }

    #_astatus {
      font-size: 9px; color: ${ACCENT}99; min-height: 12px;
      margin-bottom: 4px;
    }

    #_axbtn {
      position: absolute; top: 8px; right: 10px;
      background: none; border: none; color: rgba(240,236,224,.3);
      font-size: 13px; cursor: pointer; line-height: 1; padding: 0;
      font-family: inherit; transition: color .12s;
    }
    #_axbtn:hover { color: #fff; }

    #_abtn {
      width: 74px; height: 74px; border-radius: 50%;
      background: #0a0800; border: 2px solid ${ACCENT};
      cursor: grab; display: flex; align-items: center; justify-content: center;
      position: relative;
      box-shadow: 0 4px 20px rgba(0,0,0,0.65), 0 0 14px ${ACCENT}28;
      transition: box-shadow .3s, transform .15s; overflow: visible;
    }
    #_abtn:active { cursor: grabbing; }
    #_abtn:hover { box-shadow: 0 6px 28px rgba(0,0,0,0.7), 0 0 22px ${ACCENT}44; transform: scale(1.06); }
    #_abtn.wiggle { animation: _aw-wig 0.55s ease; }

    #_adot {
      position: absolute; top: 2px; right: 2px;
      width: 10px; height: 10px; background: #ff2244;
      border-radius: 50%; border: 2px solid #0a0800;
      display: none; animation: _aw-dotpulse 1.6s ease-in-out infinite;
    }
    #_adot.on { display: block; }

    #_adbstatus {
      font-size: 9px; color: ${ACCENT}66;
      margin-bottom: 4px; min-height: 10px;
    }

    @keyframes _aw-wig {
      0%   { transform: rotate(0deg) scale(1.04); }
      20%  { transform: rotate(-10deg) scale(1.08); }
      40%  { transform: rotate(10deg) scale(1.08); }
      60%  { transform: rotate(-6deg) scale(1.05); }
      80%  { transform: rotate(5deg) scale(1.04); }
      100% { transform: rotate(0deg) scale(1); }
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
      0%,100% { transform: scaleY(1) scaleX(1); opacity: .9; }
      25%      { transform: scaleY(1.2) scaleX(0.88); opacity: 1; }
      50%      { transform: scaleY(0.86) scaleX(1.1); opacity: .85; }
      75%      { transform: scaleY(1.14) scaleX(0.91); opacity: 1; }
    }
    @keyframes _aw-iris { 0%,100% { transform: scale(1); } 50% { transform: scale(1.13); } }
    @keyframes _aw-blink {
      0%,85%,100% { transform: scaleY(1); }
      92%          { transform: scaleY(0.05); }
    }
    #_asvg  { animation: _aw-float 3.8s ease-in-out infinite; }
    #_airis { transform-origin: 27px 26px; animation: _aw-iris 3.2s ease-in-out infinite; }
    #_aeye  { transform-origin: 27px 26px; animation: _aw-blink 6.5s ease-in-out infinite; }
    #_af1   { transform-origin: 27px 50px; animation: _aw-flame .21s ease-in-out infinite; }
    #_af2   { transform-origin: 27px 52px; animation: _aw-flame .27s ease-in-out infinite .05s; }
    #_af3   { transform-origin: 27px 49px; animation: _aw-flame .18s ease-in-out infinite .12s; }
  `;

  /* ══════════════════════════════════════════════════════════
     7. SVG (igual al original)
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
  <ellipse cx="27" cy="58" rx="9" ry="3" fill="#e85500" opacity=".2"/>
  <ellipse id="_af3" cx="27" cy="54" rx="6.8" ry="7.2" fill="url(#_ag-fo)"/>
  <ellipse id="_af2" cx="27" cy="52" rx="4.4" ry="5.2" fill="url(#_ag-fm)"/>
  <ellipse id="_af1" cx="27" cy="50" rx="2.2" ry="3.2" fill="url(#_ag-fc)"/>
  <rect x="17" y="43" width="20" height="7.5" rx="3.8" fill="url(#_ag-noz)" stroke="#282420" stroke-width=".7"/>
  <rect x="19.5" y="41.5" width="15" height="4" rx="2" fill="#7a7672" stroke="#484440" stroke-width=".5"/>
  <rect x="13" y="44.5" width="5" height="5.5" rx="2.5" fill="#585450" stroke="#383430" stroke-width=".5"/>
  <rect x="36" y="44.5" width="5" height="5.5" rx="2.5" fill="#585450" stroke="#383430" stroke-width=".5"/>
  <circle cx="21" cy="45.5" r="1.1" fill="#484440"/>
  <circle cx="33" cy="45.5" r="1.1" fill="#484440"/>
  <circle cx="21" cy="48.5" r="1.1" fill="#484440"/>
  <circle cx="33" cy="48.5" r="1.1" fill="#484440"/>
  <ellipse cx="27" cy="27" rx="19.5" ry="18.5" fill="url(#_ag-body)" stroke="#686460" stroke-width="1"/>
  <path d="M8.5 24 Q27 19 45.5 24" fill="none" stroke="#9a9690" stroke-width=".5" opacity=".45"/>
  <path d="M8.5 30 Q27 35 45.5 30" fill="none" stroke="#9a9690" stroke-width=".5" opacity=".45"/>
  <line x1="27" y1="9.5" x2="27" y2="44.5" stroke="#9a9690" stroke-width=".3" opacity=".2"/>
  <circle cx="27" cy="26" r="10.5" fill="#141008" stroke="#38342e" stroke-width="1.3"/>
  <circle cx="27" cy="26" r="10.5" fill="none" stroke="#6a5f50" stroke-width=".5" opacity=".55"/>
  <g id="_aeye">
    <circle cx="27" cy="26" r="8.5" fill="url(#_ag-eye)"/>
    <circle cx="27" cy="26" r="3.8" fill="#060300"/>
    <g id="_airis">
      <circle cx="27" cy="26" r="6.2" fill="none" stroke="#e87a10" stroke-width=".55" opacity=".38"/>
      <circle cx="27" cy="26" r="4.8" fill="none" stroke="#ffcc44" stroke-width=".35" opacity=".3"/>
    </g>
    <circle cx="23.2" cy="22.4" r="2.4" fill="#fff" opacity=".32"/>
    <circle cx="22.2" cy="21.4" r="1.1" fill="#fff" opacity=".58"/>
    <circle cx="30.5" cy="29.5" r=".9" fill="#fff" opacity=".18"/>
  </g>
  <ellipse cx="27" cy="11" rx="11.5" ry="4.4" fill="#d2cfc9" stroke="#888480" stroke-width=".8"/>
  <ellipse cx="27" cy="10.5" rx="9.5" ry="2.8" fill="none" stroke="#b8b5ae" stroke-width=".4" opacity=".5"/>
  <line x1="18" y1="14" x2="8.5" y2="5" stroke="#787470" stroke-width="1.8" stroke-linecap="round"/>
  <circle cx="8" cy="4.5" r="3.4" fill="#e87a10" stroke="#7a3e00" stroke-width=".8"/>
  <circle cx="8" cy="4.5" r="1.4" fill="#ffe066"/>
  <circle cx="6.8" cy="3.4" r=".65" fill="#fff" opacity=".5"/>
  <line x1="36" y1="14" x2="45.5" y2="5" stroke="#787470" stroke-width="1.8" stroke-linecap="round"/>
  <circle cx="46" cy="4.5" r="3.4" fill="#e87a10" stroke="#7a3e00" stroke-width=".8"/>
  <circle cx="46" cy="4.5" r="1.4" fill="#ffe066"/>
  <circle cx="44.8" cy="3.4" r=".65" fill="#fff" opacity=".5"/>
</svg>`;

  /* ══════════════════════════════════════════════════════════
     8. BUILD DOM
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
        <div id="_adbstatus"></div>
        <div id="_atxt"></div>
        <div id="_achat"></div>
        <div id="_astatus"></div>
        <div id="_ainput-wrap">
          <input id="_ainput" type="text" placeholder="Preguntame algo…" autocomplete="off"/>
          <button id="_amic" title="Mantené presionado para hablar">🎙</button>
          <button id="_asend">↑</button>
        </div>
      </div>
      <div id="_abtn">${SVG}<div id="_adot"></div></div>
    `;

    document.body.appendChild(wrap);

    const btn      = wrap.querySelector('#_abtn');
    const bub      = wrap.querySelector('#_abub');
    const txt      = wrap.querySelector('#_atxt');
    const chat     = wrap.querySelector('#_achat');
    const status   = wrap.querySelector('#_astatus');
    const dbStatus = wrap.querySelector('#_adbstatus');
    const input    = wrap.querySelector('#_ainput');
    const send     = wrap.querySelector('#_asend');
    const dot      = wrap.querySelector('#_adot');
    const xbtn     = wrap.querySelector('#_axbtn');
    const mic      = wrap.querySelector('#_amic');

    /* ── Voz — Groq TTS con fallback a Web Speech ── */
    let currentAudio = null;

    async function speak(msg) {
      // Parar audio anterior
      if (currentAudio) { currentAudio.pause(); currentAudio = null; }
      window.speechSynthesis?.cancel();

      if (!GROQ_KEY) { speakFallback(msg); return; }

      const clean = msg.replace(/[¡¿…]/g, '').replace(/—/g, ', ').slice(0, 800);
      try {
        const res = await fetch('https://api.groq.com/openai/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_KEY}`,
          },
          body: JSON.stringify({
            model: 'playai-tts',
            voice: 'Diego-PlayAI',   // voz masculina en español
            input: clean,
            response_format: 'mp3',
          }),
        });

        if (!res.ok) { speakFallback(msg); return; }

        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        currentAudio = new Audio(url);
        currentAudio.playbackRate = 0.95;
        currentAudio.onended = () => { URL.revokeObjectURL(url); currentAudio = null; };
        currentAudio.play().catch(() => speakFallback(msg));

      } catch (_) {
        speakFallback(msg);
      }
    }

    function speakFallback(msg) {
      if (!window.speechSynthesis) return;
      const clean = msg.replace(/[¡¿…]/g, '').replace(/—/g, ',');
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = 'es-ES'; u.rate = 0.88; u.pitch = 0.7; u.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang.startsWith('es') && /google|microsoft|jorge|pablo|diego/i.test(v.name))
                     || voices.find(v => v.lang.startsWith('es')) || null;
      if (preferred) u.voice = preferred;
      window.speechSynthesis.speak(u);
    }

    /* ── Typewriter ── */
    let typeTimer = null;
    function typeText(el, msg, cb) {
      clearInterval(typeTimer);
      el.textContent = '';
      let i = 0;
      const speed = Math.max(14, Math.min(32, Math.floor(700 / msg.length)));
      typeTimer = setInterval(() => {
        el.textContent += msg[i++];
        if (i >= msg.length) { clearInterval(typeTimer); if (cb) cb(); }
      }, speed);
    }

    /* ── Abrir / cerrar ── */
    function openBub() {
      bub.classList.add('open');
      isOpen = true; roamPaused = true;
      dot.classList.remove('on');
      setTimeout(() => input.focus(), 250);
    }

    function closeBub() {
      if (currentAudio) { currentAudio.pause(); currentAudio = null; }
      window.speechSynthesis?.cancel();
      bub.classList.remove('open');
      isOpen = false; roamPaused = false;
    }

    function wiggle() {
      btn.classList.remove('wiggle');
      void btn.offsetWidth;
      btn.classList.add('wiggle');
      setTimeout(() => btn.classList.remove('wiggle'), 600);
    }

    /* ── Agregar mensaje al chat ── */
    function addChatMsg(text, role) {
      chat.classList.add('visible');
      const div = document.createElement('div');
      div.className = `j-msg ${role}`;
      div.textContent = text;
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    }

    /* ── Push-to-talk con Whisper ── */
    let mediaRecorder = null;
    let audioChunks   = [];
    let micStream     = null;

    async function startRecording() {
      if (mediaRecorder?.state === 'recording') return;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(micStream, { mimeType: 'audio/webm' });
        audioChunks = [];
        mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
        mediaRecorder.start();
        mic.classList.add('recording');
        status.textContent = '● grabando…';
      } catch (e) {
        status.textContent = 'Mic denegado: ' + e.message;
        setTimeout(() => { status.textContent = ''; }, 3000);
      }
    }

    async function stopRecordingAndTranscribe() {
      if (!mediaRecorder || mediaRecorder.state !== 'recording') return;

      mediaRecorder.stop();
      mic.classList.remove('recording');
      status.textContent = 'transcribiendo…';

      await new Promise(r => mediaRecorder.onstop = r);
      micStream?.getTracks().forEach(t => t.stop());

      if (!audioChunks.length) { status.textContent = ''; return; }

      const blob     = new Blob(audioChunks, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('file', blob, 'audio.webm');
      formData.append('model', 'whisper-large-v3');
      formData.append('language', 'es');
      formData.append('response_format', 'json');

      try {
        const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${GROQ_KEY}` },
          body: formData,
        });
        const data = await res.json();
        const text = data.text?.trim();
        if (text) {
          input.value = text;
          status.textContent = '';
          await sendQuestion();
        } else {
          status.textContent = 'No entendí nada, che.';
          setTimeout(() => { status.textContent = ''; }, 2000);
        }
      } catch (e) {
        status.textContent = 'Error Whisper: ' + e.message;
        setTimeout(() => { status.textContent = ''; }, 3000);
      }
    }

    // Push-to-talk: mousedown/touchstart → grabar, mouseup/touchend → transcribir
    mic.addEventListener('mousedown', e => { e.stopPropagation(); e.preventDefault(); startRecording(); });
    mic.addEventListener('touchstart', e => { e.stopPropagation(); e.preventDefault(); startRecording(); }, { passive: false });
    mic.addEventListener('mouseup',   e => { e.stopPropagation(); stopRecordingAndTranscribe(); });
    mic.addEventListener('touchend',  e => { e.stopPropagation(); stopRecordingAndTranscribe(); });
    // Si el usuario arrastra el dedo fuera del botón
    mic.addEventListener('mouseleave', e => { if (mediaRecorder?.state === 'recording') stopRecordingAndTranscribe(); });

    /* ── moveTo: mueve Joaco cerca de un elemento ── */
    function moveTo(selector) {
      try {
        const el = document.querySelector(selector);
        if (!el) return;
        const r = el.getBoundingClientRect();
        const SIZE = 74, MARGIN = 14;
        const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
        posX = clamp(r.left + r.width / 2 - SIZE / 2, MARGIN, window.innerWidth  - SIZE - MARGIN);
        posY = clamp(r.top  - SIZE - 10,               MARGIN, window.innerHeight - SIZE - MARGIN);
        wrap.style.left = posX + 'px';
        wrap.style.top  = posY + 'px';
        roamVelX = 0; roamVelY = 0;
      } catch (_) {}
    }

    /* ── Enviar pregunta ── */
    async function sendQuestion() {
      const q = input.value.trim();
      if (!q || isLoading) return;

      input.value = '';
      txt.textContent = '';
      addChatMsg(q, 'user');

      isLoading = true;
      send.disabled = true;
      status.textContent = 'pensando…';

      const reply = await askGroq(q, domData, wiggle, moveTo);

      status.textContent = '';
      if (reply !== '(acción ejecutada)') addChatMsg(reply, 'bot');
      if (reply && reply !== '(acción ejecutada)') speak(reply);

      isLoading = false;
      send.disabled = false;
      input.focus();
    }

    /* ── Init: leer DOM + Firestore + saludar ── */
    async function init() {
      domData = readPage();
      _moodBtnRef = btn; // referencia para applyMood()

      // Detectar mood según página
      const detectedMood = detectMoodFromPage(domData);
      applyMood(detectedMood);

      // Saludo inteligente según memoria
      const gCtx = getGreetingContext();
      const prefs = gCtx.prefs;
      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      let greeting;

      if (gCtx.isFirstEver) {
        greeting = `Joaco activo. Primera vez por acá. Estoy en "${domData.pageTitle}". Preguntame lo que necesites.`;
      } else if (gCtx.isFirstThisWeek) {
        const days = Math.round(gCtx.daysDiff);
        greeting = prefs.name
          ? `${prefs.name}, ${days} días sin verte. Estoy en "${domData.pageTitle}".`
          : `${days} días sin verte. Joaco de vuelta en "${domData.pageTitle}".`;
      } else if (gCtx.isFirstToday) {
        const hour = new Date().getHours();
        const saludo = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
        greeting = prefs.name
          ? `${saludo}, ${prefs.name}. En "${domData.pageTitle}" otra vez.`
          : `${saludo}. Joaco activo en "${domData.pageTitle}".`;
      } else {
        greeting = prefs.name
          ? `${prefs.name}, de vuelta en "${domData.pageTitle}".`
          : `Joaco activo en "${domData.pageTitle}".`;
      }

      if (isMobile) greeting += ' (modo mobile)';
      if (detectedMood === 'urgente') greeting += ' Hay cosas que revisar.';
      if (detectedMood === 'celebrando') greeting += ' Todo parece andar bien.';

      typeText(txt, greeting);
      speak(greeting);
      openBub();
      wiggle();

      // Monitoreo de red
      initNetworkMonitor(txt, typeText, wiggle, openBub, () => isOpen);

      // Cargar Firestore en background
      if (FB_CFG) {
        dbStatus.textContent = 'conectando a Firestore…';
        firestoreSnapshot = await loadFirestore();
        const cols = firestoreSnapshot ? Object.keys(firestoreSnapshot) : [];
        if (cols.length) {
          const counts = cols.map(c => `${c}(${firestoreSnapshot[c].length})`).join(', ');
          dbStatus.textContent = `DB: ${counts}`;
        } else {
          dbStatus.textContent = 'DB: sin acceso o vacía';
        }
      } else {
        dbStatus.textContent = 'DB: no configurada';
      }

      // Mostrar historial previo (últimos 6 mensajes)
      const prevHistory = loadChatHistory().slice(-6);
      if (prevHistory.length > 0) {
        prevHistory.forEach(m => addChatMsg(m.content, m.role === 'user' ? 'user' : 'bot'));
      }

      // Iniciar detectores de comportamiento
      initBehaviorDetectors(txt, typeText, wiggle, openBub,
        () => domData,
        (d) => { domData = d; },
        wrap,
        () => isOpen
      );
    }

    /* ── Eventos ── */
    btn.addEventListener('click', e => {
      if (isDragging) return;
      if (!isOpen) openBub();
      else closeBub();
    });

    xbtn.addEventListener('click', e => { e.stopPropagation(); closeBub(); });

    send.addEventListener('click', e => { e.stopPropagation(); sendQuestion(); });

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); sendQuestion(); }
      e.stopPropagation();
    });

    input.addEventListener('click', e => e.stopPropagation());

    /* ── Auto-init ── */
    if (window.speechSynthesis) {
      if (window.speechSynthesis.getVoices().length) {
        setTimeout(init, 1400);
      } else {
        window.speechSynthesis.addEventListener('voiceschanged', () => setTimeout(init, 200), { once: true });
        setTimeout(init, 1400);
      }
    } else {
      setTimeout(init, 1400);
    }

    /* ── Dot periódico ── */
    setInterval(() => { if (!isOpen) { dot.classList.add('on'); wiggle(); } }, 40000);

    /* ══════════════════════════════════════════════════════
       MOVIMIENTO LIBRE
    ══════════════════════════════════════════════════════ */

    const SIZE = 74, MARGIN = 14;
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function randomTarget() {
      return {
        x: MARGIN + Math.random() * (window.innerWidth  - SIZE - MARGIN * 2),
        y: MARGIN + Math.random() * (window.innerHeight - SIZE - MARGIN * 2),
      };
    }
    function scheduleNextRoam() {
      nextRoamIn = 4000 + Math.random() * 10000;
      lastRoamTime = performance.now();
      roamTarget = randomTarget();
    }
    scheduleNextRoam();

    const SPRING = 0.04, DAMP = 0.82, THRESH = 2;
    let lastFrame = performance.now();

    function roamFrame(now) {
      requestAnimationFrame(roamFrame);
      const dt = Math.min(now - lastFrame, 50);
      lastFrame = now;
      if (!roamPaused && !isDragging) {
        if (now - lastRoamTime < nextRoamIn) {
          roamVelX *= DAMP; roamVelY *= DAMP;
        } else {
          const dx = roamTarget.x - posX, dy = roamTarget.y - posY;
          roamVelX = roamVelX * DAMP + dx * SPRING;
          roamVelY = roamVelY * DAMP + dy * SPRING;
          if (Math.abs(dx) < THRESH && Math.abs(dy) < THRESH) scheduleNextRoam();
        }
        posX = clamp(posX + roamVelX * (dt / 16), MARGIN, window.innerWidth  - SIZE - MARGIN);
        posY = clamp(posY + roamVelY * (dt / 16), MARGIN, window.innerHeight - SIZE - MARGIN);
        wrap.style.left = posX + 'px';
        wrap.style.top  = posY + 'px';
      }
    }
    requestAnimationFrame(roamFrame);

    /* ══════════════════════════════════════════════════════
       DRAG
    ══════════════════════════════════════════════════════ */

    let dragStartX, dragStartY, dragOriginX, dragOriginY;

    function onDragStart(cx, cy) {
      isDragging = false;
      dragStartX = cx; dragStartY = cy;
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
        scheduleNextRoam();
      }, 60);
    }

    btn.addEventListener('mousedown', e => {
      onDragStart(e.clientX, e.clientY);
      const mv = e2 => onDragMove(e2.clientX, e2.clientY);
      const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); onDragEnd(); };
      document.addEventListener('mousemove', mv);
      document.addEventListener('mouseup', up);
      e.preventDefault();
    });

    btn.addEventListener('touchstart', e => {
      const t = e.touches[0];
      onDragStart(t.clientX, t.clientY);
      const mv = e2 => { const t2 = e2.touches[0]; onDragMove(t2.clientX, t2.clientY); e2.preventDefault(); };
      const up = () => { document.removeEventListener('touchmove', mv); document.removeEventListener('touchend', up); onDragEnd(); };
      document.addEventListener('touchmove', mv, { passive: false });
      document.addEventListener('touchend', up);
    }, { passive: true });
  }

  /* ══════════════════════════════════════════════════════════
     DETECTORES DE COMPORTAMIENTO
  ══════════════════════════════════════════════════════════ */

  // Monitor de red
  function initNetworkMonitor(txtEl, typeTextFn, wiggleFn, openBubFn, isOpenFn) {
    let wasOffline = !navigator.onLine;

    function onOffline() {
      wasOffline = true;
      typeTextFn(txtEl, 'Sin conexión. Algunas funciones no van a andar.');
      applyMood('urgente');
      wiggleFn();
      if (!isOpenFn()) openBubFn();
    }
    function onOnline() {
      if (wasOffline) {
        wasOffline = false;
        typeTextFn(txtEl, 'Volvió la conexión. Todo en orden.');
        applyMood('celebrando');
        wiggleFn();
        setTimeout(() => applyMood('neutral'), 4000);
      }
    }
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    if (!navigator.onLine) onOffline();
  }

  // Detectores de inactividad, scroll y errores visibles
  function initBehaviorDetectors(txtEl, typeTextFn, wiggleFn, openBubFn, getDomData, setDomData, wrap, isOpenFn) {
    let lastActivity = Date.now();
    let inactivityFired = false;
    let scrollBottomFired = false;
    let errorAlertFired = false;
    const INACTIVITY_MS = 5 * 60 * 1000; // 5 minutos

    // Actualizar actividad en cualquier interacción
    const resetActivity = () => {
      lastActivity = Date.now();
      inactivityFired = false;
    };
    ['click', 'mousemove', 'keydown', 'touchstart', 'scroll'].forEach(ev =>
      document.addEventListener(ev, resetActivity, { passive: true })
    );

    // Inactividad: reaparecer con algo útil
    function buildInactivityHint() {
      const domData = getDomData();
      const visits = memGet('visits', {});
      const topPages = Object.entries(visits)
        .filter(([p]) => p !== PAGE_KEY)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 1);

      if (domData.buttons.length > 0) {
        return `¿Seguís ahí? Hay ${domData.buttons.length} acciones disponibles en esta pantalla, como "${domData.buttons[0]}".`;
      }
      if (topPages.length) {
        const pageName = topPages[0][0].replace(/_/g, '/');
        return `¿Seguís ahí? Tu sección más visitada es "${pageName}". ¿Querés ir para allá?`;
      }
      return '¿Seguís ahí? Puedo ayudarte con algo de esta página.';
    }

    // Scroll hasta el fondo sin acción
    function onScroll() {
      if (scrollBottomFired) return;
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      if (total > window.innerHeight + 200 && scrolled >= total - 40) {
        scrollBottomFired = true;
        setTimeout(() => {
          typeTextFn(txtEl, '¿Encontraste lo que buscabas? Si no, contame y lo buscamos juntos.');
          wiggleFn();
          if (!isOpenFn()) openBubFn();
        }, 800);
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    // Detección de errores visibles en pantalla
    function checkVisibleErrors() {
      if (errorAlertFired) return;
      const errorSelectors = [
        '[class*="error"]:not([style*="display:none"])',
        '[class*="alert-danger"]:not([style*="display:none"])',
        '[class*="alert-error"]:not([style*="display:none"])',
        '[role="alert"]:not([style*="display:none"])',
      ];
      for (const sel of errorSelectors) {
        const els = [...document.querySelectorAll(sel)].filter(el => {
          const t = el.innerText?.trim();
          const r = el.getBoundingClientRect();
          return t && t.length > 3 && r.height > 0 && r.width > 0;
        });
        if (els.length) {
          errorAlertFired = true;
          const errText = els[0].innerText.trim().slice(0, 80);
          setTimeout(() => {
            applyMood('urgente');
            typeTextFn(txtEl, `Hay un error visible en pantalla: "${errText}". ¿Querés que te ayude?`);
            wiggleFn();
            if (!isOpenFn()) openBubFn();
          }, 1200);
          return;
        }
      }
    }

    // Check periódico
    setInterval(() => {
      // Inactividad
      if (!inactivityFired && Date.now() - lastActivity > INACTIVITY_MS) {
        inactivityFired = true;
        applyMood('tranquilo');
        typeTextFn(txtEl, buildInactivityHint());
        wiggleFn();
        if (!isOpenFn()) openBubFn();
      }
      // Errores visibles (check cada 10s)
      checkVisibleErrors();
    }, 10000);

    // MutationObserver: detectar errores que aparecen dinámicamente
    let mutDebounce = null;
    const observer = new MutationObserver((mutations) => {
      // Ignorar cambios originados por el propio Joaco (dentro de #_aw)
      const fromJoaco = mutations.every(m => wrap && wrap.contains(m.target));
      if (fromJoaco) return;
      // Debounce: esperar 500ms de calma antes de procesar
      clearTimeout(mutDebounce);
      mutDebounce = setTimeout(() => {
        errorAlertFired = false;
        setDomData(readPage());
        checkVisibleErrors();
      }, 500);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: false });
  }

  /* ══════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════ */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }

})();
