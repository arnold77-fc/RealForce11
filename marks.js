(function () {
    'use strict';

    if (window.marks_module_v2) return;
    window.marks_module_v2 = true;

    if (typeof Lampa === 'undefined') {
        console.warn('Marks: Lampa not found');
        return;
    }

    var qualitiesCache = {};
    var uafixCache = {};

    function isSettingEnabled(key, defaultVal) {
        var val = Lampa.Storage.get(key, defaultVal);
        return val !== false && val !== 'false' && val !== 0 && val !== '0';
    }

    function emptyMarksData() {
        return {
            empty: true,
            resolution: 'SD',
            ukr: false,
            eng: false,
            ru: false,
            hdr: false,
            dolbyVision: false,
            atmos: false
        };
    }

    function fetchWithProxy(url, callback) {
        var proxies = [
            'https://my-lampa-proxy1.arnoldclasic6.workers.dev/?url=',
            'https://api.allorigins.win/get?url=',
            'https://cors-anywhere.herokuapp.com/',
            'https://thingproxy.freeboard.io/fetch/'
        ];

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
            xhr.ontimeout = onFail;
            xhr.send();
        }

        function tryProxy(index) {
            if (index >= proxies.length) return callback(new Error('All proxies failed'), null);

            var proxy = proxies[index];
            var reqUrl = (proxy.indexOf('?url=') !== -1)
                ? proxy + encodeURIComponent(url)
                : proxy + url;

            request(reqUrl, function (xhr) {
                if (proxy === 'https://cors-anywhere.herokuapp.com/') {
                    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                }
            }, function () {
                tryProxy(index + 1);
            });
        }

        request(url, null, function () {
            tryProxy(0);
        });
    }

    function processTitleString(t, best) {
        if (!t) return;
        
        if (/\b(camrip|cam|ts|telesync|tc|telecine)\b/i.test(t)) return;

        var is4k = /\b(4k|2160p|2160|uhd)\b/i.test(t);
        var isFhd = /\b(1080p|1080|fhd)\b/i.test(t);
        var isHd = /\b(720p|720|hd)\b/i.test(t);

        if (is4k) {
            best.resolution = '4K';
        } else if (best.resolution !== '4K') {
            if (isFhd) best.resolution = 'FHD';
            else if (isHd && best.resolution === 'SD') best.resolution = 'HD';
        }

        if (/\b(ukr|ua|укр)\b/i.test(t)) best.ukr = true;
        if (/\b(eng|english|en)\b/i.test(t)) best.eng = true;
        if (/\b(ru|rus|russian|ру|рус|dvo|mvo)\b/i.test(t) || t.indexOf('дубляж') >= 0 || t.indexOf('лицензия') >= 0) best.ru = true;
        
        if (/\b(hdr)\b/i.test(t)) best.hdr = true;
        if (/\b(dolby vision|dv|dovi)\b/i.test(t)) best.dolbyVision = true;
        if (/\b(atmos)\b/i.test(t)) best.atmos = true;
    }

    function searchMovieQualities(movie, callback) {
        var cacheKey = 'marks_qualities_v2_' + movie.id;
        if (qualitiesCache[cacheKey]) return callback(qualitiesCache[cacheKey]);

        try {
            var raw = Lampa.Storage.get(cacheKey, '');
            if (raw && typeof raw === 'object' && raw._ts && (Date.now() - raw._ts < 48 * 60 * 60 * 1000)) {
                qualitiesCache[cacheKey] = raw;
                return callback(raw);
            }
        } catch (e) { }

        var title = (movie.original_title || movie.title || movie.name || '').toLowerCase().trim();
        var ruTitle = (movie.title || movie.name || '').toLowerCase().trim();
        var dateRaw = movie.release_date || movie.first_air_date || '';
        var year = String(dateRaw).substr(0, 4);
        if (!title || !year) return callback(emptyMarksData());

        var releaseDate = new Date(dateRaw);
        if (!isNaN(releaseDate.getTime()) && releaseDate.getTime() > Date.now()) return callback(emptyMarksData());

        var apisToTry = [
            { url: 'https://jac.red/api/v1/search?query=' + encodeURIComponent(title) + '&year=' + year, type: 'jacred' },
            { url: 'https://bitsearch.to/api/v1/search?q=' + encodeURIComponent(title + ' ' + year), type: 'bitsearch' }
        ];

        if (ruTitle && ruTitle !== title && /[а-яА-Я]/.test(ruTitle)) {
            apisToTry.push({ url: 'https://bitsearch.to/api/v1/search?q=' + encodeURIComponent(ruTitle + ' ' + year), type: 'bitsearch' });
        }
        apisToTry.push({ url: 'https://apibay.org/q.php?q=' + encodeURIComponent(title), type: 'apibay' });

        var best = emptyMarksData();
        best.empty = false;
        var index = 0;

        function finish() {
            best.empty = (best.resolution === 'SD' && !best.ukr && !best.ru && !best.hdr);
            best._ts = Date.now();
            qualitiesCache[cacheKey] = best;
            Lampa.Storage.set(cacheKey, best);
            callback(best);
        }

        function checkNextAPI() {
            if (best.resolution === '4K' && best.ru && best.ukr && best.eng) {
                return finish();
            }

            if (index >= apisToTry.length) return finish();

            var api = apisToTry[index++];
            
            fetchWithProxy(api.url, function (err, body) {
                if (!err && body) {
                    try {
                        var parsed = JSON.parse(body);
                        var results = [];
                        if (api.type === 'jacred') results = Array.isArray(parsed) ? parsed : (parsed.torrents || []);
                        else if (api.type === 'bitsearch') results = parsed.data || [];
                        else if (api.type === 'apibay') results = Array.isArray(parsed) ? parsed : [];

                        results.forEach(function (item) {
                            var t = String(item.title || item.name || '').toLowerCase();
                            processTitleString(t, best);
                        });
                    } catch (e) { }
                }
                checkNextAPI();
            });
        }

        checkNextAPI();
    }

    function checkUafixBandera(movie, callback) {
        var title = movie.title || movie.name || '';
        var origTitle = movie.original_title || movie.original_name || '';
        var imdbId = movie.imdb_id || '';
        var type = movie.name ? 'series' : 'movie';

        var url = 'https://banderabackend.lampame.v6.rocks/api/v2/search?source=uaflix';
        if (title) url += '&title=' + encodeURIComponent(title);
        if (origTitle) url += '&original_title=' + encodeURIComponent(origTitle);
        if (imdbId) url += '&imdb_id=' + encodeURIComponent(imdbId);
        url += '&type=' + type;

        var network = new Lampa.Reguest();
        network.timeout(5000);
        network.silent(url, function (json) {
            callback(Boolean(json && json.ok && json.items && json.items.length > 0));
        }, function () {
            callback(null);
        });
    }

    function checkUafixDirect(movie, callback) {
        var query = movie.original_title || movie.original_name || movie.title || movie.name || '';
        if (!query) return callback(false);

        var searchUrl = 'https://uafix.net/index.php?do=search&subaction=search&story=' + encodeURIComponent(query);
        fetchWithProxy(searchUrl, function (err, html) {
            if (err || !html) return callback(false);
            var hasResults = html.indexOf('знайдено') >= 0 && html.indexOf('0 відповідей') < 0;
            callback(hasResults);
        });
    }

    function checkUafix(movie, callback) {
        if (!movie || !movie.id) return callback(false);

        var key = 'marks_uafix_v1_' + movie.id;
        if (uafixCache[key] !== undefined) return callback(uafixCache[key]);

        checkUafixBandera(movie, function (result) {
            if (result !== null) {
                uafixCache[key] = result;
                callback(result);
            } else {
                checkUafixDirect(movie, function (found) {
                    uafixCache[key] = found;
                    callback(found);
                });
            }
        });
    }

    function getMovieFromCard(cardNode) {
        var card = $(cardNode);
        return cardNode.heroMovieData || card.data('item') || cardNode.card_data || cardNode.item || null;
    }

    function extractRating(movie) {
        if (!movie) return 0;

        var candidates = [
            movie.imdb_rating,
            movie.kp_rating,
            movie.vote_average,
            movie.rating,
            movie.rate
        ];

        for (var i = 0; i < candidates.length; i++) {
            if (candidates[i] === undefined || candidates[i] === null || candidates[i] === '') continue;
            var n = parseFloat(String(candidates[i]).replace(',', '.'));
            if (!isNaN(n) && n > 0) return n;
        }
        return 0;
    }

    function resolveMarks(movie, callback) {
        searchMovieQualities(movie, function (bestData) {
            if (!bestData.ukr) {
                checkUafix(movie, function (hasUafix) {
                    if (hasUafix) {
                        bestData.empty = false;
                        bestData.ukr = true;
                        if (!bestData.resolution || bestData.resolution === 'SD' || bestData.resolution === 'HD') {
                            bestData.resolution = 'FHD';
                        }
                    }
                    callback(bestData);
                });
            } else {
                callback(bestData);
            }
        });
    }

    function createCardBadge(cssClass, label) {
        var badge = document.createElement('div');
        badge.classList.add('likhtar-marks-badge');
        badge.classList.add('likhtar-marks-badge--' + cssClass);
        badge.textContent = label;
        return badge;
    }

    function renderCardBadges(container, data, movie, cardRoot) {
        container.empty();

        if (!isSettingEnabled('marks_enabled', false)) return;

        if (data.ru && isSettingEnabled('marks_ru', false)) container.append(createCardBadge('ru', 'RU'));
        if (data.ukr && isSettingEnabled('marks_ua', false)) container.append(createCardBadge('ua', 'UA'));
        if (data.eng && isSettingEnabled('marks_en', false)) container.append(createCardBadge('en', 'EN'));

        if (data.resolution && data.resolution !== 'SD') {
            if (data.resolution === '4K' && isSettingEnabled('marks_4k', false)) {
                container.append(createCardBadge('4k', '4K'));
            } else if (data.resolution === 'FHD' && isSettingEnabled('marks_fhd', false)) {
                container.append(createCardBadge('fhd', '1080p'));
            } else if (data.resolution === 'HD' && isSettingEnabled('marks_fhd', false)) {
                container.append(createCardBadge('hd', '720p'));
            } else if (isSettingEnabled('marks_fhd', false)) {
                container.append(createCardBadge('hd', data.resolution));
            }
        }

        if (isSettingEnabled('marks_hdr', false)) {
            if (data.hdr) container.append(createCardBadge('hdr', 'HDR'));
            if (data.dolbyVision) container.append(createCardBadge('hdr', 'DV'));
            if (data.atmos) container.append(createCardBadge('atmos', 'Atmos'));
        }

        var hasCustomRating = false;
        if (isSettingEnabled('marks_rating', false)) {
            var rating = extractRating(movie);
            if (rating > 0 && String(rating) !== '0.0') {
                var rBadge = document.createElement('div');
                rBadge.classList.add('likhtar-marks-badge', 'likhtar-marks-badge--rating');
                rBadge.innerHTML = '<span class="likhtar-marks-star">&#9733;</span>' + rating.toFixed(1);
                container.append(rBadge);
                hasCustomRating = true;
            }
        }

        if (cardRoot && cardRoot.length) {
            if (hasCustomRating) cardRoot.addClass('likhtar-marks-has-custom-rating');
            else cardRoot.removeClass('likhtar-marks-has-custom-rating');
        }
    }

    function addMarksToCard(card, movie, viewSelector) {
        if (!isSettingEnabled('marks_enabled', false)) return;

        var containerParent = viewSelector ? card.find(viewSelector).first() : card;
        if (!containerParent.length) containerParent = card;

        if (containerParent.css('position') === 'static') containerParent.css('position', 'relative');

        var marksContainer = containerParent.find('.likhtar-marks-container').first();
        if (!marksContainer.length) {
            marksContainer = $('<div class="likhtar-marks-container"></div>');
            containerParent.append(marksContainer);
        }

        resolveMarks(movie, function (bestData) {
            renderCardBadges(marksContainer, bestData, movie, card);
        });
    }

    function processCards(scopeNodes) {
        var cardsToProcess;

        if (scopeNodes && scopeNodes.length) {
            var cardNodes = [];
            for (var i = 0; i < scopeNodes.length; i++) {
                var node = scopeNodes[i];
                if (!node || node.nodeType !== 1) continue;
                if (node.matches && node.matches('.card')) cardNodes.push(node);
                var nested = node.querySelectorAll ? node.querySelectorAll('.card') : [];
                for (var j = 0; j < nested.length; j++) cardNodes.push(nested[j]);
            }
            cardsToProcess = $(cardNodes).not('.likhtar-marks-processed');
        } else {
            cardsToProcess = $('.card').not('.likhtar-marks-processed');
        }

        cardsToProcess.each(function () {
            var card = $(this);
            var movie = getMovieFromCard(this);
            if (!(movie && movie.id && !movie.size)) return;

            card.addClass('likhtar-marks-processed');
            if (card.hasClass('hero-banner')) addMarksToCard(card, movie, null);
            else addMarksToCard(card, movie, '.card__view');
        });
    }

    function renderFullBadges(container, data, movie) {
        container.empty();
        if (!isSettingEnabled('marks_enabled', false)) {
            container.remove();
            return;
        }

        if (data.ru && isSettingEnabled('marks_ru', false)) {
            container.append('<div class="likhtar-marks-full-badge likhtar-marks-full-badge--ru">RU</div>');
        }
        if (data.ukr && isSettingEnabled('marks_ua', false)) {
            container.append('<div class="likhtar-marks-full-badge likhtar-marks-full-badge--ua">UA+</div>');
        }

        if (data.resolution && data.resolution !== 'SD') {
            var resText = data.resolution;
            if (resText === 'FHD') resText = '1080p';
            else if (resText === 'HD') resText = '720p';

            var showQuality = false;
            if (data.resolution === '4K' && isSettingEnabled('marks_4k', false)) showQuality = true;
            else if ((data.resolution === 'FHD' || data.resolution === 'HD') && isSettingEnabled('marks_fhd', false)) showQuality = true;

            if (showQuality) {
                container.append('<div class="likhtar-marks-full-badge likhtar-marks-full-badge--quality">' + resText + '</div>');
            }
        }

        if (isSettingEnabled('marks_hdr', false)) {
            if (data.hdr) container.append('<div class="likhtar-marks-full-badge likhtar-marks-full-badge--hdr">HDR</div>');
            if (data.dolbyVision) container.append('<div class="likhtar-marks-full-badge likhtar-marks-full-badge--hdr">DV</div>');
            if (data.atmos) container.append('<div class="likhtar-marks-full-badge likhtar-marks-full-badge--hdr">Atmos</div>');
        }

        if (isSettingEnabled('marks_rating', false)) {
            var rating = extractRating(movie);
            if (rating > 0 && String(rating) !== '0.0') {
                container.append('<div class="likhtar-marks-full-badge likhtar-marks-full-badge--rating">&#9733;' + rating.toFixed(1) + '</div>');
            }
        }
    }

    function injectFullCardMarks(movie, renderEl) {
        if (!movie || !movie.id || !renderEl) return;

        var $render = $(renderEl);
        if ($render.is('.applecation') || $render.find('.applecation').length) return;

        if ($('.quality-badges-container').length) return;

        var poster = $render.find('.full-start__poster, .full-start-new__poster').first();
        if (poster.length) {
            if ($render.find('.likhtar-marks-full').length) return;
            poster.css('position', 'relative');
            var posterBadges = $('<div class="likhtar-marks-full"></div>');
            poster.append(posterBadges);

            resolveMarks(movie, function (bestData) {
                renderFullBadges(posterBadges, bestData, movie);
            });
        } else {
            var rateLine = $render.find('.full-start-new__rate-line, .full-start__rate-line').first();
            if (!rateLine.length) return;
            if ($render.find('.likhtar-marks-row').length) return;

            var qualityRow = $('<div class="likhtar-marks-row"></div>');
            rateLine.append(qualityRow);
            resolveMarks(movie, function (bestData) {
                renderFullBadges(qualityRow, bestData, movie);
            });
        }
    }

    function initCardObserver() {
        var queued = false;
        var pendingRoots = [];

        function scheduleProcess(mutations) {
            if (mutations && mutations.length) {
                for (var i = 0; i < mutations.length; i++) {
                    var added = mutations[i].addedNodes;
                    for (var j = 0; j < added.length; j++) {
                        if (added[j] && added[j].nodeType === 1) pendingRoots.push(added[j]);
                    }
                }
            }

            if (queued) return;
            queued = true;

            setTimeout(function () {
                queued = false;
                if (pendingRoots.length) {
                    var batch = pendingRoots.slice(0);
                    pendingRoots = [];
                    processCards(batch);
                } else {
                    processCards();
                }
            }, 80);
        }

        var observer = new MutationObserver(scheduleProcess);
        var target = document.getElementById('app') || document.body;
        observer.observe(target, { childList: true, subtree: true });

        processCards();
        setTimeout(processCards, 400);
        setTimeout(processCards, 1500);
    }

    function initFullCardObserver() {
        if (!Lampa.Listener || !Lampa.Listener.follow) return;

        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complite') return;
            var movie = e.data && e.data.movie;
            var renderEl = e.object && e.object.activity && e.object.activity.render && e.object.activity.render();
            injectFullCardMarks(movie, renderEl);
        });

        setTimeout(function () {
            try {
                var act = Lampa.Activity && Lampa.Activity.active && Lampa.Activity.active();
                if (!act || act.component !== 'full') return;
                var movie = act.card || act.movie;
                var renderEl = act.activity && act.activity.render && act.activity.render();
                injectFullCardMarks(movie, renderEl);
            } catch (err) { }
        }, 300);
    }

    function refreshAllMarks() {
        try {
            $('.likhtar-marks-container').remove();
            $('.card').removeClass('likhtar-marks-processed likhtar-marks-has-custom-rating');
            $('.likhtar-marks-full, .likhtar-marks-row').remove();
            processCards();
        } catch (e) { }

        try {
            var act = Lampa.Activity && Lampa.Activity.active && Lampa.Activity.active();
            if (act && act.component === 'full') {
                var movie = act.card || act.movie;
                var renderEl = act.activity && act.activity.render && act.activity.render();
                injectFullCardMarks(movie, renderEl);
            }
        } catch (e2) { }
    }

    function setupSettings() {
        if (!Lampa.SettingsApi || !Lampa.SettingsApi.addParam) return;
        if (window.marks_settings_added) return;
        window.marks_settings_added = true;
        var targetComponent = 'interface';
        var migrateKey = 'marks_defaults_migrated_v4';

        if (!Lampa.Storage.get(migrateKey, false)) {
            if (Lampa.Storage.get('marks_enabled', null) === null) {
                Lampa.Storage.set('marks_enabled', false);
            }
            Lampa.Storage.set('marks_ru', true);
            Lampa.Storage.set('marks_ua', true);
            Lampa.Storage.set('marks_en', true);
            Lampa.Storage.set('marks_4k', true);
            Lampa.Storage.set('marks_fhd', true);
            Lampa.Storage.set('marks_hdr', true);
            Lampa.Storage.set('marks_rating', true);
            Lampa.Storage.set(migrateKey, true);
        }

        var refreshBadgesNow = function () {
            if (window.MARKS_REFRESH) window.MARKS_REFRESH();
        };

        Lampa.SettingsApi.addParam({
            component: targetComponent,
            param: { type: 'title' },
            field: { name: '\u041c\u0456\u0442\u043a\u0438 (Marks)' }
        });

        Lampa.SettingsApi.addParam({
            component: targetComponent,
            param: { name: 'marks_enabled', type: 'trigger', default: false },
            field: { name: '\u0423\u0432\u0456\u043c\u043a\u043d\u0443\u0442\u0438 \u043c\u043e\u0434\u0443\u043b\u044c \u043c\u0456\u0442\u043e\u043a' },
            onChange: refreshBadgesNow
        });

        Lampa.SettingsApi.addParam({
            component: targetComponent,
            param: { name: 'marks_ru', type: 'trigger', default: true },
            field: { name: 'Показувати мітку RU' },
            onChange: refreshBadgesNow
        });

        Lampa.SettingsApi.addParam({
            component: targetComponent,
            param: { name: 'marks_ua', type: 'trigger', default: true },
            field: { name: '\u041f\u043e\u043a\u0430\u0437\u0443\u0432\u0430\u0442\u0438 \u043c\u0456\u0442\u043a\u0443 UA' },
            onChange: refreshBadgesNow
        });

        Lampa.SettingsApi.addParam({
            component: targetComponent,
            param: { name: 'marks_en', type: 'trigger', default: true },
            field: { name: '\u041f\u043e\u043a\u0430\u0437\u0443\u0432\u0430\u0442\u0438 \u043c\u0456\u0442\u043a\u0443 EN' },
            onChange: refreshBadgesNow
        });

        Lampa.SettingsApi.addParam({
            component: targetComponent,
            param: { name: 'marks_4k', type: 'trigger', default: true },
            field: { name: '\u041f\u043e\u043a\u0430\u0437\u0443\u0432\u0430\u0442\u0438 \u043c\u0456\u0442\u043a\u0443 4K' },
            onChange: refreshBadgesNow
        });

        Lampa.SettingsApi.addParam({
            component: targetComponent,
            param: { name: 'marks_fhd', type: 'trigger', default: true },
            field: { name: '\u041f\u043e\u043a\u0430\u0437\u0443\u0432\u0430\u0442\u0438 \u043c\u0456\u0442\u043a\u0438 1080p / 720p' },
            onChange: refreshBadgesNow
        });

        Lampa.SettingsApi.addParam({
            component: targetComponent,
            param: { name: 'marks_hdr', type: 'trigger', default: true },
            field: { name: '\u041f\u043e\u043a\u0430\u0437\u0443\u0432\u0430\u0442\u0438 \u043c\u0456\u0442\u043a\u0443 HDR / Dolby Vision / Atmos' },
            onChange: refreshBadgesNow
        });

        Lampa.SettingsApi.addParam({
            component: targetComponent,
            param: { name: 'marks_rating', type: 'trigger', default: true },
            field: { name: '\u041f\u043e\u043a\u0430\u0437\u0443\u0432\u0430\u0442\u0438 \u043c\u0456\u0442\u043a\u0443 \u0440\u0435\u0439\u0442\u0438\u043d\u0433\u0443' },
            onChange: refreshBadgesNow
        });
    }

    function injectStyle() {
        if (document.getElementById('likhtar-marks-style-v2')) return;

        var style = document.createElement('style');
        style.id = 'likhtar-marks-style-v2';
        style.innerHTML = '\
            .likhtar-marks-container {\
                position: absolute;\
                top: 2.8em;\
                left: -0.2em;\
                display: flex;\
                flex-direction: column;\
                gap: 0.2em;\
                z-index: 20;\
                pointer-events: none;\
            }\
            .hero-banner .likhtar-marks-container {\
                top: 2.8em;\
                left: 1.2em;\
                gap: 0.3em;\
            }\
            .likhtar-marks-badge {\
                padding: 0.32em 0.48em;\
                font-size: 0.78em;\
                font-weight: 800;\
                line-height: 1;\
                letter-spacing: 0.03em;\
                border-radius: 0.32em;\
                display: inline-flex;\
                align-items: center;\
                justify-content: center;\
                align-self: flex-start;\
                border: 1px solid rgba(255,255,255,0.16);\
                box-shadow: 0 1px 5px rgba(0,0,0,0.35);\
                color: #fff;\
                white-space: nowrap;\
            }\
            .likhtar-marks-badge--ru  { background: linear-gradient(135deg, #c62828, #ef5350); border-color: rgba(239,83,80,0.4); }\
            .likhtar-marks-badge--ua  { background: linear-gradient(135deg, #1565c0, #42a5f5); border-color: rgba(66,165,245,0.4); }\
            .likhtar-marks-badge--en  { background: linear-gradient(135deg, #37474f, #78909c); border-color: rgba(120,144,156,0.4); }\
            .likhtar-marks-badge--4k  { background: linear-gradient(135deg, #e65100, #ff9800); border-color: rgba(255,152,0,0.4); }\
            .likhtar-marks-badge--fhd { background: linear-gradient(135deg, #4a148c, #ab47bc); border-color: rgba(171,71,188,0.4); }\
            .likhtar-marks-badge--hd  { background: linear-gradient(135deg, #1b5e20, #66bb6a); border-color: rgba(102,187,106,0.4); }\
            .likhtar-marks-badge--hdr { background: linear-gradient(135deg, #f57f17, #ffeb3b); color: #000; border-color: rgba(255,235,59,0.4); }\
            .likhtar-marks-badge--atmos { background: linear-gradient(135deg, #424242, #757575); color: #fff; border-color: rgba(255,255,255,0.4); }\
            .likhtar-marks-badge--rating { background: linear-gradient(135deg, #1a1a2e, #16213e); color: #ffd700; border-color: rgba(255,215,0,0.35); }\
            .likhtar-marks-star { margin-right: 0.16em; font-size: 0.92em; }\
            .card.likhtar-marks-has-custom-rating .card__vote { display: none !important; }\
            .likhtar-marks-full {\
                position: absolute;\
                top: 0.8em;\
                right: 0.2em;\
                display: flex;\
                flex-direction: column;\
                gap: 0.3em;\
                z-index: 20;\
                pointer-events: none;\
            }\
            .likhtar-marks-row {\
                display: inline-flex;\
                align-items: center;\
                gap: 0.4em;\
                flex-wrap: wrap;\
            }\
            .likhtar-marks-full-badge {\
                display: inline-flex;\
                align-items: center;\
                justify-content: center;\
                padding: 0.25em 0.5em;\
                border-radius: 0.3em;\
                border: 1px solid rgba(255,255,255,0.2);\
                font-size: 0.75em;\
                font-weight: 800;\
                line-height: 1;\
                letter-spacing: 0.04em;\
                color: #fff;\
                box-shadow: 0 2px 6px rgba(0,0,0,0.4);\
            }\
            .likhtar-marks-full-badge--ru { background: linear-gradient(135deg, #c62828, #ef5350); border-color: rgba(239,83,80,0.4); }\
            .likhtar-marks-full-badge--ua { background: linear-gradient(135deg, #1565c0, #42a5f5); border-color: rgba(66,165,245,0.4); }\
            .likhtar-marks-full-badge--quality { background: linear-gradient(135deg, #2e7d32, #66bb6a); border-color: rgba(102,187,106,0.4); }\
            .likhtar-marks-full-badge--hdr { background: linear-gradient(135deg, #512da8, #ab47bc); border-color: rgba(171,71,188,0.4); }\
            .likhtar-marks-full-badge--rating { background: linear-gradient(135deg, #1a1a2e, #16213e); color: #ffd700; border-color: rgba(255,215,0,0.35); }\
        ';

        document.head.appendChild(style);
    }

    function runInit() {
        setupSettings();
        injectStyle();
        window.MARKS_REFRESH = refreshAllMarks;
        initCardObserver();
        initFullCardObserver();
        setTimeout(refreshAllMarks, 50);
    }

    if (window.appready) {
        runInit();
    } else if (Lampa.Listener && Lampa.Listener.follow) {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') runInit();
        });
    } else {
        setTimeout(runInit, 1200);
    }
})();
