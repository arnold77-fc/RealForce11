(function () {
    'use strict';
    if (window.__lampac_favorites_sync__) return;
    window.__lampac_favorites_sync__ = true;

    var STORAGE_KEY = 'favorites_local_data';

    // Получение списка из памяти браузера
    function getFavorites() {
        return JSON.parse(Lampa.Storage.get(STORAGE_KEY, '[]'));
    }

    // Сохранение списка
    function saveFavorites(list) {
        Lampa.Storage.set(STORAGE_KEY, JSON.stringify(list));
    }

    // Логика добавления (вместо вызова сервера)
    function toggleFavorite(item) {
        var list = getFavorites();
        var exists = list.find(i => i.id === item.id);

        if (exists) {
            list = list.filter(i => i.id !== item.id);
            Lampa.Noty.show('Удалено из избранного');
        } else {
            list.push(item);
            Lampa.Noty.show('Добавлено в избранное');
        }
        saveFavorites(list);
    }

    // Здесь должна быть логика отрисовки (как в вашем оригинале, 
    // но запросы к /api/favorites/... заменяются на прямые вызовы Lampa.Api.tmdb)
    
    function boot() {
        console.log('Plugin Favorites Sync (Client-Only Mode) initialized');
        // Добавьте сюда функции отрисовки кнопок, использующие getFavorites()
    }

    if (window.appready) boot();
    else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') boot(); });
})();

