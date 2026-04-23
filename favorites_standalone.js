(function () {
    'use strict';

    if (window.__lampac_favs_ready__) return;
    window.__lampac_favs_ready__ = true;

    var STORAGE_KEY = 'my_local_favs_v2';

    function getFavs() { return Lampa.Storage.get(STORAGE_KEY, []); }
    function saveFavs(list) { Lampa.Storage.set(STORAGE_KEY, list); }

    // Функция отрисовки меню
    function renderMenu() {
        var items = getFavs();
        var html = '<div class="favorite-list" style="padding: 20px;">';
        if (items.length === 0) html += '<p>Список пуст</p>';
        items.forEach(function(item) {
            html += '<div class="item selector" style="padding: 10px; border-bottom: 1px solid #333;">' + item.title + '</div>';
        });
        html += '</div>';
        
        Lampa.Modal.open({
            title: 'Мои отслеживаемые',
            html: html,
            size: 'large',
            onBack: function() { Lampa.Modal.close(); }
        });
    }

    function init() {
        // 1. Кнопка в карточке фильма
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                setTimeout(function() {
                    var btn = $('<div class="full-start__button selector"><span>Отслеживать</span></div>');
                    btn.on('hover:enter', function () {
                        var list = getFavs();
                        if (!list.find(i => i.tmdb_id === e.data.id)) {
                            list.push({ tmdb_id: e.data.id, title: e.data.name || e.data.title });
                            saveFavs(list);
                            Lampa.Noty.show('Добавлено в список!');
                        } else {
                            Lampa.Noty.show('Уже добавлено!');
                        }
                    });
                    $('.full-start__buttons').append(btn);
                }, 500); // Задержка для надежности
            }
        });

        // 2. Пункт в главном меню
        Lampa.Listener.follow('menu', function (e) {
            if (e.type === 'render') {
                var menuList = $('.menu .menu__list');
                if (menuList.find('[data-action="my_favs"]').length === 0) {
                    var btn = $('<li class="menu__item selector" data-action="my_favs"><span>Мои отслеживаемые</span></li>');
                    btn.on('hover:enter', renderMenu);
                    menuList.append(btn);
                }
            }
        });
    }

    if (window.appready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') init(); });
})();
