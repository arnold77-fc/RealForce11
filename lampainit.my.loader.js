(function () {
  'use strict';
  if (window.__lampac_favorites_sync_loader__) return;
  window.__lampac_favorites_sync_loader__ = true;

  function favoritesSrc() {
    return (window.location.origin || '') + ['/pl', 'ugins/', 'fav', 'orites_sync', '.js?v=20260325_5'].join('');
  }

  function loadFavorites() {
    if (document.querySelector('script[data-lampac-favorites-sync="1"]')) return;
    var script = document.createElement('script');
    script.src = favoritesSrc();
    script.async = false;
    script.defer = false;
    script.setAttribute('data-lampac-favorites-sync', '1');
    (document.head || document.documentElement).appendChild(script);
  }

  var wait = setInterval(function () {
    if (window.Lampa && Lampa.SettingsApi && Lampa.Listener) {
      clearInterval(wait);
      loadFavorites();
    }
  }, 250);
})();
