(function () {
    'use strict';

    https://my-lampa-proxy1.arnoldclasic6.workers.dev/?url=%27
    var STABLE_PROXY = ''; 

    if (window.marks_module_v1) return;
    window.marks_module_v1 = true;

    if (typeof Lampa === 'undefined') {
        console.warn('Marks: Lampa not found');
        return;
    }

    var jacredCache = {};
    var uafixCache = {};

    function isSettingEnabled(key, defaultVal) {
        var val = Lampa.Storage.get(key, defaultVal);
        return val !== false && val !== 'false' && val !== 0 && val !== '0';
    }

    function emptyMarksData() {
        return { empty: true, resolution: 'SD', ukr: false, eng: false, hdr: false, dolbyVision: false, atmos: false };
    }

    function fetchWithProxy(url, callback) {
        if (STABLE_PROXY) {
            var network = new Lampa.Reguest();
            network.timeout(7000);
            network.silent(STABLE_PROXY + encodeURIComponent(url), function (body) {
                callback(null, body);
            }, function () {
                fallbackToOriginalProxies(url, callback);
            });
        } else {
            fallbackToOriginalProxies(url, callback);
        }
    }

    function fallbackToOriginalProxies(url, callback) {
        var proxies = ['https://api.allorigins.win/get?url=', 'https://cors-anywhere.herokuapp.com/', 'https://thingproxy.freeboard.io/fetch/'];
        function request(reqUrl, setHeaders, onFail) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', reqUrl, true);
            if (typeof setHeaders === 'function') setHeaders(xhr);
            xhr.onload = function () {
                if (xhr.status >= 200 && xhr.status < 300) callback(null, xhr.responseText);
                else onFail();
            };
            xhr.onerror = onFail;
            xhr.timeout = 10000;
            xhr.send();
        }
        function tryProxy(index) {
            if (index >= proxies.length) return callback(new Error('All proxies failed'), null);
            var proxy = proxies[index];
            var reqUrl = proxy === 'https://api.allorigins.win/get?url=' ? proxy + encodeURIComponent(url) : proxy + url;
            request(reqUrl, function (xhr) {
                if (proxy === 'https://cors-anywhere.herokuapp.com/') xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            }, function () { tryProxy(index + 1); });
        }
        request(url, null, function () { tryProxy(0); });
    }

    function getBestJacred(movie, callback) {
        var cacheKey = 'marks_jacred_v1_' + movie.id;
        if (jacredCache[cacheKey]) return callback(jacredCache[cacheKey]);
        try {
            var raw = Lampa.Storage.get(cacheKey, '');
            if (raw && typeof raw === 'object' && raw._ts && (Date.now() - raw._ts < 48 * 60 * 60 * 1000)) {
                jacredCache[cacheKey] = raw;
                return callback(raw);
            }
        } catch (e) { }

        // ПРИОРИТЕТ ОРИГИНАЛА ДЛЯ ПОИСКА КАЧЕСТВА
        var title = (movie.original_title || movie.title || movie.name || '').replace(/[:·,]/g, '').toLowerCase().trim();
        var dateRaw = movie.release_date || movie.first_air_date || '';
        var year = String(dateRaw).substr(0, 4);
        if (!title || !year) return callback(emptyMarksData());

        var apiUrl = 'https://jac.red/api/v1/search?query=' + encodeURIComponent(title) + '&year=' + year;
        fetchWithProxy(apiUrl, function (err, body) {
            if (err || !body) return callback(emptyMarksData());
            try {
                var parsed = JSON.parse(body);
                var results = Array.isArray(parsed) ? parsed : (parsed.torrents || []);
                var best = { resolution: 'SD', ukr: false, eng: false, hdr: false, dolbyVision: false, atmos: false };
                var bestRes = 'SD', lock4k = false;
                results.forEach(function (item) {
                    var t = String(item.title || '').toLowerCase();
                    if (t.indexOf('cam') >= 0 || t.indexOf('ts') >= 0) return;
                    if (t.indexOf('4k') >= 0 || t.indexOf('2160') >= 0 || t.indexOf('uhd') >= 0) { bestRes = '4K'; lock4k = true; }
                    else if (!lock4k) {
                        if (t.indexOf('1080') >= 0 || t.indexOf('fhd') >= 0) bestRes = 'FHD';
                        else if (t.indexOf('720') >= 0 && bestRes === 'SD') bestRes = 'HD';
                    }
                    if (t.indexOf('ukr') >= 0 || t.indexOf('ua') >= 0) best.ukr = true;
                    if (t.indexOf('eng') >= 0) best.eng = true;
                    if (t.indexOf('hdr') >= 0) best.hdr = true;
                    if (t.indexOf('dv') >= 0 || t.indexOf('dolby vision') >= 0) best.dolbyVision = true;
                    if (t.indexOf('atmos') >= 0) best.atmos = true;
                });
                best.resolution = bestRes;
                best.empty = (best.resolution === 'SD' && !best.ukr);
                best._ts = Date.now();
                jacredCache[cacheKey] = best;
                Lampa.Storage.set(cacheKey, best);
                callback(best);
            } catch (e) { callback(emptyMarksData()); }
        });
    }

    function checkUafixBandera(movie, callback) {
        var title = movie.title || movie.name || '';
        var origTitle = movie.original_title || movie.original_name || '';
        var url = 'https://banderabackend.lampame.v6.rocks/api/v2/search?source=uaflix&title=' + encodeURIComponent(title) + '&original_title=' + encodeURIComponent(origTitle);
        var network = new Lampa.Reguest();
        network.timeout(5000);
        network.silent(url, function (json) { callback(Boolean(json && json.ok && json.items && json.items.length > 0)); }, function () { callback(null); });
    }

    function checkUafix(movie, callback) {
        if (!movie || !movie.id) return callback(false);
        var key = 'marks_uafix_v1_' + movie.id;
        if (uafixCache[key] !== undefined) return callback(uafixCache[key]);
        checkUafixBandera(movie, function (result) {
            uafixCache[key] = result;
            callback(result);
        });
    }

    function extractRating(movie) {
        if (!movie) return 0;
        var r = movie.imdb_rating || movie.kp_rating || movie.vote_average || movie.rating || 0;
        var n = parseFloat(String(r).replace(',', '.'));
        return isNaN(n) ? 0 : n;
    }

    function resolveMarks(movie, callback) {
        getBestJacred(movie, function (data) {
            var bestData = data || emptyMarksData();
            if (!bestData.ukr) {
                checkUafix(movie, function (hasUafix) {
                    if (hasUafix) { bestData.ukr = true; if (bestData.resolution === 'SD') bestData.resolution = 'FHD'; }
                    callback(bestData);
                });
            } else callback(bestData);
        });
    }

    function renderCardBadges(container, data, movie, cardRoot) {
        container.empty();
        if (!isSettingEnabled('marks_enabled', false)) return;
        if (data.ukr && isSettingEnabled('marks_ua', false)) container.append($('<div class="likhtar-marks-badge likhtar-marks-badge--ua">UA</div>'));
        if (data.resolution && data.resolution !== 'SD') {
            var cls = data.resolution.toLowerCase();
            var lbl = data.resolution === 'FHD' ? '1080p' : (data.resolution === 'HD' ? '720p' : '4K');
            if (isSettingEnabled('marks_fhd', true)) container.append($('<div class="likhtar-marks-badge likhtar-marks-badge--' + cls + '">' + lbl + '</div>'));
        }
        if (isSettingEnabled('marks_rating', true)) {
            var rate = extractRating(movie);
            if (rate > 0) {
                container.append($('<div class="likhtar-marks-badge likhtar-marks-badge--rating">★ ' + rate.toFixed(1) + '</div>'));
                if (cardRoot) cardRoot.addClass('likhtar-marks-has-custom-rating');
            }
        }
    }

    function processCards(scopeNodes) {
        var cards = (scopeNodes ? $(scopeNodes).find('.card') : $('.card')).not('.likhtar-marks-processed');
        cards.each(function () {
            var card = $(this);
            var movie = card.data('item') || this.card_data;
            if (movie && movie.id) {
                card.addClass('likhtar-marks-processed');
                var container = $('<div class="likhtar-marks-container"></div>');
                card.find('.card__view').append(container);
                resolveMarks(movie, function (data) { renderCardBadges(container, data, movie, card); });
            }
        });
    }

    function initCardObserver() {
        var observer = new MutationObserver(function () { processCards(); });
        observer.observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
        processCards();
    }

    function setupSettings() {
        if (window.marks_settings_added) return;
        window.marks_settings_added = true;
        Lampa.SettingsApi.addParam({ component: 'interface', param: { type: 'title' }, field: { name: 'Мітки (Marks)' } });
        Lampa.SettingsApi.addParam({ component: 'interface', param: { name: 'marks_enabled', type: 'trigger', default: true }, field: { name: 'Увімкнути модуль' } });
        Lampa.SettingsApi.addParam({ component: 'interface', param: { name: 'marks_ua', type: 'trigger', default: true }, field: { name: 'Метка UA' } });
        Lampa.SettingsApi.addParam({ component: 'interface', param: { name: 'marks_fhd', type: 'trigger', default: true }, field: { name: 'Якість (4K/1080)' } });
        Lampa.SettingsApi.addParam({ component: 'interface', param: { name: 'marks_rating', type: 'trigger', default: true }, field: { name: 'Рейтинг' } });
    }

    function injectStyle() {
        if (document.getElementById('likhtar-marks-style')) return;
        $('<style id="likhtar-marks-style">').text('\
            .likhtar-marks-container { position: absolute; top: 0.5em; left: 0.5em; display: flex; flex-direction: column; gap: 3px; z-index: 10; }\
            .likhtar-marks-badge { padding: 2px 5px; font-size: 10px; font-weight: bold; border-radius: 3px; color: #fff; background: rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.2); }\
            .likhtar-marks-badge--ua { background: #1565c0; }\
            .likhtar-marks-badge--4k { background: #e65100; }\
            .likhtar-marks-badge--rating { color: #ffd700; }\
            .likhtar-marks-has-custom-rating .card__vote { display: none !important; }\
        ').appendTo('head');
    }

    // Инициализация
    function init() {
        setupSettings(); injectStyle(); initCardObserver();
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                var render = e.object.activity.render();
                var movie = e.data.movie;
                var container = $('<div class="likhtar-marks-full"></div>').appendTo(render.find('.full-start__poster'));
                resolveMarks(movie, function (data) {
                    if (data.ukr) container.append('<div class="badge">UA</div>');
                });
            }
        });
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });
})();
