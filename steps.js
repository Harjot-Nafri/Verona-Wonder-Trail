// "Come funziona": i passi compaiono mentre scorri e la linea si riempie.
(function () {
  var box = document.getElementById('how');
  if (!box) return;
  var steps = Array.prototype.slice.call(box.querySelectorAll('.how-step'));
  var list = box.querySelector('.how-list');
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function progress() {
    if (!list) return;
    var r = list.getBoundingClientRect();
    var vh = window.innerHeight || 800;
    var p = (vh * 0.7 - r.top) / Math.max(r.height, 1);
    list.style.setProperty('--p', String(Math.max(0, Math.min(1, p))));
  }
  var tick = false;
  function onScroll() {
    if (tick) return;
    tick = true;
    requestAnimationFrame(function () { tick = false; progress(); });
  }

  if (still || !('IntersectionObserver' in window)) {
    steps.forEach(function (s) { s.classList.add('in'); });
    list.style.setProperty('--p', '1');
    return;
  }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.35 });
  steps.forEach(function (s) { io.observe(s); });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  progress();
})();
