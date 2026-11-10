// Gioco "Dove lo butto?": regole di raccolta differenziata di AMIA Verona.
(function () {
  var ROUND = 10;

  var BINS = [
    { id: 'umido', nome: 'Umido', sub: 'Scarti organici', c: '#c58a4a' },
    { id: 'carta', nome: 'Carta e cartone', sub: '', c: '#ffffff' },
    { id: 'plastica', nome: 'Plastica e lattine', sub: 'Imballaggi', c: '#DEF434' },
    { id: 'vetro', nome: 'Vetro', sub: 'Bottiglie e barattoli', c: '#5fd6a0' },
    { id: 'secco', nome: 'Secco non riciclabile', sub: '', c: '#a9afb8' },
    { id: 'punto', nome: 'Punto di raccolta', sub: 'Ecocentro, farmacia, negozi', c: '#ff9d8a' }
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
    var round = [];
    var idx = 0;
    var score = 0;
    var errors = [];

    function topBar(label) {
      var bar = el('div', 'qtop');
      var back = el('button', 'back', '← Giochi');
      back.type = 'button';
      back.addEventListener('click', onBack);
      bar.appendChild(back);
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

    function start() {
      round = pick(ROUND);
      idx = 0;
      score = 0;
      errors = [];
      step();
    }

    function step() {
      view.textContent = '';
      var it = round[idx];
      var card = el('div', 'gcard');
      card.appendChild(topBar('Rifiuto ' + (idx + 1) + ' di ' + round.length));
      var h = el('h3', 'qtext', 'Dove lo butto?');
      h.tabIndex = -1;
      card.appendChild(h);
      card.appendChild(el('div', 'item', it[0]));

      var list = el('ul', 'bins');
      var buttons = [];
      BINS.forEach(function (b) {
        var li = el('li');
        var btn = el('button', 'bin');
        btn.type = 'button';
        btn.dataset.id = b.id;
        var name = el('span', 'bn');
        var dot = el('span', 'bd');
        dot.style.setProperty('--c', b.c);
        dot.setAttribute('aria-hidden', 'true');
        name.appendChild(dot);
        name.appendChild(document.createTextNode(b.nome));
        btn.appendChild(name);
        if (b.sub) btn.appendChild(el('small', null, b.sub));
        var mk = el('span', 'mk');
        btn.appendChild(mk);
        btn.addEventListener('click', function () { answer(b.id, buttons, fb); });
        li.appendChild(btn);
        list.appendChild(li);
        buttons.push(btn);
      });
      card.appendChild(list);

      var fb = el('div', 'fb');
      fb.hidden = true;
      fb.setAttribute('role', 'status');
      card.appendChild(fb);
      card.appendChild(source());
      view.appendChild(card);
      h.focus({ preventScroll: true });
    }

    function answer(chosen, buttons, fb) {
      var it = round[idx];
      var right = it[1];
      var good = chosen === right;
      if (good) score++; else errors.push(it);
      buttons.forEach(function (b) {
        b.disabled = true;
        var mk = b.querySelector('.mk');
        if (b.dataset.id === right) {
          b.classList.add('ok');
          mk.textContent = '✓ Giusto';
        } else if (b.dataset.id === chosen) {
          b.classList.add('ko');
          mk.textContent = '✗';
        }
      });
      fb.textContent = '';
      fb.appendChild(el('strong', null, good ? 'Giusto!' : 'Non proprio: va in ' + binName(right) + '.'));
      fb.appendChild(el('p', null, it[2]));
      var last = idx === round.length - 1;
      var next = el('button', 'gbtn', last ? 'Vedi il risultato' : 'Avanti');
      next.type = 'button';
      next.addEventListener('click', function () {
        if (last) result(); else { idx++; step(); }
      });
      fb.appendChild(next);
      fb.hidden = false;
      next.focus();
    }

    function result() {
      view.textContent = '';
      var card = el('div', 'gcard');
      card.appendChild(topBar('Risultato'));
      var h = el('h3', 'qtext', 'Hai fatto ' + score + ' su ' + round.length);
      h.tabIndex = -1;
      card.appendChild(h);
      var msg = score === round.length ? 'Perfetto: sei un esperto di differenziata!'
        : score >= 7 ? 'Molto bene! Ripassa gli ultimi errori qui sotto.'
        : 'Buon inizio. Rigioca: ogni giro cambia gli oggetti.';
      card.appendChild(el('p', 'sub', msg));
      if (errors.length) {
        card.appendChild(el('h4', 'sec', 'Da ricordare'));
        var ul = el('ul', 'review');
        errors.forEach(function (it) {
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

    start();
  }

  window.WT_RIFIUTI = { mount: mount, count: ITEMS.length };
})();
