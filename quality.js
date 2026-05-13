(function () {
    'use strict';

    function initRealQualityBadges() {
        // Добавляем стили для бейджей
        if (!$('#lampa_real_quality_badges_css').length) {
            $('body').append(`
                <style id="lampa_real_quality_badges_css">
                    .card__badge--custom {
                        position: absolute;
                        z-index: 15;
                        padding: 0.2em 0.45em;
                        font-size: 1.1em;
                        font-weight: bold;
                        line-height: 1;
                        color: #fff;
                        opacity: 0;
                        animation: badge-fade-in 0.3s ease-out forwards;
                        font-family: Roboto, Arial, sans-serif;
                    }
                    @keyframes badge-fade-in {
                        from { opacity: 0; transform: scale(0.8); }
                        to { opacity: 1; transform: scale(1); }
                    }
                    .card__badge--quality {
                        bottom: 0 !important;
                        left: 0 !important;
                        background: rgba(51, 153, 153, 0.9) !important;
                        color: #fff !important;
                        border-radius: 0 0.8em 0 0.8em !important;
                        font-weight: bold !important;
                        text-transform: uppercase !important;
                    }
                </style>
            `);
        }

        // Настройка прокси для обхода блокировок при поиске качества
        var workingProxy = null;
        var proxies = [
            'https://myfinder.kozak-bohdan.workers.dev/?key=lmp_2026_JacRed_K9xP7aQ4mV2E&url=',
            'https://api.allorigins.win/raw?url=',
            'https://corsproxy.io/?url='
        ];

        function fetchWithProxy(url, callback) {
            try {
                var network = new Lampa.Reguest();
                network.timeout(5000);
                network.silent(url, function (json) {
                    var text = typeof json === 'string' ? json : JSON.stringify(json);
                    workingProxy = 'direct';
                    callback(null, text);
                }, function () {
                    tryProxies(url, callback);
                });
            } catch (e) {
                tryProxies(url, callback);
            }
        }

        function tryProxies(url, callback) {
            var proxyList = (workingProxy && workingProxy !== 'direct') ? [workingProxy].concat(proxies) : proxies;
            function tryProxy(index) {
                if (index >= proxyList.length) {
                    callback(new Error('No proxy worked'));
                    return;
                }
                var p = proxyList[index];
                var target = p.indexOf('url=') > -1 ? p + encodeURIComponent(url) : p + url;

                var xhr = new XMLHttpRequest();
                xhr.open('GET', target, true);
                xhr.onload = function () {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        workingProxy = p;
                        callback(null, xhr.responseText);
                    } else {
                        tryProxy(index + 1);
                    }
                };
                xhr.onerror = function () { tryProxy(index + 1); };
                xhr.timeout = 5000;
                xhr.ontimeout = function () { tryProxy(index + 1); };
                xhr.send();
            }
            tryProxy(0);
        }

        var _qCache = {};

        // Главная функция поиска РЕАЛЬНОГО качества в сети
        function getRealQuality(card, callback) {
            var cacheKey = 'real_q_v1_' + card.id;

            // 1. Проверяем кэш в оперативной памяти
            if (_qCache[cacheKey]) return callback(_qCache[cacheKey]);

            // 2. Проверяем кэш в памяти устройства (храним 24 часа)
            try {
                var raw = Lampa.Storage.get(cacheKey, '');
                if (raw && typeof raw === 'object' && raw._ts && (Date.now() - raw._ts < 24 * 60 * 60 * 1000)) {
                    _qCache[cacheKey] = raw;
                    return callback(raw);
                }
            } catch (e) { }

            var title = (card.original_title || card.title || card.name || '').toLowerCase();
            var year = (card.release_date || card.first_air_date || '').substr(0, 4);

            if (!title || !year) {
                return callback(null);
            }

            // Если дата релиза в будущем — не ищем (торрентов еще нет)
            var releaseDate = new Date(card.release_date || card.first_air_date);
            if (releaseDate && releaseDate.getTime() > Date.now()) {
                return callback(null);
            }

            // Обращаемся к API-агрегатору торрентов
            var apiUrl = 'https://jr.maxvol.pro/api/v1.0/torrents?search=' + encodeURIComponent(title) + '&year=' + year;

            fetchWithProxy(apiUrl, function (err, data) {
                if (err || !data) return callback(null);

                try {
                    var parsed = JSON.parse(data);
                    if (parsed.contents) parsed = JSON.parse(parsed.contents); // парсинг для allorigins
                    
                    var results = Array.isArray(parsed) ? parsed : (parsed.Results || []);
                    if (!results.length) {
                        var emptyData = { empty: true, _ts: Date.now() };
                        _qCache[cacheKey] = emptyData;
                        Lampa.Storage.set(cacheKey, emptyData);
                        return callback(null);
                    }

                    var bestRes = 'SD';
                    var resOrder = ['SD', 'HD', 'FHD', '2K', '4K'];

                    // Перебираем найденные раздачи и ищем максимальное качество
                    results.forEach(function (item) {
                        var t = (item.title || '').toLowerCase();
                        var currentRes = 'SD';
                        var q = parseInt(item.quality || 0, 10);
                        
                        if (q >= 2160) currentRes = '4K';
                        else if (q >= 1440) currentRes = '2K';
                        else if (q >= 1080) currentRes = 'FHD';
                        else if (q >= 720) currentRes = 'HD';

                        // Если метаданных качества нет, ищем по названию раздачи
                        if (currentRes === 'SD') {
                            if (t.indexOf('4k') >= 0 || t.indexOf('2160') >= 0 || t.indexOf('uhd') >= 0) currentRes = '4K';
                            else if (t.indexOf('2k') >= 0 || t.indexOf('1440') >= 0) currentRes = '2K';
                            else if (t.indexOf('1080') >= 0 || t.indexOf('fhd') >= 0 || t.indexOf('full hd') >= 0) currentRes = 'FHD';
                            else if (t.indexOf('720') >= 0 || t.indexOf('hd') >= 0) currentRes = 'HD';
                        }

                        if (resOrder.indexOf(currentRes) > resOrder.indexOf(bestRes)) {
                            bestRes = currentRes;
                        }
                    });

                    var finalResult = { resolution: bestRes, _ts: Date.now() };
                    _qCache[cacheKey] = finalResult;
                    Lampa.Storage.set(cacheKey, finalResult);
                    callback(finalResult);

                } catch (e) {
                    callback(null);
                }
            });
        }

        function addBadge(cardEl, movie) {
            if (!movie || !movie.id) return;
            let view = $(cardEl).find('.card__view');
            if (!view.length) view = $(cardEl);

            getRealQuality(movie, function(result) {
                if (!result || result.empty || !result.resolution) return;
                if (!view.isConnected) return;
                
                let existingBadge = view.find('.card__badge--quality');
                if (existingBadge.length > 0) {
                    existingBadge.text(result.resolution);
                } else {
                    let qualityBadge = $('<div>', {
                        class: 'card__badge card__badge--custom card__badge--quality',
                        text: result.resolution
                    });
                    view.append(qualityBadge);
                }
            });
        }

        function processCards() {
            $('.card:not(.real-quality-processed)').each(function () {
                let card = $(this);
                card.addClass('real-quality-processed');

                let movie = card.data('item') || (card[0] && (card[0].card_data || card[0].item)) || null;
                if (movie && movie.id && !movie.size) {
                    addBadge(card[0], movie);
                }
            });
        }

        let cardsObserver = new MutationObserver(function () {
            processCards();
        });
        
        cardsObserver.observe(document.body, { childList: true, subtree: true });
        processCards();
    }

    if (window.appready) {
        initRealQualityBadges();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initRealQualityBadges();
        });
    }

})();
