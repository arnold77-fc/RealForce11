(function () {
    'use strict';

    /**
     * ====================================================================================
     * MODULE: Lampa Marks Mod
     * Version: 4.2.1 (Full Monolith)
     * Compatibility: Lampa Platform
     * Description: Displays full array of content tags on Lampa UI cards.
     * ====================================================================================
     */

    // Ensure single execution
    if (window.lampa_marks_full_monolith) return;
    window.lampa_marks_full_monolith = true;

    if (typeof Lampa === 'undefined') {
        console.warn('Lampa Marks: Lampa library not found. Stopping initialization.');
        return;
    }

    // --- Caches and global state objects ---
    var jacred_cache = {};
    var uafix_cache = {};
    var search_results = {};
    var timers = {};
    var network = new Lampa.Reguest();

    /**
     * List of available proxies, starting with the primary one as requested.
     */
    var proxy_list = [
        'https://my-lampa-proxy1.arnoldclasic6.workers.dev/?url=',
        'https://api.allorigins.win/get?url=',
        'https://cors-anywhere.herokuapp.com/',
        'https://thingproxy.freeboard.io/fetch/'
    ];

    // --- UTILITY FUNCTIONS ---

    /**
     * Gets setting value from storage.
     * @param {string} key 
     * @param {any} default_val 
     * @returns {boolean}
     */
    function getSetting(key, default_val) {
        var val = Lampa.Storage.get(key, default_val);
        return val === true || val === 'true' || val === 1 || val === '1';
    }

    /**
     * Checks if the item is a valid object.
     * @param {any} item 
     * @returns {boolean}
     */
    function isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    /**
     * Cleans the title by removing all punctuation and unnecessary spaces.
     * @param {string} str 
     * @returns {string}
     */
    function cleanTitle(str) {
        if (!str) return '';
        return str
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
            .replace(/\s{2,}/g, " ")
            .toLowerCase()
            .trim();
    }

    // --- NETWORK AND PROXY MANAGEMENT ---

    /**
     * Performs an HTTP request with automatic fallback to proxy list.
     * @param {string} url 
     * @param {function} callback 
     * @param {function} error_cb 
     */
    function requestWithProxy(url, callback, error_cb) {
        function tryRequest(index) {
            if (index >= proxy_list.length) {
                if (error_cb) error_cb();
                return;
            }

            var current_proxy = proxy_list[index];
            var final_url = (current_proxy.indexOf('?url=') !== -1) ? current_proxy + encodeURIComponent(url) : current_proxy + url;

            var xhr = new XMLHttpRequest();
            xhr.open('GET', final_url, true);

            if (current_proxy.indexOf('herokuapp') !== -1) {
                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            }

            xhr.onload = function () {
                if (xhr.status >= 200 && xhr.status < 300) {
                    var resp = xhr.responseText;
                    if (current_proxy.indexOf('allorigins') !== -1) {
                        try {
                            resp = JSON.parse(resp).contents;
                        } catch (e) {
                            // Suppress parse errors
                        }
                    }
                    callback(resp);
                } else {
                    tryRequest(index + 1);
                }
            };

            xhr.onerror = function () {
                tryRequest(index + 1);
            };

            xhr.timeout = 15000;
            xhr.ontimeout = function () {
                tryRequest(index + 1);
            };

            xhr.send();
        }

        // Fast direct request first
        var direct = new XMLHttpRequest();
        direct.open('GET', url, true);
        direct.timeout = 2500;

        direct.onload = function () {
            if (direct.status === 200) {
                callback(direct.responseText);
            } else {
                tryRequest(0);
            }
        };

        direct.onerror = function () {
            tryRequest(0);
        };

        direct.send();
    }

    // --- DATA ANALYSIS AND PARSING ---

    /**
     * Analyzes torrent items and extracts resolution and tracks data.
     * @param {Array} torrents 
     * @returns {Object}
     */
    function analyzeTorrents(torrents) {
        var data = {
            res: 'SD',
            ua: false,
            ru: false, // Russian language tag
            en: false,
            hdr: false,
            dv: false,
            atmos: false,
            found: false
        };

        if (!torrents || !Array.isArray(torrents)) return data;

        torrents.forEach(function (item) {
            var title = (item.title || item.name || '').toLowerCase();

            // Exclude camrips and other trash
            if (
                title.indexOf('cam') >= 0 ||
                title.indexOf('ts') >= 0 ||
                title.indexOf('telesync') >= 0 ||
                title.indexOf('pdw') >= 0
            ) {
                return;
            }

            data.found = true;

            // Resolution evaluation
            if (
                title.indexOf('2160') >= 0 ||
                title.indexOf('4k') >= 0 ||
                title.indexOf('uhd') >= 0 ||
                title.indexOf('sdr') >= 0
            ) {
                data.res = '4K';
            } else if (data.res !== '4K') {
                if (title.indexOf('1080') >= 0 || title.indexOf('fhd') >= 0 || title.indexOf('bdremux') >= 0) {
                    data.res = 'FHD';
                } else if (title.indexOf('720') >= 0 || title.indexOf('hd') >= 0) {
                    if (data.res === 'SD') data.res = 'HD';
                }
            }

            // Ukrainian language detection
            if (
                title.indexOf('ukr') >= 0 ||
                title.indexOf('ua ') >= 0 ||
                title.indexOf('.ua') >= 0 ||
                title.indexOf('ukrainian') >= 0
            ) {
                data.ua = true;
            }

            // Russian language detection (Extended tags)
            var ru_tags = ['rus', 'ru ', '.ru', 'russian', 'dub', 'mvo', 'lvo', 'avo', 'itunes', 'line', 'звук', 'dts-ru'];
            ru_tags.forEach(function (tag) {
                if (title.indexOf(tag) >= 0) data.ru = true;
            });

            // English language detection
            if (
                title.indexOf('eng') >= 0 ||
                title.indexOf('english') >= 0 ||
                title.indexOf('original') >= 0
            ) {
                data.en = true;
            }

            // Video technologies analysis
            if (title.indexOf('hdr') >= 0 || title.indexOf('high dynamic range') >= 0) {
                data.hdr = true;
            }
            if (
                title.indexOf('dv') >= 0 ||
                title.indexOf('dolby vision') >= 0 ||
                title.indexOf('.dv.') >= 0 ||
                title.indexOf('dovi') >= 0
            ) {
                data.dv = true;
            }
            if (title.indexOf('atmos') >= 0 || title.indexOf('truehd') >= 0) {
                data.atmos = true;
            }
        });

        return data;
    }

    /**
     * Performs multi-source search (Jacred, Torlook, Uafix).
     * @param {Object} movie 
     * @param {function} callback 
     */
    function getMovieData(movie, callback) {
        var id = movie.id;
        var cache_key = 'marks_full_cache_' + id;

        if (jacred_cache[cache_key]) {
            return callback(jacred_cache[cache_key]);
        }

        try {
            var local = Lampa.Storage.get(cache_key, '{}');
            // Уменьшено время кэширования до 15 минут (1000 * 60 * 15)
            if (local && local.timestamp && (Date.now() - local.timestamp < 1000 * 60 * 15)) {
                jacred_cache[cache_key] = local.data;
                return callback(local.data);
            }
        } catch (e) {}

        var title = cleanTitle(movie.original_title || movie.title || movie.name);
        var year = (movie.release_date || movie.first_air_date || '0000').substring(0, 4);

        if (!title || year === '0000') {
            return callback({ found: false, res: 'SD' });
        }

        // 1. Jacred source search
        var jac_url = 'https://jac.red/api/v1/search?query=' + encodeURIComponent(title) + '&year=' + year;

        requestWithProxy(
            jac_url,
            function (resp) {
                var torrents = [];
                try {
                    var json = JSON.parse(resp);
                    torrents = Array.isArray(json) ? json : (json.torrents || []);
                } catch (e) {}

                if (torrents.length > 0) {
                    var analyzed = analyzeTorrents(torrents);
                    finalize(analyzed);
                } else {
                    // 2. Torlook source search
                    var torlook_url = 'https://api.torlook.info/api/search/torrents?q=' + encodeURIComponent(title + ' ' + year);

                    requestWithProxy(
                        torlook_url,
                        function (t_resp) {
                            var t_torrents = [];
                            try {
                                var t_json = JSON.parse(t_resp);
                                t_torrents = t_json.torrents || t_json || [];
                            } catch (e) {}

                            var analyzed = analyzeTorrents(t_torrents);
                            finalize(analyzed);
                        },
                        function () {
                            finalize({ found: false, res: 'SD' });
                        }
                    );
                }
            },
            function () {
                finalize({ found: false, res: 'SD' });
            }
        );

        function finalize(data) {
            // 3. Uafix check if UA is missing
            if (!data.ua) {
                var uafix_url = 'https://uafix.net/index.php?do=search&subaction=search&story=' + encodeURIComponent(title);

                requestWithProxy(
                    uafix_url,
                    function (h_resp) {
                        if (h_resp && h_resp.indexOf('0 РІС–РґРїРѕРІС–РґРµР№') < 0 && h_resp.indexOf('Р·РЅР°Р№РґРµРЅРѕ') >= 0) {
                            data.ua = true;
                            data.found = true;
                            if (data.res === 'SD') data.res = 'FHD';
                        }
                        saveAndReturn(data);
                    },
                    function () {
                        saveAndReturn(data);
                    }
                );
            } else {
                saveAndReturn(data);
            }
        }

        function saveAndReturn(data) {
            jacred_cache[cache_key] = data;
            Lampa.Storage.set(cache_key, { data: data, timestamp: Date.now() });
            callback(data);
        }
    }

    // --- BADGE RENDERING AND CARD INTERFACES ---

    function createBadge(type, text) {
        var badge = document.createElement('div');
        badge.className = 'lampa-mark lampa-mark--' + type;
        badge.textContent = text;
        return badge;
    }

    function applyMarks(container, movie, data) {
        container.empty();

        // Verification to make sure marks are enabled
        if (!getSetting('marks_enabled', true)) return;

        // Render UA
        if (data.ua && getSetting('marks_ua', true)) {
            container.append(createBadge('ua', 'UA'));
        }

        // Render RU
        if (data.ru && getSetting('marks_ru', true)) {
            container.append(createBadge('ru', 'RU'));
        }

        // Render EN
        if (data.en && getSetting('marks_en', false)) {
            container.append(createBadge('en', 'EN'));
        }

        // Resolution render
        if (data.res !== 'SD') {
            if (data.res === '4K' && getSetting('marks_4k', true)) {
                container.append(createBadge('4k', '4K'));
            } else if (data.res === 'FHD' && getSetting('marks_fhd', true)) {
                container.append(createBadge('fhd', '1080p'));
            } else if (data.res === 'HD' && getSetting('marks_fhd', true)) {
                container.append(createBadge('hd', '720p'));
            }
        }

        // HDR & DV & Atmos
        if (getSetting('marks_hdr', true)) {
            if (data.dv) {
                container.append(createBadge('hdr', 'DV'));
            } else if (data.hdr) {
                container.append(createBadge('hdr', 'HDR'));
            }

            if (data.atmos) {
                container.append(createBadge('atmos', 'Atmos'));
            }
        }

        // Render Rating
        if (getSetting('marks_rating', true)) {
            var vote = movie.imdb_rating || movie.vote_average || 0;
            if (vote > 0) {
                var r_badge = createBadge('rating', '');
                r_badge.innerHTML = '<span class="mark-star">★</span>' + parseFloat(vote).toFixed(1);
                container.append(r_badge);
            }
        }
    }

    function processCard(card, movie) {
        if (!movie || !movie.id) return;

        var view = card.find('.card__view');
        if (!view.length) view = card;

        if (view.css('position') === 'static') view.css('position', 'relative');

        var container = view.find('.lampa-marks-wrap');
        if (!container.length) {
            container = $('<div class="lampa-marks-wrap"></div>');
            view.append(container);
        }

        getMovieData(movie, function (data) {
            applyMarks(container, movie, data);
        });
    }

    // Full card details view rendering
    function injectFullCard(movie, render) {
        if (!movie || !movie.id) return;

        var target = render.find('.full-start-new__rate-line, .full-start__rate-line').first();
        if (!target.length) return;

        var full_wrap = $('<div class="lampa-marks-full-row"></div>');
        target.after(full_wrap);

        getMovieData(movie, function (data) {
            if (!getSetting('marks_enabled', true)) return;

            if (data.ua && getSetting('marks_ua', true)) {
                full_wrap.append('<div class="lampa-full-mark lampa-full-mark--ua">Українська озвучка</div>');
            }

            if (data.ru && getSetting('marks_ru', true)) {
                full_wrap.append('<div class="lampa-full-mark lampa-full-mark--ru">Русская озвучка</div>');
            }

            if (data.en && getSetting('marks_en', false)) {
                full_wrap.append('<div class="lampa-full-mark lampa-full-mark--en">Английская озвучка</div>');
            }

            if (data.res !== 'SD') {
                var res_text = data.res === '4K' ? '4K Ultra HD' : (data.res === 'FHD' ? '1080p Full HD' : '720p HD');
                full_wrap.append('<div class="lampa-full-mark lampa-full-mark--quality">' + res_text + '</div>');
            }

            if (data.dv || data.hdr) {
                full_wrap.append('<div class="lampa-full-mark lampa-full-mark--hdr">' + (data.dv ? 'Dolby Vision' : 'HDR10') + '</div>');
            }

            if (data.atmos) {
                full_wrap.append('<div class="lampa-full-mark lampa-full-mark--atmos">Dolby Atmos</div>');
            }
        });
    }

    // --- OBSERVER ---

    function startObserver() {
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.addedNodes.length) {
                    $(mutation.addedNodes).find('.card').addBack('.card').each(function () {
                        var card = $(this);
                        if (card.hasClass('lampa-marks-done')) return;
                        card.addClass('lampa-marks-done');

                        var data = card.data('item') || card[0].card_data;
                        if (data) processCard(card, data);
                    });
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });

        $('.card').each(function () {
            var card = $(this);
            if (card.hasClass('lampa-marks-done')) return;
            card.addClass('lampa-marks-done');
            var data = card.data('item') || card[0].card_data;
            if (data) processCard(card, data);
        });
    }

    // --- INJECT STYLES ---

    function injectStyles() {
        if (document.getElementById('lampa-marks-style')) return;
        var style = document.createElement('style');
        style.id = 'lampa-marks-style';
        style.innerHTML = '\
            .lampa-marks-wrap { position: absolute; top: 0.5em; left: 0.3em; display: flex; flex-direction: column; gap: 0.25em; z-index: 10; pointer-events: none; }\
            .lampa-mark { padding: 0.2em 0.4em; font-size: 0.7em; font-weight: 800; border-radius: 0.3em; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 2px 4px rgba(0,0,0,0.4); text-transform: uppercase; line-height: 1; }\
            .lampa-mark--ua { background: linear-gradient(135deg, #0057b7 50%, #ffd700 50%); color: #fff; border-color: rgba(255,255,255,0.4); }\
            .lampa-mark--ru { background: linear-gradient(135deg, #d32f2f, #ef5350); }\
            .lampa-mark--en { background: linear-gradient(135deg, #455a64, #90a4ae); }\
            .lampa-mark--4k { background: #e65100; border-color: #ff9800; }\
            .lampa-mark--fhd { background: #311b92; }\
            .lampa-mark--hd { background: #1b5e20; }\
            .lampa-mark--hdr { background: #fbc02d; color: #000; text-shadow: none; font-weight: 900; }\
            .lampa-mark--atmos { background: #212121; color: #fff; }\
            .lampa-mark--rating { background: rgba(0,0,0,0.8); color: #ffd700; border-color: #ffd700; }\
            .mark-star { margin-right: 0.1em; font-size: 1.1em; }\
            /* Стили для полной карточки */\
            .lampa-marks-full-row { display: flex; flex-wrap: wrap; gap: 0.5em; margin-top: 1em; width: 100%; }\
            .lampa-full-mark { padding: 0.4em 0.8em; border-radius: 0.4em; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); font-size: 0.9em; font-weight: bold; }\
            .lampa-full-mark--ua { border-left: 5px solid #ffd700; }\
            .lampa-full-mark--ru { border-left: 5px solid #d32f2f; }\
            .lampa-full-mark--quality { color: #81c784; }\
            .lampa-full-mark--hdr { color: #ffca28; }\
            .lampa-full-mark--atmos { color: #90caf9; }\
            /* Фикс для Hero баннеров */\
            .hero-banner .lampa-marks-wrap { top: 3em; left: 2em; scale: 1.3; transform-origin: top left; }\
            .card__vote { display: none !important; } /* Скрываем стандартный рейтинг, если мешает */\
        ';
        document.head.appendChild(style);
    }

    // --- SETTINGS INTERACTION ---

    function setupSettings() {
        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { type: 'title' },
            field: { name: 'Метки контента (Full Mod)' }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { name: 'marks_enabled', type: 'trigger', default: true },
            field: { name: 'Включить модуль меток' },
            onChange: function () {
                location.reload();
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { name: 'marks_ua', type: 'trigger', default: true },
            field: { name: 'Показывать метку UA' }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { name: 'marks_ru', type: 'trigger', default: true },
            field: { name: 'Показывать метку RU' }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { name: 'marks_en', type: 'trigger', default: false },
            field: { name: 'Показывать метку EN' }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { name: 'marks_4k', type: 'trigger', default: true },
            field: { name: 'Показывать метку 4K' }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { name: 'marks_fhd', type: 'trigger', default: true },
            field: { name: 'Показывать метку 1080p/720p' }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { name: 'marks_hdr', type: 'trigger', default: true },
            field: { name: 'Показывать HDR/DV' }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { name: 'marks_rating', type: 'trigger', default: true },
            field: { name: 'Показывать рейтинг на карточке' }
        });
    }

    function initialize() {
        injectStyles();
        setupSettings();
        startObserver();

        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                injectFullCard(e.data.movie, e.object.activity.render());
            }
        });

        console.log('Lampa Marks Full Plugin: Initialized successfully');
    }

    // Ждем готовности приложения
    if (window.appready) {
        initialize();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initialize();
        });
    }

})();
