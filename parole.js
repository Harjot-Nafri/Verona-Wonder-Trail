// Sezione "Parole": scrivi una nota da una sede, ricevine una scritta in un'altra sede, metti il cuore.
(function () {
  var view = document.getElementById('parole-view');
  if (!view) return;

  var MAX = 400;
  var MIN = 5;
  var state = { loaded: false, error: null, sedi: [], sbloccate: {}, scritte: [], ricevute: [], inAttesa: 0 };
  var flash = { newId: null, msg: '' };
  var draft = { sede: '', testo: '', anonima: false, cover: '' };
  var busy = false;

  var ERR = {
    sede_non_sbloccata: 'Prima devi sbloccare questa sede con il suo QR.',
    gia_scritta: 'Hai già scritto una nota da questa sede.',
    troppo_corta: 'La nota è troppo corta: servono almeno ' + MIN + ' caratteri.',
    troppo_lunga: 'La nota è troppo lunga: massimo ' + MAX + ' caratteri.',
    non_autenticato: 'Sessione scaduta. Ricarica la pagina.'
  };

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

  // ---- dati ----
  async function load() {
    var c = client();
    if (!c) { state.error = 'nd'; state.loaded = true; return; }
    try {
      var a = await c.from('sedi').select('id,nome,ordine').order('ordine');
      var b = await c.from('sblocchi').select('sede_id');
      var n = await c.rpc('mie_note');
      if (a.error || b.error || n.error || !n.data) { state.error = 'err'; state.loaded = true; return; }
      state.sedi = a.data || [];
      state.sbloccate = {};
      (b.data || []).forEach(function (r) { state.sbloccate[r.sede_id] = true; });
      state.scritte = n.data.scritte || [];
      state.ricevute = n.data.ricevute || [];
      state.inAttesa = n.data.in_attesa || 0;
      state.error = null;
    } catch (e) {
      state.error = 'err';
    }
    state.loaded = true;
  }

  function freeSedi() {
    var done = {};
    state.scritte.forEach(function (n) { done[n.sede_id] = true; });
    return state.sedi.filter(function (s) { return state.sbloccate[s.id] && !done[s.id]; });
  }
  function unlockedCount() {
    return state.sedi.filter(function (s) { return state.sbloccate[s.id]; }).length;
  }

  // ---- azioni ----
  async function send(sede, testo, anonima, cover, errEl, btn) {
    if (busy) return;
    busy = true;
    btn.disabled = true;
    errEl.textContent = '';
    var res;
    try {
      res = await client().rpc('scrivi_nota', { p_sede: sede, p_testo: testo, p_anonima: anonima, p_copertina: cover || null });
    } catch (e) {
      res = { error: e };
    }
    busy = false;
    var d = res && res.data;
    if (!d || res.error) {
      errEl.textContent = 'Non sono riuscito a inviare la nota. Riprova.';
      btn.disabled = false;
      return;
    }
    if (!d.ok) {
      errEl.textContent = ERR[d.errore] || 'Non è stato possibile inviare la nota.';
      btn.disabled = false;
      return;
    }
    draft = { sede: '', testo: '', anonima: false, cover: '' };
    flash.newId = d.ricevuta ? d.ricevuta.id : null;
    flash.msg = d.ricevuta
      ? 'Nota inviata. Ecco la nota che hai ricevuto in cambio.'
      : 'Nota inviata. Per ora non ci sono note di altri poli: la tua ti aspetta, ritirala più tardi.';
    await load();
    render();
    window.scrollTo(0, 0);
  }

  async function collect(btn, msgEl) {
    if (busy) return;
    busy = true;
    btn.disabled = true;
    var res;
    try { res = await client().rpc('ricevi_nota'); } catch (e) { res = { error: e }; }
    busy = false;
    var d = res && res.data;
    if (!d || res.error) {
      msgEl.textContent = 'Non sono riuscito a controllare. Riprova.';
      btn.disabled = false;
      return;
    }
    if (d.ricevuta) {
      flash.newId = d.ricevuta.id;
      flash.msg = 'Ecco la tua nota.';
      await load();
      render();
    } else {
      msgEl.textContent = 'Non ci sono ancora note di altri poli. Riprova più tardi.';
      btn.disabled = false;
    }
  }

  async function toggleHeart(note, want) {
    if (busy) return null;
    busy = true;
    var res;
    try { res = await client().rpc('metti_like', { p_nota: note.id, p_si: want }); } catch (e) { res = { error: e }; }
    busy = false;
    var d = res && res.data;
    if (!d || res.error || !d.ok) return null;
    if (want && navigator.vibrate) { try { navigator.vibrate(15); } catch (e) {} }
    return d;
  }

  async function report(note) {
    try { await client().rpc('segnala_nota', { p_nota: note.id }); } catch (e) {}
    await load();
    render();
  }

  // ---- interfaccia ----
  function formCard() {
    var card = el('div', 'gcard');
    var h = el('h3', null, 'Lascia la bellezza delle tue parole');
    card.appendChild(h);

    var free = freeSedi();
    if (!unlockedCount()) {
      card.appendChild(el('p', null, 'Per scrivere una nota devi prima sbloccare una sede: scansiona il suo QR.'));
      return card;
    }
    if (!free.length) {
      card.appendChild(el('p', null, 'Hai scritto una nota per ogni sede che hai sbloccato. Sblocca un\'altra sede per scriverne una nuova.'));
      return card;
    }
    card.appendChild(el('p', null, 'Scrivi un pensiero gentile per chi passerà da un altro luogo. In cambio riceverai una nota scritta per te. Le note con più cuori partecipano all\'estrazione del premio.'));

    var lab = el('label', 'pa-label', 'Da quale sede scrivi?');
    lab.setAttribute('for', 'pa-sede');
    var sel = el('select', 'pa-select');
    sel.id = 'pa-sede';
    free.forEach(function (s) {
      var o = el('option', null, s.nome);
      o.value = s.id;
      sel.appendChild(o);
    });
    if (draft.sede && free.some(function (s) { return s.id === draft.sede; })) sel.value = draft.sede;
    card.appendChild(lab);
    card.appendChild(sel);

    var cv = el('fieldset', 'cv');
    cv.appendChild(el('legend', 'pa-label', 'Scegli la copertina'));
    var grid = el('div', 'cv-grid');
    window.WT_CARDS.COVERS.forEach(function (c) {
      var lb = el('label', 'cv-opt');
      var rd = el('input');
      rd.type = 'radio';
      rd.name = 'pa-cover';
      rd.value = c[0];
      rd.checked = draft.cover === c[0];
      rd.addEventListener('change', function () { draft.cover = c[0]; });
      var im = el('img');
      im.src = window.WT_CARDS.coverSrc(c[0]);
      im.alt = c[1];
      im.loading = 'lazy';
      lb.appendChild(rd);
      lb.appendChild(im);
      lb.appendChild(el('span', null, c[1]));
      grid.appendChild(lb);
    });
    cv.appendChild(grid);
    cv.appendChild(el('p', 'pa-hint', 'Se non scegli, la copertina sarà a caso.'));
    card.appendChild(cv);

    var pvLab = el('p', 'pa-prevlab', 'Anteprima della tua nota');
    var pv = el('div', 'pa-prevwrap');
    card.appendChild(pvLab);
    card.appendChild(pv);
    var pvCover = window.WT_CARDS.COVERS[Math.floor(Math.random() * window.WT_CARDS.COVERS.length)][0];
    function drawPrev() {
      var ul = el('ul', 'pa-list hc-list');
      ul.style.padding = '0';
      ul.appendChild(window.WT_CARDS.build({
        copertina: draft.cover || pvCover,
        sede_nome: (sel.options[sel.selectedIndex] || {}).text || '',
        testo: draft.testo.trim() || 'Qui vedi la tua nota…',
        like: 0
      }, { byText: draft.anonima ? 'Anonimo' : 'Tu' }));
      pv.textContent = '';
      pv.appendChild(ul);
    }
    cv.addEventListener('change', drawPrev);

    var lab2 = el('label', 'pa-label', 'La tua nota');
    lab2.setAttribute('for', 'pa-testo');
    var ta = el('textarea', 'pa-text');
    ta.id = 'pa-testo';
    ta.maxLength = MAX;
    ta.placeholder = 'Oggi vorrei dirti che…';
    ta.value = draft.testo;
    card.appendChild(lab2);
    card.appendChild(ta);

    var row = el('div', 'pa-row');
    var chk = el('label', 'pa-check');
    var cb = el('input');
    cb.type = 'checkbox';
    cb.id = 'pa-anon';
    cb.checked = draft.anonima;
    chk.appendChild(cb);
    chk.appendChild(document.createTextNode('Invia in anonimo'));
    var count = el('span', 'pa-count', ta.value.length + '/' + MAX);
    row.appendChild(chk);
    row.appendChild(count);
    card.appendChild(row);

    card.appendChild(el('p', 'pa-hint', 'Non scrivere nomi, numeri di telefono o altri dati personali. Senza «anonimo», gli altri vedranno il tuo nickname.'));

    var btn = el('button', 'gbtn', 'Invia e sblocca una nota');
    btn.type = 'button';
    var err = el('p', 'pa-err');
    err.setAttribute('role', 'alert');
    function sync() {
      draft.testo = ta.value;
      draft.anonima = cb.checked;
      draft.sede = sel.value;
      count.textContent = ta.value.length + '/' + MAX;
      btn.disabled = ta.value.trim().length < MIN;
      drawPrev();
    }
    ta.addEventListener('input', sync);
    cb.addEventListener('change', sync);
    sel.addEventListener('change', sync);
    btn.addEventListener('click', function () { send(sel.value, ta.value, cb.checked, draft.cover, err, btn); });
    sync();
    card.appendChild(btn);
    card.appendChild(err);
    return card;
  }

  function waitingCard() {
    var card = el('div', 'gcard');
    card.appendChild(el('h3', null, 'La tua nota ti aspetta'));
    card.appendChild(el('p', null, 'Hai scritto ma non c\'erano ancora note di altri poli. Appena ne arriva una, puoi ritirarla qui.'));
    var msg = el('p', 'pa-err');
    msg.setAttribute('role', 'status');
    var b = el('button', 'gbtn', 'Ritira la nota');
    b.type = 'button';
    b.addEventListener('click', function () { collect(b, msg); });
    card.appendChild(b);
    card.appendChild(msg);
    return card;
  }

  function receivedOpts(n) {
    var slot = el('div', 'pa-confirm');
    var rep = el('button', 'pa-link', 'Segnala');
    rep.type = 'button';
    rep.addEventListener('click', function () {
      slot.textContent = '';
      slot.appendChild(document.createTextNode('Segnalare questa nota?'));
      var yes = el('button', 'pa-link', 'Sì');
      yes.type = 'button';
      yes.addEventListener('click', function () { closeModal(); report(n); });
      var no = el('button', 'pa-link', 'No');
      no.type = 'button';
      no.addEventListener('click', function () { slot.textContent = ''; slot.appendChild(rep); rep.focus(); });
      slot.appendChild(yes);
      slot.appendChild(no);
      yes.focus();
    });
    slot.appendChild(rep);
    return { isNew: n.id === flash.newId, toggle: toggleHeart, extra: slot };
  }

  // ---- griglia di miniature + polaroid a schermo intero ----
  var modal = null;
  function closeModal() {
    if (!modal) return;
    var m = modal;
    modal = null;
    document.removeEventListener('keydown', m.key);
    m.node.remove();
    document.body.style.overflow = '';
    if (m.opener && document.contains(m.opener)) m.opener.focus();
    var o = m.opener;
    if (o && o.refresh) o.refresh();
  }
  function openModal(notes, i, optsFor, opener) {
    closeModal();
    var node = el('div', 'pm');
    node.setAttribute('role', 'dialog');
    node.setAttribute('aria-modal', 'true');
    node.setAttribute('aria-label', 'Nota');
    var x = el('button', 'pm-x', '✕');
    x.type = 'button';
    x.setAttribute('aria-label', 'Chiudi');
    x.addEventListener('click', closeModal);
    var stage = el('div', 'pm-stage');
    var nav = el('div', 'pm-nav');
    var prev = el('button', 'pm-ar', '‹');
    var next = el('button', 'pm-ar', '›');
    prev.type = next.type = 'button';
    prev.setAttribute('aria-label', 'Nota precedente');
    next.setAttribute('aria-label', 'Nota successiva');
    var cnt = el('span', 'pm-cnt');
    cnt.setAttribute('aria-live', 'polite');
    nav.appendChild(prev); nav.appendChild(cnt); nav.appendChild(next);
    var tip = el('p', 'pm-tip', '← Scorri con il dito per le altre note →');
    tip.hidden = notes.length < 2;
    node.appendChild(x); node.appendChild(stage); node.appendChild(tip); node.appendChild(nav);
    node.addEventListener('click', function (e) { if (e.target === node || e.target === stage) closeModal(); });
    function show(k) {
      i = (k + notes.length) % notes.length;
      stage.textContent = '';
      var ul = el('ul', 'pa-list hc-list');
      ul.appendChild(window.WT_CARDS.build(notes[i], optsFor(notes[i])));
      stage.appendChild(ul);
      cnt.textContent = (i + 1) + ' / ' + notes.length;
      prev.hidden = next.hidden = notes.length < 2;
    }
    prev.addEventListener('click', function () { show(i - 1); });
    next.addEventListener('click', function () { show(i + 1); });
    var sx = null;
    node.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    node.addEventListener('touchend', function (e) {
      if (sx == null) return;
      var d = e.changedTouches[0].clientX - sx;
      sx = null;
      if (Math.abs(d) > 60 && notes.length > 1) show(d < 0 ? i + 1 : i - 1);
    });
    var key = function (e) {
      if (e.key === 'Escape') closeModal();
      else if (e.key === 'ArrowLeft' && notes.length > 1) show(i - 1);
      else if (e.key === 'ArrowRight' && notes.length > 1) show(i + 1);
    };
    document.addEventListener('keydown', key);
    modal = { node: node, key: key, opener: opener };
    document.body.appendChild(node);
    document.body.style.overflow = 'hidden';
    show(i);
    x.focus();
  }
  function gridOf(notes, optsFor, openIdx) {
    var g = el('div', 'pg');
    var counts = [];
    notes.forEach(function (n, i) {
      var b = el('button', 'pg-it' + (n.nascosta ? ' off' : '') + ((n.like || 0) >= 8 ? ' leg' : ''));
      b.type = 'button';
      b.setAttribute('aria-label', 'Apri la nota scritta a ' + n.sede_nome + ', ' + (n.like || 0) + ' cuori');
      if (n.copertina) {
        var im = el('img');
        im.src = window.WT_CARDS.coverSrc(n.copertina);
        im.alt = '';
        im.loading = 'lazy';
        b.appendChild(im);
      }
      var c = el('span', 'pg-h', '♥ ' + (n.like || 0));
      counts.push(function () { c.textContent = '♥ ' + (n.like || 0); b.classList.toggle('leg', (n.like || 0) >= 8); });
      b.appendChild(c);
      if (n.id === flash.newId) b.classList.add('new');
      b.refresh = function () { counts.forEach(function (f) { f(); }); };
      b.addEventListener('click', function () { openModal(notes, i, optsFor, b); });
      g.appendChild(b);
    });
    return g;
  }

  function receivedCard() {
    var card = el('div', 'gcard');
    card.appendChild(el('h4', 'sec', 'Note ricevute (' + state.ricevute.length + ')'));
    if (!state.ricevute.length) {
      card.appendChild(el('p', null, 'Ancora nessuna. Scrivi la tua nota e ne riceverai una in cambio.'));
      return card;
    }
    card.appendChild(gridOf(state.ricevute, function (n) {
      var o = receivedOpts(n);
      return o;
    }));
    card.appendChild(el('p', 'pa-hint', 'Tocca una foto per aprire la nota, poi scorri con il dito per vedere le altre.'));
    return card;
  }

  function mineCard() {
    var card = el('div', 'gcard');
    card.appendChild(el('h4', 'sec', 'Le tue note (' + state.scritte.length + ')'));
    if (!state.scritte.length) {
      card.appendChild(el('p', null, 'Quando scrivi una nota, qui vedi quanti cuori riceve.'));
      return card;
    }
    card.appendChild(gridOf(state.scritte, function (n) {
      var st = n.nascosta ? 'Nascosta dalla moderazione'
        : n.scambiata ? '' : 'In attesa dello scambio';
      return { off: n.nascosta, byText: n.anonima ? 'Anonima' : 'Tu', extra: st ? el('p', 'pa-meta hc-state', st) : null };
    }));
    card.appendChild(el('p', 'pa-hint', 'Tocca una foto per aprire la nota, poi scorri con il dito per vedere le altre. L\'arancione indica le più amate.'));
    return card;
  }

  function render() {
    closeModal();
    view.textContent = '';
    if (!state.loaded) {
      var l = el('div', 'gcard');
      l.appendChild(el('p', null, 'Carico le note…'));
      view.appendChild(l);
      return;
    }
    if (state.error) {
      var e = el('div', 'gcard');
      e.appendChild(el('p', null, state.error === 'nd' ? 'Le note non sono disponibili in questo momento.' : 'Non riesco a caricare le note. Riprova tra poco.'));
      view.appendChild(e);
      return;
    }
    if (flash.msg) {
      var f = el('div', 'gcard');
      f.appendChild(el('p', 'streak', flash.msg));
      f.setAttribute('role', 'status');
      view.appendChild(f);
    }
    if (state.inAttesa > 0 && !flash.newId) view.appendChild(waitingCard());
    if (flash.newId) {
      view.appendChild(receivedCard());
      view.appendChild(formCard());
    } else {
      view.appendChild(formCard());
      view.appendChild(receivedCard());
    }
    view.appendChild(mineCard());
    if (flash.newId) {
      var ni = -1;
      state.ricevute.forEach(function (r, k) { if (r.id === flash.newId) ni = k; });
      if (ni >= 0) openModal(state.ricevute, ni, receivedOpts, view.querySelector('.pg-it.new'));
    }
    flash.newId = null;
  }

  // ---- avvio: si aggiorna ogni volta che si apre la scheda ----
  var started = false;
  function refresh() {
    if (!client() || !window.WT.ready) return;
    started = true;
    load().then(render);
  }
  document.addEventListener('wt:view', function (e) {
    if (e.detail === 'parole') { flash.msg = ''; flash.newId = null; refresh(); }
  });
  document.addEventListener('wt:ready', function () {
    if (document.body.getAttribute('data-view') === 'parole') refresh();
  }, { once: true });
  if (window.WT && window.WT.ready && document.body.getAttribute('data-view') === 'parole') refresh();
  if (!client()) { state.error = 'nd'; state.loaded = true; }
  render();
})();
