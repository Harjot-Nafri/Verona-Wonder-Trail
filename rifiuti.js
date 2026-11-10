// Gioco "Dove lo butto?": regole di raccolta differenziata di AMIA Verona.
(function () {
  var ROUND = 10;

  var BINS = [
    { id: 'umido', nome: 'Umido', sub: 'Scarti organici', c: '#c58a4a' },
    { id: 'carta', nome: 'Carta e cartone', sub: '', c: '#ffffff' },
    { id: 'plastica', nome: 'Plastica e lattine', sub: 'Imballaggi', c: '#FD8F32' },
    { id: 'vetro', nome: 'Vetro', sub: 'Bottiglie e barattoli', c: '#C9A8FF' },
    { id: 'secco', nome: 'Secco non riciclabile', sub: '', c: '#a9afb8' },
    { id: 'punto', nome: 'Punto di raccolta', sub: 'Ecocentro, farmacia, negozi', c: '#FFB36B' }
  ];

  var ITEMS = [
    // umido
    ['Fondi di caffè', 'umido', 'I fondi di caffè sono scarto organico: vanno nell\'umido.'],
    ['Buccia di banana', 'umido', 'Bucce e scarti di frutta e verdura vanno nell\'umido.'],
    ['Bustina di tè usata', 'umido', 'Le bustine di tè usate vanno nell\'umido.'],
    ['Gusci d\'uovo', 'umido', 'I gusci d\'uovo vanno nell\'umido.'],
    ['Lische di pesce', 'umido', 'Lische e ossicini piccoli vanno nell\'umido.'],
    ['Fiori recisi appassiti', 'umido', 'Fiori e piante recise vanno nell\'umido.'],
    ['Tovagliolo di carta sporco di cibo', 'umido', 'Se è sporco di cibo, il tovagliolo va nell\'umido e non nella carta.'],
    // carta
    ['Quaderno', 'carta', 'Quaderni e fogli puliti vanno in carta e cartone.'],
    ['Scatola di cartone', 'carta', 'Il cartone va schiacciato e messo nella carta.'],
    ['Cartone del latte (senza tappo)', 'carta', 'Il Tetra Pak va nella carta. Il tappo di plastica si toglie.'],
    ['Sacchetto di carta pulito', 'carta', 'I sacchetti di carta puliti vanno nella carta.'],
    ['Giornale', 'carta', 'Giornali e riviste vanno nella carta.'],
    // plastica e lattine
    ['Bottiglia di plastica', 'plastica', 'Le bottiglie di plastica vanno in plastica e lattine.'],
    ['Lattina di bibita', 'plastica', 'Le lattine vanno in plastica e lattine.'],
    ['Scatoletta di tonno vuota', 'plastica', 'Anche le scatolette di metallo vanno in plastica e lattine.'],
    ['Vaschetta di polistirolo per alimenti', 'plastica', 'Il polistirolo degli imballaggi va in plastica e lattine.'],
    ['Vasetto di yogurt', 'plastica', 'I vasetti di yogurt vanno in plastica e lattine.'],
    ['Flacone del detersivo', 'plastica', 'I flaconi di detersivo e igiene vanno in plastica e lattine.'],
    ['Pellicola trasparente per alimenti', 'plastica', 'La pellicola per alimenti va in plastica e lattine.'],
    ['Retina della frutta', 'plastica', 'Le retine di frutta e verdura vanno in plastica e lattine.'],
    ['Sacchetto di patatine', 'plastica', 'Le confezioni di snack vanno in plastica e lattine.'],
    ['Coperchio metallico di un barattolo', 'plastica', 'Tappi e coperchi di metallo vanno in plastica e lattine.'],
    // vetro
    ['Bottiglia di vino vuota', 'vetro', 'Le bottiglie di vetro vanno nel vetro.'],
    ['Barattolo di vetro senza coperchio', 'vetro', 'Il vetro va nel vetro. Il coperchio di metallo va invece in plastica e lattine.'],
    ['Bottiglietta di succo in vetro', 'vetro', 'Bottiglie e bottigliette di vetro vanno nel vetro.'],
    // secco
    ['Pannolino', 'secco', 'Pannolini e assorbenti vanno nel secco non riciclabile.'],
    ['CD o DVD', 'secco', 'CD e DVD non si riciclano con la plastica: vanno nel secco.'],
    ['Spazzolino da denti', 'secco', 'Gli spazzolini vanno nel secco non riciclabile.'],
    ['Posate di plastica usa e getta', 'secco', 'Non sono imballaggi: posate e piatti di plastica vanno nel secco.'],
    ['Mozzicone di sigaretta', 'secco', 'I mozziconi vanno nel secco non riciclabile.'],
    ['Capsula del caffè non compostabile', 'secco', 'Le capsule del caffè, in genere, vanno nel secco.'],
    ['Rasoio usa e getta', 'secco', 'I rasoi usa e getta vanno nel secco.'],
    ['Sacchetto per frutta e verdura sfusa', 'secco', 'I sacchetti per l\'ortofrutta sfusa vanno nel secco, non nella plastica.'],
    ['Giocattolo di plastica', 'secco', 'I giocattoli non sono imballaggi: vanno nel secco.'],
    // punti di raccolta
    ['Pila esaurita', 'punto', 'Le pile vanno nei contenitori dei negozi, all\'ecocentro o all\'Ecomobile.'],
    ['Medicinale scaduto', 'punto', 'I farmaci scaduti vanno nei contenitori in farmacia, senza la scatola.'],
    ['Tubo al neon', 'punto', 'I tubi al neon vanno all\'ecocentro o all\'Ecomobile.'],
    ['Vecchia tastiera del computer', 'punto', 'Computer e periferiche vanno all\'ecocentro.']
  ];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function binName(id) {
    for (var i = 0; i < BINS.length; i++) if (BINS[i].id === id) return BINS[i].nome;
    return id;
  }

  function pick(n) {
    var a = ITEMS.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a.slice(0, n);
  }

  function mount(view, onBack) {
    var DURATION = 60;
    var GAP = 28;
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var raf = 0, running = false, S = null;

    function stop() { running = false; cancelAnimationFrame(raf); }
    function back() { stop(); onBack(); }

    function topBar(label) {
      var bar = el('div', 'qtop');
      var b = el('button', 'back', '← Giochi');
      b.type = 'button';
      b.addEventListener('click', back);
      bar.appendChild(b);
      bar.appendChild(el('span', 'qprog', label));
      return bar;
    }

    function source() {
      var p = el('p', 'src');
      p.appendChild(document.createTextNode('Regole di raccolta di AMIA Verona. Nel dubbio, cerca l\'oggetto nel '));
      var a = el('a', null, 'Dizionario dei rifiuti');
      a.href = 'https://www.amiavr.it/Portals/0/Documenti/dizionario.pdf';
      a.target = '_blank';
      a.rel = 'noopener';
      p.appendChild(a);
      p.appendChild(document.createTextNode('.'));
      return p;
    }

    function intro() {
      stop();
      view.textContent = '';
      var card = el('div', 'gcard');
      card.appendChild(topBar('Dove lo butto?'));
      var h = el('h3', 'qtext', 'Dove lo butto?');
      h.tabIndex = -1;
      card.appendChild(h);
      card.appendChild(el('p', null, 'Gli oggetti scorrono sul nastro. Tocca il contenitore giusto per quello con il bordo giallo, il più avanti. Hai ' + DURATION + ' secondi: più risposte giuste di fila, più punti.'));
      var leg = el('ul', 'nb-legend');
      BINS.forEach(function (b) {
        var ex = ITEMS.filter(function (it) { return it[1] === b.id; }).slice(0, 3)
          .map(function (it) { return it[0].toLowerCase(); }).join(', ');
        var li = el('li');
        var dot = el('span', 'nb-dot');
        dot.style.background = b.c;
        dot.setAttribute('aria-hidden', 'true');
        li.appendChild(dot);
        var t = el('span');
        t.appendChild(el('strong', null, b.nome));
        t.appendChild(document.createTextNode(': ' + ex + '…'));
        li.appendChild(t);
        leg.appendChild(li);
      });
      card.appendChild(leg);
      var go = el('button', 'gbtn', 'Gioca');
      go.type = 'button';
      go.addEventListener('click', start);
      card.appendChild(go);
      card.appendChild(source());
      view.appendChild(card);
      h.focus({ preventScroll: true });
    }

    function start() {
      S = { score: 0, right: 0, wrong: 0, combo: 1, streak: 0, time: DURATION, el: 0,
            items: [], queue: [], spawn: 0, last: performance.now(), errors: [] };
      view.textContent = '';
      var card = el('div', 'gcard nb');
      card.appendChild(topBar('Nastro'));

      var hud = el('div', 'nb-hud');
      var l = el('div'); l.appendChild(el('small', null, 'Punti'));
      S.sEl = el('div', 'nb-big', '0'); l.appendChild(S.sEl);
      S.cEl = el('span', 'nb-combo', '×1');
      var r = el('div', 'nb-r'); r.appendChild(el('small', null, 'Tempo'));
      S.tEl = el('div', 'nb-big', String(DURATION)); r.appendChild(S.tEl);
      hud.appendChild(l); hud.appendChild(S.cEl); hud.appendChild(r);
      card.appendChild(hud);

      var tb = el('div', 'nb-time');
      S.tbEl = el('i');
      tb.appendChild(S.tbEl);
      card.appendChild(tb);

      S.belt = el('div', 'nb-belt');
      card.appendChild(S.belt);

      S.now = el('p', 'nb-now', '');
      S.now.setAttribute('aria-live', 'polite');
      card.appendChild(S.now);

      S.fb = el('p', 'nb-fb', 'Tocca il contenitore giusto.');
      S.fb.setAttribute('role', 'status');
      card.appendChild(S.fb);

      var grid = el('div', 'nb-bins');
      S.btns = {};
      BINS.forEach(function (b) {
        var x = el('button', 'nb-bin');
        x.type = 'button';
        x.dataset.id = b.id;
        x.style.setProperty('--c', b.c);
        var body = el('span', 'nb-body');
        body.setAttribute('aria-hidden', 'true');
        body.appendChild(el('span', 'nb-lid'));
        x.appendChild(body);
        x.appendChild(el('span', 'nb-name', b.nome));
        x.addEventListener('click', function () { choose(b.id, x); });
        grid.appendChild(x);
        S.btns[b.id] = x;
      });
      card.appendChild(grid);
      card.appendChild(source());
      view.appendChild(card);

      running = true;
      raf = requestAnimationFrame(loop);
    }

    function front() {
      var f = null;
      S.items.forEach(function (i) { if (!f || i.x > f.x) f = i; });
      return f;
    }
    function remove(i) {
      if (i.n.parentNode) i.n.parentNode.removeChild(i.n);
      S.items = S.items.filter(function (x) { return x !== i; });
    }
    function say(text, cls) {
      S.fb.textContent = text;
      S.fb.className = 'nb-fb ' + (cls || '');
    }
    function paint() {
      S.sEl.textContent = S.score;
      S.cEl.textContent = '×' + S.combo;
      S.cEl.classList.add('pop');
      setTimeout(function () { S.cEl.classList.remove('pop'); }, 160);
    }
    function mark(btn, cls) {
      btn.classList.remove('good', 'bad', 'hint');
      void btn.offsetWidth;
      btn.classList.add(cls);
      setTimeout(function () { btn.classList.remove(cls); }, 800);
    }
    function remember(it) {
      for (var k = 0; k < S.errors.length; k++) if (S.errors[k] === it) return;
      S.errors.push(it);
    }
    function lose(it, text) {
      S.combo = 1; S.streak = 0; S.wrong++;
      remember(it);
      paint();
      say(text, 'ko');
      if (navigator.vibrate) { try { navigator.vibrate(50); } catch (e) {} }
    }

    function choose(id, btn) {
      if (!running) return;
      var f = front();
      if (!f) return;
      if (f.d[1] === id) {
        S.score += 10 * S.combo;
        S.streak++; S.right++;
        S.combo = Math.min(5, 1 + Math.floor(S.streak / 3));
        mark(btn, 'good');
        remove(f);
        paint();
        say(f.d[2], 'ok');
      } else {
        mark(btn, 'bad');
        mark(S.btns[f.d[1]], 'hint');
        remove(f);
        lose(f.d, 'Non proprio: "' + f.d[0] + '" va in ' + binName(f.d[1]) + '. ' + f.d[2]);
      }
    }

    function loop(ts) {
      if (!running) return;
      if (!S.belt.isConnected) { stop(); return; }
      var dt = Math.min(0.05, (ts - S.last) / 1000);
      S.last = ts;
      S.time -= dt;
      S.el += dt;
      var W = S.belt.clientWidth;

      var minX = Infinity;
      S.items.forEach(function (i) { if (i.x < minX) minX = i.x; });
      if (!S.items.length || minX >= GAP) {
        if (!S.queue.length) S.queue = pick(ITEMS.length);
        var it = S.queue.pop();
        var n = el('div', 'nb-chip', it[0]);
        S.belt.appendChild(n);
        S.items.push({ d: it, n: n, x: -n.offsetWidth });
      }
      var speed = (calm ? 0.7 : 1) * (36 + S.el * 0.5);
      S.items.slice().forEach(function (i) {
        i.x += speed * dt;
        i.n.style.transform = 'translateX(' + i.x + 'px)';
        if (i.x > W - i.n.offsetWidth) {
          remove(i);
          lose(i.d, 'Troppo lento: "' + i.d[0] + '" va in ' + binName(i.d[1]) + '. ' + i.d[2]);
        }
      });
      var f = front();
      S.items.forEach(function (i) { i.n.classList.toggle('front', i === f); });
      var label = f ? f.d[0] : '';
      if (label !== S.nowText) { S.nowText = label; S.now.textContent = label ? 'Ora: ' + label : ''; }

      S.tEl.textContent = Math.max(0, Math.ceil(S.time));
      S.tbEl.style.width = Math.max(0, S.time / DURATION * 100) + '%';
      if (S.time <= 0) { result(); return; }
      raf = requestAnimationFrame(loop);
    }

    function result() {
      stop();
      try {
        var sb = window.WT && window.WT.sb;
        if (sb) sb.rpc('registra_partita', { p_punteggio: S.score }).then(function () {}, function () {});
      } catch (e) {}
      view.textContent = '';
      var card = el('div', 'gcard');
      card.appendChild(topBar('Risultato'));
      var h = el('h3', 'qtext', 'Tempo scaduto!');
      h.tabIndex = -1;
      card.appendChild(h);
      card.appendChild(el('div', 'score', String(S.score)));
      var tot = S.right + S.wrong;
      card.appendChild(el('p', 'sub', S.right + ' giusti su ' + tot + '. ' +
        (S.wrong === 0 && S.right > 0 ? 'Nemmeno un errore: sei un esperto di differenziata!'
          : S.right >= S.wrong ? 'Bel lavoro. Rigioca: gli oggetti cambiano ogni volta.'
          : 'Buon inizio. Rigioca: gli oggetti cambiano ogni volta.')));
      if (S.errors.length) {
        card.appendChild(el('h4', 'sec', 'Da ricordare'));
        var ul = el('ul', 'review');
        S.errors.forEach(function (it) {
          var li = el('li');
          li.appendChild(el('strong', null, it[0] + ' → ' + binName(it[1])));
          li.appendChild(el('span', null, it[2]));
          ul.appendChild(li);
        });
        card.appendChild(ul);
      }
      var again = el('button', 'gbtn', 'Rigioca');
      again.type = 'button';
      again.addEventListener('click', start);
      card.appendChild(again);
      card.appendChild(source());
      view.appendChild(card);
      h.focus({ preventScroll: true });
    }

    intro();
  }

  window.WT_RIFIUTI = { mount: mount, count: ITEMS.length };
})();
