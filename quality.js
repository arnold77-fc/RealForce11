(function () {
    'use strict';

    function initQualityOnly() {
        // Добавляем стили для бейджа (только качество)
        if (!$('#lampa_quality_only_css').length) {
            $('body').append(`
                <style id="lampa_quality_only_css">
                    .card__badge--quality-tag {
                        position: absolute;
                        z-index: 15;
                        left: 0;
                        bottom: 0;
                        padding: 0.25em 0.5em;
                        font-size: 1.1em;
                        font-weight: bold;
                        line-height: 1;
                        color: #fff;
                        background: rgba(51, 153, 153, 0.95);
                        border-radius: 0 0.8em 0 0.8em;
                        text-transform: uppercase;
                        font-family: Roboto, Arial, sans-serif;
                        box-shadow: 0 0 5px rgba(0,0,0,0.5);
                    }
                </style>
            `);
        }

        // Функция получения качества из объекта данных Лампы
        function getQualityText(data) {
            if (!data) return '';
            
            // Проверяем наличие качества в разных полях, где его хранит Лампа
            var quality = data.quality || data.max_quality || '';
            
            // Если качества нет в чистом виде, пробуем достать из инфо о файле (если это торрент)
            if (!quality && data.source) {
                if (data.source.indexOf('2160') > -1 || data.source.toLowerCase().indexOf('4k') > -1) quality = '4K';
                else if (data.source.indexOf('1080') > -1) quality = 'FHD';
                else if (data.source.indexOf('720') > -1) quality = 'HD';
            }

            // Если все еще пусто, проверяем по дате (логика "превью"), но только для новинок
            if (!quality && data.release_date) {
                var year = parseInt(data.release_date.split('-')[0]);
                if (year >= 2024) quality = '4K';
                else if (year >= 2020) quality = 'FHD';
                else quality = 'HD';
            }

            return quality;
        }

        function applyToCard(cardEl) {
            var $card = $(cardEl);
            if ($card.hasClass('q-added')) return;
            $card.addClass('q-added');

            var data = $card.data('item');
            if (!data) return;

            var quality = getQualityText(data);
            if (quality) {
                var view = $card.find('.card__view');
                if (view.length) {
                    // Удаляем старый, если был, и ставим новый
                    view.find('.card__badge--quality-tag').remove();
                    view.append('<div class="card__badge--quality-tag">' + quality + '</div>');
                }
            }
        }

        // Следим за появлением карточек на экране
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.addedNodes.length) {
                    $('.card').each(function () {
                        applyToCard(this);
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Запуск для уже загруженных
        $('.card').each(function () {
            applyToCard(this);
        });
    }

    // Ожидание готовности Лампы
    if (window.appready) {
        initQualityOnly();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initQualityOnly();
        });
    }
})();
