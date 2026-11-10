// Animazione "fuochi d'artificio" quando si sblocca una sede.
// Uso: window.WT_UNLOCK({ nome, n, total, punti }) -> Promise (si risolve quando si preme Continua)
(function () {
  var COL = ['#FD8F32', '#FFB36B', '#7022FC', '#C9A8FF', '#ffffff'];
  var css = '' +
    '.ul{position:fixed;inset:0;z-index:2000;display:flex;flex-direction:column;align-items:center;color:#fff;font-family:Outfit,system-ui,sans-serif;' +
    'background:radial-gradient(75% 46% at 8% 6%,rgba(112,34,252,.75),transparent 70%),radial-gradient(70% 44% at 102% 100%,rgba(253,143,50,.55),transparent 70%),#010102;opacity:0;transition:opacity .35s}' +
    '.ul.in{opacity:1}.ul.out{opacity:0}' +
    '.ul canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}' +
    '.ul-stage{position:relative;flex:1;width:100%;display:grid;place-items:center;overflow:hidden}' +
    '.ul-sym{width:min(230px,58vw);height:min(230px,58vw);opacity:0;filter:drop-shadow(0 0 30px #FD8F32);overflow:visible}' +
    '.ul.fin .ul-sym{animation:ulin 1s ease-out forwards}' +
    '@keyframes ulin{from{opacity:0;transform:scale(.3) rotate(-60deg)}to{opacity:1;transform:none}}' +
    '.ul-rk{position:absolute;width:6px;height:26px;border-radius:6px;background:linear-gradient(#fff,transparent);bottom:-30px}' +
    '.ul-res{width:100%;max-width:480px;padding:0 22px calc(26px + env(safe-area-inset-bottom));text-align:center;display:grid;gap:8px;justify-items:center}' +
    '.ul-res>*{opacity:0;transform:translateY(18px)}' +
    '.ul.txt .ul-res>*{animation:ulup .6s cubic-bezier(.2,.9,.3,1) forwards}' +
    '.ul.txt .ul-res>*:nth-child(2){animation-delay:.1s}.ul.txt .ul-res>*:nth-child(3){animation-delay:.2s}.ul.txt .ul-res>*:nth-child(4){animation-delay:.3s}.ul.txt .ul-res>*:nth-child(5){animation-delay:.45s}' +
    '@keyframes ulup{to{opacity:1;transform:none}}' +
    '.ul-tag{font:700 12px Unbounded,sans-serif;letter-spacing:.14em;color:#FFB36B;text-transform:uppercase}' +
    '.ul-res h2{margin:0;font:800 clamp(26px,8vw,34px)/1.08 Unbounded,sans-serif;letter-spacing:-.03em}' +
    '.ul-chips{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}' +
    '.ul-chip{padding:7px 14px;border-radius:99px;font:700 14px Outfit,sans-serif;background:rgba(255,255,255,.14)}.ul-chip.o{background:#FD8F32;color:#010102}' +
    '.ul-bar{width:min(300px,80%);height:8px;border-radius:9px;background:rgba(255,255,255,.18);overflow:hidden}' +
    '.ul-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#7022FC,#FD8F32);border-radius:9px}' +
    '.ul.txt .ul-bar i{animation:ulfill 1s .6s ease-out forwards}@keyframes ulfill{to{width:var(--w)}}' +
    '.ul-go{margin-top:6px;border:0;border-radius:99px;padding:15px 36px;font:700 16px Outfit,sans-serif;background:#fff;color:#010102;cursor:pointer}' +
    '.ul-go:focus-visible{outline:3px solid #FD8F32;outline-offset:3px}';
  var SYM = (function () {
    var s = '<svg class="ul-sym" viewBox="0 0 100 100" aria-hidden="true"><g stroke="#FD8F32" stroke-width="9" stroke-linecap="round" fill="#FD8F32">';
    for (var i = 0; i < 7; i++) {
      s += '<g transform="rotate(' + (i * 360 / 7) + ' 50 50)"><line x1="50" y1="50" x2="50" y2="22"/><circle cx="50" cy="9" r="8" stroke="none"/></g>';
    }
    return s + '</g></svg>';
  })();
  var styled = false;
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  window.WT_UNLOCK = function (o) {
    return new Promise(function (resolve) {
      if (!styled) {
        var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); styled = true;
      }
      var calm = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
      var pts = o.punti == null ? 20 : o.punti;
      var pct = o.total ? Math.round(100 * o.n / o.total) : 0;
      var root = document.createElement('div');
      root.className = 'ul';
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-label', 'Sede sbloccata: ' + o.nome);
      root.innerHTML = '<canvas></canvas><div class="ul-stage">' + SYM + '</div>' +
        '<div class="ul-res" aria-live="polite"><span class="ul-tag">Sede sbloccata</span><h2>' + esc(o.nome) + '</h2>' +
        '<div class="ul-chips"><span class="ul-chip o">+' + pts + ' punti</span><span class="ul-chip">' + o.n + ' / ' + o.total + ' sedi</span></div>' +
        '<div class="ul-bar" style="--w:' + pct + '%"><i></i></div><button class="ul-go" type="button">Continua</button></div>';
      document.body.appendChild(root);
      var cv = root.querySelector('canvas'), ctx = cv.getContext('2d'), stage = root.querySelector('.ul-stage'), btn = root.querySelector('.ul-go');
      var parts = [], raf = null, timers = [], closed = false;
      function size() { cv.width = innerWidth * 2; cv.height = innerHeight * 2; }
      size();
      function vib(p) { if (navigator.vibrate) navigator.vibrate(p); }
      function at(ms, f) { timers.push(setTimeout(f, ms)); }
      function burst(x, y, n, pw) {
        for (var i = 0; i < n; i++) {
          var a = Math.random() * Math.PI * 2, s = (Math.random() * .7 + .3) * pw;
          parts.push({ x: x * 2, y: y * 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s - pw * .3, r: Math.random() * 7 + 4, c: COL[(Math.random() * 5) | 0], l: 1, sq: Math.random() < .4, rot: Math.random() * 6 });
        }
        if (!raf) draw();
      }
      function draw() {
        ctx.clearRect(0, 0, cv.width, cv.height);
        parts = parts.filter(function (p) { return p.l > 0; });
        parts.forEach(function (p) {
          p.x += p.vx; p.y += p.vy; p.vy += .35; p.vx *= .985; p.l -= .011; p.rot += .1;
          ctx.globalAlpha = Math.max(p.l, 0); ctx.fillStyle = p.c;
          if (p.sq) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore(); }
          else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
        });
        ctx.globalAlpha = 1;
        raf = parts.length && !closed ? requestAnimationFrame(draw) : null;
      }
      function close() {
        if (closed) return; closed = true;
        timers.forEach(clearTimeout);
        root.classList.remove('in'); root.classList.add('out');
        document.removeEventListener('keydown', onKey);
        setTimeout(function () { root.remove(); resolve(); }, 380);
      }
      function onKey(e) { if (e.key === 'Escape' || e.key === 'Enter') close(); }
      btn.addEventListener('click', close);
      document.addEventListener('keydown', onKey);
      requestAnimationFrame(function () { root.classList.add('in'); });
      btn.focus({ preventScroll: true });

      var W = innerWidth, H = stage.clientHeight || innerHeight * .65, top = stage.getBoundingClientRect().top || 0;
      if (calm) {
        root.classList.add('fin'); at(300, function () { root.classList.add('txt'); });
        return;
      }
      vib(20);
      [[.22, .38, 0], [.78, .3, 350], [.5, .22, 700], [.3, .62, 1000], [.72, .55, 1250]].forEach(function (f) {
        at(f[2], function () {
          var r = document.createElement('i'); r.className = 'ul-rk'; r.style.left = (f[0] * W) + 'px'; stage.appendChild(r);
          var y = H * f[1];
          r.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(' + (-(H + 30 - y)) + 'px)' }], { duration: 550, easing: 'ease-out', fill: 'forwards' });
          at(f[2] + 550, function () { r.remove(); burst(f[0] * W, top + y, 55, 12); vib(25); });
        });
      });
      at(1700, function () { burst(W / 2, top + H / 2, 110, 17); root.classList.add('fin'); vib([40, 30, 90]); });
      at(1900, function () { root.classList.add('txt'); });
    });
  };
})();
