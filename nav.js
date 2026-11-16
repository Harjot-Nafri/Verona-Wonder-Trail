// Navigazione tra le schermate (spostato fuori da index.html per la CSP)
(function () {
  var IDS = ['top', 'mappa', 'gioca', 'parole', 'io'];
  var links = document.querySelectorAll('.dock a');
  function show(id) {
    if (IDS.indexOf(id) < 0) id = 'top';
    document.body.setAttribute('data-view', id);
    for (var i = 0; i < links.length; i++) {
      if (links[i].getAttribute('href') === '#' + id) links[i].setAttribute('aria-current', 'page');
      else links[i].removeAttribute('aria-current');
    }
    window.scrollTo(0, 0);
    document.dispatchEvent(new CustomEvent('wt:view', { detail: id }));
    if (id === 'mappa') setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 60);
  }
  window.WT_VIEW = show;
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (IDS.indexOf(id) < 0) return;
    e.preventDefault();
    show(id);
    try { history.replaceState(null, '', '#' + id); } catch (err) {}
  });
  window.addEventListener('hashchange', function () { show(location.hash.slice(1)); });
  show(location.hash.slice(1));
})();
