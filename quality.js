(function () {
    'use strict';

    function initRealQualityBadges() {
        // 1. Добавляем стили
        if (!$('#lampa_real_quality_badges_css').length) {
            $('body').append(`
                <style id="lampa_real_quality_badges_css">
                    .card__badge--custom-quality {
                        position: absolute !important;
                        z-index: 20 !important;
                        bottom: 2px !important;
                        left: 2px !important;
                        padding: 2px 5px !important;
                        font-size: 0.8em !important;
                        font-weight: bold !important;
                        line-height: 1;
                        color: #fff !important;
                        background: rgba(51, 153, 153, 0.95) !important;
                        border-radius: 3px !important;
                        text-transform: uppercase !important;
                        font-family: Roboto, Arial, sans-serif;
                        pointer-events: none;
                    }
                </style>
            `);
        }

        var workingProxy = null;
        var proxies = [
            'https://myfinder.kozak-bohdan.workers.dev/?key=lmp_2026_JacRed_K9xP7aQ4mV2E&url=',
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?url='
        ];

        var _qCache = {};

        function fetchWithProxy(url, callback) {
            var proxyList = (workingProxy && workingProxy !== 'direct') ? [workingProxy].concat(proxies) : proxies;
            
            function tryProxy(index) {
                if (index >= proxyList.length) return callback(new Error('All proxies failed'));
                
                var p = proxyList[index];
                var target = p.indexOf('url=') > -1 ? p + encodeURIComponent(url) : p + url;

                $.ajax({
                    url: target,
                    method: 'GET',
                    timeout: 5000,
                    success: function (res) {
                        workingProxy = p;
                        callback(null, res);
                    },
                    error: function () {
                        tryProxy(index + 1);
                    }
                });
            }
            tryProxy(0);
        }

        function getRealQuality(card, callback) {
            var id = card.id || card.kp_id || card.imdb_id;
            var cacheKey = 'real_q_' + id;

            if (_qCache[cacheKey]) return callback(_qCache[cacheKey]);

            // Проверка хранилища
            try {
                var cached = Lampa.Storage.get(cacheKey);
                if (cached && cached._ts && (Date.now() - cached._ts < 86400000)) {
                    _qCache[cacheKey] = cached;
                    return callback(cached);
                }
            } catch (e) {}

            var title = (card.title || card.name || card.original_title || card.original_name || '').toLowerCase();
            var year = (card.release_date || card.first_air_date || '0000').substring(0, 4);

            if (!title || year === '0000') return callback(null);

            var apiUrl = 'https://jr.maxvol.pro/api/v1.0/torrents?search=' + encodeURIComponent(title) + '&year=' + year;

            fetchWithProxy(apiUrl, function (err, data) {
                if (err || !data) return callback(null);

                try {
                    var parsed = typeof data === 'string' ? JSON.parse(data) : data;
                    var results = parsed.Results || parsed;
                    if (!Array.isArray(results) || !results.length) {
                        var empty = { resolution: '', empty: true, _ts: Date.now() };
                        Lampa.Storage.set(cacheKey, empty);
                        return callback(null);
                    }

                    var bestRes = 'SD';
                    var resOrder = ['SD', 'HD', 'FHD', '2K', '4K'];

                    results.forEach(function (item) {
                        var t = (item.title || '').toLowerCase();
                        var currentRes = 'SD';
                        var qStr = (item.quality || '').toString().toLowerCase();
                        
                        if (qStr.indexOf('2160') >= 0 || qStr.indexOf('4k') >= 0) currentRes = '4K';
                        else if (qStr.indexOf('1440') >= 0 || qStr.indexOf('2k') >= 0) currentRes = '2K';
                        else if (qStr.indexOf('1080') >= 0 || qStr.indexOf('fhd') >= 0) currentRes = 'FHD';
                        else if (qStr.indexOf('720') >= 0 || qStr.indexOf('hd') >= 0) currentRes = 'HD';
                        
                        // Доп. проверка по названию
                        if (currentRes === 'SD') {
                            if (t.indexOf('2160p') >= 0 || t.indexOf('4k') >= 0 || t.indexOf('uhd') >= 0) currentRes = '4K';
                            else if (t.indexOf('1440p') >= 0 || t.indexOf('2k') >= 0) currentRes = '2K';
                            else if (t.indexOf('1080p') >= 0 || t.indexOf('full hd') >= 0 || t.indexOf('fhd') >= 0) currentRes = 'FHD';
                            else if (t.indexOf('720p') >= 0 || t.indexOf(' hd ') >= 0) currentRes = 'HD';
                        }

                        if (resOrder.indexOf(currentRes) > resOrder.indexOf(bestRes)) bestRes = currentRes;
                    });

                    var result = { resolution: bestRes, _ts: Date.now() };
                    _qCache[cacheKey] = result;
                    Lampa.Storage.set(cacheKey, result);
                    callback(result);
                } catch (e) {
                    callback(null);
                }
            });
        }

        function processCards() {
            $('.card:not(.quality-done)').each(function () {
                var cardEl = $(this);
                cardEl.addClass('quality-done');

                // Получаем данные фильма из разных возможных мест
                var data = cardEl.data('item') || cardEl[0].card_data || cardEl[0].item;
                
                if (data && (data.id || data.kp_id)) {
                    getRealQuality(data, function(res) {
                        if (res && res.resolution && res.resolution !== 'SD') {
                            var container = cardEl.find('.card__view').length ? cardEl.find('.card__view') : cardEl;
                            // Проверяем, чтобы не было дублей
                            if (!container.find('.card__badge--custom-quality').length) {
                                container.append('<div class="card__badge--custom-quality">' + res.resolution + '</div>');
                            }
                        }
                    });
                }
            });
        }

        // Следим за появлением новых карточек
        var observer = new MutationObserver(function() {
            processCards();
        });

        observer.observe(document.body, { childList: true, subtree: true });
        processCards();
    }

    // Запуск
    if (window.appready) {
        initRealQualityBadges();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initRealQualityBadges();
        });
    }
})();
