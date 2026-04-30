/*
 * Plugin: Extra Title
 * Original creator: @yaroslav_films
 * Edited by: @bodya_elven
 */
(function () {
    "use strict";

    function startPlugin() {
        var CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 днів
        var CACHE_KEY = "title_cache_extra_v6";
        var titleCache = Lampa.Storage.get(CACHE_KEY) || {};

        // 1. Очищення старого кешу
        function cleanOldCache() {
            var now = Date.now();
            var keys = Object.keys(titleCache);
            var changed = false;
            keys.forEach(function(key) {
                if (now - titleCache[key].timestamp > CACHE_TTL) {
                    delete titleCache[key];
                    changed = true;
                }
            });
            if (changed) Lampa.Storage.set(CACHE_KEY, titleCache);
        }
        cleanOldCache();

        // 2. Локалізація (Тільки українська, для всіх інших - англійська)
        Lampa.Lang.add({
            extra_title_menu: { uk: "Додаткова назва", en: "Extra Title" },
            extra_title_desc: { uk: "Налаштування відображення назви, року та країни", en: "Settings for displaying title, year and country" },
            extra_title_mode: { uk: "Режим відображення", en: "Display Mode" },
            extra_title_size: { uk: "Розмір назви", en: "Title Size" },
            extra_title_info: { uk: "Додаткова інформація", en: "Additional Info" },
            extra_title_info_country: { uk: "Тільки країна", en: "Only country" },
            extra_title_info_year: { uk: "Тільки рік", en: "Only year" },
            extra_title_info_both: { uk: "Рік та країна", en: "Year and country" }
        });

        // 3. Стилі (Applecation-стайл)
        if ($('#plugin-extra-title-style').length === 0) {
            var style = '<style id="plugin-extra-title-style">' +
                '.plugin-extra-title { margin-top: 10px; margin-bottom: 5px; width: 100%; position: relative; z-index: 10; text-align: left; }' +
                '.plugin-extra-title__body { ' +
                    'font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif; ' +
                    'line-height: 1.2; letter-spacing: 0.3px; ' +
                    'text-shadow: 0px 2px 5px rgba(0, 0, 0, 0.6); ' +
                    'display: flex; align-items: baseline; flex-wrap: wrap; justify-content: flex-start; ' +
                '}' +
                '@media screen and (orientation: portrait), screen and (max-width: 767px) {' +
                    '.plugin-extra-title { text-align: center !important; }' +
                    '.plugin-extra-title__body { justify-content: center !important; }' +
                '}' +
            '</style>';
            $('head').append(style);
        }

        var SETTINGS_COMPONENT = "extra_title_settings";
        var isUK = Lampa.Storage.get('language') === 'uk';

        // Інтеграція в меню налаштувань
        Lampa.Settings.listener.follow("open", function (e) {
            if (e.name == "main") {
                var render = Lampa.Settings.main().render();
                if (render.find('[data-component="' + SETTINGS_COMPONENT + '"]').length == 0) {
                    Lampa.SettingsApi.addComponent({
                        component: SETTINGS_COMPONENT,
                        name: Lampa.Lang.translate('extra_title_menu')
                    });
                }
                Lampa.Settings.main().update();
                render.find('[data-component="' + SETTINGS_COMPONENT + '"]').addClass("hide");
            }
        });

        // Створення кнопки в розділі "Інтерфейс" з підміною логіки повернення
        Lampa.SettingsApi.addParam({
            component: "interface",
            param: { name: "extra_title_entry", type: "static" },
            field: { name: Lampa.Lang.translate('extra_title_menu'), description: Lampa.Lang.translate('extra_title_desc') },
            onRender: function (item) {
                item.on("hover:enter", function () {
                    Lampa.Settings.create(SETTINGS_COMPONENT);
                    Lampa.Controller.enabled().controller.back = function () {
                        Lampa.Settings.create("interface");
                    };
                });
            }
        });

        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: {
                name: "extra_title_mode",
                type: "select",
                values: {
                    'smart': isUK ? 'Залежно від лого' : 'Depending on logo',
                    'always_ua': isUK ? 'Завжди локальна' : 'Always localized'
                },
                default: 'smart'
            },
            field: { name: Lampa.Lang.translate('extra_title_mode'), description: "" }
        });

        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: {
                name: "extra_title_info",
                type: "select",
                values: {
                    'both': Lampa.Lang.translate('extra_title_info_both'),
                    'year': Lampa.Lang.translate('extra_title_info_year'),
                    'country': Lampa.Lang.translate('extra_title_info_country')
                },
                default: 'both'
            },
            field: { name: Lampa.Lang.translate('extra_title_info'), description: "" }
        });

        Lampa.SettingsApi.addParam({
            component: SETTINGS_COMPONENT,
            param: {
                name: "extra_title_size",
                type: "select",
                values: {
                    'xs': isUK ? 'Дуже малий' : 'Very small',
                    's': isUK ? 'Малий' : 'Small',
                    'm': isUK ? 'Нормальний' : 'Normal',
                    'l': isUK ? 'Великий' : 'Large',
                    'xl': isUK ? 'Дуже великий' : 'Very large',
                    'xxl': isUK ? 'Максимальний' : 'Max'
                },
                default: 'm'
            },
            field: { name: Lampa.Lang.translate('extra_title_size'), description: "" }
        });

        var countryNames = {
            'us': 'США', 'usa': 'США', 'gb': 'Велика Британія', 'uk': 'Велика Британія',
            'ua': 'Україна', 'ca': 'Канада', 'hk': 'Гонконг', 'fr': 'Франція',
            'de': 'Німеччина', 'it': 'Італія', 'es': 'Іспанія', 'jp': 'Японія',
            'kr': 'Південна Корея', 'cn': 'Китай', 'pl': 'Польща', 'au': 'Австралія',
            'ie': 'Ірландія', 'be': 'Бельгія', 'dk': 'Данія', 'no': 'Норвегія',
            'se': 'Швеція', 'fi': 'Фінляндія', 'tr': 'Туреччина', 'in': 'Індія',
            'br': 'Бразилія', 'mx': 'Мексика', 'nl': 'Нідерланди', 'at': 'Австрія',
            'ch': 'Швейцарія', 'cz': 'Чехія', 'hu': 'Угорщина', 'nz': 'Нова Зеландія',
            'za': 'ПАР', 'il': 'Ізраїль', 'th': 'Таїланд', 'tw': 'Тайвань', 
            'ru': 'Країна-агресор', 'pt': 'Португалія', 'gr': 'Греція',
            'is': 'Ісландія', 'ro': 'Румунія', 'bg': 'Болгарія',
            'ar': 'Аргентина', 'cl': 'Чилі', 'co': 'Колумбія', 'pe': 'Перу',
            'id': 'Індонезія', 'my': 'Малайзія', 'ph': 'Філіппіни', 'sg': 'Сінгапур',
            'vn': 'В\'єтнам', 'ae': 'ОАЕ', 'sa': 'Саудівська Аравія', 'eg': 'Єгипет'
        };

        function getCountryUA(iso) {
            if (!iso) return '';
            var code = iso.toLowerCase().trim();
            if (!isUK) return Lampa.Lang.translate(code) || iso;
            return countryNames[code] || Lampa.Lang.translate(code) || iso; 
        }

        function renderTitle(ukTitle, enTitle, hasLogo, year, country, activityRender) {
            if (!activityRender || !activityRender.parent().length) return;

            $(".plugin-extra-title", activityRender).remove();

            var mode = Lampa.Storage.get('extra_title_mode', 'smart');
            var sizeKey = Lampa.Storage.get('extra_title_size', 'm');
            var infoMode = Lampa.Storage.get('extra_title_info', 'both');

            var displayTitle = (mode === 'smart' && hasLogo) ? enTitle : ukTitle;
            if (!displayTitle || displayTitle === "undefined") displayTitle = "";

            var sizes = {
                'xs': { title: '1.0em', info: '0.8em' },
                's':  { title: '1.2em', info: '0.9em' },
                'm':  { title: '1.4em', info: '1.0em' },
                'l':  { title: '1.6em', info: '1.1em' },
                'xl': { title: '1.8em', info: '1.2em' },
                'xxl':{ title: '2.0em', info: '1.3em' }
            };
            var currentSize = sizes[sizeKey] || sizes['m'];

            var infoParts = [];
            if ((infoMode === 'year' || infoMode === 'both') && year && year !== "undefined") {
                infoParts.push(year);
            }
            if ((infoMode === 'country' || infoMode === 'both') && country && country !== "undefined") {
                infoParts.push(country);
            }
            var secondaryInfo = infoParts.join(' &middot; ');

            var infoSpan = '';
            if (secondaryInfo) {
                var separator = displayTitle ? ' &nbsp;&middot;&nbsp; ' : '';
                infoSpan = '<span style="font-size: ' + currentSize.info + '; color: #fff; font-weight: 400; margin-left: 4px;">' + separator + secondaryInfo + '</span>';
            }

            var html = '<div class="plugin-extra-title">' +
                '<div class="plugin-extra-title__body">' +
                    '<span style="font-size: ' + currentSize.title + '; color: #fff; font-weight: 600;">' + displayTitle + '</span>' + 
                    infoSpan +
                '</div>' +
           '</div>';

            var target = $(".full-start-new__title", activityRender);
            if (!target.length) target = $(".full-start__title", activityRender);
            target.after(html);
        }

        function checkLogoAndRender(card, activityRender) {
            var cached = titleCache[card.id];
            var now = Date.now();

            if (cached && (now - cached.timestamp < CACHE_TTL)) {
                renderTitle(cached.ukTitle, cached.enTitle, cached.hasLogo, cached.year, cached.country, activityRender);
                return;
            }

            var type = card.first_air_date ? "tv" : "movie";
            var url = "https://api.themoviedb.org/3/" + type + "/" + card.id + "?api_key=" + Lampa.TMDB.key() + "&append_to_response=translations,images&include_image_language=uk,en,null";

            $.getJSON(url, function (data) {
                var hasUkrainianLogo = false;
                if (data.images && data.images.logos) {
                    hasUkrainianLogo = data.images.logos.some(function (l) {
                        return l.iso_639_1 === "uk"; // Повернуто сувору перевірку виключно на українське лого
                    });
                }

                var originalName = data.original_title || data.original_name || card.original_title || card.original_name || "";
                var enTitle = data.title || data.name || originalName;
                var ukTitle = enTitle;

                if (data.translations && data.translations.translations) {
                    var translation = data.translations.translations.find(function (t) {
                        return t.iso_3166_1 === "UA" || t.iso_639_1 === "uk";
                    });
                    if (translation) {
                        ukTitle = translation.data.title || translation.data.name || enTitle;
                    }
                }

                var dateStr = data.release_date || data.first_air_date || "";
                var year = dateStr ? dateStr.split("-")[0] : "";
                
                var countryList = (data.production_countries || []).map(function (c) {
                    return getCountryUA(c.iso_3166_1);
                });
                var countryString = countryList.join(", "); 

                titleCache[card.id] = {
                    ukTitle: ukTitle || "",
                    enTitle: enTitle || "",
                    hasLogo: hasUkrainianLogo,
                    year: year || "",
                    country: countryString || "",
                    timestamp: now
                };
                Lampa.Storage.set(CACHE_KEY, titleCache);

                renderTitle(ukTitle, enTitle, hasUkrainianLogo, year, countryString, activityRender);
            }).fail(function() {
                var fallbackTitle = card.title || card.name || card.original_title || "";
                renderTitle(fallbackTitle, fallbackTitle, false, "", "", activityRender);
            });
        }

        if (!window.extra_title_plugin_loaded) {
            window.extra_title_plugin_loaded = true;
            Lampa.Listener.follow("full", function (e) {
                if (e.type === "complite" && e.data && e.data.movie) {
                    var activityRender = e.object && e.object.activity ? e.object.activity.render() : Lampa.Activity.active().activity.render();
                    checkLogoAndRender(e.data.movie, activityRender);
                }
            });
        }
    }

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow("app", function (e) {
            if (e.type === "ready") startPlugin();
        });
    }
})();
