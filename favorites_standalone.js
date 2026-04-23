(function () {
    'use strict';

    if (window.__lampac_favorites_standalone__) return;
    window.__lampac_favorites_standalone__ = true;

    var STORAGE_KEY = 'my_local_favorites_list';

    // Функции работы с хранилищем
    function getFavorites() { return Lampa.Storage.get(STORAGE_KEY, []); }
    function saveFavorites(list) { Lampa.Storage.set(STORAGE_KEY, list); }

    // Проверка новых серий через API Lampa (TMDB)
    function checkNotifications() {
        var favorites = getFavorites();
        var today = new Date().toISOString().split('T')[0];

        favorites.forEach(function (item) {
            Lampa.Api.tv({ id: item.tmdb_id }, function (data) {
                if (data && data.last_episode_to_air) {
                    if (data.last_episode_to_air.air_date === today) {
                        Lampa.Noty.show('Новая серия: ' + data.name);
                    }
                }
            }, function () {});
        });
    }

    // Отображение списка в меню
    function showFavoritesList() {
        var items = getFavorites();
        var html = '<div class="favorite-list">';
        items.forEach(function(item) {
            html += '<div class="item selector" data-id="'+item.tmdb_id+'">'+item.title+'</div>';
        });
        html += '</div>';
        
        var modal = Lampa.Modal.open({
            title: 'Мои отслеживаемые',
            html: html,
            onBack: function() { Lampa.Modal.close(); }
        });
    }

    function boot() {
        // 1. Добавляем кнопку в карточку сериала
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                var btn = $('<div class="full-start__button selector"><span>Отслеживать</span></div>');
                btn.on('hover:enter', function () {
                    var list = getFavorites();
                    if (!list.find(i => i.tmdb_id === e.data.id)) {
                        list.push({ tmdb_id: e.data.id, title: e.data.name });
                        saveFavorites(list);
                        Lampa.Noty.show('Сериал добавлен в список!');
                    }
                });
                $('.full-start__buttons').append(btn);
            }
        });

        // 2. Добавляем пункт в главное меню
        Lampa.Listener.follow('menu', function (e) {
            if (e.type === 'build') {
                var btn = $('<li class="menu__item selector" data-action="my_favs"><span>Мои отслеживаемые</span></li>');
                btn.on('hover:enter', showFavoritesList);
                $('.menu .menu__list').append(btn);
            }
        });

        checkNotifications();
    }

    if (window.appready) boot();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') boot(); });
})();
