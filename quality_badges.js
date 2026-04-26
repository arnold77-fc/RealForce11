(function () {
    'use strict';

    // 1. Добавляем стили для красивых кнопок (цвета и дизайн)
    Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') {
            var css = `
                .lampa-q-badges { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
                .lq-badge { background: #1a1a1a; border: 1px solid #444; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; color: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.5); }
                .lq-4k { color: #ffcc00; border-color: #ffcc00; }
                .lq-hdr { color: #00ccff; border-color: #00ccff; }
                .lq-dv { color: #cc66ff; border-color: #cc66ff; }
                .lq-atmos { color: #33cc33; border-color: #33cc33; }
                .lq-remux { color: #ff3333; border-color: #ff3333; }
            `;
            $('head').append('<style>' + css + '</style>');
        }
    });

    // 2. Отслеживаем появление торрентов на экране
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                // Ищем элементы с классом torrent-item
                if (node.nodeType === 1 && $(node).hasClass('torrent-item') && !$(node).data('badges-added')) {
                    
                    var titleText = $(node).find('.torrent-item__title').text().toLowerCase();
                    var badgesHtml = '<div class="lampa-q-badges">';
                    var found = false;

                    // Проверяем наличие ключевых слов в названии файла
                    if (titleText.includes('2160p') || titleText.includes('4k')) { badgesHtml += '<div class="lq-badge lq-4k">4K ULTRA HD</div>'; found = true; }
                    if (titleText.includes('hdr')) { badgesHtml += '<div class="lq-badge lq-hdr">HDR</div>'; found = true; }
                    if (titleText.includes('dolby vision') || titleText.includes('dv')) { badgesHtml += '<div class="lq-badge lq-dv">DOLBY VISION</div>'; found = true; }
                    if (titleText.includes('atmos')) { badgesHtml += '<div class="lq-badge lq-atmos">DOLBY ATMOS</div>'; found = true; }
                    if (titleText.includes('remux')) { badgesHtml += '<div class="lq-badge lq-remux">REMUX</div>'; found = true; }
                    
                    badgesHtml += '</div>';

                    // Если нашли качество, добавляем плашки под название
                    if (found) {
                        $(node).find('.torrent-item__details').append(badgesHtml);
                    }
                    
                    // Помечаем, чтобы не добавлять дважды
                    $(node).data('badges-added', true);
                }
            });
        });
    });

    // Запускаем наблюдение за изменениями на странице
    observer.observe(document.body, { childList: true, subtree: true });

})();
