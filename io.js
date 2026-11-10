// Sezione "Io": il tuo profilo, i progressi, le tue note e le note che ti sono piaciute.
(function () {
  var view = document.getElementById('io-view');
  if (!view) return;

  var NEEDED = 5;
  var state = { loaded: false, error: null, nick: '', sedi: [], sbloccate: {}, scritte: [], ricevute: [], giorni: {} };
  var editing = false;
  var busy = false;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function client() { return window.WT && window.WT.sb; }
  function heartSvg() {
    var ns = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(ns, 'path');
    p.setAttribute('d', 'M12 20.5s-7.5-4.6-9.2-9.3C1.7 8 3.6 5 6.6 5c1.9 0 3.5 1 5.4 3 1.9-2 3.5-3 5.4-3 3 0 4.9 3 3.8 6.2-1.7 4.7-9.2 9.3-9.2 9.3z');
    s.appendChild(p);
    return s;
  }

  // ---- date (a Verona, come nel quiz) ----
  function todayStr() { return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' }); }
  function addDays(str, n) {
    var p = str.split('-');
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)).toISOString().slice(0, 10);
  }
  function streak() {
    var today = todayStr();
    var d = state.giorni[today] ? today : addDays(today, -1);
    var n = 0;
    while (state.giorni[d]) { n++; d = addDays(d, -1); }
    return n;
  }

  // ---- dati ----
  async function load() {
    var c = client();
    if (!c) { state.error = 'nd'; state.loaded = true; return; }
    try {
      var uid = null;
      var s = await c.auth.getSession();
      uid = s && s.data && s.data.session && s.data.session.user && s.data.session.user.id;
      var p = uid ? await c.from('profili').select('nickname').eq('user_id', uid).maybeSingle() : null;
      var a = await c.from('sedi').select('id,nome,ordine').order('ordine');
      var b = await c.from('sblocchi').select('sede_id');
      var r = await c.from('risposte').select('giorno');
      var n = await c.rpc('mie_note');
      if (a.error || b.error) { state.error = 'err'; state.loaded = true; return; }
      state.nick = (p && p.data && p.data.nickname) || '';
      state.sedi = a.data || [];
      state.sbloccate = {};
      (b.data || []).forEach(function (x) { state.sbloccate[x.sede_id] = true; });
      var cnt = {};
      (r.data || []).forEach(function (x) { cnt[x.giorno] = (cnt[x.giorno] || 0) + 1; });
      state.giorni = {};
      Object.keys(cnt).forEach(function (k) { if (cnt[k] >= NEEDED) state.giorni[k] = true; });
      var nd = (n && n.data) || {};
      state.scritte = nd.scritte || [];
      state.ricevute = nd.ricevute || [];
      state.error = null;
    } catch (e) {
      state.error = 'err';
    }
    state.loaded = true;
  }

  async function saveNick(value, errEl, btn) {
    if (busy) return;
    var v = (value || '').trim();
    if (v.length < 2 || v.length > 20) { errEl.textContent = 'Il nickname deve avere da 2 a 20 caratteri.'; return; }
    busy = true;
    btn.disabled = true;
    errEl.textContent = '';
    try {
      var s = await client().auth.getSession();
      var uid = s.data.session.user.id;
      var res = await client().from('profili').update({ nickname: v }).eq('user_id', uid);
      busy = false;
      if (res.error) { errEl.textContent = 'Non sono riuscito a salvare il nickname. Riprova.'; btn.disabled = false; return; }
    } catch (e) {
      busy = false;
      errEl.textContent = 'Non sono riuscito a salvare il nickname. Riprova.';
      btn.disabled = false;
      return;
    }
    state.nick = v;
    editing = false;
    var who = document.getElementById('who');
    if (who) who.textContent = '@' + v;
    render();
  }

  // ---- interfaccia ----
  function profileCard() {
    var card = el('div', 'gcard');
    card.appendChild(el('p', 'io-kicker', 'Il tuo nickname'));
    if (!editing) {
      var h = el('h3', 'io-nick', state.nick ? '@' + state.nick : 'Senza nickname');
      card.appendChild(h);
      var b = el('button', 'gbtn io-ghost', state.nick ? 'Cambia nickname' : 'Scegli un nickname');
      b.type = 'button';
      b.addEventListener('click', function () { editing = true; render(); var i = document.getElementById('io-nick'); if (i) i.focus(); });
      card.appendChild(b);
      return card;
    }
    var lab = el('label', 'pa-label', 'Nuovo nickname');
    lab.setAttribute('for', 'io-nick');
    var inp = el('input', 'pa-select');
    inp.id = 'io-nick';
    inp.type = 'text';
    inp.minLength = 2;
    inp.maxLength = 20;
    inp.autocomplete = 'off';
    inp.value = state.nick;
    var err = el('p', 'pa-err');
    err.setAttribute('role', 'alert');
    var row = el('div', 'io-row');
    var ok = el('button', 'gbtn', 'Salva');
    ok.type = 'button';
    ok.addEventListener('click', function () { saveNick(inp.value, err, ok); });
    var no = el('button', 'gbtn io-ghost', 'Annulla');
    no.type = 'button';
    no.addEventListener('click', function () { editing = false; render(); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') saveNick(inp.value, err, ok); });
    row.appendChild(ok);
    row.appendChild(no);
    card.appendChild(lab);
    card.appendChild(inp);
    card.appendChild(row);
    card.appendChild(err);
    return card;
  }

  function stat(num, label) {
    var d = el('div', 'io-stat');
    d.appendChild(el('div', 'io-num', num));
    d.appendChild(el('div', 'io-lab', label));
    return d;
  }

  function statsCard() {
    var total = state.sedi.length;
    var got = state.sedi.filter(function (s) { return state.sbloccate[s.id]; }).length;
    var hearts = state.scritte.reduce(function (a, n) { return a + (n.like || 0); }, 0);
    var n = streak();
    var grid = el('div', 'io-stats');
    grid.appendChild(stat(got + '/' + (total || 14), 'Sedi sbloccate'));
    grid.appendChild(stat(String(state.scritte.length), state.scritte.length === 1 ? 'Nota scritta' : 'Note scritte'));
    grid.appendChild(stat(String(hearts), hearts === 1 ? 'Cuore ricevuto' : 'Cuori ricevuti'));
    grid.appendChild(stat(String(n), n === 1 ? 'Giorno di serie' : 'Giorni di serie'));
    return grid;
  }

  function sediCard() {
    var card = el('div', 'gcard');
    card.appendChild(el('h4', 'sec', 'Le tue sedi'));
    var ul = el('ul', 'io-sedi');
    state.sedi.forEach(function (s) {
      var on = !!state.sbloccate[s.id];
      var li = el('li', on ? 'on' : '', s.nome);
      li.setAttribute('aria-label', s.nome + (on ? ': sbloccata' : ': da sbloccare'));
      ul.appendChild(li);
    });
    card.appendChild(ul);
    return card;
  }

  function likedCard() {
    var card = el('div', 'gcard');
    card.appendChild(el('h4', 'sec', 'Note che ti sono piaciute'));
    var liked = state.ricevute.filter(function (n) { return n.mio_like; });
    if (!liked.length) {
      card.appendChild(el('p', null, 'Metti il cuore alle note che ti toccano: le ritrovi qui.'));
      return card;
    }
    var ul = el('ul', 'pa-list hc-list');
    liked.forEach(function (n) { ul.appendChild(window.WT_CARDS.build(n, {})); });
    card.appendChild(ul);
    return card;
  }

  function mineCard() {
    var card = el('div', 'gcard');
    card.appendChild(el('h4', 'sec', 'Le tue parole'));
    if (!state.scritte.length) {
      card.appendChild(el('p', null, 'Non hai ancora scritto una nota.'));
    } else {
      var ul = el('ul', 'pa-list hc-list');
      state.scritte.forEach(function (n) {
        var extra = n.nascosta ? el('p', 'pa-meta hc-state', 'Nascosta dalla moderazione') : null;
        ul.appendChild(window.WT_CARDS.build(n, { off: n.nascosta, byText: n.anonima ? 'Anonima' : 'Tu', extra: extra }));
      });
      card.appendChild(ul);
    }
    var go = el('a', 'gbtn io-link', 'Vai a Parole');
    go.href = '#parole';
    card.appendChild(go);
    return card;
  }

  function render() {
    view.textContent = '';
    if (!state.loaded) { var l = el('div', 'gcard'); l.appendChild(el('p', null, 'Carico il tuo profilo…')); view.appendChild(l); return; }
    if (state.error) {
      var e = el('div', 'gcard');
      e.appendChild(el('p', null, state.error === 'nd' ? 'Il profilo non è disponibile in questo momento.' : 'Non riesco a caricare il profilo. Riprova tra poco.'));
      view.appendChild(e);
      return;
    }
    view.appendChild(profileCard());
    view.appendChild(statsCard());
    view.appendChild(sediCard());
    view.appendChild(mineCard());
    view.appendChild(likedCard());
  }

  function refresh() {
    if (!client() || !window.WT.ready) return;
    load().then(render);
  }
  document.addEventListener('wt:view', function (e) { if (e.detail === 'io') { editing = false; refresh(); } });
  document.addEventListener('wt:ready', function () {
    if (document.body.getAttribute('data-view') === 'io') refresh();
  }, { once: true });
  if (window.WT && window.WT.ready && document.body.getAttribute('data-view') === 'io') refresh();
  if (!client()) { state.error = 'nd'; state.loaded = true; }
  render();
})();
