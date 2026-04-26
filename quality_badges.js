(function () {
    'use strict';

    // Добавляем стили для бейджей на постеры
    Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') {
            $('head').append(`
                <style>
                    .poster-badge-container { position: absolute; bottom: 10px; left: 10px; display: flex; flex-direction: column; gap: 4px; z-index: 10; }
                    .poster-badge { background: rgba(0,0,0,0.7); color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; border: 1px solid #ffffff33; }
                    .badge-4k { color: #ffcc00; }
                    .badge-hdr { color: #00ccff; }
                </style>
            `);
        }
    });

    // Функция, которая ищет карточку фильма и добавляет значки
    function addBadgesToPoster(card, movieData) {
        if (card.find('.poster-badge-container').length > 0) return;

        let badges = [];
        
        // Анализируем данные, которые есть в TMDB (через movieData)
        // В некоторых случаях данные о качестве приходят в поле "video" или "original_title"
        if (movieData.title && (movieData.title.toLowerCase().includes('4k') || movieData.video)) {
            badges.push('<div class="poster-badge badge-4k">4K</div>');
        }
        
        if (badges.length > 0) {
            card.append('<div class="poster-badge-container">' + badges.join('') + '</div>');
        }
    }

    // Слушаем отрисовку карточек в Лампе
    Lampa.Listener.follow('full', function (e) {
        if (e.type == 'render') {
            let data = e.data;
            let card = $('.full-start__poster'); 
            addBadgesToPoster(card, data);
        }
    });
})();
