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
      img.loading = opts.eager ? 'eager' : 'lazy';
      if (opts.eager) img.decoding = 'sync';
      ph.appendChild(img);
    }
    var badge = el('span', 'hc-rar');
    function setRarity(count) {
      var r = rarity(count);
      li.classList.toggle('r-rara', r === 'Rara');
      li.classList.toggle('r-leg', r === 'Leggendaria');
      badge.textContent = r;
      badge.setAttribute('data-r', r);
    }
    setRarity(n.like || 0);
    ph.appendChild(badge);
    li.appendChild(ph);
    [['-6px', '30%', null, null, '.2s'], [null, '18%', '-6px', null, '1s'], [null, null, '12%', '-8px', '1.6s'], ['14%', null, null, null, '.7s']].forEach(function (q, k) {
      var sp = el('i', 'hc-sp');
      if (k === 0) { sp.style.left = '-6px'; sp.style.top = '30%'; }
      if (k === 1) { sp.style.right = '-6px'; sp.style.top = '18%'; }
      if (k === 2) { sp.style.right = '12%'; sp.style.bottom = '-8px'; }
      if (k === 3) { sp.style.left = '14%'; sp.style.top = '-8px'; }
      sp.style.animationDelay = q[4];
      sp.setAttribute('aria-hidden', 'true');
      li.appendChild(sp);
    });
    if (opts.tilt) {
      var mv = function (x, y) {
        var r = li.getBoundingClientRect();
        var px = Math.max(0, Math.min(1, (x - r.left) / r.width));
        var py = Math.max(0, Math.min(1, (y - r.top) / r.height));
        li.style.setProperty('--mx', px * 100 + '%');
        li.style.setProperty('--my', py * 100 + '%');
        li.style.setProperty('--hx', px * 100 + '%');
        li.style.setProperty('--rx', ((0.5 - py) * 12) + 'deg');
        li.style.setProperty('--ry', ((px - 0.5) * 12) + 'deg');
      };
      li.classList.add('tilt');
      li.addEventListener('pointermove', function (e) { mv(e.clientX, e.clientY); });
      li.addEventListener('pointerleave', function () { li.style.setProperty('--rx', '0deg'); li.style.setProperty('--ry', '0deg'); });
      li.addEventListener('touchmove', function (e) { mv(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    }

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
