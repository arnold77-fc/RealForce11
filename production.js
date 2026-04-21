(function () {
    'use strict';

    function TMDBStudios() {
        var _this = this;

        // Вшита SVG іконка. Адаптована під зміну кольору (currentColor) і масштабування (viewBox)
        var ICON_STUDIOS = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="currentColor"><path d="M0 0 C0.89162842 0.37125 0.89162842 0.37125 1.80126953 0.75 C19.98742322 8.48459847 30.65878444 20.14562913 38.95703125 38.1015625 C44.54173973 53.62161377 44.14343522 72.8236151 37.17041016 87.77929688 C32.28522831 97.70323269 25.89896384 106.32577712 17 113 C25.25 113.33 33.5 113.66 42 114 C42 117.63 42 121.26 42 125 C32.41122918 125.06979925 22.82254709 125.12296221 13.23357677 125.15543652 C8.78005628 125.17102993 4.32671081 125.19215126 -0.12670898 125.22631836 C-4.43205653 125.25913919 -8.73723672 125.27690046 -13.04269981 125.28463173 C-14.67758502 125.29013476 -16.31246205 125.30087976 -17.94727516 125.31719017 C-36.9443848 125.49902331 -54.02468206 120.6448634 -68.0390625 107.27929688 C-79.52061096 95.65422906 -86.15679965 80.20798589 -86.33007812 63.94580078 C-86.22135245 46.49835081 -86.22135245 46.49835081 -83 39 C-82.7525 38.40558105 -82.505 37.81116211 -82.25 37.19873047 C-74.51540153 19.01257678 -62.85437087 8.34121556 -44.8984375 0.04296875 C-31.52138909 -4.77060527 -13.18487413 -5.66432909 0 0 Z M-33.8125 13.5 C-37.37354188 17.56976215 -37.34897749 21.30649651 -37.2734375 26.49609375 C-36.7918305 30.90623783 -34.85074919 33.50065888 -31.45703125 36.25 C-27.13888623 39.09582555 -23.09451956 39.98280102 -18 39 C-13.99914111 37.55253479 -11.44888097 35.48341027 -8.5625 32.375 C-6.44491693 27.80102057 -6.32591539 23.95993123 -7 19 C-8.74174685 14.64563287 -11.90457369 11.30478537 -16 9 C-23.3775501 6.83168778 -28.09150828 8.41467403 -33.8125 13.5 Z M-68.44921875 38.4296875 C-72.60832268 43.2204032 -73.42456273 46.73769972 -73 53 C-71.10672504 58.2590971 -68.40216785 60.79008594 -64 64 C-59.94531366 65.35156211 -56.2227074 65.85381662 -52.12890625 64.28125 C-47.18030998 61.64199866 -43.81019232 58.43057695 -42 53 C-41.60319551 47.74234055 -42.10501854 44.43897158 -45 40 C-48.72671155 36.22237709 -51.92443319 34.15664655 -57.3125 33.75 C-61.95367488 34.06465592 -65.08781977 35.11359039 -68.44921875 38.4296875 Z M2.55078125 38.4296875 C-1.60832268 43.2204032 -2.42456273 46.73769972 -2 53 C-0.10672504 58.2590971 2.59783215 60.79008594 7 64 C11.66252858 65.55417619 15.48753327 65.54448802 20.125 63.875 C24.41090933 61.07984174 27.34925239 57.95224283 29 53 C29.39680449 47.74234055 28.89498146 44.43897158 26 40 C22.27328845 36.22237709 19.07556681 34.15664655 13.6875 33.75 C9.04632512 34.06465592 5.91218023 35.11359039 2.55078125 38.4296875 Z M-25.25 57.9375 C-26.11625 58.9584375 -26.11625 58.9584375 -27 60 C-25.94525335 63.69460876 -25.94525335 63.69460876 -23.125 66.0625 C-20.77383252 66.21665306 -20.77383252 66.21665306 -18.75 64.0625 C-18.1725 63.381875 -17.595 62.70125 -17 62 C-18.05474665 58.30539124 -18.05474665 58.30539124 -20.875 55.9375 C-23.22616748 55.78334694 -23.22616748 55.78334694 -25.25 57.9375 Z M-57.4375 82.625 C-59.5566208 87.20230092 -59.80023162 91.03694732 -59 96 C-56.81341387 100.37317227 -54.17345903 103.43901378 -50 106 C-43.98799313 107.45451779 -40.4956658 107.21444603 -35 104 C-30.95982603 100.04960768 -28.76370769 96.63234422 -28 91 C-28.73874557 86.12260026 -30.22521107 82.26519242 -34 79 C-42.61930449 73.25379701 -50.80851101 75.48608878 -57.4375 82.625 Z M-12.25 81.1875 C-14.8208741 85.31926195 -16.41664192 89.15294691 -15.6953125 94.08203125 C-14.02278083 99.48162425 -10.88252311 103.17378902 -6 106 C-1.70982249 107.50029783 1.33680281 107.19109071 5.6875 105.9375 C10.00908001 103.40978339 12.73012634 100.53974732 15 96 C15.53718762 91.10366692 15.52418708 87.1322441 13.4375 82.625 C9.52424457 78.41072492 5.8085724 75.82069248 -0.0625 75.5625 C-5.34571933 76.14952437 -8.44147041 77.48476289 -12.25 81.1875 Z " transform="translate(86,3)"/></svg>';

        // Локалізація
        if (Lampa.Lang) {
            Lampa.Lang.add({
                tmdb_studios: {
                    en: 'Production',
                    uk: 'Виробництво'
                }
            });
        }

        this.init = function () {
            if (!Lampa.Listener) return;

            Lampa.Listener.follow('full', function (e) {
                if (e.type == 'complite') {
                    var card = e.data.movie;
                    if (card && (card.source == 'tmdb' || e.data.source == 'tmdb') && card.id) {
                        var render = e.object.activity.render();
                        // 1. Малюємо кнопку відразу (напівпрозору)
                        _this.drawButton(render);
                        // 2. Вантажимо дані
                        _this.getStudios(render, card);
                    }
                }
            });

            // Змінені стилі: додано центрування, gap та вирівняно svg
            $('<style>').prop('type', 'text/css').html(
                '.button--studios { display: flex !important; align-items: center; justify-content: center; gap: 3px; opacity: 0.5; pointer-events: none; } ' + 
                '.button--studios.ready { opacity: 1; pointer-events: auto; } ' +
                '.button--studios svg { width: 1.5em; height: 1.5em; margin: 0 !important; }'
            ).appendTo('head');
        };

        this.drawButton = function (render) {
            var container = render.find('.full-start-new__buttons, .full-start__buttons').first();
            if (!container.length || container.find('.button--studios').length) return;

            var title = Lampa.Lang.translate('tmdb_studios');
            
            // Вставляємо безпосередньо SVG замість <img>
            var btn = $('<div class="full-start__button selector view--category button--studios">' + ICON_STUDIOS + '<span>' + title + '</span></div>');

            // Вставляємо перед кнопкою закладок/лайків
            var bookmarkBtn = container.find('.button--book, .button--like').first();
            if (bookmarkBtn.length) {
                bookmarkBtn.before(btn);
            } else {
                container.append(btn);
            }
        };

        this.getStudios = function (render, card) {
            var method = (card.original_name || card.name) ? 'tv' : 'movie';
            var url = Lampa.TMDB.api(method + '/' + card.id + '?api_key=' + Lampa.TMDB.key() + '&language=' + Lampa.Storage.get('language', 'uk'));

            $.ajax({
                url: url,
                dataType: 'json',
                success: function (resp) {
                    var studios = resp.production_companies || [];
                    if (studios.length > 0) {
                        _this.activateButton(render, studios);
                    }
                }
            });
        };

        this.activateButton = function (render, studios) {
            var btn = render.find('.button--studios');
            if (!btn.length) return; 

            // Робимо активною
            btn.addClass('ready');

            btn.off('hover:enter click').on('hover:enter click', function () {
                _this.openStudiosMenu(studios, btn, render);
            });
        };

        this.openStudiosMenu = function(studios, btnElement, renderContainer) {
            var title = Lampa.Lang.translate('tmdb_studios');

            var items = studios.map(function(s) {
                return { title: s.name, id: s.id };
            });

            Lampa.Select.show({
                title: title, 
                items: items,
                onSelect: function (selectedItem) {
                    Lampa.Activity.push({
                        url: 'movie', 
                        id: selectedItem.id,
                        title: selectedItem.title,
                        component: 'company',
                        source: 'tmdb',
                        page: 1
                    });
                },
                onBack: function() {
                    // === ПРАВИЛЬНЕ ВИПРАВЛЕННЯ ДЛЯ СВАЙПУ ===
                    // Використовуємо activity.toggle(), щоб Lampa відновила слухачі подій
                    if (Lampa.Activity.active() && Lampa.Activity.active().activity) {
                        Lampa.Activity.active().activity.toggle();
                    } else {
                        Lampa.Controller.toggle('full_start');
                    }

                    // Фокус на кнопку повертаємо ТІЛЬКИ на телевізорі (не тач)
                    if (!Lampa.Platform.is('touch')) {
                        if (btnElement && renderContainer) {
                            Lampa.Controller.collectionFocus(btnElement[0], renderContainer[0]);
                        }
                    }
                }
            });
        };
    }

    if (!window.plugin_tmdb_studios_vfinal) {
        window.plugin_tmdb_studios_vfinal = new TMDBStudios();
        window.plugin_tmdb_studios_vfinal.init();
    }
})();
