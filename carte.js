// Carte delle note: copertina, bordo olografico, rarità che sale con i cuori.
window.WT_CARDS = (function () {
  var COVERS = [
    ['giardino-giusti', 'Giardino Giusti'],
    ['valpolicella', 'Valpolicella'],
    ['garda', 'Lago di Garda'],
    ['lessinia', 'Lessinia'],
    ['teatro-romano', 'Teatro Romano'],
    ['adige', 'Adige'],
    ['piazza-erbe', 'Piazza delle Erbe'],
    ['castelvecchio', 'Castelvecchio'],
    ['ponte-pietra', 'Ponte Pietra'],
    ['arena', 'Arena']
  ];

  function coverLabel(id) {
    for (var i = 0; i < COVERS.length; i++) if (COVERS[i][0] === id) return COVERS[i][1];
    return '';
  }
  function coverSrc(id) { return 'cover-' + id + '.jpg'; }

  // soglie di rarità: da regolare quando si conosce il numero di giocatori
  function rarity(n) { return n < 3 ? 'Comune' : n < 8 ? 'Rara' : 'Leggendaria'; }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
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

  function burst(from) {
    var r = from.getBoundingClientRect(), e = ['❤', '🧡', '💜'];
    for (var i = 0; i < 6; i++) {
      var h = el('i', 'hc-fly', e[i % 3]);
      h.style.left = (r.left + r.width / 2 - 10) + 'px';
      h.style.top = r.top + 'px';
      h.style.setProperty('--x', ((Math.random() - .5) * 100) + 'px');
      h.style.animationDelay = (i * 0.05) + 's';
      document.body.appendChild(h);
      setTimeout((function (n) { return function () { n.remove(); }; })(h), 1300);
    }
  }

  // opts: { isNew, off, byText, toggle(note, want) -> Promise<{like, mio_like}|null>, extra: Node }
  function build(n, opts) {
    opts = opts || {};
    var li = el('li', 'hc' + (opts.isNew ? ' new' : '') + (opts.off ? ' off' : ''));

    var ph = el('div', 'hc-ph');
    if (n.copertina) {
      var img = el('img');
      img.src = coverSrc(n.copertina);
      img.alt = coverLabel(n.copertina);
      img.loading = 'lazy';
      ph.appendChild(img);
    }
    var badge = el('span', 'hc-rar');
    function setRarity(count) {
      var r = rarity(count);
      badge.textContent = r;
      badge.setAttribute('data-r', r);
    }
    setRarity(n.like || 0);
    ph.appendChild(badge);
    li.appendChild(ph);

    li.appendChild(el('p', 'hc-tag', 'Scritta a ' + n.sede_nome));
    li.appendChild(el('p', 'hc-text', '«' + n.testo + '»'));

    var foot = el('div', 'hc-foot');
    foot.appendChild(el('span', 'hc-by', opts.byText != null ? opts.byText : (n.autore ? '@' + n.autore : 'Anonimo')));

    if (opts.toggle) {
      var heart = el('button', 'hc-heart');
      heart.type = 'button';
      heart.setAttribute('aria-pressed', n.mio_like ? 'true' : 'false');
      heart.setAttribute('aria-label', n.mio_like ? 'Togli il cuore' : 'Metti il cuore');
      heart.appendChild(heartSvg());
      var cnt = el('span', null, String(n.like || 0));
      heart.appendChild(cnt);
      heart.addEventListener('click', function () {
        var want = heart.getAttribute('aria-pressed') !== 'true';
        Promise.resolve(opts.toggle(n, want)).then(function (d) {
          if (!d) return;
          n.like = d.like;
          n.mio_like = d.mio_like;
          heart.setAttribute('aria-pressed', d.mio_like ? 'true' : 'false');
          heart.setAttribute('aria-label', d.mio_like ? 'Togli il cuore' : 'Metti il cuore');
          cnt.textContent = String(d.like);
          setRarity(d.like);
          if (d.mio_like) burst(heart);
          heart.classList.add('pop');
          setTimeout(function () { heart.classList.remove('pop'); }, 180);
        });
      });
      foot.appendChild(heart);
    } else {
      var c = el('span', 'hc-count');
      c.setAttribute('aria-label', (n.like || 0) + ((n.like || 0) === 1 ? ' cuore' : ' cuori'));
      c.appendChild(heartSvg());
      c.appendChild(el('span', null, String(n.like || 0)));
      foot.appendChild(c);
    }
    li.appendChild(foot);
    if (opts.extra) li.appendChild(opts.extra);
    return li;
  }

  return { COVERS: COVERS, coverLabel: coverLabel, coverSrc: coverSrc, rarity: rarity, build: build, el: el };
})();
