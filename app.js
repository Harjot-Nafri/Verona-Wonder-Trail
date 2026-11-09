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

  function say(text) { if (note) note.textContent = text; }

  if (cta) {
    cta.addEventListener('click', function () {
      say('Inquadra il QR che trovi in sede con la fotocamera del telefono.');
    });
  }

  if (!window.supabase || !cfg || !cfg.SUPABASE_URL || !cfg.SUPABASE_KEY) {
    say('Il collegamento al server non è disponibile in questo momento.');
    return;
  }

  var sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);
  var session = null;

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

  async function unlockFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var sede = params.get('sede');
    var key = params.get('k');
    if (!sede || !key) return null;
    window.history.replaceState({}, '', window.location.pathname);
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
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.className = on ? 'on' : '';
      if (selected === s.id) b.setAttribute('aria-current', 'true');
      var dot = document.createElement('span');
      dot.className = 'dot2';
      dot.setAttribute('aria-hidden', 'true');
      var name = document.createElement('span');
      name.textContent = s.nome;
      var tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = on ? 'Sbloccata' : 'Bloccata';
      b.appendChild(dot); b.appendChild(name); b.appendChild(tag);
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
    var s = await sb.from('sedi').select('id,nome,ordine,lat,lng,categoria').order('ordine');
    if (s.error) s = await sb.from('sedi').select('id,nome,ordine,lat,lng').order('ordine');
    var b = await sb.from('sblocchi').select('sede_id');
    var c = await sb.from('sedi_contenuti').select('sede_id,storia,fun_fact');
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
