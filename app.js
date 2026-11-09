// Fase 2: accesso anonimo, nickname, sblocco sedi dal QR.
(function () {
  var cfg = window.WT_CONFIG;
  var cta = document.getElementById('cta');
  var note = document.getElementById('note');
  var progress = document.getElementById('progress');
  var who = document.getElementById('who');
  var form = document.getElementById('nick-form');
  var input = document.getElementById('nick');

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
    if (!sede || !key) return;
    window.history.replaceState({}, '', window.location.pathname);
    var res = await sb.rpc('sblocca_sede', { p_sede: sede, p_chiave: key });
    if (res.error || !res.data || !res.data.ok) {
      say('Questo QR non è valido. Riprova a inquadrarlo.');
      return;
    }
    var info = await sb.from('sedi').select('nome').eq('id', sede).maybeSingle();
    var nome = info.data && info.data.nome ? info.data.nome : 'nuova sede';
    say('Sede sbloccata: ' + nome);
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

  async function loadProgress() {
    var total = await sb.from('sedi').select('id', { count: 'exact', head: true });
    var mine = await sb.from('sblocchi').select('sede_id', { count: 'exact', head: true });
    if (total.error || mine.error || !progress) return;
    progress.textContent = 'Sedi sbloccate: ' + (mine.count || 0) + ' su ' + (total.count || 0);
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
      await unlockFromUrl();
      await loadProfile();
      await loadProgress();
    } catch (err) {
      say('Qualcosa non ha funzionato. Riprova tra poco.');
    }
  })();
})();
