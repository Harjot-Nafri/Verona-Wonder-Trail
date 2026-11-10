// Fase 3: accesso anonimo, nickname, sblocco sedi dal QR, mappa e pagina sede.
(function () {
  var cfg = window.WT_CONFIG;
  var cta = document.getElementById('cta');
  var note = document.getElementById('note');
  var progress = document.getElementById('progress');
  var who = document.getElementById('who');
  var form = document.getElementById('nick-form');
  var input = document.getElementById('nick');
  var mapEl = document.getElementById('map');
  var panel = document.getElementById('sede-panel');
  var spNome = document.getElementById('sp-nome');
  var spState = document.getElementById('sp-state');
  var spBody = document.getElementById('sp-body');
  var listEl = document.getElementById('sedi-list');
  var tabsEl = document.getElementById('tabs');
  var tab = 'flora';
  var scanEl = document.getElementById('scan');
  var video = document.getElementById('scan-video');
  var canvas = document.getElementById('scan-canvas');
  var scanMsg = document.getElementById('scan-msg');
  var scanClose = document.getElementById('scan-close');

  function say(text) { if (note) note.textContent = text; }

  if (!window.supabase || !cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_KEY) {
    say('Il collegamento al server non è disponibile in questo momento.');
    return;
  }

  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);
  var session = null;
  window.WT = { sb: sb, ready: false };

  // stato della mappa
  var map = null;
  var markers = {};
  var sedi = [];
  var unlocked = {};
  var contenuti = {};
  var selected = null;
  var fitted = false;

  async function ensureSession() {
    var res = await sb.auth.getSession();
    if (res.data && res.data.session) { session = res.data.session; return true; }
    var anon = await sb.auth.signInAnonymously();
    if (anon.error || !anon.data || !anon.data.session) return false;
    session = anon.data.session;
    return true;
  }

  async function unlockWith(sede, key) {
    var res = await sb.rpc('sblocca_sede', { p_sede: sede, p_chiave: key });
    if (res.error || !res.data || !res.data.ok) {
      say('Questo QR non è valido. Riprova a inquadrarlo.');
      return null;
    }
    var info = await sb.from('sedi').select('nome').eq('id', sede).maybeSingle();
    var nome = info.data && info.data.nome ? info.data.nome : 'nuova sede';
    say('Sede sbloccata: ' + nome);
    return sede;
  }

  async function unlockFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var sede = params.get('sede');
    var key = params.get('k');
    if (!sede || !key) return null;
    window.history.replaceState({}, '', window.location.pathname);
    return unlockWith(sede, key);
  }

  // ---- scanner QR con la fotocamera ----
  var stream = null;
  var scanning = false;
  var busy = false;
  var lastTick = 0;
  var FALLBACK = 'Puoi anche inquadrare il QR con la fotocamera del telefono.';

  function stopScan() {
    scanning = false;
    if (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
    }
    if (video) video.srcObject = null;
    if (scanEl) scanEl.hidden = true;
    document.body.style.overflow = '';
    if (cta) cta.focus();
  }

  async function startScan() {
    if (!session) { say('Un attimo, sto preparando il tuo accesso. Riprova.'); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.jsQR) {
      say('Non riesco ad aprire la fotocamera da qui. ' + FALLBACK);
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
    } catch (err) {
      if (err && err.name === 'NotAllowedError') {
        say('Per scansionare serve il permesso alla fotocamera. ' + FALLBACK);
      } else {
        say('Non riesco ad aprire la fotocamera. ' + FALLBACK);
      }
      return;
    }
    video.srcObject = stream;
    try { await video.play(); } catch (e) { /* alcuni browser partono da soli */ }
    scanMsg.textContent = 'Inquadra il QR della sede';
    scanEl.hidden = false;
    document.body.style.overflow = 'hidden';
    scanning = true;
    busy = false;
    scanClose.focus();
    window.requestAnimationFrame(tick);
  }

  function tick(ts) {
    if (!scanning) return;
    if (!busy && ts - lastTick >= 120 && video.readyState >= 2 && video.videoWidth) {
      lastTick = ts;
      var w = Math.min(video.videoWidth, 640);
      var h = Math.round(video.videoHeight * w / video.videoWidth);
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, w, h);
      var img = ctx.getImageData(0, 0, w, h);
      var code = window.jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
      if (code && code.data) handleCode(code.data);
    }
    window.requestAnimationFrame(tick);
  }

  async function handleCode(text) {
    busy = true;
    var sede = null, key = null;
    try {
      var u = new URL(text);
      sede = u.searchParams.get('sede');
      key = u.searchParams.get('k');
    } catch (e) { /* non è un link */ }
    if (!sede || !key) {
      scanMsg.textContent = 'Questo QR non è di Wonder Trail.';
      setTimeout(function () { busy = false; }, 1500);
      return;
    }
    scanMsg.textContent = 'Controllo il QR…';
    var ok = await unlockWith(sede, key);
    if (ok) {
      stopScan();
      await loadSedi();
      showSede(ok, false);
      var sec = document.getElementById('mappa');
      if (sec) sec.scrollIntoView();
    } else {
      scanMsg.textContent = 'Questo QR non è valido. Riprova.';
      setTimeout(function () { busy = false; }, 1500);
    }
  }

  if (cta) cta.addEventListener('click', startScan);
  if (scanClose) scanClose.addEventListener('click', stopScan);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && scanning) stopScan();
  });
  window.addEventListener('pagehide', function () { if (scanning) stopScan(); });

  async function loadProfile() {
    var res = await sb.from('profili').select('nickname').eq('user_id', session.user.id).maybeSingle();
    if (res.data && res.data.nickname) {
      if (who) who.textContent = '@' + res.data.nickname;
      if (form) form.hidden = true;
    } else if (form) {
      form.hidden = false;
    }
  }

  function updateProgress() {
    if (!progress || !sedi.length) return;
    var n = Object.keys(unlocked).length;
    progress.textContent = 'Sedi sbloccate: ' + n + ' su ' + sedi.length;
  }

  function pinIcon(on, sel) {
    return window.L.divIcon({
      className: 'pinbox',
      html: '<span class="pin' + (on ? ' on' : '') + (sel ? ' sel' : '') + '"></span>',
      iconSize: [36, 36]
    });
  }

  function drawMap() {
    if (!window.L || !mapEl) return;
    if (!map) {
      map = window.L.map(mapEl, { center: [45.4384, 10.9916], zoom: 13, zoomControl: true });
      window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);
    }
    var pts = [];
    sedi.forEach(function (s) {
      if (typeof s.lat !== 'number' || typeof s.lng !== 'number') return;
      pts.push([s.lat, s.lng]);
      var on = !!unlocked[s.id];
      if (markers[s.id]) {
        markers[s.id].setIcon(pinIcon(on, selected === s.id));
      } else {
        var m = window.L.marker([s.lat, s.lng], {
          icon: pinIcon(on, false),
          title: s.nome,
          keyboard: true
        }).addTo(map);
        m.on('click', function () { showSede(s.id, false); });
        markers[s.id] = m;
      }
    });
    if (!fitted && pts.length) {
      map.fitBounds(pts, { padding: [30, 30], maxZoom: 15 });
      fitted = true;
    }
    setTimeout(function () { map.invalidateSize(); }, 200);
  }

  function hasCategories() {
    return sedi.some(function (s) { return !!s.categoria; });
  }

  function drawTabs() {
    if (!tabsEl) return;
    tabsEl.hidden = !hasCategories();
    ['flora', 'fauna'].forEach(function (cat) {
      var b = document.getElementById('tab-' + cat);
      if (!b) return;
      var tot = 0, got = 0;
      sedi.forEach(function (s) {
        if (s.categoria === cat) { tot++; if (unlocked[s.id]) got++; }
      });
      b.textContent = (cat === 'flora' ? 'Flora' : 'Fauna') + ' · ' + got + '/' + tot;
      b.setAttribute('aria-selected', tab === cat ? 'true' : 'false');
    });
  }

  function setTab(cat) {
    tab = cat;
    drawTabs();
    drawList();
  }

  if (tabsEl) {
    ['flora', 'fauna'].forEach(function (cat) {
      var b = document.getElementById('tab-' + cat);
      if (b) b.addEventListener('click', function () { setTab(cat); });
    });
  }

  function drawList() {
    if (!listEl) return;
    listEl.textContent = '';
    var filtra = hasCategories();
    sedi.forEach(function (s) {
      if (filtra && s.categoria !== tab) return;
      var on = !!unlocked[s.id];
      var c = contenuti[s.id] || {};
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'card' + (on ? ' on' : '');
      if (selected === s.id) b.setAttribute('aria-current', 'true');
      b.setAttribute('aria-label', s.nome + (on ? ', sbloccata' : ', bloccata'));

      var ph = document.createElement('span');
      ph.className = 'ph';
      if (s.immagine) {
        var img = document.createElement('img');
        img.src = s.immagine;
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        ph.appendChild(img);
      }
      if (!on) {
        var lock = document.createElement('span');
        lock.className = 'lock';
        lock.setAttribute('aria-hidden', 'true');
        lock.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path></svg>';
        ph.appendChild(lock);
      }

      var txt = document.createElement('span');
      txt.className = 'txt2';
      var t1 = document.createElement('span');
      t1.className = 'sp';
      t1.textContent = on ? (c.specie || 'Sbloccata') : 'Da scoprire';
      var t2 = document.createElement('span');
      t2.className = 'sd';
      t2.textContent = s.nome;
      txt.appendChild(t1); txt.appendChild(t2);

      b.appendChild(ph); b.appendChild(txt);
      b.addEventListener('click', function () { showSede(s.id, true); });
      li.appendChild(b);
      listEl.appendChild(li);
    });
  }

  function addBlock(title, text) {
    var h = document.createElement('h4');
    h.textContent = title;
    var p = document.createElement('p');
    p.className = 'txt';
    p.textContent = text;
    spBody.appendChild(h);
    spBody.appendChild(p);
  }

  function showSede(id, moveFocus) {
    var s = null;
    sedi.forEach(function (x) { if (x.id === id) s = x; });
    if (!s || !panel) return;
    var prev = selected;
    selected = id;
    if (s.categoria && s.categoria !== tab) { tab = s.categoria; drawTabs(); }
    var on = !!unlocked[id];
    spNome.textContent = s.nome;
    spBody.textContent = '';
    panel.className = 'panel' + (on ? '' : ' locked');
    if (on) {
      spState.textContent = 'Sede sbloccata';
      var c = contenuti[id] || {};
      if (s.immagine) {
        var pimg = document.createElement('img');
        pimg.className = 'pimg';
        pimg.src = s.immagine;
        pimg.alt = c.specie || '';
        spBody.appendChild(pimg);
      }
      if (c.specie) addBlock('Nel tuo album', c.specie);
      addBlock('Storia', c.storia || 'Presto qui troverai la storia di questa sede.');
      addBlock('Lo sapevi?', c.fun_fact || 'Presto qui troverai un fun fact.');
    } else {
      spState.textContent = 'Sede ancora bloccata';
      addBlock('Come si sblocca', 'Vai in questa sede e inquadra il QR con la fotocamera del telefono.');
    }
    panel.hidden = false;
    if (prev && markers[prev]) markers[prev].setIcon(pinIcon(!!unlocked[prev], false));
    if (markers[id]) {
      markers[id].setIcon(pinIcon(on, true));
      map.panTo(markers[id].getLatLng());
    }
    drawList();
    if (moveFocus) {
      panel.scrollIntoView({ block: 'nearest' });
      panel.focus({ preventScroll: true });
    }
  }

  async function loadSedi() {
    var s = await sb.from('sedi').select('id,nome,ordine,lat,lng,categoria,immagine').order('ordine');
    if (s.error) s = await sb.from('sedi').select('id,nome,ordine,lat,lng,categoria').order('ordine');
    if (s.error) s = await sb.from('sedi').select('id,nome,ordine,lat,lng').order('ordine');
    var b = await sb.from('sblocchi').select('sede_id');
    var c = await sb.from('sedi_contenuti').select('sede_id,storia,fun_fact,specie');
    if (c.error) c = await sb.from('sedi_contenuti').select('sede_id,storia,fun_fact');
    if (s.error || !s.data) return;
    sedi = s.data;
    unlocked = {};
    (b.data || []).forEach(function (r) { unlocked[r.sede_id] = true; });
    contenuti = {};
    (c.data || []).forEach(function (r) { contenuti[r.sede_id] = r; });
    updateProgress();
    drawMap();
    drawTabs();
    drawList();
    if (selected) showSede(selected, false);
  }

  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var nick = (input.value || '').trim();
      if (nick.length < 2 || nick.length > 20) {
        say('Il nickname deve avere da 2 a 20 caratteri.');
        return;
      }
      var res = await sb.from('profili').insert({ user_id: session.user.id, nickname: nick });
      if (res.error) {
        say('Non sono riuscito a salvare il nickname. Riprova.');
        return;
      }
      say('Benvenuto, @' + nick);
      await loadProfile();
    });
  }

  (async function start() {
    try {
      var ok = await ensureSession();
      if (!ok) {
        say('Non riesco ad accedere. Riprova tra poco.');
        return;
      }
      window.WT.ready = true;
      document.dispatchEvent(new Event('wt:ready'));
      var fresh = await unlockFromUrl();
      await loadProfile();
      await loadSedi();
      if (fresh) {
        showSede(fresh, false);
        var sec = document.getElementById('mappa');
        if (sec) sec.scrollIntoView();
      }
    } catch (err) {
      say('Qualcosa non ha funzionato. Riprova tra poco.');
    }
  })();
})();
