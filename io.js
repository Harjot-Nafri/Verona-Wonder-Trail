// Sezione "Io": profilo, livello, missioni di oggi, forziere, medaglie, passaporto delle sedi e le tue note.
(function () {
  var view = document.getElementById('io-view');
  if (!view) return;

  var NEEDED = 5;
  var STEP = 250;
  var LEVELS = ['Curioso', 'Viandante', 'Esploratore', 'Cartografo', 'Guida', 'Custode'];
  var STOP = { di: 1, del: 1, della: 1, dei: 1, de: 1, la: 1, il: 1, san: 1, e: 1 };

  var state = {
    loaded: false, error: null, nick: '', sedi: [], sbloccate: {}, scritte: [], ricevute: [],
    giorni: {}, perfetti: 0, m: null
  };
  var editing = false;
  var busy = false;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function client() { return window.WT && window.WT.sb; }

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
  function bestStreak() {
    var days = Object.keys(state.giorni).sort();
    var best = 0, run = 0, prev = null;
    days.forEach(function (d) {
      run = prev && addDays(prev, 1) === d ? run + 1 : 1;
      if (run > best) best = run;
      prev = d;
    });
    return best;
  }
  function initials(name) {
    var w = (name || '').split(/\s+/).filter(function (x) { return x && !STOP[x.toLowerCase()]; });
    var s = w.slice(0, 2).map(function (x) { return x.charAt(0).toUpperCase(); }).join('');
    return s || '?';
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
      var r = await c.from('risposte').select('giorno,corretta');
      var n = await c.rpc('mie_note');
      var mm = await c.rpc('stato_missioni');
      if (a.error || b.error) { state.error = 'err'; state.loaded = true; return; }
      state.nick = (p && p.data && p.data.nickname) || '';
      state.sedi = a.data || [];
      state.sbloccate = {};
      (b.data || []).forEach(function (x) { state.sbloccate[x.sede_id] = true; });
      var cnt = {}, ok = {};
      (r.data || []).forEach(function (x) {
        cnt[x.giorno] = (cnt[x.giorno] || 0) + 1;
        if (x.corretta) ok[x.giorno] = (ok[x.giorno] || 0) + 1;
      });
      state.giorni = {};
      state.perfetti = 0;
      Object.keys(cnt).forEach(function (k) {
        if (cnt[k] >= NEEDED) state.giorni[k] = true;
        if (cnt[k] >= NEEDED && ok[k] === cnt[k]) state.perfetti++;
      });
      var nd = (n && n.data) || {};
      state.scritte = nd.scritte || [];
      state.ricevute = nd.ricevute || [];
      state.m = (mm && !mm.error && mm.data && mm.data.ok) ? mm.data : null;
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

  function go(id) { if (window.WT_VIEW) window.WT_VIEW(id); }

  // ---- livello ----
  function levelInfo() {
    var pts = state.m ? state.m.punti : 0;
    var lv = Math.floor(pts / STEP) + 1;
    return { pts: pts, lv: lv, name: LEVELS[Math.min(lv, LEVELS.length) - 1], into: pts % STEP };
  }

  // ---- interfaccia ----
  function meCard() {
    var li = levelInfo();
    var card = el('div', 'me');
    card.appendChild(el('span', 'av', (state.nick || 'io').slice(0, 2).toUpperCase()));
    var box = el('div', 'me-text');
    if (!editing) {
      box.appendChild(el('b', null, state.nick ? '@' + state.nick : 'Senza nickname'));
      if (state.m) box.appendChild(el('span', null, li.name + ' · livello ' + li.lv));
      var b = el('button', 'me-edit', state.nick ? 'Cambia nickname' : 'Scegli un nickname');
      b.type = 'button';
      b.addEventListener('click', function () { editing = true; render(); var i = document.getElementById('io-nick'); if (i) i.focus(); });
      box.appendChild(b);
      card.appendChild(box);
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
    box.appendChild(lab);
    box.appendChild(inp);
    box.appendChild(row);
    box.appendChild(err);
    card.appendChild(box);
    return card;
  }

  function levelCard() {
    var li = levelInfo();
    var card = el('div', 'lvl');
    card.appendChild(el('div', 'hex', String(li.lv)));
    var box = el('div', 'lvl-text');
    box.appendChild(el('b', null, li.name));
    box.appendChild(el('small', null, li.pts + ' punti · ' + (STEP - li.into) + ' al livello ' + (li.lv + 1)));
    var bar = el('div', 'xpb');
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', String(STEP));
    bar.setAttribute('aria-valuenow', String(li.into));
    var fill = el('i');
    fill.style.setProperty('--w', Math.round(li.into / STEP * 100) + '%');
    bar.appendChild(fill);
    box.appendChild(bar);
    card.appendChild(box);
    return card;
  }

  function quest(sym, title, pts, pct, done, target) {
    var q = el('button', 'quest' + (done ? ' done' : ''));
    q.type = 'button';
    q.appendChild(el('span', 'qi', done ? '✓' : sym));
    var box = el('div', 'quest-text');
    var h = el('h4');
    h.appendChild(el('span', null, title));
    h.appendChild(el('em', null, '+' + pts));
    box.appendChild(h);
    var bar = el('div', 'xpb');
    var fill = el('i');
    fill.style.setProperty('--w', Math.round(pct * 100) + '%');
    bar.appendChild(fill);
    box.appendChild(bar);
    q.appendChild(box);
    q.setAttribute('aria-label', title + (done ? ': completata' : ': da fare'));
    q.addEventListener('click', function () { go(target); });
    return q;
  }

  function questsCard() {
    var o = state.m.oggi;
    var wrap = el('div', 'qs-wrap');
    wrap.appendChild(el('h4', 'sec', 'Missioni di oggi'));
    var list = el('div', 'qs');
    list.appendChild(quest('?', 'Quiz del giorno', 50, Math.min(1, o.risposte / NEEDED), !!o.quiz, 'gioca'));
    list.appendChild(quest('♻', 'Una partita a Dove lo butto?', 30, o.partite > 0 ? 1 : 0, o.partite > 0, 'gioca'));
    list.appendChild(quest('QR', 'Scansiona una sede (bonus)', 20, o.sede ? 1 : 0, !!o.sede, 'mappa'));
    wrap.appendChild(list);
    return wrap;
  }

  function chestCard() {
    var o = state.m.oggi;
    var ready = o.quiz && o.partite > 0;
    var opened = !!o.forziere;
    var wrap = el('div', 'chest-wrap');
    var chest = el('button', 'chest' + (opened ? ' open' : ready ? ' ready' : ' locked'));
    chest.type = 'button';
    var box = el('span', 'box');
    box.setAttribute('aria-hidden', 'true');
    box.appendChild(el('span', 'bd2'));
    box.appendChild(el('span', 'lid'));
    var conf = el('span', 'conf');
    ['#FD8F32', '#FFB36B', '#ffffff', '#C9A8FF', '#FD8F32'].forEach(function (c, k) {
      var i = el('i');
      i.style.setProperty('--x', (k * 26 - 52) + 'px');
      i.style.setProperty('--c', c);
      conf.appendChild(i);
    });
    box.appendChild(conf);
    chest.appendChild(box);
    chest.appendChild(el('strong', null, 'Forziere di oggi'));
    var txt = el('span', 'chest-txt', opened ? 'Aperto: +' + (o.forziere.punti || 50) + ' punti'
      : ready ? 'Tocca per aprirlo' : 'Completa il quiz e una partita per aprirlo');
    chest.appendChild(txt);
    if (!opened && !ready) chest.setAttribute('aria-disabled', 'true');
    wrap.appendChild(chest);

    var reveal = el('div', 'reveal');
    function showFact(f) {
      reveal.textContent = '';
      reveal.appendChild(el('span', 'eyebrow', 'Curiosità di oggi'));
      reveal.appendChild(el('p', null, f.testo));
      reveal.hidden = false;
    }
    reveal.hidden = !opened;
    if (opened) showFact(o.forziere);
    wrap.appendChild(reveal);
    var msg = el('p', 'pa-err');
    msg.setAttribute('role', 'alert');
    wrap.appendChild(msg);

    chest.addEventListener('click', async function () {
      if (opened || busy) return;
      if (!ready) { msg.textContent = 'Completa prima il quiz e una partita.'; return; }
      busy = true;
      msg.textContent = '';
      var res = null;
      try { res = await client().rpc('apri_forziere'); } catch (e) { res = null; }
      busy = false;
      var d = res && !res.error && res.data;
      if (!d || !d.ok) {
        msg.textContent = d && d.errore === 'missioni_incomplete'
          ? 'Completa prima il quiz e una partita.' : 'Non sono riuscito ad aprire il forziere. Riprova tra poco.';
        return;
      }
      opened = true;
      chest.classList.remove('ready');
      chest.classList.add('open', 'fresh');
      txt.textContent = 'Aperto: +' + (d.punti || 50) + ' punti';
      showFact(d.curiosita);
      setTimeout(function () { refresh(); }, 1600);
    });
    return wrap;
  }

  function stat(num, label) {
    var d = el('div');
    d.appendChild(el('b', null, num));
    d.appendChild(document.createTextNode(label));
    return d;
  }

  function statsCard() {
    var total = state.sedi.length;
    var got = state.sedi.filter(function (s) { return state.sbloccate[s.id]; }).length;
    var hearts = state.scritte.reduce(function (a, n) { return a + (n.like || 0); }, 0);
    var n = streak();
    var grid = el('div', 'nums');
    grid.appendChild(stat(got + '/' + (total || 14), 'sedi'));
    grid.appendChild(stat(String(state.scritte.length), state.scritte.length === 1 ? 'nota' : 'note'));
    grid.appendChild(stat(String(hearts), hearts === 1 ? 'cuore' : 'cuori'));
    grid.appendChild(stat(String(n), n === 1 ? 'giorno di serie' : 'giorni di serie'));
    return grid;
  }

  function medals() {
    var total = state.sedi.length || 14;
    var got = state.sedi.filter(function (s) { return state.sbloccate[s.id]; }).length;
    var hearts = state.scritte.reduce(function (a, n) { return a + (n.like || 0); }, 0);
    var best = bestStreak();
    var m = state.m || {};
    return [
      { n: 'Prima sede', d: 'Sblocca una sede', ok: got >= 1, s: '1' },
      { n: 'Metà percorso', d: 'Sblocca 7 sedi', ok: got >= 7, s: '7' },
      { n: 'Tutte le sedi', d: 'Sblocca tutte le sedi', ok: got >= total, s: String(total) },
      { n: 'Serie di 3', d: 'Completa il quiz 3 giorni di fila', ok: best >= 3, s: '3' },
      { n: 'Serie di 7', d: 'Completa il quiz 7 giorni di fila', ok: best >= 7, s: '7' },
      { n: 'Quiz perfetto', d: 'Rispondi giusto a tutte le 5 domande', ok: state.perfetti >= 1, s: '★' },
      { n: 'Riciclatore', d: 'Gioca 5 partite a Dove lo butto?', ok: (m.partite_totali || 0) >= 5, s: '♻' },
      { n: 'Maestro del nastro', d: 'Fai 300 punti in una partita', ok: (m.record || 0) >= 300, s: '300' },
      { n: 'Poeta', d: 'Scrivi una nota', ok: state.scritte.length >= 1, s: '✎' },
      { n: 'Primo cuore', d: 'Ricevi un cuore su una tua nota', ok: hearts >= 1, s: '♥' },
      { n: 'Cacciatore di tesori', d: 'Apri 5 forzieri', ok: (m.forzieri || 0) >= 5, s: '5' },
      { n: 'Collezionista', d: 'Raccogli 10 curiosità', ok: (m.curiosita || []).length >= 10, s: '10' }
    ];
  }

  function medalsCard() {
    var list = medals();
    var n = list.filter(function (x) { return x.ok; }).length;
    var wrap = el('div', 'meds');
    wrap.appendChild(el('h4', 'sec', 'Medaglie · ' + n + ' su ' + list.length));
    var grid = el('div', 'bds');
    list.forEach(function (x) {
      var d = el('div', 'bd' + (x.ok ? ' on' : ''));
      d.setAttribute('aria-label', x.n + (x.ok ? ': ottenuta' : ': ' + x.d));
      d.appendChild(el('i', null, x.s));
      d.appendChild(el('span', null, x.n));
      if (!x.ok) d.appendChild(el('small', null, x.d));
      grid.appendChild(d);
    });
    wrap.appendChild(grid);
    return wrap;
  }

  function passportCard() {
    var got = state.sedi.filter(function (s) { return state.sbloccate[s.id]; }).length;
    var wrap = el('div', 'pass-wrap');
    wrap.appendChild(el('h4', 'sec', 'Il tuo passaporto · ' + got + ' su ' + (state.sedi.length || 14)));
    var grid = el('div', 'pass');
    state.sedi.forEach(function (s, i) {
      var on = !!state.sbloccate[s.id];
      var d = el('div', 'st' + (on ? ' on' : ''));
      d.setAttribute('aria-label', s.nome + (on ? ': sbloccata' : ': da sbloccare'));
      d.appendChild(el('i', null, initials(s.nome)));
      d.appendChild(el('span', null, s.nome));
      grid.appendChild(d);
    });
    wrap.appendChild(grid);
    return wrap;
  }

  function curiositaCard() {
    var m = state.m;
    var wrap = el('div', 'cur-wrap');
    wrap.appendChild(el('h4', 'sec', 'Le tue curiosità · ' + m.curiosita.length + ' su ' + (m.curiosita_totali || m.curiosita.length)));
    if (!m.curiosita.length) {
      wrap.appendChild(el('p', 'cur-empty', 'Apri il forziere ogni giorno per raccogliere curiosità su Verona.'));
      return wrap;
    }
    var ul = el('ul', 'cur');
    m.curiosita.forEach(function (f) { ul.appendChild(el('li', null, f.testo)); });
    wrap.appendChild(ul);
    return wrap;
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
    var stack = el('div', 'stack');
    stack.appendChild(meCard());
    if (state.m) {
      stack.appendChild(levelCard());
      stack.appendChild(questsCard());
      stack.appendChild(chestCard());
    }
    stack.appendChild(statsCard());
    stack.appendChild(medalsCard());
    stack.appendChild(passportCard());
    if (state.m) stack.appendChild(curiositaCard());
    view.appendChild(stack);
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
