(function () {
  'use strict';

  var config = {
    version: '2.1',
    name: 'Torrent Styles',
    pluginId: 'torrent_styles'
  };

  // Thresholds
  // Seeds:
  // - <5: danger (red)
  // - 5..9: normal (light emerald)   -> base `ts-seeds`
  // - 10..19: good (emerald)         -> `good-seeds`
  // - >=20: top (gold)               -> `high-seeds`
  //
  // Bitrate (Mbps):
  // - <50: base `ts-bitrate`
  // - 50..100: gold                  -> `high-bitrate`
  // - >100: red                      -> `very-high-bitrate`
  //
  // Size (GB):
  // - <50: base `ts-size`
  // - 50..99: emerald                -> `mid-size`
  // - 100..200: gold                 -> `high-size`
  // - >200: red                      -> `top-size`
  var TH = {
    seeds: {
      danger_below: 5,
      good_from: 10,
      top_from: 20
    },
    bitrate: {
      warn_from: 50,
      danger_from: 100
    },
    size: {
      mid_from_gb: 50,
      high_from_gb: 100,
      top_from_gb: 200
    },
    // Debounce updateTorrentStyles() calls triggered by MutationObserver
    debounce_ms: 60
  };

  var styles = {
    // Базовий вигляд бейджів
    '.torrent-item__bitrate > span.ts-bitrate, .torrent-item__seeds > span.ts-seeds, .torrent-item__grabs > span.ts-grabs, .torrent-item__size.ts-size': {
      'display': 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      'box-sizing': 'border-box',
      'min-height': '1.7em',
      // Корекція для підняття тексту: зменшено верхній та збільшено нижній відступ
      'padding': '0.05em 0.45em 0.25em 0.45em',
      'border-radius': '0.5em',
      'font-weight': '700',
      'font-size': '0.9em',
      'line-height': '1',
      'white-space': 'nowrap',
      'vertical-align': 'middle',
      'font-variant-numeric': 'tabular-nums'
    },

    '.torrent-item__bitrate, .torrent-item__grabs, .torrent-item__seeds': {
      'margin-right': '0.55em'
    },

    // Seeds (раздають)
    '.torrent-item__seeds > span.ts-seeds': {
      color: '#5cd4b0',
      'background-color': 'rgba(92, 212, 176, 0.14)',
      border: '0.15em solid rgba(92, 212, 176, 0.90)'
    },
    '.torrent-item__seeds > span.ts-seeds.low-seeds': {
      color: '#ff5f6d',
      'background-color': 'rgba(255, 95, 109, 0.14)',
      border: '0.15em solid rgba(255, 95, 109, 0.82)'
    },
    '.torrent-item__seeds > span.ts-seeds.good-seeds': {
      color: '#43cea2',
      'background-color': 'rgba(67, 206, 162, 0.16)',
      border: '0.15em solid rgba(67, 206, 162, 0.92)'
    },
    '.torrent-item__seeds > span.ts-seeds.high-seeds': {
      color: '#ffc371',
      'background-color': 'rgba(255, 195, 113, 0.22)',
      border: '0.15em solid rgba(255, 195, 113, 0.92)'
    },

    // Grabs (качають)
    '.torrent-item__grabs > span.ts-grabs': {
      color: '#4db6ff',
      'background-color': 'rgba(77, 182, 255, 0.12)',
      border: '0.15em solid rgba(77, 182, 255, 0.82)'
    },
    '.torrent-item__grabs > span.ts-grabs.high-grabs': {
      color: '#4db6ff',
      'background-color': 'rgba(77, 182, 255, 0.18)',
      border: '0.15em solid rgba(77, 182, 255, 0.92)'
    },

    // Bitrate
    '.torrent-item__bitrate > span.ts-bitrate': {
      color: '#5cd4b0',
      'background-color': 'rgba(67, 206, 162, 0.10)',
      border: '0.15em solid rgba(92, 212, 176, 0.78)'
    },
    '.torrent-item__bitrate > span.ts-bitrate.high-bitrate': {
      color: '#ffc371',
      'background-color': 'rgba(255, 195, 113, 0.22)',
      border: '0.15em solid rgba(255, 195, 113, 0.92)'
    },
    '.torrent-item__bitrate > span.ts-bitrate.very-high-bitrate': {
      color: '#ff5f6d',
      'background-color': 'rgba(255, 95, 109, 0.22)',
      border: '0.15em solid rgba(255, 95, 109, 0.92)'
    },

    // Size
    '.torrent-item__size.ts-size': {
      color: '#5cd4b0',
      'background-color': 'rgba(92, 212, 176, 0.12)',
      border: '0.15em solid rgba(92, 212, 176, 0.82)'
    },
    '.torrent-item__size.ts-size.mid-size': {
      color: '#43cea2',
      'background-color': 'rgba(67, 206, 162, 0.16)',
      border: '0.15em solid rgba(67, 206, 162, 0.92)'
    },
    '.torrent-item__size.ts-size.high-size': {
      color: '#ffc371',
      'background-color': 'rgba(255, 195, 113, 0.22)',
      border: '0.15em solid rgba(255, 195, 113, 0.95)'
    },
    '.torrent-item__size.ts-size.top-size': {
      color: '#ff5f6d',
      'background-color': 'rgba(255, 95, 109, 0.22)',
      border: '0.15em solid rgba(255, 95, 109, 0.95)'
    },

    '.scroll__body': {
      margin: '5px'
    }
  };


  function injectStyles() {
    try {
      var style = document.createElement('style');
      var css = Object.keys(styles)
        .map(function (selector) {
          var props = styles[selector];
          var rules = Object.keys(props)
            .map(function (prop) {
              return prop + ': ' + props[prop] + ' !important';
            })
            .join('; ');
          return selector + ' { ' + rules + ' }';
        })
        .join('\n');

      style.setAttribute('data-' + config.pluginId + '-styles', 'true');
      style.innerHTML = css;
      document.head.appendChild(style);
    } catch (e) {
      console.error(config.name, 'style injection error:', e);
    }
  }

  var tsUpdateTimer = null;
  function scheduleUpdate(delayMs) {
    try {
      if (tsUpdateTimer) clearTimeout(tsUpdateTimer);
    } catch (e) { }

    var ms = typeof delayMs === 'number' ? delayMs : TH.debounce_ms;
    tsUpdateTimer = setTimeout(function () {
      tsUpdateTimer = null;
      updateTorrentStyles();
    }, ms);
  }

  function tsParseFloat(text) {
    var t = ((text || '') + '').trim();
    var m = t.match(/(\d+(?:[.,]\d+)?)/);
    return m ? (parseFloat(m[1].replace(',', '.')) || 0) : 0;
  }

  function tsParseInt(text) {
    var t = ((text || '') + '').trim();
    var v = parseInt(t, 10);
    return isNaN(v) ? 0 : v;
  }

  function tsApplyTier(el, classesToClear, classToAdd) {
    try {
      for (var i = 0; i < classesToClear.length; i++) el.classList.remove(classesToClear[i]);
      if (classToAdd) el.classList.add(classToAdd);
    } catch (e) { }
  }

  function tsParseSizeToGb(text) {
    try {
      var t = ((text || '') + '').replace(/\u00A0/g, ' ').trim(); // NBSP -> space
      // Supports: "123 GB", "1.2 TB", "900 MB" and RU: "ГБ/ТБ/МБ/КБ"
      var m = t.match(/(\d+(?:[.,]\d+)?)\s*(kb|mb|gb|tb|кб|мб|гб|тб)/i);
      if (!m) return null;

      var num = parseFloat((m[1] || '0').replace(',', '.')) || 0;
      var unit = (m[2] || '').toLowerCase();
      var gb = 0;

      if (unit === 'tb' || unit === 'тб') gb = num * 1024;
      else if (unit === 'gb' || unit === 'гб') gb = num;
      else if (unit === 'mb' || unit === 'мб') gb = num / 1024;
      else if (unit === 'kb' || unit === 'кб') gb = num / (1024 * 1024);
      else gb = 0;

      return gb;
    } catch (e) {
      return null;
    }
  }

  function updateTorrentStyles() {
    try {
      document.querySelectorAll('.torrent-item__seeds span').forEach(function (span) {
        var value = tsParseInt(span.textContent);
        span.classList.add('ts-seeds');

        var seedTier = '';
        if (value < TH.seeds.danger_below) seedTier = 'low-seeds';
        else if (value >= TH.seeds.top_from) seedTier = 'high-seeds';
        else if (value >= TH.seeds.good_from) seedTier = 'good-seeds';
        tsApplyTier(span, ['low-seeds', 'good-seeds', 'high-seeds'], seedTier);
      });

      document.querySelectorAll('.torrent-item__bitrate span').forEach(function (span) {
        var value = tsParseFloat(span.textContent);
        span.classList.add('ts-bitrate');

        var brTier = '';
        if (value > TH.bitrate.danger_from) brTier = 'very-high-bitrate';
        else if (value >= TH.bitrate.warn_from) brTier = 'high-bitrate';
        tsApplyTier(span, ['high-bitrate', 'very-high-bitrate'], brTier);
      });

      // "Grabs" in Lampa template is actually peers/leechers (качают)
      document.querySelectorAll('.torrent-item__grabs span').forEach(function (span) {
        var value = tsParseInt(span.textContent);
        span.classList.add('ts-grabs');
        tsApplyTier(span, ['high-grabs'], value > 10 ? 'high-grabs' : '');
      });

      // Size badge (highlight big files)
      document.querySelectorAll('.torrent-item__size').forEach(function (el) {
        var text = (el.textContent || '');
        el.classList.add('ts-size');

        var gb = tsParseSizeToGb(text);
        if (gb === null) {
          tsApplyTier(el, ['mid-size', 'high-size', 'top-size'], '');
          return;
        }

        var szTier = '';
        if (gb > TH.size.top_from_gb) szTier = 'top-size';
        else if (gb >= TH.size.high_from_gb) szTier = 'high-size';
        else if (gb >= TH.size.mid_from_gb) szTier = 'mid-size';
        tsApplyTier(el, ['mid-size', 'high-size', 'top-size'], szTier);
      });
    } catch (e) {
      console.error(config.name, 'torrent update error:', e);
    }
  }

  function observeDom() {
    try {
      var observer = new MutationObserver(function (mutations) {
        var needsUpdate = false;
        for (var i = 0; i < mutations.length; i++) {
          var mutation = mutations[i];
          // Check for added nodes
          if (mutation.addedNodes && mutation.addedNodes.length) {
            needsUpdate = true;
            break;
          }
          // Check for text content changes (bitrate/seeds values might update)
          if (mutation.type === 'characterData' ||
            (mutation.type === 'childList' && mutation.target &&
              (mutation.target.classList &&
                (mutation.target.classList.contains('torrent-item__bitrate') ||
                  mutation.target.classList.contains('torrent-item__seeds') ||
                  mutation.target.classList.contains('torrent-item__grabs') ||
                  mutation.target.classList.contains('torrent-item__size'))))) {
            needsUpdate = true;
            break;
          }
        }
        if (needsUpdate) scheduleUpdate();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
      scheduleUpdate(0);
    } catch (e) {
      console.error(config.name, 'observer error:', e);
      scheduleUpdate(0);
    }
  }

  function registerPlugin() {
    try {
      if (typeof Lampa !== 'undefined') {
        Lampa.Manifest = Lampa.Manifest || {};
        Lampa.Manifest.plugins = Lampa.Manifest.plugins || {};

        Lampa.Manifest.plugins[config.pluginId] = {
          type: 'other',
          name: config.name,
          version: config.version,
          author: '@bodya_elven',
          description: 'Додаткові стилі для торрентів'
          // Оригінальний плагін: https://lampaplugins.github.io/store/torrent_styles_v2.js
        };
      }
    } catch (e) {
      console.error(config.name, 'register error:', e);
    } finally {
      window['plugin_' + config.pluginId + '_ready'] = true;
    }
  }

  function init() {
    injectStyles();
    observeDom();

    if (window.appready) {
      registerPlugin();
      // Update styles after app is ready
      scheduleUpdate(200);
    } else if (typeof Lampa !== 'undefined' && Lampa.Listener && typeof Lampa.Listener.follow === 'function') {
      Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') {
          registerPlugin();
          // Update styles again when app is ready
          scheduleUpdate(200);
        }
      });
    } else {
      setTimeout(registerPlugin, 500);
    }

    console.log(config.name, 'Configuration plugin loaded, version:', config.version);
  }

  init();

})();
