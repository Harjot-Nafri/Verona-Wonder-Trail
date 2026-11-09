// Fase 1: solo un controllo che il sito e gli aggiornamenti automatici funzionano.
// Qui, nelle prossime fasi, arrivano il lettore QR e il collegamento a Supabase.
(function () {
  var cta = document.getElementById('cta');
  var note = document.getElementById('note');
  if (!cta || !note) return;
  cta.addEventListener('click', function () {
    note.textContent = 'Il lettore QR arriva nella prossima fase.';
  });
})();
