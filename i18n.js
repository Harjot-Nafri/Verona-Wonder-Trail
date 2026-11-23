// Lingua del sito: italiano (predefinita) e inglese. La scelta resta salvata sul telefono.
// Le traduzioni inglesi stanno in i18n-en.js: chiave = testo italiano esatto, valore = inglese.
(function () {
  'use strict';
  var KEY = 'wt-lang';
  var lang = 'it';
  try { if (localStorage.getItem(KEY) === 'en') lang = 'en'; } catch (e) {}
  document.documentElement.lang = lang;
  window.WT_LANG = lang;

  function setLang(l) {
    try { localStorage.setItem(KEY, l); } catch (e) {}
    location.reload();
  }

  // ---- interruttore IT | EN ----
  var css = document.createElement('style');
  css.textContent =
    '.langsw{display:inline-flex;border:1px solid rgba(255,255,255,.3);border-radius:999px;padding:3px;gap:2px}' +
    '.langsw button{min-width:44px;min-height:36px;border:0;border-radius:999px;background:transparent;color:#fff;font:600 13px Outfit,system-ui,sans-serif;letter-spacing:.06em;cursor:pointer}' +
    '.langsw button[aria-pressed="true"]{background:#FD8F32;color:#010102}' +
    '.langsw button:focus-visible{outline:3px solid #fff;outline-offset:2px}' +
    '.hright{display:flex;align-items:center;gap:8px}.lang:empty{display:none}' +
    'html[lang="en"] .l-it,html[lang="it"] .l-en{display:none!important}';
  document.head.appendChild(css);

  function mount() {
    var slot = document.getElementById('langsw-slot');
    if (!slot) return;
    var box = document.createElement('div');
    box.className = 'langsw';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Lingua / Language');
    ['it', 'en'].forEach(function (l) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = l.toUpperCase();
      b.lang = l;
      b.setAttribute('aria-pressed', l === lang ? 'true' : 'false');
      b.setAttribute('aria-label', l === 'it' ? 'Italiano' : 'English');
      b.addEventListener('click', function () { if (l !== lang) setLang(l); });
      box.appendChild(b);
    });
    slot.appendChild(box);
  }

  // ---- traduzione (solo inglese) ----
  function start() {
    mount();
    var tt = document.querySelector('title[data-en]');
    if (tt && lang === 'en') document.title = tt.getAttribute('data-en');
    if (lang !== 'en' || !window.WT_EN) return;

    var norm = function (s) { return s.replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim(); };
    var M = {};
    Object.keys(WT_EN.m).forEach(function (k) { M[norm(k)] = WT_EN.m[k]; });
    var HAS = /[A-Za-zÀ-ú]{2}/;
    var own = Object.prototype.hasOwnProperty;

    function tr(s, depth) {
      var n = norm(s);
      if (!n || !HAS.test(n)) return null;
      if (own.call(M, n)) return M[n];
      var i, r, m;
      for (i = 0; i < WT_EN.p.length; i++) {
        m = n.match(WT_EN.p[i][0]);
        if (m) {
          r = WT_EN.p[i][1](m, function (x) { return tr(x, 1) || x; }, function (x) { return tr(x, 1); });
          if (r) return r;
        }
      }
      // simboli iniziali (✓ ✗ ← → ·)
      m = n.match(/^([✓✗←→·+\-]+\s*)(.+)$/);
      if (m) { r = tr(m[2], 1); if (r) return m[1] + r; }
      // frase per frase
      if (!depth) {
        var parts = n.replace(/([.!?…])\s+/g, '$1\u0001').split('\u0001');
        if (parts.length > 1) {
          var any = false;
          var out = parts.map(function (p) { var q = tr(p, 1); if (q) { any = true; return q; } return p; });
          if (any) return out.join(' ');
        }
      }
      return null;
    }

    function fixText(node) {
      var v = node.data;
      var r = tr(v);
      if (r && r !== norm(v)) {
        node.data = (v.match(/^\s*/)[0]) + r + (v.match(/\s*$/)[0]);
      }
    }
    var ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
    function fixEl(el) {
      for (var i = 0; i < ATTRS.length; i++) {
        var v = el.getAttribute(ATTRS[i]);
        if (v) { var r = tr(v); if (r && r !== v) el.setAttribute(ATTRS[i], r); }
      }
    }
    function walk(root) {
      if (root.nodeType === 3) { fixText(root); return; }
      if (root.nodeType !== 1) return;
      var tag = root.nodeName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CANVAS') return;
      if (root.hasAttribute('data-no-i18n')) return;
      fixEl(root);
      for (var c = root.firstChild; c; c = c.nextSibling) walk(c);
    }

    // titolo grande della home (lettere separate)
    function hero() {
      var lines = document.querySelectorAll('.title .letters');
      if (lines.length !== 2) return;
      var words = ['Scan.', 'Discover.'], idx = 0;
      for (var l = 0; l < 2; l++) {
        lines[l].setAttribute('aria-label', words[l]);
        lines[l].textContent = '';
        for (var k = 0; k < words[l].length; k++) {
          var s = document.createElement('span');
          s.setAttribute('aria-hidden', 'true');
          s.style.setProperty('--i', idx++);
          s.textContent = words[l].charAt(k);
          lines[l].appendChild(s);
        }
      }
      var sc = document.querySelector('.title .script span');
      if (sc) sc.textContent = 'write.';
    }

    var d = document.querySelector('meta[name="description"]');
    if (d) d.setAttribute('content', 'Scan the QR codes at the University of Verona locations, unlock their story and write to the other places.');
    hero();
    walk(document.body);
    var t = document.title && tr(document.title);
    if (t) document.title = t;

    new MutationObserver(function (list) {
      list.forEach(function (mu) {
        if (mu.type === 'characterData') fixText(mu.target);
        else if (mu.type === 'attributes') fixEl(mu.target);
        else for (var i = 0; i < mu.addedNodes.length; i++) walk(mu.addedNodes[i]);
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
