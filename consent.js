// Consenso: banner privacy e gestione della scelta (mappa OpenStreetMap).
// La scelta resta sul telefono (localStorage). Cambia VERSION se cambiano i servizi esterni: il banner riapparirà.
(function () {
  var KEY = 'wt_consent';
  var VERSION = 1;
  var banner = null;

  function read() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY));
      return o && o.v === VERSION ? o : null;
    } catch (e) { return null; }
  }
  function write(map) {
    try { localStorage.setItem(KEY, JSON.stringify({ v: VERSION, map: !!map, t: Date.now() })); } catch (e) {}
    document.dispatchEvent(new CustomEvent('wt:consent', { detail: { map: !!map } }));
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function close() {
    if (!banner) return;
    banner.remove();
    banner = null;
  }

  function open() {
    close();
    var cur = read();
    var mapOn = !!(cur && cur.map);
    var b = el('div', 'ck');
    b.setAttribute('role', 'dialog');
    b.setAttribute('aria-labelledby', 'ck-title');
    b.appendChild(el('h3', null, 'Rispettiamo la tua privacy')).id = 'ck-title';
    b.appendChild(el('p', 'ck-tx', 'Il sito salva sul tuo telefono solo il nickname e i tuoi progressi, per farti giocare. La mappa invece è fornita da OpenStreetMap, un servizio esterno, e viene caricata solo con il tuo consenso.'));

    var pn = el('div', 'ck-pn');
    pn.hidden = true;
    var o1 = el('div', 'ck-opt');
    var d1 = el('div');
    d1.appendChild(el('b', null, 'Necessari'));
    d1.appendChild(el('small', null, 'Nickname, progressi e sedi sbloccate. Servono per far funzionare il sito.'));
    var t1 = el('button', 'ck-tg on');
    t1.type = 'button';
    t1.disabled = true;
    t1.setAttribute('role', 'switch');
    t1.setAttribute('aria-checked', 'true');
    t1.setAttribute('aria-label', 'Necessari, sempre attivi');
    o1.appendChild(d1); o1.appendChild(t1);
    var o2 = el('div', 'ck-opt');
    var d2 = el('div');
    d2.appendChild(el('b', null, 'Mappa (OpenStreetMap)'));
    d2.appendChild(el('small', null, 'Mostra la mappa delle sedi. Attivandola, ti colleghi al servizio esterno OpenStreetMap, che ha una sua informativa sulla privacy.'));
    var t2 = el('button', 'ck-tg' + (mapOn ? ' on' : ''));
    t2.type = 'button';
    t2.setAttribute('role', 'switch');
    t2.setAttribute('aria-checked', mapOn ? 'true' : 'false');
    t2.setAttribute('aria-label', 'Mappa OpenStreetMap');
    t2.addEventListener('click', function () {
      mapOn = !mapOn;
      t2.classList.toggle('on', mapOn);
      t2.setAttribute('aria-checked', mapOn ? 'true' : 'false');
    });
    o2.appendChild(d2); o2.appendChild(t2);
    pn.appendChild(o1); pn.appendChild(o2);
    b.appendChild(pn);

    var row = el('div', 'ck-row');
    var no = el('button', 'ck-btn ck-no', 'Solo necessari');
    var ok = el('button', 'ck-btn ck-ok', 'Accetta tutto');
    no.type = ok.type = 'button';
    no.addEventListener('click', function () { write(false); close(); });
    var saving = false;
    ok.addEventListener('click', function () { write(saving ? mapOn : true); close(); });
    row.appendChild(no); row.appendChild(ok);
    b.appendChild(row);

    var links = el('div', 'ck-links');
    var pz = el('button', 'ck-lk', 'Personalizza');
    pz.type = 'button';
    pz.addEventListener('click', function () {
      saving = pn.hidden;
      pn.hidden = !pn.hidden;
      pz.textContent = pn.hidden ? 'Personalizza' : 'Chiudi';
      ok.textContent = pn.hidden ? 'Accetta tutto' : 'Salva scelta';
    });
    var pv = el('a', 'ck-lk', 'Privacy');
    pv.href = 'privacy.html';
    links.appendChild(pz);
    links.appendChild(document.createTextNode(' · '));
    links.appendChild(pv);
    b.appendChild(links);

    document.body.appendChild(b);
    banner = b;
    no.focus({ preventScroll: true });
  }

  window.WT_CONSENT = {
    get: read,
    map: function () { var c = read(); return !!(c && c.map); },
    open: open
  };

  function init() { if (!read()) open(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
