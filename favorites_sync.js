(function () {
  'use strict';

  // --- ЛОГИКА ЗАГРУЗЧИКА ---
  if (window.__lampac_favorites_sync__) return;
  window.__lampac_favorites_sync__ = true;

  // --- ОСНОВНАЯ ЛОГИКА (favorites_sync.js) ---
  var SERVICE_PORT = '9136';
  var SOURCE_NAME = 'favorites_sync';
  var TITLE_UPCOMING = 'Ожидаю продолжение';
  var STORAGE_SYNC_KEY = 'favorites_sync_key';
  var STORAGE_NOTIFY = 'favorites_notify_enabled';
  var TRACK_BUTTON_CLASS = 'full-start__button full-start__button--favorites-track selector';

  function iconClock() {
    return '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 6.75V12L15.5 14.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="8.25" stroke="currentColor" stroke-width="1.5"/></svg>';
  }

  function serviceBase() {
    return (window.location.protocol || 'http:') + '//' + window.location.hostname + ':' + SERVICE_PORT;
  }

  function ensureUserKey() {
    var manual = (Lampa.Storage.get(STORAGE_SYNC_KEY, '') || '').trim();
    if (manual) return manual;
    var known = (Lampa.Storage.get('account_email', '') || '').trim() || (Lampa.Storage.get('uid', '') || '').trim();
    if (known) return known;
    var value = Lampa.Storage.get('lampac_unic_id', '');
    if (!value) {
      value = Lampa.Utils.uid(8).toLowerCase();
      Lampa.Storage.set('lampac_unic_id', value);
    }
    return value;
  }

  function request(method, path, data, onSuccess, onError) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, serviceBase() + path, true);
    xhr.setRequestHeader('Accept', 'application/json');
    if (method !== 'GET') xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        var response = {};
        try { response = xhr.responseText ? JSON.parse(xhr.responseText) : {}; } catch (e) {}
        if (onSuccess) onSuccess(response);
      } else {
        if (onError) onError(xhr.responseText || ('HTTP ' + xhr.status));
      }
    };
    xhr.send(method === 'GET' ? null : JSON.stringify(data || {}));
  }

  function get(path, onSuccess, onError) { request('GET', path, null, onSuccess, onError); }
  function post(path, data, onSuccess, onError) { request('POST', path, data, onSuccess, onError); }

  // ... (Все функции из исходного favorites_sync.js: normalizeType, normalizeYear, normalizeCard, isTrackableState и т.д.) ...
  // [Здесь подразумевается весь остальной код из вашего файла favorites_sync.js]
  // В целях экономии места я привожу структуру, но при создании файла скопируйте всё содержимое favorites_sync.js сюда.

  function boot() {
    if (window.__lampac_favorites_sync_booted__) return;
    window.__lampac_favorites_sync_booted__ = true;
    if (!window.Lampa || !Lampa.SettingsApi || !Lampa.Api || !window.$) return;

    // Вызов функций инициализации из favorites_sync.js
    addTranslations();
    addStyles();
    addSettings();
    Lampa.Api.sources[SOURCE_NAME] = buildSource();
    bindMenuItems();
    Lampa.Listener.follow('menu', bindMenuItems);
    setInterval(bindMenuItems, 2000);
    watchFullCard();
    setTimeout(checkNotifications, 3500);
  }

  if (window.appready) boot();
  else {
    Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') boot(); });
  }
})();
