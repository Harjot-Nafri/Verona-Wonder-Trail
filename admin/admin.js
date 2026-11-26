// Area team: login con email+password, codice a 6 cifre, poi pannello. Tutto il testo è inserito con textContent.
(function () {
  var app = document.getElementById('app');
  var C = window.WT_CONFIG;
  var sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_KEY, {
    auth: { storageKey: 'wt-admin-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });
  var tab = 'panoramica';
  var IDLE_MS = 15 * 60 * 1000;   // disconnessione dopo 15 minuti di inattività
  var QR_MS = 5 * 60 * 1000;      // il QR di attivazione vale 5 minuti
  var LAST = 'wt-admin-last';
  var idleTimer = null;
  function touch() { try { localStorage.setItem(LAST, String(Date.now())); } catch (e) {} }
  function lastTouch() { try { return Number(localStorage.getItem(LAST)) || 0; } catch (e) { return 0; } }
  function startIdle() {
    if (idleTimer) return;
    var t = 0;
    function act() { var n = Date.now(); if (n - t > 5000) { t = n; touch(); } }
    ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, act, { passive: true }); });
    idleTimer = setInterval(async function () {
      if (Date.now() - lastTouch() > IDLE_MS) { clearInterval(idleTimer); idleTimer = null; await sb.auth.signOut(); loginView('Sessione scaduta per inattività. Rientra.'); }
    }, 15000);
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function clear() { while (app.firstChild) app.removeChild(app.firstChild); }
  function field(label, type, name, attrs) {
    var w = el('div');
    var l = el('label', null, label); l.setAttribute('for', name);
    var i = el('input'); i.type = type; i.id = name; i.name = name;
    Object.keys(attrs || {}).forEach(function (k) { i.setAttribute(k, attrs[k]); });
    w.appendChild(l); w.appendChild(i);
    return { wrap: w, input: i };
  }
  function fmt(d) {
    try { return new Date(d).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }); } catch (e) { return ''; }
  }
  async function rpc(name, args) {
    var r = await sb.rpc(name, args || {});
    if (r.error) throw r.error;
    return r.data;
  }

  // ---------- accesso ----------
  function loginView(msg) {
    clear();
    var box = el('form', 'card login');
    box.appendChild(el('h1', null, 'Area team'));
    box.appendChild(el('p', null, 'Accesso riservato al team di Wonder Trail.'));
    var e = field('Email', 'email', 'em', { autocomplete: 'username', required: '' });
    var p = field('Password', 'password', 'pw', { autocomplete: 'current-password', required: '' });
    var err = el('p', 'err', msg || ''); err.setAttribute('role', 'alert');
    var b = el('button', 'btn pri', 'Entra'); b.type = 'submit';
    box.append(e.wrap, p.wrap, err, b);
    box.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      b.disabled = true; err.textContent = '';
      var r = await sb.auth.signInWithPassword({ email: e.input.value.trim(), password: p.input.value });
      if (r.error) { err.textContent = 'Email o password non corretti.'; b.disabled = false; return; }
      touch();
      boot();
    });
    app.appendChild(box);
  }
  function logoutBtn() {
    var b = el('button', 'btn', 'Esci'); b.type = 'button';
    b.addEventListener('click', async function () { await sb.auth.signOut(); try { localStorage.removeItem(LAST); } catch (e) {} loginView(); });
    return b;
  }
  function deniedView() {
    clear();
    var box = el('div', 'card login');
    box.appendChild(el('h1', null, 'Accesso non autorizzato'));
    box.appendChild(el('p', null, 'Questo account non fa parte del team.'));
    box.appendChild(logoutBtn());
    app.appendChild(box);
  }
  async function mfaView() {
    clear();
    var box = el('form', 'card login');
    box.appendChild(el('h1', null, 'Verifica a due passaggi'));
    var fl = await sb.auth.mfa.listFactors();
    var vecchi = (fl.data && fl.data.all || []).filter(function (x) { return x.status !== 'verified'; });
    for (var q = 0; q < vecchi.length; q++) { await sb.auth.mfa.unenroll({ factorId: vecchi[q].id }); }
    var f = fl.data && fl.data.totp && fl.data.totp.filter(function (x) { return x.status === 'verified'; })[0];
    var enroll = null;
    if (!f) {
      var en = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Wonder Trail ' + Date.now() });
      if (en.error) { box.appendChild(el('p', 'err', 'Non riesco ad attivare la verifica. Riprova.')); box.appendChild(logoutBtn()); app.appendChild(box); return; }
      enroll = en.data;
      box.appendChild(el('p', null, 'Prima volta: apri la tua app di autenticazione (Google Authenticator, Authy, 1Password…), scansiona questo codice e inserisci le 6 cifre che mostra.'));
      var img = el('img'); img.alt = 'Codice QR per l\'app di autenticazione'; img.width = 180; img.height = 180;
      img.src = enroll.totp.qr_code; img.style.background = '#fff'; img.style.borderRadius = '12px'; img.style.padding = '8px';
      box.appendChild(img);
      box.appendChild(el('p', 'meta', 'Se non puoi scansionare, inserisci a mano: ' + enroll.totp.secret));
      var cd = el('p', 'meta'); box.appendChild(cd);
      var fine = Date.now() + QR_MS;
      var iv = setInterval(async function () {
        var r = fine - Date.now();
        if (!document.body.contains(cd)) { clearInterval(iv); return; }
        if (r <= 0) {
          clearInterval(iv);
          await sb.auth.mfa.unenroll({ factorId: enroll.id });
          mfaView();
          return;
        }
        var m = Math.floor(r / 60000), sec = Math.floor(r % 60000 / 1000);
        cd.textContent = 'Questo codice scade tra ' + m + ':' + (sec < 10 ? '0' : '') + sec + ', poi ne verrà creato uno nuovo.';
      }, 1000);
      f = enroll;
    } else {
      box.appendChild(el('p', null, 'Inserisci il codice a 6 cifre della tua app di autenticazione.'));
    }
    var c = field('Codice', 'text', 'code', { inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6', pattern: '[0-9]{6}', required: '' });
    var err = el('p', 'err'); err.setAttribute('role', 'alert');
    var b = el('button', 'btn pri', 'Verifica'); b.type = 'submit';
    box.append(c.wrap, err, b, el('span'), logoutBtn());
    box.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      b.disabled = true; err.textContent = '';
      var ch = await sb.auth.mfa.challenge({ factorId: f.id });
      if (ch.error) { err.textContent = 'Errore. Riprova.'; b.disabled = false; return; }
      var v = await sb.auth.mfa.verify({ factorId: f.id, challengeId: ch.data.id, code: c.input.value.trim() });
      if (v.error) { err.textContent = 'Codice non corretto.'; b.disabled = false; return; }
      boot();
    });
    app.appendChild(box);
  }

  // ---------- pannello ----------
  var TABS = [['panoramica', 'Panoramica'], ['note', 'Note da rivedere'], ['utenti', 'Utenti'], ['finali', 'Note finali'], ['regole', 'Regole filtro'], ['registro', 'Registro']];
  function shell(stato) {
    clear();
    var w = el('div', 'wrap');
    var bar = el('div', 'bar');
    var h = el('h1', null, 'Wonder Trail · '); h.appendChild(el('span', null, 'Area team'));
    bar.appendChild(h);
    bar.appendChild(logoutBtn());
    w.appendChild(bar);
    var tabs = el('div', 'tabs'); tabs.setAttribute('role', 'tablist');
    TABS.forEach(function (t) {
      var b = el('button', 'tab', t[1]); b.type = 'button'; b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(tab === t[0]));
      b.addEventListener('click', function () { tab = t[0]; show(); });
      tabs.appendChild(b);
    });
    w.appendChild(tabs);
    var body = el('div'); w.appendChild(body);
    app.appendChild(w);
    return body;
  }
  async function show() {
    var body = shell();
    body.appendChild(el('p', 'meta', 'Carico…'));
    try {
      var out = el('div');
      if (tab === 'panoramica') await vPan(out);
      else if (tab === 'note') await vNote(out);
      else if (tab === 'utenti') await vUtenti(out);
      else if (tab === 'finali') await vFinali(out);
      else if (tab === 'regole') await vRegole(out);
      else await vReg(out);
      body.textContent = ''; body.appendChild(out);
    } catch (e) {
      body.textContent = '';
      body.appendChild(el('p', 'err', e && e.code === '42501' ? 'Sessione non più valida: esci e rientra.' : 'Errore nel caricamento. Riprova.'));
    }
  }
  function kpi(v, l, hot) { var k = el('div', 'kpi' + (hot ? ' hot' : '')); k.appendChild(el('b', null, String(v))); k.appendChild(el('span', null, l)); return k; }

  async function vPan(out) {
    var s = await rpc('admin_statistiche');
    var g = el('div', 'grid');
    g.append(kpi(s.visitatori, 'visitatori totali'), kpi(s.con_nickname, 'con nickname'), kpi(s.nuovi_7g, 'nuovi (7 giorni)'),
      kpi(s.attivi_7g, 'attivi (7 giorni)'), kpi(s.sblocchi, 'sblocchi sedi'), kpi(s.note.totali, 'note scritte'),
      kpi(s.note.da_rivedere, 'note da rivedere', s.note.da_rivedere > 0), kpi(s.note.segnalate, 'note segnalate', s.note.segnalate > 0),
      kpi(s.cuori, 'cuori dati'), kpi(s.risposte, 'risposte al quiz'),
      kpi(s.risposte ? Math.round(100 * s.risposte_corrette / s.risposte) + '%' : '—', 'risposte corrette'),
      kpi(s.partite, 'partite minigioco'), kpi(s.punteggio_medio, 'punteggio medio'), kpi(s.forzieri, 'forzieri aperti'), kpi(s.bloccati, 'utenti bloccati'));
    out.appendChild(g);
    var c1 = el('div', 'card'); c1.appendChild(el('h3', null, 'Ultimi 14 giorni'));
    [['sblocchi', 'Sblocchi'], ['note', 'Note'], ['risposte', 'Risposte quiz'], ['partite', 'Partite']].forEach(function (m) {
      var mx = Math.max.apply(null, s.serie.map(function (d) { return d[m[0]]; }).concat([1]));
      c1.appendChild(el('p', 'meta', m[1] + ' (totale ' + s.serie.reduce(function (a, d) { return a + d[m[0]]; }, 0) + ')'));
      var sp = el('div', 'spark');
      s.serie.forEach(function (d) {
        var i = el('i'); i.style.height = Math.max(2, Math.round(100 * d[m[0]] / mx)) + '%'; i.title = d.giorno + ': ' + d[m[0]];
        sp.appendChild(i);
      });
      c1.appendChild(sp);
    });
    out.appendChild(c1);
    var c2 = el('div', 'card bars'); c2.appendChild(el('h3', null, 'Sblocchi per sede'));
    var mx2 = Math.max.apply(null, s.sblocchi_per_sede.map(function (x) { return x.n; }).concat([1]));
    s.sblocchi_per_sede.forEach(function (x) {
      var r = el('div', 'row'); r.appendChild(el('span', null, x.nome));
      var t = el('div', 'track'); var f = el('div', 'fill'); f.style.width = Math.round(100 * x.n / mx2) + '%'; t.appendChild(f);
      r.appendChild(t); r.appendChild(el('span', null, String(x.n))); c2.appendChild(r);
    });
    out.appendChild(c2);
    out.appendChild(el('p', 'meta', 'Aggiornato: ' + fmt(s.generato)));
  }

  var MOT = { dati_personali: 'Dati personali', offensivo: 'Linguaggio offensivo', odio: 'Odio / discriminazione', violenza: 'Violenza', politica: 'Politica', sessuale: 'Contenuto sessuale', sostanze: 'Sostanze', segnalata: 'Segnalata dagli utenti' };
  async function vNote(out) {
    var filtro = 'da_rivedere';
    var bar = el('div', 'actions');
    var holder = el('div');
    async function load() {
      holder.textContent = '';
      var list = await rpc('admin_note', { p_filtro: filtro, p_limite: 100 });
      if (!list.length) holder.appendChild(el('div', 'card', filtro === 'da_rivedere' ? 'Nessuna nota da rivedere. 🎉' : 'Nessuna nota.'));
      list.forEach(function (n) { holder.appendChild(noteCard(n, load)); });
    }
    [['da_rivedere', 'Da rivedere'], ['segnalate', 'Segnalate dagli utenti'], ['tutte', 'Tutte']].forEach(function (f) {
      var b = el('button', 'btn', f[1]); b.type = 'button';
      b.addEventListener('click', function () { filtro = f[0]; load().catch(function () { holder.textContent = 'Errore.'; }); });
      bar.appendChild(b);
    });
    out.appendChild(bar); out.appendChild(el('p')); out.appendChild(holder);
    await load();
  }
  function noteCard(n, reload) {
    var c = el('div', 'card');
    var m = el('p', 'meta', n.sede + ' · ' + fmt(n.creata_il) + ' · autore: @' + n.autore + (n.anonima ? ' (anonima per gli altri)' : '') + ' · ♥ ' + n.cuori + ' · segnalazioni: ' + n.segnalazioni);
    c.appendChild(m);
    c.appendChild(el('p', 'note-t', n.testo));
    (n.motivi || []).forEach(function (x) { c.appendChild(el('span', 'chip red', MOT[x] || x)); });
    c.appendChild(el('span', 'chip', 'Stato: ' + n.revisione + (n.nascosta ? ' · nascosta' : ' · pubblica')));
    if (n.autore_bloccato) c.appendChild(el('span', 'chip red', 'Autore bloccato'));
    var a = el('div', 'actions');
    function act(label, cls, fn) {
      var b = el('button', 'btn ' + cls, label); b.type = 'button';
      b.addEventListener('click', async function () {
        b.disabled = true;
        try { await fn(); await reload(); } catch (e) { b.disabled = false; alert('Operazione non riuscita.'); }
      });
      a.appendChild(b);
    }
    act('Approva e pubblica', 'ok', function () { return rpc('admin_modera_nota', { p_nota: n.id, p_azione: 'approva' }); });
    act('Nascondi', 'no', function () { return rpc('admin_modera_nota', { p_nota: n.id, p_azione: 'nascondi' }); });
    act(n.autore_bloccato ? 'Sblocca autore' : 'Nascondi e blocca autore', 'no', async function () {
      if (!n.autore_bloccato) await rpc('admin_modera_nota', { p_nota: n.id, p_azione: 'nascondi' });
      await rpc('admin_blocca_utente', { p_user: n.autore_id, p_bloccato: !n.autore_bloccato, p_motivo: 'Nota ' + n.id });
    });
    c.appendChild(a);
    return c;
  }

  async function vUtenti(out) {
    var q = field('Cerca per nickname o codice', 'search', 'q', { maxlength: '20' });
    var holder = el('div', 'card scroll');
    async function load() {
      holder.textContent = '';
      var list = await rpc('admin_utenti', { p_cerca: q.input.value.trim(), p_limite: 100 });
      var t = el('table'); var hr = el('tr');
      ['Nickname', 'Codice', 'Iscritto', 'Sedi', 'Note', 'Quiz', 'Partite', 'Ultima attività', 'Premio', ''].forEach(function (h) { hr.appendChild(el('th', null, h)); });
      t.appendChild(hr);
      list.forEach(function (u) {
        var r = el('tr');
        r.appendChild(el('td', null, '@' + u.nickname + (u.bloccato ? ' 🚫' : '')));
        r.appendChild(el('td', null, u.codice || '—'));
        [fmt(u.creato_il), u.sedi, u.note + (u.note_nascoste ? ' (' + u.note_nascoste + ' nasc.)' : ''), u.risposte, u.partite, fmt(u.ultima_attivita)]
          .forEach(function (x) { r.appendChild(el('td', null, String(x))); });
        var tp = el('td');
        var pb = el('button', 'btn ' + (u.premio_ritirato ? '' : 'ok'), u.premio_ritirato ? 'Ritirato ✓ (annulla)' : 'Segna ritirato'); pb.type = 'button';
        if (u.sedi < 14 && !u.premio_ritirato) tp.appendChild(el('span', 'meta', 'Album incompleto ' + u.sedi + '/14 '));
        pb.addEventListener('click', async function () {
          pb.disabled = true;
          try { await rpc('admin_premio', { p_user: u.user_id, p_ritirato: !u.premio_ritirato }); await load(); } catch (e) { pb.disabled = false; }
        });
        tp.appendChild(pb);
        if (u.nota_finale) tp.appendChild(el('span', 'chip', 'Nota finale'));
        r.appendChild(tp);
        var td = el('td'); var b = el('button', 'btn ' + (u.bloccato ? '' : 'no'), u.bloccato ? 'Sblocca' : 'Blocca'); b.type = 'button';
        b.addEventListener('click', async function () {
          b.disabled = true;
          try { await rpc('admin_blocca_utente', { p_user: u.user_id, p_bloccato: !u.bloccato, p_motivo: 'Dal pannello' }); await load(); } catch (e) { b.disabled = false; }
        });
        td.appendChild(b); r.appendChild(td); t.appendChild(r);
      });
      holder.appendChild(t);
      if (!list.length) holder.appendChild(el('p', 'meta', 'Nessun utente trovato.'));
    }
    var tm; q.input.addEventListener('input', function () { clearTimeout(tm); tm = setTimeout(function () { load().catch(function () {}); }, 350); });
    out.appendChild(q.wrap); out.appendChild(el('p', 'meta', 'Gli utenti sono anonimi: vedi solo il nickname, nessun dato personale. "Blocca" impedisce di scrivere nuove note.'));
    out.appendChild(holder);
    await load();
  }

  async function vFinali(out) {
    var holder = el('div');
    async function load() {
      holder.textContent = '';
      var list = await rpc('admin_note_finali', { p_limite: 100 });
      if (!list.length) holder.appendChild(el('div', 'card', 'Nessuna nota finale per ora.'));
      list.forEach(function (n) {
        var c = el('div', 'card');
        c.appendChild(el('p', 'meta', 'Per: ' + n.specie + ' · ' + fmt(n.creata_il) + ' · @' + n.autore + ' · ' + (n.codice || '—')));
        c.appendChild(el('p', 'note-t', n.testo));
        (n.motivi || []).forEach(function (x) { c.appendChild(el('span', 'chip red', MOT[x] || x)); });
        c.appendChild(el('span', 'chip', 'Stato: ' + n.revisione));
        var a = el('div', 'actions');
        [['Approva', 'ok', 'approva'], ['Nascondi', 'no', 'nascondi']].forEach(function (x) {
          var b = el('button', 'btn ' + x[1], x[0]); b.type = 'button';
          b.addEventListener('click', async function () { b.disabled = true; try { await rpc('admin_modera_finale', { p_user: n.user_id, p_azione: x[2] }); await load(); } catch (e) { b.disabled = false; } });
          a.appendChild(b);
        });
        c.appendChild(a);
        holder.appendChild(c);
      });
    }
    out.appendChild(holder);
    await load();
  }

  var CATS = ['dati_personali', 'offensivo', 'odio', 'violenza', 'politica', 'sessuale', 'sostanze'];
  async function vRegole(out) {
    var prova = el('form', 'card');
    prova.appendChild(el('h3', null, 'Prova un testo'));
    var ta = el('textarea'); ta.rows = 2; ta.maxLength = 400; ta.setAttribute('aria-label', 'Testo da provare');
    var res = el('p', 'meta'); var pb = el('button', 'btn pri', 'Prova'); pb.type = 'submit';
    prova.append(ta, el('p'), pb, res);
    prova.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      try { var r = await rpc('admin_prova_testo', { p_testo: ta.value }); res.textContent = r.categorie.length ? 'Verrebbe segnalato: ' + r.categorie.map(function (x) { return MOT[x] || x; }).join(', ') : 'Passerebbe senza controlli.'; }
      catch (e) { res.textContent = 'Errore.'; }
    });
    out.appendChild(prova);
    var add = el('form', 'card');
    add.appendChild(el('h3', null, 'Nuova regola'));
    add.appendChild(el('p', 'meta', 'Un\'espressione regolare (esempio: \\mparola\\M per una parola intera). "Normalizzato" ignora accenti, maiuscole e trucchi tipo c4zz0.'));
    var row = el('div', 'row2');
    var sc = el('select'); CATS.forEach(function (c) { var o = el('option', null, MOT[c]); o.value = c; sc.appendChild(o); });
    var ss = el('select'); ['normalizzato', 'grezzo', 'compatto'].forEach(function (c) { var o = el('option', null, c); o.value = c; ss.appendChild(o); });
    row.append(sc, ss);
    var pi = el('input'); pi.maxLength = 400; pi.required = true; pi.placeholder = 'espressione'; pi.setAttribute('aria-label', 'Espressione');
    var ab = el('button', 'btn pri', 'Aggiungi'); ab.type = 'submit'; var ae = el('p', 'err');
    add.append(row, el('p'), pi, el('p'), ab, ae);
    add.addEventListener('submit', async function (ev) {
      ev.preventDefault(); ae.textContent = '';
      try {
        var r = await rpc('admin_regola_salva', { p_id: null, p_categoria: sc.value, p_pattern: pi.value, p_su: ss.value, p_attiva: true });
        if (!r.ok) { ae.textContent = r.errore === 'pattern_non_valido' ? 'Espressione non valida.' : 'Dati non validi.'; return; }
        tab = 'regole'; show();
      } catch (e) { ae.textContent = 'Errore.'; }
    });
    out.appendChild(add);
    var rules = await rpc('admin_regole');
    var box = el('div', 'card scroll'); var t = el('table'); var hr = el('tr');
    ['Categoria', 'Su', 'Espressione', 'Attiva', ''].forEach(function (h) { hr.appendChild(el('th', null, h)); });
    t.appendChild(hr);
    rules.forEach(function (r) {
      var tr = el('tr');
      tr.appendChild(el('td', null, MOT[r.categoria] || r.categoria)); tr.appendChild(el('td', null, r.su));
      var pt = el('td'); var cd = el('code', null, r.pattern); cd.style.wordBreak = 'break-all'; pt.appendChild(cd); tr.appendChild(pt);
      tr.appendChild(el('td', null, r.attiva ? 'sì' : 'no'));
      var td = el('td');
      var tg = el('button', 'btn', r.attiva ? 'Disattiva' : 'Attiva'); tg.type = 'button';
      tg.addEventListener('click', async function () { tg.disabled = true; try { await rpc('admin_regola_salva', { p_id: r.id, p_categoria: r.categoria, p_pattern: r.pattern, p_su: r.su, p_attiva: !r.attiva }); show(); } catch (e) { tg.disabled = false; } });
      var dl = el('button', 'btn no', 'Elimina'); dl.type = 'button';
      dl.addEventListener('click', async function () { if (!confirm('Eliminare questa regola?')) return; dl.disabled = true; try { await rpc('admin_regola_elimina', { p_id: r.id }); show(); } catch (e) { dl.disabled = false; } });
      td.append(tg, dl); tr.appendChild(td); t.appendChild(tr);
    });
    box.appendChild(t); out.appendChild(box);
  }

  async function vReg(out) {
    var list = await rpc('admin_registro', { p_limite: 150 });
    var box = el('div', 'card scroll'); var t = el('table'); var hr = el('tr');
    ['Quando', 'Evento', 'Utente'].forEach(function (h) { hr.appendChild(el('th', null, h)); });
    t.appendChild(hr);
    list.forEach(function (a) {
      var r = el('tr'); r.appendChild(el('td', null, fmt(a.quando))); r.appendChild(el('td', null, a.evento)); r.appendChild(el('td', null, a.utente)); t.appendChild(r);
    });
    box.appendChild(t); out.appendChild(box);
  }

  async function boot() {
    var s = await sb.auth.getSession();
    if (!s.data.session || s.data.session.user.is_anonymous) return loginView();
    var st;
    try { st = await rpc('admin_stato'); } catch (e) { return loginView('Errore di connessione.'); }
    if (!st.nel_team) { return deniedView(); }
    if (Date.now() - lastTouch() > IDLE_MS) { await sb.auth.signOut(); return loginView('Sessione scaduta. Rientra.'); }
    touch(); startIdle();
    if (!st.admin) return mfaView();
    show();
  }
  boot();
})();
