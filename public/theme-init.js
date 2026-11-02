// Applique le thème avant le premier affichage (évite un flash blanc).
// Script classique et synchrone : il doit rester minuscule.
(function () {
  var t = null;
  try { t = localStorage.getItem('jsthier-theme'); } catch (e) {}
  if (t !== 'light' && t !== 'dark') t = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
  if (navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches)) {
    document.documentElement.setAttribute('data-standalone-app', '');
  }
})();
