// Percorso dopo il QR: scrivi la nota → ricevi la nota di un altro polo → mini quiz → mini sfida → specie sbloccata.
// A album completo: sceglie una specie e le lascia la nota finale.
window.WT_PERCORSO = (function () {
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function sb() { return window.WT && window.WT.sb; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  var MIN = 5, MAX = 400;
  var ERR = {
    gia_scritta: 'Hai già scritto una nota da questa sede.',
    troppo_corta: 'La nota è troppo corta: servono almeno ' + MIN + ' caratteri.',
    troppo_lunga: 'La nota è troppo lunga: massimo ' + MAX + ' caratteri.',
    bloccato: 'Al momento non puoi scrivere nuove note.',
    non_autenticato: 'Sessione scaduta. Ricarica la pagina.'
  };

  function overlay() {
    var o = el('div', 'pc');
    o.setAttribute('role', 'dialog');
    o.setAttribute('aria-modal', 'true');
    o.setAttribute('aria-label', 'Percorso della sede');
    document.body.appendChild(o);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { o.classList.add('in'); });
    return o;
  }
  function close(o) {
    o.classList.remove('in');
    document.body.style.overflow = '';
    setTimeout(function () { o.remove(); }, 320);
  }
  function page(o, step, steps, tag, title) {
    o.textContent = '';
    o.scrollTop = 0;
    var inn = el('div', 'pc-in');
    if (steps) {
      var d = el('div', 'pc-dots');
      d.setAttribute('aria-hidden', 'true');
      for (var i = 0; i < steps; i++) d.appendChild(el('i', i < step ? 'done' : i === step ? 'on' : ''));
      inn.appendChild(d);
    }
    if (tag) inn.appendChild(el('p', 'pc-tag', tag));
    var h = el('h2', null, title);
    h.tabIndex = -1;
    inn.appendChild(h);
    o.appendChild(inn);
    h.focus({ preventScroll: true });
    return inn;
  }
  function btn(text, cls, fn) {
    var b = el('button', 'pc-btn ' + (cls || ''), text);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }
  function skip(text, fn) {
    var b = el('button', 'pc-skip', text);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }

  var PLANE = '<svg class="pc-plane" viewBox="0 0 64 64" aria-hidden="true"><path d="M4 30 60 6 44 58 31 40 4 30Z" fill="#fff"/><path d="M31 40 60 6 24 36Z" fill="#C9A8FF"/></svg>';
  function plane(inn) {
    var w = el('div', 'pc-send');
    w.setAttribute('aria-hidden', 'true');
    w.insertAdjacentHTML('beforeend', PLANE);
    inn.parentNode.appendChild(w);
    return new Promise(function (r) { setTimeout(function () { w.remove(); r(); }, 1500); });
  }

  // ---- passo 1: scrivi ----
  function stepWrite(o, ctx) {
    return new Promise(function (resolve) {
      var inn = page(o, 0, 4, ctx.nome, 'Lascia una nota ad altri poli');
      inn.appendChild(el('p', null, 'Scrivi qualcosa per chi verrà dopo di te. In cambio ne riceverai una scritta da un altro polo.'));
      var ta = el('textarea');
      ta.maxLength = MAX;
      ta.setAttribute('aria-label', 'La tua nota');
      ta.placeholder = 'Che cosa ti ha colpito di questo posto?';
      inn.appendChild(ta);
      var cnt = el('div', 'pc-cnt', '0/' + MAX);
      ta.addEventListener('input', function () { cnt.textContent = ta.value.length + '/' + MAX; });
      inn.appendChild(cnt);
      var lab = el('label', 'pc-chk');
      var cb = el('input');
      cb.type = 'checkbox';
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode('Scrivi in forma anonima'));
      inn.appendChild(lab);
      var err = el('div', 'pc-err');
      err.setAttribute('role', 'alert');
      inn.appendChild(err);
      var row = el('div', 'pc-row');
      var go = btn('Invia la nota', 'o', async function () {
        var t = ta.value.trim();
        if (t.length < MIN) { err.textContent = ERR.troppo_corta; return; }
        go.disabled = true;
        err.textContent = '';
        var covers = window.WT_CARDS.COVERS;
        var cover = covers[Math.floor(Math.random() * covers.length)][0];
        var res;
        try { res = await sb().rpc('scrivi_nota', { p_sede: ctx.sede, p_testo: t, p_anonima: cb.checked, p_copertina: cover }); } catch (e) { res = { error: e }; }
        var d = res && res.data;
        if (!d || res.error || !d.ok) {
          err.textContent = (d && ERR[d.errore]) || 'Non sono riuscito a inviare la nota. Riprova.';
          go.disabled = false;
          return;
        }
        await plane(inn);
        resolve(d);
      });
      row.appendChild(go);
      row.appendChild(skip('Scrivo più tardi', function () { resolve(null); }));
      inn.appendChild(row);
    });
  }

  // ---- passo 2: ricevi ----
  function stepReceive(o, ctx, d) {
    return new Promise(function (resolve) {
      var inn = page(o, 1, 4, 'Nota ricevuta', d && d.ricevuta ? 'Una nota è arrivata per te' : 'Nota inviata');
      var n = d && d.ricevuta;
      function next() { resolve(); }
      if (!n) {
        inn.appendChild(el('p', null, d && d.in_revisione
          ? 'Prima di pubblicarla il team la controlla. Ritira la tua nota in cambio più tardi da «Parole».'
          : 'Per ora non ci sono note di altri poli: la tua è in viaggio. Ritira quella che ti spetta più tardi da «Parole».'));
        var r0 = el('div', 'pc-row');
        r0.appendChild(btn('Avanti', 'o', next));
        inn.appendChild(r0);
        return;
      }
      var env = el('div', 'pc-env');
      env.setAttribute('aria-hidden', 'true');
      env.appendChild(el('b')); env.appendChild(el('u')); env.appendChild(el('i'));
      inn.appendChild(env);
      var slot = el('div');
      inn.appendChild(slot);
      var row = el('div', 'pc-row');
      inn.appendChild(row);
      setTimeout(function () {
        env.classList.add('gone');
        var ul = el('ul', 'pa-list hc-list pc-card');
        ul.style.listStyle = 'none';
        ul.style.padding = '0';
        ul.appendChild(window.WT_CARDS.build(n, {
          isNew: true, eager: true,
          toggle: async function (note, want) {
            var r = await sb().rpc('metti_like', { p_nota: note.id, p_si: want });
            return r && r.data && r.data.ok ? { like: r.data.like, mio_like: r.data.mio_like } : null;
          },
          save: async function (note, want) {
            var r = await sb().rpc('salva_nota', { p_nota: note.id, p_si: want });
            return !!(r && r.data && r.data.ok);
          }
        }));
        slot.appendChild(ul);
        row.appendChild(btn('Avanti', 'o', next));
        row.appendChild(skip('Salta', next));
      }, 2000);
    });
  }

  // ---- passo 3: mini quiz sulla specie ----
  function stepQuiz(o, ctx) {
    return new Promise(function (resolve) {
      var c = ctx.contenuti[ctx.sede] || {};
      var inn = page(o, 2, 4, 'Mini quiz', 'Chi vive qui?');
      if (!c.specie) { resolve(); return; }
      var clue = String(c.specie_desc || c.specie_sapevi || '').split(/(?<=[.!?])\s/)[0];
      var re = new RegExp(c.specie.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
      clue = clue.replace(re, '…');
      inn.appendChild(el('p', null, clue || 'Indovina la specie di questa sede.'));
      var others = shuffle(Object.keys(ctx.contenuti).filter(function (k) { return k !== ctx.sede && ctx.contenuti[k].specie; })).slice(0, 2)
        .map(function (k) { return ctx.contenuti[k].specie; });
      var opts = shuffle([c.specie].concat(others));
      var box = el('div', 'pc-opts');
      var fb = el('p', 'pc-fb');
      fb.setAttribute('aria-live', 'polite');
      opts.forEach(function (name) {
        var b = el('button', 'pc-opt', name);
        b.type = 'button';
        b.addEventListener('click', function () {
          var all = box.querySelectorAll('button');
          for (var i = 0; i < all.length; i++) {
            all[i].disabled = true;
            if (all[i].textContent === c.specie) all[i].classList.add('ok'); else all[i].classList.add('ko');
          }
          fb.textContent = name === c.specie ? 'Esatto! È proprio ' + c.specie + '.' : 'Quasi: la specie di questa sede è ' + c.specie + '.';
          row.querySelector('.pc-btn').hidden = false;
        });
        box.appendChild(b);
      });
      inn.appendChild(box);
      inn.appendChild(fb);
      var row = el('div', 'pc-row');
      var nx = btn('Avanti', 'o', resolve);
      nx.hidden = true;
      row.appendChild(nx);
      row.appendChild(skip('Salta', resolve));
      inn.appendChild(row);
    });
  }

  // ---- passo 4: mini sfida "Dove lo butto?" ----
  function stepSort(o, ctx) {
    return new Promise(function (resolve) {
      var R = window.WT_RIFIUTI;
      if (!R || !R.items) { resolve(); return; }
      var items = shuffle(R.items).slice(0, 3), k = 0, good = 0;
      var bins = R.bins.filter(function (b) { return b.id !== 'punto'; });
      function round() {
        var inn = page(o, 3, 4, 'Mini sfida · ' + (k + 1) + '/3', 'Dove lo butto?');
        var it = items[k];
        inn.appendChild(el('div', 'pc-item', it[0]));
        var box = el('div', 'pc-opts g2');
        var fb = el('p', 'pc-fb');
        fb.setAttribute('aria-live', 'polite');
        var row = el('div', 'pc-row');
        var nx = btn(k === 2 ? 'Fine' : 'Avanti', 'o', function () { k++; if (k < 3) round(); else resolve(); });
        nx.hidden = true;
        bins.forEach(function (b) {
          var x = el('button', 'pc-opt', b.nome);
          x.type = 'button';
          x.addEventListener('click', function () {
            var all = box.querySelectorAll('button');
            for (var i = 0; i < all.length; i++) all[i].disabled = true;
            var okk = b.id === it[1];
            if (okk) { good++; x.classList.add('ok'); }
            fb.textContent = (okk ? 'Giusto! ' : 'Non proprio. ') + it[2];
            nx.hidden = false;
          });
          box.appendChild(x);
        });
        inn.appendChild(box);
        inn.appendChild(fb);
        row.appendChild(nx);
        row.appendChild(skip('Salta la sfida', resolve));
        inn.appendChild(row);
      }
      round();
    });
  }

  // ---- percorso completo ----
  // ctx: { sede, nome, n, total, contenuti }
  async function run(ctx) {
    var o = overlay();
    try {
      var d = await stepWrite(o, ctx);
      if (d) await stepReceive(o, ctx, d);
      await stepQuiz(o, ctx);
      await stepSort(o, ctx);
    } catch (e) { /* il percorso non deve bloccare lo sblocco */ }
    close(o);
    if (window.WT_UNLOCK) {
      try { await window.WT_UNLOCK({ nome: ctx.nome, n: ctx.n, total: ctx.total, punti: 20 }); } catch (e) { /* ok */ }
    }
  }

  // ---- album completo: nota finale a una specie ----
  async function finale(ctx) {
    var st = null;
    try { var r = await sb().rpc('stato_album'); st = r && r.data; } catch (e) { st = null; }
    if (!st || !st.completo || st.finale) return false;
    var o = overlay();
    var inn = page(o, 0, 0, 'Album completato', 'Hai trovato tutte le specie');
    inn.appendChild(el('p', null, 'Scegli la specie che ti ha colpito di più: ti chiederemo di lasciarle un ultimo messaggio.'));
    var grid = el('div', 'pc-sp');
    var chosen = null;
    var go;
    ctx.sedi.forEach(function (s) {
      var c = ctx.contenuti[s.id] || {};
      var b = el('button', null);
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      if (s.immagine) { var im = el('img'); im.src = s.immagine; im.alt = ''; b.appendChild(im); }
      b.appendChild(document.createTextNode(c.specie || s.nome));
      b.addEventListener('click', function () {
        var all = grid.querySelectorAll('button');
        for (var i = 0; i < all.length; i++) all[i].setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-pressed', 'true');
        chosen = { id: s.id, nome: c.specie || s.nome };
        go.disabled = false;
      });
      grid.appendChild(b);
    });
    inn.appendChild(grid);
    var row = el('div', 'pc-row');
    go = btn('Scelgo questa', 'o', function () { write(); });
    go.disabled = true;
    row.appendChild(go);
    row.appendChild(skip('Più tardi', function () { close(o); }));
    inn.appendChild(row);

    function write() {
      var w = page(o, 0, 0, 'Nota finale', 'Lascia una nota finale come se ' + chosen.nome + ' potesse sentirti');
      var ta = el('textarea');
      ta.maxLength = MAX;
      ta.setAttribute('aria-label', 'Nota finale');
      w.appendChild(ta);
      var err = el('div', 'pc-err');
      err.setAttribute('role', 'alert');
      w.appendChild(err);
      var r2 = el('div', 'pc-row');
      var send = btn('Invia', 'o', async function () {
        var t = ta.value.trim();
        if (t.length < MIN) { err.textContent = ERR.troppo_corta; return; }
        send.disabled = true;
        var res;
        try { res = await sb().rpc('scrivi_nota_finale', { p_sede: chosen.id, p_testo: t }); } catch (e) { res = { error: e }; }
        var d = res && res.data;
        if (!d || res.error || !d.ok) {
          err.textContent = (d && ERR[d.errore]) || 'Non sono riuscito a inviare la nota. Riprova.';
          send.disabled = false;
          return;
        }
        await plane(w);
        thanks(st.codice);
      });
      r2.appendChild(send);
      r2.appendChild(skip('Indietro', function () { close(o); finale(ctx); }));
      w.appendChild(r2);
    }
    function thanks(code) {
      var t = page(o, 0, 0, 'Grazie', 'Il tuo messaggio è arrivato');
      t.appendChild(el('p', null, 'Hai completato Wonder Trail. Per ritirare l\'eventuale premio mostra al team il tuo Codice Esploratore.'));
      var cd = el('div', 'pc-code', code || '—');
      cd.setAttribute('data-no-i18n', '');
      t.appendChild(cd);
      var r3 = el('div', 'pc-row');
      r3.appendChild(btn('Chiudi', 'o', function () { close(o); }));
      t.appendChild(r3);
    }
    return true;
  }

  return { run: run, finale: finale };
})();
