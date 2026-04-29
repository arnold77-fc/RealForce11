(function () {
    'use strict';

    /**
     * МОДУЛЬ МЕТОК (MARKS) ДЛЯ LAMPA
     * Версия: 2.0.0 (Extended)
     * * ПАРАМЕТРЫ КОНФИГУРАЦИИ:
     * Если у вас есть личный прокси-сервер, укажите его ниже.
     */
    var STABLE_PROXY = 'https://my-lampa-proxy1.arnoldclasic6.workers.dev/?url='; 

    // Глобальный флаг для предотвращения дублирования скрипта
    if (window.marks_module_v1) {
        console.log('Marks: Module already loaded.');
        return;
    }
    window.marks_module_v1 = true;

    // Проверка окружения Lampa
    if (typeof Lampa === 'undefined') {
        console.error('Marks: Lampa environment not detected.');
        return;
    }

    /**
     * ХРАНИЛИЩА КЭША
     * Используются для минимизации количества сетевых запросов.
     */
    var jacredCache = {};
    var onlineCache = {};
    var uafixCache  = {};

    /**
     * Функция получения настроек из хранилища Lampa.
     * @param {string} key - Ключ настройки.
     * @param {any} defaultVal - Значение по умолчанию.
     */
    function isSettingEnabled(key, defaultVal) {
        var val = Lampa.Storage.get(key, defaultVal);
        if (val === null || val === undefined) {
            return defaultVal;
        }
        // Обработка строковых значений из хранилища
        return val !== false && val !== 'false' && val !== 0 && val !== '0';
    }

    /**
     * Создание стандартного объекта данных для нового фильма.
     */
    function emptyMarksData() {
        return {
            empty: true,
            resolution: 'SD',
            ukr: false,
            rus: false,
            eng: false,
            hdr: false,
            dolbyVision: false,
            atmos: false,
            _ts: 0
        };
    }

    /**
     * ОСНОВНОЙ МЕТОД ЗАПРОСОВ (FETCH)
     * Поддерживает работу через указанный прокси или через цепочку публичных CORS-прокси.
     */
    function fetchWithProxy(url, callback) {
        if (STABLE_PROXY) {
            var network = new Lampa.Reguest();
            network.timeout(12000);
            network.silent(STABLE_PROXY + encodeURIComponent(url), function (body) {
                var responseData = typeof body === 'string' ? body : JSON.stringify(body);
                callback(null, responseData);
            }, function () {
                console.warn('Marks: Primary proxy failed, switching to fallback...');
                fallbackToOriginalProxies(url, callback);
            });
            return;
        }
        fallbackToOriginalProxies(url, callback);
    }

    /**
     * Список публичных прокси-серверов для обхода ограничений CORS.
     */
    function fallbackToOriginalProxies(url, callback) {
        var proxies = [
            'https://api.allorigins.win/get?url=',
            'https://cors-anywhere.herokuapp.com/',
            'https://thingproxy.freeboard.io/fetch/',
            'https://api.codetabs.com/v1/proxy?quest='
        ];

        function request(reqUrl, setHeaders, onFail) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', reqUrl, true);
            
            if (typeof setHeaders === 'function') {
                setHeaders(xhr);
            }

            xhr.onload = function () {
                if (xhr.status >= 200 && xhr.status < 300) {
                    callback(null, xhr.responseText);
                } else {
                    onFail();
                }
            };

            xhr.onerror = function() { onFail(); };
            xhr.timeout = 10000;
            xhr.ontimeout = function() { onFail(); };
            xhr.send();
        }

        function tryProxy(index) {
            if (index >= proxies.length) {
                console.error('Marks: All fallback proxies failed.');
                return callback(new Error('All proxies failed'), null);
            }

            var proxy = proxies[index];
            var finalUrl = (proxy.indexOf('allorigins') > -1 || proxy.indexOf('codetabs') > -1) 
                ? proxy + encodeURIComponent(url) 
                : proxy + url;

            request(finalUrl, function (xhr) {
                if (proxy.indexOf('herokuapp') > -1) {
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

    /**
     * ФУНКЦИЯ ПОИСКА В JACRED (ТОРРЕНТЫ)
     * Анализирует заголовки раздач для определения качества и звука.
     */
    function getBestJacred(movie, callback) {
        var movieId = movie.id;
        var cacheKey = 'marks_full_extended_' + movieId;

        // 1. Проверка оперативного кэша
        if (jacredCache[cacheKey]) {
            return callback(jacredCache[cacheKey]);
        }

        // 2. Проверка долговременного кэша (LocalStorage)
        try {
            var cachedRaw = Lampa.Storage.get(cacheKey, '');
            if (cachedRaw && typeof cachedRaw === 'object' && cachedRaw._ts) {
                var now = Date.now();
                var lifeTime = 48 * 60 * 60 * 1000; // 48 часов
                if (now - cachedRaw._ts < lifeTime) {
                    jacredCache[cacheKey] = cachedRaw;
                    return callback(cachedRaw);
                }
            }
        } catch (e) {
            console.log('Marks: Cache read error.');
        }

        // Подготовка поискового запроса
        var cleanTitle = (movie.original_title || movie.title || movie.name || '');
        // Исправлено: добавлена очистка точек и тире для корректного поиска в Jacred
        cleanTitle = cleanTitle.replace(/[/\-—:·,.]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
        
        var dateValue = movie.release_date || movie.first_air_date || '';
        var releaseYear = String(dateValue).substr(0, 4);

        if (!cleanTitle) {
            return callback(emptyMarksData());
        }

        var jacUrl = 'https://jac.red/api/v1/search?query=' + encodeURIComponent(cleanTitle);
        if (releaseYear) {
            jacUrl += '&year=' + releaseYear;
        }
        
        fetchWithProxy(jacUrl, function (err, responseBody) {
            if (err || !responseBody) {
                return callback(emptyMarksData());
            }

            try {
                var json = JSON.parse(responseBody);
                // Поддержка разных форматов ответа Jacred
                var items = Array.isArray(json) ? json : (json.torrents || []);
                
                // Если пусто, пробуем поиск без года
                if (items.length === 0 && releaseYear) {
                    var retryUrl = 'https://jac.red/api/v1/search?query=' + encodeURIComponent(cleanTitle);
                    fetchWithProxy(retryUrl, function(e2, b2) {
                        if (e2 || !b2) return callback(emptyMarksData());
                        parseAndCacheJacred(JSON.parse(b2), cacheKey, callback);
                    });
                } else {
                    parseAndCacheJacred(json, cacheKey, callback);
                }
            } catch (e) {
                callback(emptyMarksData());
            }
        });
    }

    /**
     * Парсинг сырых данных из торрент-ответов.
     */
    function parseAndCacheJacred(json, cacheKey, callback) {
        var torrents = Array.isArray(json) ? json : (json.torrents || []);
        var data = emptyMarksData();
        data.empty = false;

        var maxRank = 0; // 0:SD, 1:720p, 2:1080p, 3:2160p

        torrents.forEach(function (torrent) {
            var t = String(torrent.title || '').toLowerCase();
            
            // Игнорируем экранки (CamRip, TS)
            if (t.indexOf('cam') > -1 || t.indexOf('ts') > -1 || t.indexOf('telesync') > -1) {
                return;
            }

            // Определение разрешения
            if (t.indexOf('4k') > -1 || t.indexOf('2160') > -1 || t.indexOf('uhd') > -1) {
                maxRank = 3;
            } else if (maxRank < 2 && (t.indexOf('1080') > -1 || t.indexOf('fhd') > -1)) {
                maxRank = 2;
            } else if (maxRank < 1 && (t.indexOf('720') > -1 || t.indexOf('hd') > -1)) {
                maxRank = 1;
            }

            // Определение языков озвучки
            if (t.indexOf('ukr') > -1 || t.indexOf('ua') > -1 || t.indexOf('ukrainian') > -1) {
                data.ukr = true;
            }
            if (t.indexOf('rus') > -1 || t.indexOf('ru') > -1 || t.indexOf(' rus ') > -1) {
                data.rus = true;
            }
            if (t.indexOf('eng') > -1 || t.indexOf('original') > -1 || t.indexOf('en') > -1) {
                data.eng = true;
            }
            
            // Определение визуальных и звуковых технологий
            if (t.indexOf('hdr') > -1) {
                data.hdr = true;
            }
            if (t.indexOf('dv') > -1 || t.indexOf('dolby vision') > -1) {
                data.dolbyVision = true;
            }
            if (t.indexOf('atmos') > -1) {
                data.atmos = true;
            }
        });

        var resStrings = ['SD', 'HD', 'FHD', '4K'];
        data.resolution = resStrings[maxRank];
        data._ts = Date.now();
        
        // Сохранение в кэш
        jacredCache[cacheKey] = data;
        Lampa.Storage.set(cacheKey, data);

        callback(data);
    }

    /**
     * ПОИСК ПО ОНЛАЙН СЕРВИСАМ (Bandera / Online Aggregator)
     * Дополняет данные о наличии озвучек в онлайн-кинотеатрах.
     */
    function getOnlineMetaData(movie, callback) {
        var searchTitle = (movie.title || movie.name || '').toLowerCase();
        var searchOrig  = (movie.original_title || movie.original_name || '').toLowerCase();
        
        var baseUrl = 'https://banderabackend.lampame.v6.rocks/api/v2/search';
        var params = '?title=' + encodeURIComponent(searchTitle) + '&original_title=' + encodeURIComponent(searchOrig);
        
        var request = new Lampa.Reguest();
        request.timeout(6000);
        request.silent(baseUrl + params, function (response) {
            var metadata = { 
                ukr: false, 
                rus: false, 
                quality: 'SD' 
            };

            if (response && response.items) {
                response.items.forEach(function(item) {
                    var lowTitle = item.title.toLowerCase();
                    
                    // Поиск украинских меток
                    if (lowTitle.indexOf('ua') > -1 || item.source === 'uaflix' || lowTitle.indexOf('ukr') > -1) {
                        metadata.ukr = true;
                    }
                    // Поиск русских меток
                    if (lowTitle.indexOf('ru') > -1 || item.source === 'rezka' || lowTitle.indexOf('rus') > -1) {
                        metadata.rus = true;
                    }
                    // Поиск качества
                    if (item.quality) {
                        var q = item.quality.toUpperCase();
                        if (q.indexOf('4K') > -1 || q.indexOf('2160') > -1) {
                            metadata.quality = '4K';
                        } else if (metadata.quality !== '4K' && q.indexOf('1080') > -1) {
                            metadata.quality = 'FHD';
                        }
                    }
                });
            }
            callback(metadata);
        }, function () {
            // В случае ошибки возвращаем пустой объект, чтобы не прерывать цепочку
            callback(null);
        });
    }

    /**
     * ГЛАВНЫЙ МЕНЕДЖЕР ДАННЫХ
     * Собирает информацию из Jacred и онлайн-баз, объединяя результаты.
     */
    function resolveAllMarks(movie, callback) {
        getBestJacred(movie, function (torrentData) {
            getOnlineMetaData(movie, function (onlineData) {
                var finalData = torrentData;

                // Если онлайн-база нашла то, чего нет в торрентах, добавляем
                if (onlineData) {
                    if (onlineData.ukr) finalData.ukr = true;
                    if (onlineData.rus) finalData.rus = true;
                    
                    // Обновляем разрешение, если в онлайне оно выше
                    if (onlineData.quality === '4K') {
                        finalData.resolution = '4K';
                    } else if (finalData.resolution === 'SD' && onlineData.quality === 'FHD') {
                        finalData.resolution = 'FHD';
                    }
                }

                // Помечаем объект как не пустой, если найден хотя бы один параметр
                if (finalData.ukr || finalData.rus || finalData.eng || finalData.resolution !== 'SD') {
                    finalData.empty = false;
                }

                callback(finalData);
            });
        });
    }

    /**
     * Вспомогательный метод для получения объекта фильма из узла DOM.
     */
    function getMovieObject(node) {
        var $node = $(node);
        return node.heroMovieData || $node.data('item') || node.card_data || node.item || null;
    }

    /**
     * Извлечение числового значения рейтинга.
     */
    function getNumericRating(movie) {
        if (!movie) return 0;
        var r = movie.imdb_rating || movie.kp_rating || movie.vote_average || movie.rating || movie.rate || 0;
        var parsed = parseFloat(String(r).replace(',', '.'));
        return isNaN(parsed) ? 0 : parsed;
    }

    /**
     * СОЗДАНИЕ ВИЗУАЛЬНОЙ МЕТКИ (BADGE)
     */
    function buildBadgeElement(className, text) {
        var el = document.createElement('div');
        el.className = 'likhtar-badge likhtar-badge--' + className;
        el.textContent = text;
        return el;
    }

    /**
     * ОТРИСОВКА МЕТОК В КОНТЕЙНЕРЕ КАРТОЧКИ
     */
    function drawMarksInContainer(container, data, movie, $card) {
        container.empty();

        // Проверка глобального включения
        if (!isSettingEnabled('marks_enabled', true)) {
            return;
        }

        // 1. Секция озвучек
        if (data.ukr && isSettingEnabled('marks_ua', true)) {
            container.append(buildBadgeElement('ua', 'UA'));
        }
        if (data.rus) {
            container.append(buildBadgeElement('ru', 'RU'));
        }
        if (data.eng && isSettingEnabled('marks_en', true)) {
            container.append(buildBadgeElement('en', 'EN'));
        }

        // 2. Секция качества видео
        if (data.resolution && data.resolution !== 'SD') {
            var res = data.resolution;
            if (res === '4K' && isSettingEnabled('marks_4k', true)) {
                container.append(buildBadgeElement('4k', '4K'));
            } else if (res === 'FHD' && isSettingEnabled('marks_fhd', true)) {
                container.append(buildBadgeElement('fhd', '1080p'));
            } else if (res === 'HD' && isSettingEnabled('marks_fhd', true)) {
                container.append(buildBadgeElement('hd', '720p'));
            }
        }

        // 3. Секция технологий (HDR/Vision)
        if (isSettingEnabled('marks_hdr', true)) {
            if (data.hdr) {
                container.append(buildBadgeElement('hdr', 'HDR'));
            }
            if (data.dolbyVision) {
                // Исправлено: добавлен корректный класс для DV
                container.append(buildBadgeElement('dv', 'DV'));
            }
            if (data.atmos) {
                container.append(buildBadgeElement('atmos', 'ATMOS'));
            }
        }

        // 4. Рейтинг
        if (isSettingEnabled('marks_rating', true)) {
            var score = getNumericRating(movie);
            if (score > 0) {
                var scoreBadge = buildBadgeElement('rating', '★ ' + score.toFixed(1));
                container.append(scoreBadge);
                // Скрываем стандартный рейтинг Lampa через CSS класс
                if ($card) {
                    $card.addClass('likhtar-hide-native-rating');
                }
            }
        }
    }

    /**
     * ИНИЦИАЛИЗАЦИЯ МЕТОК НА КОНКРЕТНОЙ КАРТОЧКЕ
     */
    function applyMarksToCard(cardElement, movie) {
        var $card = $(cardElement);
        
        // Определяем место для вставки (внутри card__view или в корень)
        var targetArea = $card.find('.card__view').first();
        if (!targetArea.length) {
            targetArea = $card;
        }

        // Установка относительного позиционирования для контейнера
        if (targetArea.css('position') === 'static') {
            targetArea.css('position', 'relative');
        }

        // Поиск или создание контейнера меток
        var container = targetArea.find('.likhtar-marks-wrapper');
        if (!container.length) {
            container = $('<div class="likhtar-marks-wrapper"></div>');
            targetArea.append(container);
        }

        resolveAllMarks(movie, function (results) {
            drawMarksInContainer(container, results, movie, $card);
        });
    }

    /**
     * ОСНОВНОЙ ЦИКЛ ОБРАБОТКИ ВСЕХ КАРТОЧЕК
     */
    function scanAndProcessCards(nodes) {
        var cards;
        
        if (nodes && nodes.length) {
            var found = [];
            for (var i = 0; i < nodes.length; i++) {
                var n = nodes[i];
                if (n.nodeType !== 1) continue;
                if ($(n).hasClass('card')) found.push(n);
                var inner = n.querySelectorAll ? n.querySelectorAll('.card') : [];
                for (var j = 0; j < inner.length; j++) found.push(inner[j]);
            }
            cards = $(found).not('.likhtar-processed');
        } else {
            cards = $('.card').not('.likhtar-processed');
        }

        cards.each(function () {
            var self = $(this);
            var movieData = getMovieObject(this);
            
            // Обрабатываем только если есть ID и это не технический элемент (size)
            if (movieData && movieData.id && !movieData.size) {
                self.addClass('likhtar-processed');
                applyMarksToCard(this, movieData);
            }
        });
    }

    /**
     * ОТРИСОВКА В ПОЛНОЙ КАРТОЧКЕ (DETAIL VIEW)
     */
    function injectFullViewMarks(movie, htmlElement) {
        if (!movie || !movie.id || !htmlElement) return;
        
        var $root = $(htmlElement);
        // Находим постер в детальном описании
        var posterWrap = $root.find('.full-start__poster, .full-start-new__poster').first();
        
        if (posterWrap.length) {
            if ($root.find('.likhtar-full-container').length) return;
            
            posterWrap.css('position', 'relative');
            var fullContainer = $('<div class="likhtar-full-container"></div>');
            posterWrap.append(fullContainer);

            resolveAllMarks(movie, function (data) {
                fullContainer.empty();
                if (data.ukr) {
                    fullContainer.append('<div class="likhtar-full-badge likhtar-full-badge--ua">Українська озвучка</div>');
                }
                if (data.rus) {
                    fullContainer.append('<div class="likhtar-full-badge likhtar-full-badge--ru">Русская озвучка</div>');
                }
                if (data.resolution !== 'SD') {
                    fullContainer.append('<div class="likhtar-full-badge">' + data.resolution + ' Quality</div>');
                }
                if (data.hdr) {
                    fullContainer.append('<div class="likhtar-full-badge likhtar-full-badge--hdr">High Dynamic Range</div>');
                }
                if (data.dolbyVision) {
                    fullContainer.append('<div class="likhtar-full-badge likhtar-full-badge--dv">Dolby Vision</div>');
                }
            });
        }
    }

    /**
     * НАБЛЮДАТЕЛЬ ЗА ИЗМЕНЕНИЯМИ DOM
     * Позволяет обрабатывать карточки, которые подгружаются динамически при скролле.
     */
    function startDomObserver() {
        var timer = null;
        var pendingNodes = [];

        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (m) {
                for (var i = 0; i < m.addedNodes.length; i++) {
                    var node = m.addedNodes[i];
                    if (node.nodeType === 1) pendingNodes.push(node);
                }
            });

            if (timer) clearTimeout(timer);
            timer = setTimeout(function () {
                scanAndProcessCards(pendingNodes);
                pendingNodes = [];
                timer = null;
            }, 200);
        });

        var appRoot = document.getElementById('app') || document.body;
        observer.observe(appRoot, { 
            childList: true, 
            subtree: true 
        });

        // Первый запуск
        scanAndProcessCards();
    }

    /**
     * СЛУШАТЕЛЬ СОБЫТИЙ LAMPA
     */
    function attachLampaListeners() {
        Lampa.Listener.follow('full', function (event) {
            if (event.type === 'complite') {
                injectFullViewMarks(event.data.movie, event.object.activity.render());
            }
        });
    }

    /**
     * ОЧИСТКА И ПЕРЕЗАГРУЗКА
     */
    function resetMarks() {
        $('.likhtar-marks-wrapper, .likhtar-full-container').remove();
        $('.card').removeClass('likhtar-processed likhtar-hide-native-rating');
        scanAndProcessCards();
    }

    /**
     * РЕГИСТРАЦИЯ В МЕНЮ НАСТРОЕК
     */
    function registerModuleSettings() {
        if (window.marks_settings_init) return;
        window.marks_settings_init = true;

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { type: 'title' },
            field: { name: 'Мітки Контенту (Marks)' }
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { name: 'marks_enabled', type: 'trigger', default: true },
            field: { name: 'Відображати мітки' },
            onChange: resetMarks
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { name: 'marks_ua', type: 'trigger', default: true },
            field: { name: 'Пріоритет UA' },
            onChange: resetMarks
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { name: 'marks_4k', type: 'trigger', default: true },
            field: { name: 'Мітка 4K' },
            onChange: resetMarks
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { name: 'marks_fhd', type: 'trigger', default: true },
            field: { name: 'Мітки 1080p/720p' },
            onChange: resetMarks
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { name: 'marks_hdr', type: 'trigger', default: true },
            field: { name: 'Візуальні ефекти (HDR/DV)' },
            onChange: resetMarks
        });

        Lampa.SettingsApi.addParam({
            component: 'interface',
            param: { name: 'marks_rating', type: 'trigger', default: true },
            field: { name: 'Власний рейтинг' },
            onChange: resetMarks
        });
    }

    /**
     * ИНЪЕКЦИЯ СТИЛЕЙ (CSS)
     */
    function injectDetailedStyles() {
        if (document.getElementById('likhtar-marks-css')) return;

        var styleSheet = document.createElement('style');
        styleSheet.id = 'likhtar-marks-css';
        styleSheet.innerHTML = `
            /* Контейнер меток на карточке */
            .likhtar-marks-wrapper {
                position: absolute;
                top: 0.5em;
                left: 0.5em;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 0.25em;
                z-index: 15;
                pointer-events: none;
            }

            /* Базовый стиль метки */
            .likhtar-badge {
                padding: 0.2em 0.5em;
                font-size: 0.75em;
                font-weight: 900;
                border-radius: 0.3em;
                color: #ffffff;
                text-transform: uppercase;
                box-shadow: 0 2px 6px rgba(0,0,0,0.6);
                border: 1px solid rgba(255,255,255,0.15);
                white-space: nowrap;
                line-height: 1.2;
            }

            /* Цветовые схемы для меток */
            .likhtar-badge--ua {
                background: linear-gradient(135deg, #0056b3, #00a2ff);
                border-color: rgba(0,162,255,0.3);
            }
            .likhtar-badge--ru {
                background: linear-gradient(135deg, #222, #444);
            }
            .likhtar-badge--en {
                background: linear-gradient(135deg, #1b3a4b, #212529);
            }
            .likhtar-badge--4k {
                background: linear-gradient(135deg, #d35400, #f39c12);
            }
            .likhtar-badge--fhd {
                background: linear-gradient(135deg, #6a11cb, #2575fc);
            }
            .likhtar-badge--hd {
                background: linear-gradient(135deg, #27ae60, #2ecc71);
            }
            .likhtar-badge--hdr {
                background: linear-gradient(135deg, #8e44ad, #9b59b6);
            }
            .likhtar-badge--dv {
                background: #1a1a1a;
                color: #d4af37;
                border: 1px solid #d4af37;
            }
            .likhtar-badge--atmos {
                background: #000;
                color: #00d2ff;
                border-color: #00d2ff;
            }
            .likhtar-badge--rating {
                background: rgba(0, 0, 0, 0.85);
                color: #ffcc00;
                border-color: rgba(255, 204, 0, 0.4);
            }

            /* Стили для полной карточки */
            .likhtar-full-container {
                position: absolute;
                top: 1.5em;
                right: 1.5em;
                display: flex;
                flex-direction: column;
                gap: 0.6em;
                z-index: 100;
            }
            .likhtar-full-badge {
                background: rgba(0,0,0,0.85);
                padding: 0.5em 1em;
                border-radius: 0.5em;
                font-weight: bold;
                font-size: 0.9em;
                color: #fff;
                border: 1px solid rgba(255,255,255,0.2);
                text-align: center;
                backdrop-filter: blur(4px);
            }
            .likhtar-full-badge--ua { border-color: #00a2ff; color: #00a2ff; }
            .likhtar-full-badge--ru { border-color: #777; color: #ccc; }
            .likhtar-full-badge--hdr { border-color: #9b59b6; color: #d782ff; }
            .likhtar-full-badge--dv { border-color: #d4af37; color: #d4af37; }

            /* Скрытие стандартного рейтинга */
            .card.likhtar-hide-native-rating .card__vote {
                display: none !important;
            }
        `;
        document.head.appendChild(styleSheet);
    }

    /**
     * ТОЧКА ВХОДА
     */
    function initializePlugin() {
        console.log('Marks: Initializing extended module...');
        
        // 1. Настройки и стили
        registerModuleSettings();
        injectDetailedStyles();

        // 2. Активация наблюдателей
        startDomObserver();
        attachLampaListeners();

        // 3. Финальная перерисовка через небольшую паузу
        setTimeout(function() {
            resetMarks();
        }, 500);
    }

    // Ожидание готовности Lampa
    if (window.appready) {
        initializePlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                initializePlugin();
            }
        });
    }
})();
