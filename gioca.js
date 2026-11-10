// Sezione "Gioca": quiz giornaliero con streak e calendario, più il gioco dei rifiuti.
(function () {
  var view = document.getElementById('gioca-view');
  if (!view) return;

  var NEEDED = 5;
  var TOPICS = {
    rifiuti: 'Riduzione dei rifiuti',
    energia: 'Risparmio energetico',
    mobilita: 'Mobilità sostenibile',
    inclusione: 'Inclusione sociale',
    benessere: 'Benessere in università',
    territorio: 'Verona e il suo territorio'
  };
  var WD = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];
  var MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

  var state = { loaded: false, error: null, quiz: [], done: {} };
  var current = 'home';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function client() { return window.WT && window.WT.sb; }

  // ---- date (sempre a Verona, come sul server) ----
  function todayStr() {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
  }
  function addDays(str, n) {
    var p = str.split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
    return d.toISOString().slice(0, 10);
  }
  function parts(str) {
    var p = str.split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return { day: +p[2], month: MESI[+p[1] - 1], wd: WD[d.getUTCDay()] };
  }
  function streak(done, today) {
    var d = done[today] ? today : addDays(today, -1);
    var n = 0;
    while (done[d]) { n++; d = addDays(d, -1); }
    return n;
  }

  // ---- dati ----
  async function loadQuiz() {
    var c = client();
    if (!c) { state.error = 'nd'; state.loaded = true; return; }
    try {
      var r = await c.rpc('quiz_oggi');
      if (r.error || !Array.isArray(r.data)) { state.error = 'err'; state.quiz = []; }
      else { state.error = null; state.quiz = r.data; }
      var d = await c.from('risposte').select('giorno');
      var cnt = {};
      (d.data || []).forEach(function (x) { cnt[x.giorno] = (cnt[x.giorno] || 0) + 1; });
      state.done = {};
      Object.keys(cnt).forEach(function (k) { if (cnt[k] >= NEEDED) state.done[k] = true; });
    } catch (e) {
      state.error = 'err';
    }
    state.loaded = true;
  }

  function answeredCount() {
    return state.quiz.filter(function (q) { return q.risposta; }).length;
  }

  // ---- schermata iniziale ----
  function calendar() {
    var today = todayStr();
    var ul = el('ul', 'cal');
    ul.setAttribute('aria-label', 'Ultimi 14 giorni');
    for (var i = 13; i >= 0; i--) {
      var ds = addDays(today, -i);
      var p = parts(ds);
      var ok = !!state.done[ds];
      var li = el('li', ds === today ? 'today' : '');
      li.setAttribute('aria-label', p.day + ' ' + p.month + (ok ? ': quiz completato' : ': quiz non completato'));
      var wd = el('span', 'wd', p.wd);
      wd.setAttribute('aria-hidden', 'true');
      var dd = el('span', 'dd' + (ok ? ' done' : ''), ok ? '✓' : String(p.day));
      dd.setAttribute('aria-hidden', 'true');
      li.appendChild(wd);
      li.appendChild(dd);
      ul.appendChild(li);
    }
    return ul;
  }

  function quizCard() {
    var card = el('div', 'gcard');
    card.appendChild(el('h3', null, 'Quiz del giorno'));
    if (!state.loaded) {
      card.appendChild(el('p', null, 'Sto preparando le domande di oggi…'));
      return card;
    }
    if (state.error === 'nd') {
      card.appendChild(el('p', null, 'Il quiz non è disponibile in questo momento.'));
      return card;
    }
    if (state.error || !state.quiz.length) {
      card.appendChild(el('p', null, 'Le domande di oggi non sono ancora pronte. Riprova tra poco.'));
      return card;
    }
    var today = todayStr();
    var n = streak(state.done, today);
    var total = state.quiz.length;
    var done = answeredCount();
    card.appendChild(el('p', null, total + ' domande su sostenibilità, inclusione e Verona. Una serie nuova ogni giorno.'));
    card.appendChild(el('p', 'streak', 'Serie: ' + n + (n === 1 ? ' giorno' : ' giorni')));
    card.appendChild(calendar());
    var label = done === 0 ? 'Inizia il quiz' : done < total ? 'Continua (' + done + ' su ' + total + ')' : 'Rivedi il risultato di oggi';
    var b = el('button', 'gbtn', label);
    b.type = 'button';
    b.addEventListener('click', playQuiz);
    card.appendChild(b);
    return card;
  }

  function gameCard() {
    var card = el('div', 'gcard');
    card.appendChild(el('h3', null, 'Dove lo butto?'));
    card.appendChild(el('p', null, 'Metti ogni rifiuto nel contenitore giusto, secondo le regole di AMIA Verona. Ogni partita ha 10 oggetti.'));
    var b = el('button', 'gbtn', 'Gioca');
    b.type = 'button';
    b.addEventListener('click', function () {
      current = 'game';
      view.textContent = '';
      if (window.WT_RIFIUTI) window.WT_RIFIUTI.mount(view, showHome);
    });
    card.appendChild(b);
    return card;
  }

  function showHome() {
    current = 'home';
    view.textContent = '';
    view.appendChild(quizCard());
    view.appendChild(gameCard());
  }

  // ---- quiz ----
  function topBar(label) {
    var bar = el('div', 'qtop');
    var back = el('button', 'back', '← Giochi');
    back.type = 'button';
    back.addEventListener('click', showHome);
    bar.appendChild(back);
    bar.appendChild(el('span', 'qprog', label));
    return bar;
  }

  function playQuiz() {
    current = 'quiz';
    var i = -1;
    for (var k = 0; k < state.quiz.length; k++) {
      if (!state.quiz[k].risposta) { i = k; break; }
    }
    if (i < 0) showResult(); else renderQuestion(i);
  }

  function renderQuestion(i) {
    view.textContent = '';
    var q = state.quiz[i];
    var total = state.quiz.length;
    var card = el('div', 'gcard qcard');
    card.appendChild(topBar(''));
    var prog = el('div', 'qdots');
    var dots = el('span', 'qd');
    dots.setAttribute('role', 'img');
    dots.setAttribute('aria-label', 'Domanda ' + (i + 1) + ' di ' + total);
    for (var d = 0; d < total; d++) dots.appendChild(el('i', d <= i ? 'on' : ''));
    prog.appendChild(dots);
    var sn = streak(state.done, todayStr());
    prog.appendChild(el('span', 'qserie', 'Serie ' + sn));
    card.appendChild(prog);
    card.appendChild(el('span', 'chip', TOPICS[q.argomento] || q.argomento));
    var h = el('h3', 'qtext', q.testo);
    h.tabIndex = -1;
    card.appendChild(h);

    var list = el('ul', 'qopts');
    var buttons = [];
    var fb = el('div', 'fb');
    fb.hidden = true;
    fb.setAttribute('role', 'status');

    q.opzioni.forEach(function (text, k) {
      var li = el('li');
      var b = el('button', 'qopt');
      b.type = 'button';
      var lt = el('span', 'let', 'ABCD'.charAt(k));
      lt.setAttribute('aria-hidden', 'true');
      b.appendChild(lt);
      b.appendChild(el('span', 'qt', text));
      b.appendChild(el('span', 'mk'));
      b.addEventListener('click', function () { choose(i, k, buttons, fb); });
      li.appendChild(b);
      list.appendChild(li);
      buttons.push(b);
    });
    card.appendChild(list);
    card.appendChild(fb);
    view.appendChild(card);
    h.focus({ preventScroll: true });
  }

  function showFeedback(i, buttons, fb) {
    var q = state.quiz[i];
    var r = q.risposta;
    buttons.forEach(function (b, k) {
      b.disabled = true;
      var mk = b.querySelector('.mk');
      if (k === r.indice_corretto) { b.classList.add('ok'); mk.textContent = '✓ Corretta'; }
      else if (k === r.scelta) { b.classList.add('ko'); mk.textContent = '✗'; }
    });
    fb.textContent = '';
    fb.appendChild(el('strong', null, r.corretta ? 'Corretto!' : 'Non proprio.'));
    fb.appendChild(el('p', null, r.spiegazione));
    var last = i === state.quiz.length - 1;
    var next = el('button', 'gbtn', last ? 'Vedi il risultato' : 'Avanti');
    next.type = 'button';
    next.addEventListener('click', async function () {
      if (last) {
        next.disabled = true;
        await loadQuiz();
        showResult();
      } else {
        renderQuestion(i + 1);
      }
    });
    fb.appendChild(next);
    fb.hidden = false;
    next.focus();
  }

  async function choose(i, k, buttons, fb) {
    var q = state.quiz[i];
    buttons.forEach(function (b) { b.disabled = true; });
    var c = client();
    var res;
    try {
      res = await c.rpc('rispondi', { p_domanda: q.id, p_scelta: k });
    } catch (e) {
      res = { error: e };
    }
    var d = res && res.data;
    if (!d || res.error) {
      fb.textContent = 'Non sono riuscito a salvare la risposta. Riprova.';
      fb.hidden = false;
      buttons.forEach(function (b) { b.disabled = false; });
      return;
    }
    if (!d.ok) {
      if (d.errore === 'gia_risposta') { await loadQuiz(); playQuiz(); return; }
      fb.textContent = 'Questa domanda non è più disponibile. Ricarica la pagina.';
      fb.hidden = false;
      return;
    }
    q.risposta = { scelta: k, corretta: d.corretta, indice_corretto: d.indice_corretto, spiegazione: d.spiegazione };
    showFeedback(i, buttons, fb);
  }

  function showResult() {
    current = 'quiz';
    view.textContent = '';
    var total = state.quiz.length;
    var score = state.quiz.filter(function (q) { return q.risposta && q.risposta.corretta; }).length;
    var n = streak(state.done, todayStr());
    var card = el('div', 'gcard qcard');
    card.appendChild(topBar('Quiz di oggi'));
    var h = el('h3', 'qtext', 'Quiz completato!');
    h.tabIndex = -1;
    card.appendChild(h);
    card.appendChild(el('div', 'score', score + '/' + total));
    var msg = score === total ? 'Perfetto, nemmeno un errore!'
      : score >= 3 ? 'Ottimo lavoro. Domani nuove domande.'
      : 'Intanto hai imparato qualcosa. Domani si riparte.';
    card.appendChild(el('p', 'sub', msg));
    card.appendChild(el('p', 'streak', 'Serie: ' + n + (n === 1 ? ' giorno' : ' giorni')));
    card.appendChild(calendar());

    card.appendChild(el('h4', 'sec', 'Le risposte di oggi'));
    var ul = el('ul', 'review');
    state.quiz.forEach(function (q) {
      var r = q.risposta;
      if (!r) return;
      var li = el('li');
      li.appendChild(el('strong', null, (r.corretta ? '✓ ' : '✗ ') + q.testo));
      li.appendChild(el('span', null, 'Risposta giusta: ' + q.opzioni[r.indice_corretto]));
      ul.appendChild(li);
    });
    card.appendChild(ul);

    var b = el('button', 'gbtn', 'Torna ai giochi');
    b.type = 'button';
    b.addEventListener('click', showHome);
    card.appendChild(b);
    view.appendChild(card);
    h.focus({ preventScroll: true });
  }

  // ---- avvio ----
  showHome();
  if (client()) {
    var go = function () {
      loadQuiz().then(function () { if (current === 'home') showHome(); });
    };
    if (window.WT.ready) go();
    else document.addEventListener('wt:ready', go, { once: true });
  } else {
    state.error = 'nd';
    state.loaded = true;
    showHome();
  }
})();
