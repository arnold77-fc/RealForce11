(function () {
  'use strict';

  if (window.__lampac_favorites_sync__) return;
  window.__lampac_favorites_sync__ = true;

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

    var known = (Lampa.Storage.get('account_email', '') || '').trim() ||
                (Lampa.Storage.get('uid', '') || '').trim();
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
        try {
          response = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        } catch (e) {}
        if (onSuccess) onSuccess(response);
      } else {
        if (onError) onError(xhr.responseText || ('HTTP ' + xhr.status));
      }
    };
    xhr.send(method === 'GET' ? null : JSON.stringify(data || {}));
  }

  function get(path, onSuccess, onError) {
    request('GET', path, null, onSuccess, onError);
  }

  function post(path, data, onSuccess, onError) {
    request('POST', path, data, onSuccess, onError);
  }

  function normalizeType(card) {
    if (!card) return 'movie';
    if (card.media_type) return card.media_type === 'tv' ? 'tv' : 'movie';
    if (card.first_air_date || card.name || card.original_name || card.number_of_seasons || card.seasons) return 'tv';
    return 'movie';
  }

  function normalizeYear(card) {
    var value = card.release_date || card.first_air_date || '';
    return value && value.length >= 4 ? value.substring(0, 4) : '';
  }

  function normalizeCard(card) {
    if (!card || !card.id) return null;
    var type = normalizeType(card);

    return {
      tmdb_id: parseInt(card.id, 10),
      media_type: type,
      source: 'tmdb',
      title: type === 'tv'
        ? (card.name || card.title || card.original_name || card.original_title || '')
        : (card.title || card.name || card.original_title || card.original_name || ''),
      original_title: type === 'tv'
        ? (card.original_name || card.name || card.original_title || card.title || '')
        : (card.original_title || card.title || card.original_name || card.name || ''),
      poster: card.poster_path || card.poster || card.img || '',
      backdrop: card.backdrop_path || card.background_image || '',
      year: normalizeYear(card)
    };
  }

  function isTrackableState(state) {
    if (!state) return false;
    return state.state_kind === 'next' || state.state_kind === 'season';
  }

  function parseAirDate(value) {
    if (!value) return null;
    var dt = new Date(value + 'T00:00:00');
    return isNaN(dt.getTime()) ? null : dt;
  }

  function formatAirDateShort(value) {
    var dt = parseAirDate(value);
    if (!dt) return '';
    var day = String(dt.getDate()).padStart(2, '0');
    var month = String(dt.getMonth() + 1).padStart(2, '0');
    var year = String(dt.getFullYear()).slice(-2);
    var currentYear = new Date().getFullYear();
    return dt.getFullYear() === currentYear ? (day + '.' + month) : (day + '.' + month + '.' + year);
  }

  function getReleasedEpisodeCount(data) {
    if (!data) return null;
    var last = data.last_episode_to_air;
    var seasons = data.seasons || [];
    var knownTotal = parseInt(data.number_of_episodes || 0, 10) || 0;

    if (last && last.season_number && last.episode_number) {
      var total = 0;
      for (var i = 0; i < seasons.length; i++) {
        var season = seasons[i];
        if (!season || !season.season_number || season.season_number <= 0) continue;
        if (season.season_number < last.season_number) total += parseInt(season.episode_count || 0, 10) || 0;
      }
      total += parseInt(last.episode_number || 0, 10) || 0;
      if (total > 0) return knownTotal > 0 && total > knownTotal ? knownTotal : total;
    }

    return knownTotal || null;
  }

  function getLastKnownSeasonNumber(data) {
    var seasons = data && data.seasons ? data.seasons : [];
    var last = 0;
    for (var i = 0; i < seasons.length; i++) {
      var season = seasons[i];
      if (season && season.season_number > 0 && season.season_number > last) last = season.season_number;
    }
    if (data && data.last_episode_to_air && data.last_episode_to_air.season_number) {
      last = Math.max(last, data.last_episode_to_air.season_number);
    }
    return last || null;
  }

  function getUpcomingSeason(data) {
    if (!data || !data.seasons) return null;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var nextSeason = null;

    for (var i = 0; i < data.seasons.length; i++) {
      var season = data.seasons[i];
      if (!season || !season.season_number || season.season_number <= 0 || !season.air_date) continue;
      var airDate = parseAirDate(season.air_date);
      if (!airDate || airDate <= today) continue;
      if (!nextSeason || season.season_number < nextSeason.season_number) nextSeason = season;
    }

    return nextSeason;
  }

  function buildTvState(data) {
    if (!data) return null;

    var airedEpisodes = getReleasedEpisodeCount(data);
    var nextEpisode = data.next_episode_to_air && data.next_episode_to_air.air_date ? data.next_episode_to_air : null;
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    if (nextEpisode) {
      var nextDate = parseAirDate(nextEpisode.air_date);
      if (!nextDate || nextDate < today) nextEpisode = null;
    }

    var nextSeason = getUpcomingSeason(data);
    var lastEpisode = data.last_episode_to_air || null;
    var lastSeason = getLastKnownSeasonNumber(data);
    var stateKind = 'unknown';
    var stateMain = '';
    var stateSub = '';
    var stateTitle = '';

    if (nextEpisode) {
      stateKind = 'next';
      stateMain = formatAirDateShort(nextEpisode.air_date);
      stateSub = 'S' + nextEpisode.season_number + 'E' + nextEpisode.episode_number;
      stateTitle = 'Следующая серия: ' + nextEpisode.air_date + ' (' + stateSub + ')';
    } else if (nextSeason && nextSeason.air_date) {
      stateKind = 'season';
      stateMain = formatAirDateShort(nextSeason.air_date);
      stateSub = 'S' + nextSeason.season_number + ' старт';
      stateTitle = 'Следующий сезон: ' + nextSeason.season_number + ' (' + nextSeason.air_date + ')';
    } else if ((data.status || '').toLowerCase() === 'ended' || (data.status || '').toLowerCase() === 'canceled') {
      stateKind = 'ended';
      stateMain = 'Завершен';
      stateSub = '';
      stateTitle = 'Сериал завершен';
    } else if (lastEpisode && lastEpisode.episode_number) {
      stateKind = 'finale';
      stateMain = 'E' + lastEpisode.episode_number;
      stateSub = lastEpisode.season_number ? ('S' + lastEpisode.season_number + ' финал') : 'Финал';
      stateTitle = 'Финал на серии ' + lastEpisode.episode_number;
    } else if (lastSeason) {
      stateKind = 'finale';
      stateMain = 'S' + lastSeason;
      stateSub = 'финал';
      stateTitle = 'Сезон ' + lastSeason + ' завершен';
    }

    return {
      aired_episodes: airedEpisodes || 0,
      next_air_date: nextEpisode ? nextEpisode.air_date : '',
      next_episode_season: nextEpisode ? nextEpisode.season_number : null,
      next_episode_number: nextEpisode ? nextEpisode.episode_number : null,
      next_season_number: nextSeason ? nextSeason.season_number : null,
      last_episode_season: lastEpisode ? (lastEpisode.season_number || null) : null,
      last_episode_number: lastEpisode ? (lastEpisode.episode_number || null) : null,
      series_status: data.status || '',
      state_kind: stateKind,
      state_main: stateMain,
      state_sub: stateSub,
      state_title: stateTitle
    };
  }

  function tmdbRequest(path, onSuccess, onError) {
    new Lampa.Reguest().silent(Lampa.TMDB.api(path), function (data) {
      onSuccess(data || {});
    }, function (error) {
      if (onError) onError(error);
    });
  }

  function fetchTvState(tmdbId, onSuccess, onError) {
    var path = 'tv/' + tmdbId + '?api_key=' + Lampa.TMDB.key() + '&language=' + encodeURIComponent(Lampa.Storage.get('tmdb_lang', Lampa.Storage.get('language', 'ru')));
    tmdbRequest(path, function (data) {
      onSuccess(buildTvState(data || {}));
    }, onError);
  }

  function sourceCard(item) {
    var isTv = item.media_type === 'tv';
    var card = {
      id: item.tmdb_id,
      source: 'tmdb',
      poster_path: item.poster || '',
      backdrop_path: item.backdrop || '',
      vote_average: 0,
      media_type: item.media_type
    };

    if (isTv) {
      card.name = item.title || '';
      card.original_name = item.original_title || item.title || '';
      card.first_air_date = item.year ? (item.year + '-01-01') : '';
      card.number_of_seasons = 1;
    } else {
      card.title = item.title || '';
      card.original_title = item.original_title || item.title || '';
      card.release_date = item.year ? (item.year + '-01-01') : '';
    }

    return card;
  }

  function openCategory(title, url) {
    Lampa.Activity.push({
      title: title,
      component: 'category_full',
      source: SOURCE_NAME,
      url: url,
      page: 1,
      card_type: true
    });
  }

  function buildSource() {
    return {
      list: function (params, onComplete, onError) {
        var endpoint = (params.url === 'favorites_upcoming') ? 'upcoming' : 'list';
        get('/api/favorites/' + endpoint + '?user_key=' + encodeURIComponent(ensureUserKey()), function (resp) {
          var items = (resp && resp.items) ? resp.items : [];
          var results = [];
          for (var i = 0; i < items.length; i++) results.push(sourceCard(items[i]));
          onComplete({
            results: results,
            page: 1,
            total_pages: 1,
            total_results: results.length,
            more: false
          });
        }, function (error) {
          if (onError) onError(error);
        });
      },
      full: function (params, onSuccess, onError) {
        var card = params.card || {};
        params.method = normalizeType(card) === 'tv' ? 'tv' : 'movie';
        Lampa.Api.sources.tmdb.full(params, onSuccess, onError);
      }
    };
  }

  function addMenuItem(action, title, icon, handler) {
    var list = $('.menu .menu__list').eq(0);
    if (!list.length) return;
    if (list.find('[data-action="' + action + '"]').length) return;

    var item = $('<li data-action="' + action + '" class="menu__item selector"><div class="menu__ico">' + icon + '</div><div class="menu__text">' + title + '</div></li>');
    item.on('hover:enter hover:click hover:touch click', function (e) {
      if (e && e.preventDefault) e.preventDefault();
      if (handler) handler();
      return false;
    });
    list.append(item);
  }

  function addTranslations() {
    Lampa.Lang.add({
      favorites_sync_component: { ru: 'Продолжение сериалов', en: 'Series continuation' },
      favorites_sync_key: { ru: 'Ключ синхронизации', en: 'Sync key' },
      favorites_sync_key_desc: { ru: 'Оставьте пустым для привязки к lampac_unic_id', en: 'Leave empty to use lampac_unic_id' },
      favorites_sync_notify: { ru: 'Уведомления о новых сериях', en: 'New episode notifications' },
      favorites_sync_notify_desc: { ru: 'Показывать напоминания за 2 дня, за 1 день и в день выхода', en: 'Show reminders 2 days, 1 day and on release day' }
    });
  }

  function addSettings() {
    Lampa.SettingsApi.addComponent({
      component: 'favorites_sync_component',
      name: Lampa.Lang.translate('favorites_sync_component'),
      icon: iconClock()
    });

    Lampa.SettingsApi.addParam({
      component: 'favorites_sync_component',
      param: {
        name: STORAGE_SYNC_KEY,
        type: 'input',
        values: '',
        default: ''
      },
      field: {
        name: Lampa.Lang.translate('favorites_sync_key'),
        description: Lampa.Lang.translate('favorites_sync_key_desc')
      },
      onChange: function (value) {
        Lampa.Storage.set(STORAGE_SYNC_KEY, value || '');
      }
    });

    Lampa.SettingsApi.addParam({
      component: 'favorites_sync_component',
      param: {
        name: STORAGE_NOTIFY,
        type: 'trigger',
        default: true
      },
      field: {
        name: Lampa.Lang.translate('favorites_sync_notify'),
        description: Lampa.Lang.translate('favorites_sync_notify_desc')
      },
      onChange: function (value) {
        Lampa.Storage.set(STORAGE_NOTIFY, value === 'true');
      }
    });
  }

  function addStyles() {
    if (document.getElementById('favorites-sync-style')) return;

    var style = document.createElement('style');
    style.id = 'favorites-sync-style';
    style.textContent =
      '.full-start__button--favorites-sync,.full-start__button--favorites-track{display:flex;align-items:center;gap:.6em;}' +
      '.full-start__button--favorites-sync svg,.full-start__button--favorites-track svg{width:1.3em;height:1.3em;}' +
      '.full-start__button--favorites-track.is-active{background:rgba(2,119,189,.23);border-color:rgba(2,119,189,.55);}' +
      '.full-start__button--favorites-track.is-active .favorites-track-label{color:#d6efff;}' +
      '.favorites-sync-label,.favorites-track-label{white-space:nowrap;}' +
      '.favorites-sync-mark,.favorites-track-mark{margin-left:.2em;display:none;}' +
      '.favorites-track-mark{color:#8fd7ff;}' +
      '.full-start__button--favorites-track.is-active .favorites-track-mark{display:inline;}';
    document.head.appendChild(style);
  }

  function setTrackButtonState(button, exists) {
    if (!button || !button.length) return;
    button.toggleClass('is-active', !!exists);
    button.find('.favorites-track-label').text('Продолжение');
  }

  function createActionButton(baseClass, icon, labelClass, labelText, markClass) {
    return $('<div class="' + baseClass + '"><div class="full-start__button-icon">' + icon + '</div><div class="' + labelClass + '">' + labelText + '</div><div class="' + markClass + '">•</div></div>');
  }

  function renderFullButton(activity, card) {
    if (!activity || !card || !card.id) return;

    var render = activity.render();
    if (!render || !render.find) return;

    var buttons = render.find('.full-start__buttons').eq(0);
    if (!buttons.length) buttons = render.find('.full-start-new__buttons').eq(0);
    if (!buttons.length) return;

    var trackButton = $();

    buttons.find('.full-start__button--favorites-track').remove();
    buttons.attr('data-favorites-sync-processed', '1');

    var item = normalizeCard(card);
    if (!item) return;
    var renderKey = String(item.tmdb_id) + ':' + item.media_type;
    var currentState = null;
    var currentTracked = false;
    buttons.attr('data-favorites-sync-processed', renderKey);

    function isCurrentRender() {
      var ctx = resolveFullContext();
      return !!(ctx && ctx.key === renderKey);
    }

    function postTracking(enabled, onDone) {
      post('/api/favorites/set_tracking', {
        user_key: ensureUserKey(),
        tmdb_id: item.tmdb_id,
        media_type: 'tv',
        enabled: !!enabled,
        item: item,
        state: currentState
      }, function (resp) {
        currentTracked = !!(resp && resp.item && resp.item.tracking_enabled);
        if (onDone) onDone(true);
      }, function () {
        if (onDone) onDone(false, 'request_failed');
      });
    }

    function toggleTracking(enabled, onDone) {
      if (!enabled) {
        postTracking(false, onDone);
        return;
      }

      if (currentState && isTrackableState(currentState)) {
        postTracking(true, onDone);
        return;
      }

      fetchTvState(item.tmdb_id, function (state) {
        if (!isCurrentRender()) {
          if (onDone) onDone(false, 'stale_render');
          return;
        }
        currentState = state || null;
        if (!currentState || !isTrackableState(currentState)) {
          if (onDone) onDone(false, 'tracking_unavailable');
          return;
        }
        postTracking(true, onDone);
      }, function () {
        if (onDone) onDone(false, 'state_failed');
      });
    }

    function ensureTrackButton() {
      if (!isCurrentRender()) return;
      if (item.media_type !== 'tv' || !isTrackableState(currentState)) {
        if (trackButton && trackButton.length) trackButton.remove();
        return;
      }
      if (trackButton && trackButton.length) return;
      trackButton = createActionButton(TRACK_BUTTON_CLASS, iconClock(), 'favorites-track-label', 'Продолжение', 'favorites-track-mark');
      buttons.append(trackButton);
      setTrackButtonState(trackButton, currentTracked);

      var trackBusy = false;
      trackButton.off('hover:enter hover:click hover:touch click').on('hover:enter hover:click hover:touch click', function () {
        if (trackBusy) return;
        trackBusy = true;

        var active = trackButton.hasClass('is-active');
        toggleTracking(!active, function (ok) {
          trackBusy = false;
          if (!ok) return Lampa.Noty.show('Не удалось включить продолжение');

          setTrackButtonState(trackButton, !active);
          currentTracked = !active;
          Lampa.Noty.show(!active ? 'Сериал добавлен в Ожидаю продолжение' : 'Сериал удален из Ожидаю продолжение');
        });
      });
    }

    get('/api/favorites/check?user_key=' + encodeURIComponent(ensureUserKey()) + '&tmdb_id=' + item.tmdb_id + '&media_type=' + encodeURIComponent(item.media_type), function (resp) {
      if (!isCurrentRender()) return;
      var currentFavorite = resp && resp.item ? resp.item : null;
      currentState = currentFavorite && currentFavorite.series_state ? currentFavorite.series_state : currentState;
      currentTracked = !!(currentFavorite && currentFavorite.tracking_enabled);
      if (trackButton.length) setTrackButtonState(trackButton, currentTracked);
    }, function () {});

    if (item.media_type === 'tv') {
      fetchTvState(item.tmdb_id, function (state) {
        if (!isCurrentRender()) return;
        currentState = state || currentState;
        ensureTrackButton();
      }, function () {
        if (!isCurrentRender()) return;
        ensureTrackButton();
      });
    }
  }

  function resolveFullContext() {
    if (!window.Lampa || !Lampa.Activity || typeof Lampa.Activity.active !== 'function') return null;
    var active = Lampa.Activity.active();
    if (!active || !active.activity) return null;
    var route = active.route || active;
    if (!route || route.component !== 'full') return null;

    var card = route.card ||
      active.activity.card ||
      active.activity.movie ||
      (active.activity.object && (active.activity.object.card || active.activity.object.movie || active.activity.object)) ||
      null;

    if (!card || !card.id) return null;
    return {
      key: String(card.id) + ':' + normalizeType(card),
      activity: active.activity,
      card: card
    };
  }

  function watchFullCard() {
    var lastKey = '';
    setInterval(function () {
      var ctx = resolveFullContext();
      if (!ctx) {
        lastKey = '';
        return;
      }

      var render = ctx.activity.render && ctx.activity.render();
      var buttons = render && render.find ? render.find('.full-start__buttons, .full-start-new__buttons').eq(0) : $();
      var processed = !!(buttons.length && buttons.attr('data-favorites-sync-processed') === ctx.key);
      if (ctx.key !== lastKey || !processed) {
        lastKey = ctx.key;
        renderFullButton(ctx.activity, ctx.card);
      }
    }, 700);
  }

  function syncTrackedSeries(next) {
    get('/api/favorites/tracked?user_key=' + encodeURIComponent(ensureUserKey()), function (resp) {
      var items = (resp && resp.items) ? resp.items : [];
      var index = 0;

      function step() {
        if (index >= items.length) return next();
        var item = items[index++];
        fetchTvState(item.tmdb_id, function (state) {
          post('/api/favorites/sync_series_state', {
            user_key: ensureUserKey(),
            tmdb_id: item.tmdb_id,
            media_type: 'tv',
            state: state
          }, function () {
            step();
          }, function () {
            step();
          });
        }, function () {
          step();
        });
      }

      step();
    }, function () {
      next();
    });
  }

  function todayString() {
    var d = new Date();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + month + '-' + day;
  }

  function notifyQueue(items, index) {
    if (!items || index >= items.length) return;

    var item = items[index];
    Lampa.Noty.show(item.message);
    post('/api/favorites/mark_notified', {
      user_key: ensureUserKey(),
      tmdb_id: item.tmdb_id,
      media_type: 'tv',
      stage: item.stage,
      target: item.target
    }, function () {}, function () {});

    setTimeout(function () {
      notifyQueue(items, index + 1);
    }, 1400);
  }

  function checkNotifications() {
    if (Lampa.Storage.get(STORAGE_NOTIFY, true) === false) return;

    syncTrackedSeries(function () {
      get('/api/favorites/reminders?user_key=' + encodeURIComponent(ensureUserKey()) + '&today=' + encodeURIComponent(todayString()), function (resp) {
        var items = (resp && resp.items) ? resp.items : [];
        if (items.length) notifyQueue(items, 0);
      }, function () {});
    });
  }

  function bindMenuItems() {
    var list = $('.menu .menu__list').eq(0);
    if (list.length) list.find('[data-action="favorites_sync_list"]').remove();

    addMenuItem('favorites_sync_upcoming', TITLE_UPCOMING, iconClock(), function () {
      openCategory(TITLE_UPCOMING, 'favorites_upcoming');
    });
  }

  function boot() {
    if (window.__lampac_favorites_sync_booted__) return;
    window.__lampac_favorites_sync_booted__ = true;

    if (!window.Lampa || !Lampa.SettingsApi || !Lampa.Api || !Lampa.Api.sources || !window.$) return;

    addTranslations();
    addStyles();
    addSettings();

    Lampa.Api.sources[SOURCE_NAME] = buildSource();

    bindMenuItems();

    Lampa.Listener.follow('menu', function () {
      bindMenuItems();
    });

    setInterval(bindMenuItems, 2000);
    watchFullCard();
    setTimeout(checkNotifications, 3500);
  }

  if (window.appready) boot();
  else {
    Lampa.Listener.follow('app', function (e) {
      if (e.type === 'ready') boot();
    });
  }
})();
