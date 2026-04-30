//Оригінальний плагін https://github.com/FoxStudio24/lampa/blob/main/Quality/Quality.js
//SVG Quality Badges (Full card & Posters) + settings + cache + modern gradient design
//Працює при увімкненому парсері (знаходить максимальну якість та озвучки)

(function () {
  'use strict';

  // =====================================================================
  // CONFIG
  // =====================================================================

  var pluginPath = 'https://raw.githubusercontent.com/ko31k/LMP/main/wwwroot/img/';

  var svgIcons = {
    '4K': pluginPath + '4K.svg',
    '2K': pluginPath + '2K.svg',
    'FULL HD': pluginPath + 'FULL%20HD.svg',
    'HD': pluginPath + 'HD.svg',
    'HDR': pluginPath + 'HDR.svg',
    'Dolby Vision': pluginPath + 'DolbyV.png',
    '7.1': pluginPath + '7.1.svg',
    '5.1': pluginPath + '5.1.svg',
    '4.0': pluginPath + '4.0.svg',
    '2.0': pluginPath + '2.0.svg',
    'UKR': pluginPath + 'UA.png',
    'RU': pluginPath + 'RU.png' // Індикатор мови
  };

  var SETTINGS_KEY = 'svgq_user_settings_v11';
  var CACHE_KEY = 'svgq_parser_cache_v6';
  var CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

  var st = {
    placement: 'rate',
    force_new_line: false,
    badge_size: 2.0,
    show_on_cards: true // Показувати на постерах
  };

  var memCache = null;

  // =====================================================================
  // SAFE STORAGE
  // =====================================================================

  function lsGet(key, def) {
    try {
      var v = Lampa.Storage.get(key, def);
      return (typeof v === 'undefined') ? def : v;
    } catch (e) { return def; }
  }
  function lsSet(key, val) {
    try { Lampa.Storage.set(key, val); } catch (e) {}
  }

  // =====================================================================
  // SETTINGS
  // =====================================================================

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function applyCssVars() {
    try {
      if (document && document.documentElement) {
        document.documentElement.style.setProperty('--svgq-badge-size', String(st.badge_size) + 'em');
      }
    } catch (e) {}
  }

  function loadSettings() {
    var s = lsGet(SETTINGS_KEY, {}) || {};
    st.placement = (['rate', 'under_rate', 'after_details'].indexOf(s.placement) !== -1) ? s.placement : 'rate';
    st.force_new_line = (typeof s.force_new_line === 'boolean') ? s.force_new_line : false;
    st.show_on_cards = (typeof s.show_on_cards === 'boolean') ? s.show_on_cards : true;

    if (typeof s.badge_size !== 'undefined') {
      var n = parseFloat(String(s.badge_size).replace(',', '.'));
      if (!isNaN(n) && isFinite(n)) st.badge_size = clamp(n, 0.6, 4.0);
    }
    applyCssVars();
  }

  function saveSettings() {
    lsSet(SETTINGS_KEY, st);
    applyCssVars();
    toast('Збережено');
  }

  function toast(msg) {
    try {
      if (Lampa && typeof Lampa.Noty === 'function') { Lampa.Noty(msg); return; }
      if (Lampa && Lampa.Noty && Lampa.Noty.show) { Lampa.Noty.show(msg); return; }
    } catch (e) {}
  }

  // =====================================================================
  // CACHE
  // =====================================================================

  function getCacheObj() {
    if (memCache) return memCache;
    memCache = lsGet(CACHE_KEY, {}) || {};
    return memCache;
  }

  function makeCacheKey(movie) {
    var id = movie && movie.id ? String(movie.id) : '';
    var year = '';
    var rd = movie && (movie.release_date || movie.first_air_date);
    if (rd && String(rd).length >= 4) year = String(rd).slice(0, 4);
    var t = (movie.title || movie.name || movie.original_title || movie.original_name || '').toString().toLowerCase();
    return id + '|' + year + '|' + t;
  }

  function cacheGet(movie) {
    var key = makeCacheKey(movie);
    var c = getCacheObj();
    var it = c[key];
    if (!it || !it.t || typeof it.v === 'undefined') return null;
    if (Date.now() - it.t > CACHE_TTL_MS) return null;
    return it.v;
  }

  function cacheSet(movie, value) {
    var key = makeCacheKey(movie);
    var c = getCacheObj();
    c[key] = { t: Date.now(), v: value };
    memCache = c;
    lsSet(CACHE_KEY, c);
  }

  function cacheClear() {
    memCache = {};
    lsSet(CACHE_KEY, {});
    toast('Кеш очищено');
  }

  // =====================================================================
  // PARSING LOGIC
  // =====================================================================

  function countSupportedTracks(title) {
    if (!title) return 0;
    var cleanTitle = String(title).toLowerCase();
    var subsIndex = cleanTitle.indexOf('sub');
    if (subsIndex !== -1) cleanTitle = cleanTitle.substring(0, subsIndex);

    var multiUkr = cleanTitle.match(/(\d+)x\s*(ukr)/);
    var multiRus = cleanTitle.match(/(\d+)x\s*(rus|рус)/);
    if (multiUkr && multiUkr[1]) return parseInt(multiUkr[1], 10) || 0;
    if (multiRus && multiRus[1]) return parseInt(multiRus[1], 10) || 0;

    var singlesUkr = cleanTitle.match(/\bukr\b/g);
    var singlesRus = cleanTitle.match(/\b(rus|рус)\b/g);
    if (singlesUkr) return singlesUkr.length;
    if (singlesRus) return singlesRus.length;

    return 0;
  }

  function getCardType(cardData) {
    var type = cardData && (cardData.media_type || cardData.type);
    if (type === 'movie' || type === 'tv') return type;
    return (cardData && (cardData.name || cardData.original_name)) ? 'tv' : 'movie';
  }

  function extractYearFromTitle(title) {
    if (!title) return 0;
    var regex = /(?:^|[^\d])(\d{4})(?:[^\d]|$)/g;
    var match, lastYear = 0;
    var currentYear = new Date().getFullYear();
    while ((match = regex.exec(title)) !== null) {
      var y = parseInt(match[1], 10);
      if (y >= 1900 && y <= currentYear + 1) lastYear = y;
    }
    return lastYear;
  }

  function getMovieYear(movie) {
    var rd = movie && (movie.release_date || movie.first_air_date);
    if (rd && String(rd).length >= 4) {
      var y = parseInt(String(rd).slice(0, 4), 10);
      return isNaN(y) ? 0 : y;
    }
    return 0;
  }

  function isSeriesTorrentTitle(tl) {
    return /(сезон|season|s\d{1,2}|серии|серії|episodes|епізод|\d{1,2}\s*из\s*\d{1,2}|\d+×\d+)/i.test(tl);
  }

  function detectAudioFromTitle(tl) {
    if (!tl) return null;
    if (/\b7[\.\s]?1\b|\b8ch\b|\b8\s*ch\b/i.test(tl)) return '7.1';
    if (/\b5[\.\s]?1\b|\b6ch\b|\b6\s*ch\b/i.test(tl)) return '5.1';
    if (/\b4[\.\s]?0\b|\b4ch\b|\b4\s*ch\b/i.test(tl)) return '4.0';
    if (/\b2[\.\s]?0\b|\b2ch\b|\b2\s*ch\b/i.test(tl)) return '2.0';
    return null;
  }

  function getBest(results, movie) {
    var cardType = getCardType(movie);
    var cardYear = getMovieYear(movie);

    var best = { 
      resolution: null, 
      hdr: false, 
      dolbyVision: false, 
      audio: null, 
      hasTrack: false, 
      trackTracks: 0,
      hasUkr: false,
      hasRus: false
    };

    var resOrder = ['HD', 'FULL HD', '2K', '4K'];
    var audioOrder = ['2.0', '4.0', '5.1', '7.1'];
    var limit = Math.min(results.length, 50);

    for (var i = 0; i < limit; i++) {
      var item = results[i];
      var title = (item.Title || item.title || item.name || '').toString();
      if (!title) continue;
      var tl = title.toLowerCase();

      if (cardType === 'tv' && !isSeriesTorrentTitle(tl)) continue;
      if (cardType === 'movie' && isSeriesTorrentTitle(tl)) continue;

      if (cardYear > 1900) {
        var y = extractYearFromTitle(title) || parseInt(item.relased || item.released || 0, 10) || 0;
        if (y > 1900 && y !== cardYear) continue;
      }

      var trackCount = countSupportedTracks(title);
      if (!trackCount || trackCount <= 0) continue;

      best.hasTrack = true;
      if (trackCount > best.trackTracks) best.trackTracks = trackCount;

      var foundRes = null;
      if (tl.indexOf('4k') >= 0 || tl.indexOf('2160') >= 0 || tl.indexOf('uhd') >= 0) foundRes = '4K';
      else if (tl.indexOf('2k') >= 0 || tl.indexOf('1440') >= 0) foundRes = '2K';
      else if (tl.indexOf('1080') >= 0 || tl.indexOf('fhd') >= 0 || tl.indexOf('full hd') >= 0) foundRes = 'FULL HD';
      else if (tl.indexOf('720') >= 0 || /\bhd\b/.test(tl)) foundRes = 'HD';

      if (foundRes) {
        if (!best.resolution || resOrder.indexOf(foundRes) > resOrder.indexOf(best.resolution)) {
          best.resolution = foundRes;
        }
      }

      if (tl.indexOf('dolby vision') >= 0 || tl.indexOf('dovi') >= 0) best.dolbyVision = true;
      if (tl.indexOf('hdr') >= 0) best.hdr = true;

      if (tl.indexOf('ukr') >= 0) best.hasUkr = true;
      if (tl.indexOf('rus') >= 0 || tl.indexOf('рус') >= 0) best.hasRus = true;

      if (item.ffprobe && Array.isArray(item.ffprobe)) {
        for (var k = 0; k < item.ffprobe.length; k++) {
          var stream = item.ffprobe[k];
          if (!stream) continue;

          if (stream.codec_type === 'video') {
            var h = parseInt(stream.height || 0, 10);
            var w = parseInt(stream.width || 0, 10);
            var res = null;

            if (h >= 2160 || w >= 3840) res = '4K';
            else if (h >= 1440 || w >= 2560) res = '2K';
            else if (h >= 1080 || w >= 1920) res = 'FULL HD';
            else if (h >= 720 || w >= 1280) res = 'HD';

            if (res) {
              if (!best.resolution || resOrder.indexOf(res) > resOrder.indexOf(best.resolution)) best.resolution = res;
            }

            try {
              if (stream.side_data_list && JSON.stringify(stream.side_data_list).indexOf('Vision') >= 0) best.dolbyVision = true;
              if (stream.color_transfer === 'smpte2084' || stream.color_transfer === 'arib-std-b67') best.hdr = true;
            } catch (e) {}
          }

          if (stream.codec_type === 'audio') {
            var ch = parseInt(stream.channels || 0, 10);
            if (ch) {
              var aud = (ch >= 8) ? '7.1' : (ch >= 6) ? '5.1' : (ch >= 4) ? '4.0' : '2.0';
              if (!best.audio || audioOrder.indexOf(aud) > audioOrder.indexOf(best.audio)) best.audio = aud;
            }
          }
        }
      } else {
        var a = detectAudioFromTitle(tl);
        if (a && (!best.audio || audioOrder.indexOf(a) > audioOrder.indexOf(best.audio))) best.audio = a;
      }
    }
    if (best.dolbyVision) best.hdr = true;
    return best.hasTrack ? best : null;
  }

  // =====================================================================
  // RENDERING & QUEUE
  // =====================================================================

  function createBadgeImg(type, index) {
    var iconPath = svgIcons[type];
    if (!iconPath) return '';
    var delay = (index * 0.06) + 's';
    return (
      '<div class="quality-badge" style="animation-delay:' + delay + '">' +
        '<img src="' + iconPath + '" draggable="false" oncontextmenu="return false;">' +
      '</div>'
    );
  }

  function buildBadgesHtml(best) {
    if (!best || !best.hasTrack) return '';
    var badges = [];

    // Тільки максимальна якість
    if (best.resolution) {
      badges.push(createBadgeImg(best.resolution, badges.length));
    }

    if (best.hdr) badges.push(createBadgeImg('HDR', badges.length));
    if (best.dolbyVision) badges.push(createBadgeImg('Dolby Vision', badges.length));
    if (best.audio) badges.push(createBadgeImg(best.audio, badges.length));

    if (best.hasRus) {
      badges.push(createBadgeImg('RU', badges.length));
    }
    if (best.hasUkr) {
      badges.push(createBadgeImg('UKR', badges.length));
    }
    return badges.join('');
  }

  var parseQueue = [];
  var isParsingQueue = false;

  function enqueueParse(movie, renderRoot) {
    for (var i = 0; i < parseQueue.length; i++) {
      if (parseQueue[i].movie.id === movie.id && parseQueue[i].movie.title === movie.title) {
        parseQueue[i].elements.push(renderRoot);
        return;
      }
    }
    parseQueue.push({ movie: movie, elements: [renderRoot] });
    if (!isParsingQueue) processQueue();
  }

  function processQueue() {
    if (parseQueue.length === 0) {
      isParsingQueue = false;
      return;
    }
    isParsingQueue = true;
    var task = parseQueue.shift();

    var cached = cacheGet(task.movie);
    if (cached) {
      if (cached !== 'EMPTY') {
        task.elements.forEach(function(el) {
          el.find('.quality-badges-card').remove();
          el.append('<div class="quality-badges-card">' + cached + '</div>');
        });
      }
      processQueue();
      return;
    }

    Lampa.Parser.get({ search: task.movie.title || task.movie.name, movie: task.movie, page: 1 }, function (response) {
      var html = 'EMPTY';
      if (response && response.Results) {
        var best = getBest(response.Results, task.movie);
        var bHtml = buildBadgesHtml(best);
        if (bHtml) html = bHtml;
      }
      cacheSet(task.movie, html);

      if (html !== 'EMPTY') {
        task.elements.forEach(function(el) {
          el.find('.quality-badges-card').remove();
          el.append('<div class="quality-badges-card">' + html + '</div>');
        });
      }
      setTimeout(processQueue, 400); 
    });
  }

  function applyBadgesToCard(movie, renderRoot) {
    if (!Lampa.Parser || typeof Lampa.Parser.get !== 'function') return;
    if (!movie || (!movie.title && !movie.name)) return;
    
    var cached = cacheGet(movie);
    if (cached) {
      if (cached !== 'EMPTY') {
        renderRoot.find('.quality-badges-card').remove();
        renderRoot.append('<div class="quality-badges-card">' + cached + '</div>');
      }
      return;
    }
    enqueueParse(movie, renderRoot);
  }

  // =====================================================================
  // PATCH CARD RENDER
  // =====================================================================
  function patchLampaCard() {
    Lampa.Listener.follow('card', function (e) {
      if ((e.type === 'build' || e.type === 'render') && st.show_on_cards) {
        try {
          var movie = e.data;
          var html = e.object.html;
          applyBadgesToCard(movie, html);
        } catch (err) {}
      }
    });
  }

  // Відображення в Full Card
  function ensureContainer(renderRoot) {
    $('.quality-badges-container, .quality-badges-under-rate, .quality-badges-after-details', renderRoot).remove();
    renderRoot
      .removeClass('svgq-place-rate svgq-place-under svgq-place-after')
      .addClass(
        st.placement === 'under_rate' ? 'svgq-place-under' :
        st.placement === 'after_details' ? 'svgq-place-after' :
        'svgq-place-rate'
      );

    var rateLine = $('.full-start-new__rate-line, .full-start__rate-line', renderRoot).first();
    var details = $('.full-start-new__details, .full-start__details', renderRoot).first();

    if (st.placement === 'rate') {
      if (!rateLine.length) return null;
      var cls = 'quality-badges-container' + (st.force_new_line ? ' svgq-force-new-row' : '');
      var el = $('<div class="' + cls + '"></div>');
      rateLine.append(el);
      return el;
    }
    if (st.placement === 'under_rate') {
      if (!rateLine.length) return null;
      var elU = $('<div class="quality-badges-under-rate"></div>');
      rateLine.after(elU);
      return elU;
    }
    if (st.placement === 'after_details') {
      if (!details.length) return null;
      var elA = $('<div class="quality-badges-after-details"></div>');
      details.after(elA);
      return elA;
    }
    return null;
  }

  function applyBadgesToFullCard(movie, renderRoot) {
    if (!movie || !renderRoot) return;
    if (!Lampa.Parser || typeof Lampa.Parser.get !== 'function') return;

    var container = ensureContainer(renderRoot);
    if (!container) return;

    var cached = cacheGet(movie);
    if (cached) {
      if (cached !== 'EMPTY') container.html(cached);
      return;
    }

    container.html('');
    Lampa.Parser.get({ search: movie.title || movie.name, movie: movie, page: 1 }, function (response) {
      if (!response || !response.Results) {
        cacheSet(movie, 'EMPTY');
        return;
      }
      var best = getBest(response.Results, movie);
      var html = buildBadgesHtml(best);
      cacheSet(movie, html || 'EMPTY');
      if (html) container.html(html);
    });
  }

  // =====================================================================
  // STYLES 
  // =====================================================================

  var style = '<style id="svgq_styles">\
    .full-start__status.lqe-quality{ display:none !important; }\
    :root{ --svgq-badge-size: 2.0em; }\
    \
    /* Containers */\
    .quality-badges-container, .quality-badges-under-rate, .quality-badges-after-details {\
      display:inline-flex; flex-wrap:wrap; align-items:center;\
      column-gap:0.4em; row-gap:0.3em; pointer-events:none; max-width:100%;\
    }\
    .quality-badges-container { margin:0.20em 0 0 0.48em; min-height:1.2em; vertical-align:middle; }\
    .svgq-place-rate .full-start-new__rate-line, .svgq-place-rate .full-start__rate-line { display:flex; align-items:center; }\
    .quality-badges-container.svgq-force-new-row { flex-basis:100%; width:100%; margin-left:0; margin-top:0.3em; }\
    .quality-badges-under-rate { margin:0.4em 0 1.8em 0; z-index:2; position:relative; }\
    .quality-badges-after-details { margin:0.03em 0 1.9em 0; }\
    .quality-badges-under-rate + .full-start-new__details, .quality-badges-under-rate + .full-start__details { margin-top:0 !important; }\
    \
    .quality-badge {\
      height: var(--svgq-badge-size);\
      display: inline-flex; align-items: center; justify-content: center;\
      padding: 0;\
      background: none;\
      box-shadow: none;\
      border: none;\
      border-radius: 0;\
      box-sizing: border-box;\
      opacity: 0; transform: translateY(8px);\
      animation: qb_in 0.35s ease forwards;\
    }\
    @keyframes qb_in { to{ opacity: 1; transform: translateY(0); } }\
    .quality-badge img {\
      height: 100%; width: auto; display: block;\
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.7));\
    }\
    \
    /* Оновлений яскравий дизайн */\
    .quality-badges-card {\
      position: absolute;\
      top: 32px; left: 6px;\
      display: flex; flex-direction: row; flex-wrap: wrap;\
      justify-content: flex-start; gap: 5px;\
      z-index: 100;\
      pointer-events: none;\
      width: calc(100% - 12px);\
    }\
    .quality-badges-card .quality-badge {\
      height: calc(var(--svgq-badge-size) * 0.62);\
      padding: 0.15em 0.35em;\
      background: linear-gradient(135deg, #00c6ff 0%, #0072ff 100%);\
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);\
      border: 1px solid rgba(255, 255, 255, 0.3);\
      border-radius: 0.35em;\
      box-shadow: 0 4px 12px rgba(0, 114, 255, 0.5);\
      transform: scale(0.9);\
      animation: qb_in_card 0.4s ease forwards;\
    }\
    @keyframes qb_in_card { to { opacity: 1; transform: scale(1); } }\
    \
    @media (max-width: 768px){\
      .quality-badges-container { column-gap: 0.3em; row-gap: 0.2em; margin-left: 0.38em; }\
      .quality-badges-card .quality-badge { height: calc(var(--svgq-badge-size) * 0.48); padding: 0.1em 0.2em; }\
    }\
  </style>';

  function injectStyleOnce() {
    if (document.getElementById('svgq_styles')) return;
    $('body').append(style);
    applyCssVars();
  }

  // =====================================================================
  // SETTINGS UI
  // =====================================================================

  function registerSettingsUIOnce() {
    if (window.__svgq_settings_registered) return;
    window.__svgq_settings_registered = true;

    Lampa.Template.add('settings_svgq', '<div></div>');

    Lampa.SettingsApi.addParam({
      component: 'interface',
      param: { type: 'button', component: 'svgq' },
      field: { name: 'Мітки якості', description: 'SVG бейджі якості' },
      onChange: function () {
        Lampa.Settings.create('svgq', { template: 'settings_svgq', onBack: function () { Lampa.Settings.create('interface'); } });
      }
    });

    Lampa.SettingsApi.addParam({
      component: 'svgq',
      param: {
        name: 'svgq_show_on_cards',
        type: 'select',
        values: { 'false': 'Ні', 'true': 'Так' },
        default: String(!!st.show_on_cards)
      },
      field: { name: 'Показувати на постерах', description: 'Відображати бейджі якості на картках в каталозі' },
      onChange: function (v) { st.show_on_cards = (String(v) === 'true'); saveSettings(); }
    });

    Lampa.SettingsApi.addParam({
      component: 'svgq',
      param: {
        name: 'svgq_placement',
        type: 'select',
        values: { rate: 'В рядку рейтингів', under_rate: 'Під рядком рейтингів', after_details: 'Після додаткової інформації' },
        default: st.placement
      },
      field: { name: 'Розміщення в картці фільму' },
      onChange: function (v) { st.placement = String(v); saveSettings(); }
    });

    Lampa.SettingsApi.addParam({
      component: 'svgq',
      param: {
        name: 'svgq_force_new_line',
        type: 'select',
        values: { 'false': 'Ні', 'true': 'Так' },
        default: String(!!st.force_new_line)
      },
      field: { name: 'З нового рядка (для "В рядку рейтингів")' },
      onChange: function (v) { st.force_new_line = (String(v) === 'true'); saveSettings(); }
    });

    Lampa.SettingsApi.addParam({
      component: 'svgq',
      param: { name: 'svgq_badge_size', type: 'input', values: '', default: String(st.badge_size) },
      field: { name: 'Розмір мітки (em)' },
      onChange: function (v) {
        var n = parseFloat(String(v).replace(',', '.'));
        if (isNaN(n) || !isFinite(n)) { toast('Некоректне число'); return; }
        st.badge_size = clamp(n, 0.6, 4.0);
        saveSettings();
      }
    });

    Lampa.SettingsApi.addParam({
      component: 'svgq',
      param: { type: 'button', component: 'svgq_clear_cache' },
      field: { name: 'Очистити кеш' },
      onChange: function () { cacheClear(); }
    });
  }

  function startSettings() {
    loadSettings();
    if (Lampa && Lampa.SettingsApi && typeof Lampa.SettingsApi.addParam === 'function') {
      setTimeout(registerSettingsUIOnce, 0);
    }
  }

  // =====================================================================
  // INITIALIZATION
  // =====================================================================

  Lampa.Listener.follow('full', function (e) {
    if (e.type !== 'complite') return;
    try {
      injectStyleOnce();
      var root = $(e.object.activity.render());
      applyBadgesToFullCard(e.data.movie, root);
    } catch (err) { console.error('[SVGQ] error full:', err); }
  });

  patchLampaCard();

  Lampa.Listener.follow('app', function (ev) {
    if (ev.type === 'ready') {
      injectStyleOnce();
      startSettings();
    }
  });

  if (window.appready) {
    injectStyleOnce();
    startSettings();
  }

  console.log('[SVGQ] loaded with Card & Full Card support (max resolution & languages)');

})();
