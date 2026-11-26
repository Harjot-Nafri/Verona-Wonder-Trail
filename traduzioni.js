// Traduzione automatica delle note (IT <-> EN) tramite la funzione Supabase "traduci".
window.WT_TR = (function () {
  var cache = {};
  function lang() { return window.WT_LANG === 'en' ? 'en' : 'it'; }
  // -> Promise<{testo, uguale}|null>
  function get(id) {
    var l = lang(), k = id + ':' + l;
    if (cache[k]) return cache[k];
    var sb = window.WT && window.WT.sb;
    if (!sb || !sb.functions) return Promise.resolve(null);
    cache[k] = sb.functions.invoke('traduci', { body: { nota: id, lingua: l } }).then(function (r) {
      var d = r && r.data;
      if (!d || !d.ok || !d.testo) { delete cache[k]; return null; }
      return { testo: d.testo, uguale: !!d.uguale };
    }).catch(function () { delete cache[k]; return null; });
    return cache[k];
  }
  // Collega una nota: mostra la traduzione sotto il testo originale, con interruttore
  function attach(note, textEl, host) {
    get(note.id).then(function (t) {
      if (!t || t.uguale || !textEl.isConnected) return;
      var orig = textEl.textContent, tr = '«' + t.testo + '»', showTr = true;
      textEl.textContent = tr;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'hc-tr';
      function paint() { b.textContent = showTr ? (lang() === 'en' ? 'Translated · show original' : 'Tradotta · mostra originale') : (lang() === 'en' ? 'Original · show translation' : 'Originale · mostra traduzione'); }
      paint();
      b.addEventListener('click', function () { showTr = !showTr; textEl.textContent = showTr ? tr : orig; paint(); });
      host.appendChild(b);
    });
  }
  return { get: get, attach: attach, lang: lang };
})();
