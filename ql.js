"use strict";
(function() {
    var plugin = function() {
        // Оставляем стили только для плашки с качеством
        var styles = `
            <style>
                .card__info-overlay {
                    position: absolute;
                    top: 21.5em;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.8);
                    color: #3b82f6; /* Синий цвет текста качества */
                    padding: 0.3em 0.6em;
                    border-radius: 0.3em;
                    font-size: 0.8em;
                    font-weight: bold;
                    z-index: 10;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(0.2em);
                    white-space: nowrap;
                }
                
                .card__title {
                    text-align: center !important;
                }
                
                /* Скрываем дефолтные элементы на главной */
                .card__vote,
                .card__rating,
                .card__year,
                .card__data,
                .card__info,
                .card .year,
                .card .card__year,
                .card__footer,
                .card__bottom,
                .card__meta,
                .card__age,
                .card__type {
                    display: none !important;
                }
            </style>
        `;
        
        $('head').append(styles);
        
        // Функция для извлечения реального качества из данных Lampa
        function getQuality(movie) {
            var q = movie.quality || movie.rip || movie.source_quality;
            
            // Если в корне нет, проверяем внутри потоков (если они уже спарсены)
            if (!q && movie.streams && movie.streams.length > 0) {
                var qualities = movie.streams.map(function(s) { 
                    return (s.quality || '').toString().toUpperCase(); 
                });
                
                if (qualities.some(function(x) { return x.includes('4K') || x.includes('UHD') || x.includes('2160'); })) q = '4K';
                else if (qualities.some(function(x) { return x.includes('1080') || x.includes('FHD') || x.includes('FULLHD'); })) q = '1080p';
                else if (qualities.some(function(x) { return x.includes('720') || x.includes('HD'); })) q = '720p';
                else if (qualities.some(function(x) { return x.includes('TS') || x.includes('CAM'); })) q = 'TS';
            }
            
            // Форматируем вывод
            if (q) {
                var qualityStr = q.toString().toUpperCase();
                if (qualityStr.includes('4K') || qualityStr.includes('UHD') || qualityStr.includes('2160')) return '4K';
                if (qualityStr.includes('1080') || qualityStr.includes('FULLHD') || qualityStr.includes('FHD')) return '1080p';
                if (qualityStr.includes('720') || qualityStr.includes('HD')) return '720p';
                if (qualityStr.includes('TS') || qualityStr.includes('CAM')) return 'TS';
                return qualityStr; // Возвращаем как есть (например, WEB-DL), если не подошло под стандарты
            }
            
            return null; // Если качество неизвестно, возвращаем null
        }
        
        // Функция добавления плашки
        function addQualityInfo(card, movie) {
            // Если плашка уже есть - пропускаем
            if (card.find('.card__info-overlay').length > 0) return;
            
            var quality = getQuality(movie);
            
            // Если реальное качество неизвестно, НЕ выводим плашку вообще
            if (!quality) return;
            
            // Создаем контейнер ТОЛЬКО с качеством
            var infoContainer = $('<div class="card__info-overlay"></div>');
            infoContainer.text(quality);
            
            if (card.css('position') === 'static') {
                card.css('position', 'relative');
            }
            
            card.append(infoContainer);
        }
        
        // Обработка карточек на странице
        function processAllCards() {
            var cardSelectors = ['.card', '.card--movie', '.card--serial', '.card__item', '[data-card-id]'];
            
            cardSelectors.forEach(function(selector) {
                $(selector).each(function() {
                    var card = $(this);
                    if (card.find('.card__info-overlay').length > 0) return;
                    
                    var movieData = card.data('movie') || card.data('card') || card.data('item');
                    
                    if (!movieData) {
                        var cardId = card.data('id') || card.attr('data-id');
                        if (cardId && typeof Lampa !== 'undefined' && Lampa.Storage) {
                            movieData = Lampa.Storage.get('movie_' + cardId);
                        }
                    }
                    
                    if (!movieData && typeof Lampa !== 'undefined' && Lampa.Activity && Lampa.Activity.active()) {
                        var activity = Lampa.Activity.active();
                        if (activity && (activity.movie || activity.data)) {
                            movieData = activity.movie || activity.data;
                        }
                    }
                    
                    if (movieData) {
                        addQualityInfo(card, movieData);
                    }
                });
            });
        }
        
        // Наблюдатель за DOM (бесконечный скролл, новые страницы)
        var observer = new MutationObserver(function() {
            setTimeout(processAllCards, 100);
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Первичные запуски
        setTimeout(processAllCards, 500);
        
        $(document).ready(function() {
            setTimeout(processAllCards, 1000);
        });
        
        if (typeof Lampa !== 'undefined' && Lampa.Listener) {
            Lampa.Listener.follow('complete', function() {
                setTimeout(processAllCards, 500);
            });
            
            Lampa.Listener.follow('scroll', function() {
                setTimeout(processAllCards, 200);
            });
        }
    };
    
    // Инициализация при старте Lampa
    if (window.appready) {
        plugin();
    } else {
        if (typeof Lampa !== 'undefined' && Lampa.Listener) {
            Lampa.Listener.follow('app', function(e) {
                if (e.type === 'ready') {
                    plugin();
                }
            });
        }
    }
})();
