"use strict";
(function() {
    var plugin = function() {
        // Стили только для плашки с качеством
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
        
        // Кэш для сохранения результатов TMDB, чтобы не спамить API при скролле
        var tmdbCache = {};
        
        // Функция определения качества из данных трейлеров TMDB
        function getQualityFromTmdbVideos(videosData) {
            if (!videosData || !videosData.results) return null;
            
            var qualities = [];
            videosData.results.forEach(function(video) {
                // Игнорируем всё, кроме официальных видео
                if (video.name) {
                    var name = video.name.toLowerCase();
                    if (name.includes('4k') || name.includes('2160')) {
                        qualities.push('4K');
                    } else if (name.includes('1080') || name.includes('fhd')) {
                        qualities.push('1080p');
                    } else if (name.includes('720')) {
                        qualities.push('720p');
                    }
                }
            });
            
            if (qualities.includes('4K')) return '4K';
            if (qualities.includes('1080p')) return '1080p';
            if (qualities.includes('720p')) return '720p';
            
            return null;
        }

        // Функция получения качества из TMDB API
        function getTmdbData(movie) {
            return new Promise(function(resolve) {
                var apiKey = '4ef0d7355d9ffb5151e987764708ce96';
                var title = movie.title || movie.name || '';
                var year = movie.year || (movie.release_date ? new Date(movie.release_date).getFullYear() : '');
                var mediaType = movie.first_air_date ? 'tv' : 'movie';
                
                if (!title) {
                    resolve(null);
                    return;
                }

                // Проверяем кэш
                var cacheKey = mediaType + '_' + title + '_' + year;
                if (tmdbCache[cacheKey]) {
                    resolve(tmdbCache[cacheKey]);
                    return;
                }
                
                // Шаг 1: Ищем фильм/сериал, чтобы получить его ID
                var searchUrl = 'https://api.themoviedb.org/3/search/' + mediaType + '?api_key=' + apiKey + '&language=ru&query=' + encodeURIComponent(title) + (year ? '&year=' + year : '');
                
                fetch(searchUrl)
                    .then(function(response) {
                        return response.json();
                    })
                    .then(function(data) {
                        if (data.results && data.results.length > 0) {
                            var bestMatch = data.results[0];
                            var id = bestMatch.id;
                            
                            // Шаг 2: Запрашиваем детали с прикрепленными видео (трейлерами)
                            var detailsUrl = 'https://api.themoviedb.org/3/' + mediaType + '/' + id + '?api_key=' + apiKey + '&append_to_response=videos';
                            
                            return fetch(detailsUrl);
                        } else {
                            throw new Error('Not found');
                        }
                    })
                    .then(function(response) {
                        return response.json();
                    })
                    .then(function(detailsData) {
                        var quality = getQualityFromTmdbVideos(detailsData.videos) || 'HD'; // Если видео нет, ставим HD
                        tmdbCache[cacheKey] = quality; // Сохраняем в кэш
                        resolve(quality);
                    })
                    .catch(function() {
                        tmdbCache[cacheKey] = 'HD';
                        resolve('HD');
                    });
            });
        }
        
        // Функция добавления элементов на карточку
        function addQualityInfo(card, movie) {
            if (card.find('.card__info-overlay').length > 0) return;
            
            // Создаем загрузочный контейнер
            var infoContainer = $('<div class="card__info-overlay">...</div>');
            
            if (card.css('position') === 'static') {
                card.css('position', 'relative');
            }
            
            card.append(infoContainer);
            
            // Запрашиваем качество из TMDB
            getTmdbData(movie).then(function(quality) {
                if (quality) {
                    infoContainer.text(quality);
                } else {
                    infoContainer.remove(); // Удаляем плашку, если качество не найдено
                }
            });
        }
        
        // Функция для обработки всех карточек на странице
        function processAllCards() {
            var cardSelectors = ['.card', '.card--movie', '.card--serial', '.card__item', '[data-card-id]'];
            
            cardSelectors.forEach(function(selector) {
                $(selector).each(function() {
                    var card = $(this);
                    if (card.find('.card__info-overlay').length > 0) return;
                    
                    var movieData = card.data('movie') || card.data('card') || card.data('item');
                    
                    // Если данных в карточке нет, собираем базовые из DOM
                    if (!movieData) {
                        var title = card.find('.card__title, .full__title, .title').text().trim();
                        var yearText = card.find('.card__year, .year').text().trim();
                        var year = yearText ? parseInt(yearText) : '';
                        
                        if (title) {
                            movieData = {
                                title: title,
                                year: year
                            };
                        }
                    }
                    
                    if (movieData) {
                        addQualityInfo(card, movieData);
                    }
                });
            });
        }
        
        // Наблюдаем за изменениями в DOM (бесконечный скролл)
        var observer = new MutationObserver(function() {
            setTimeout(processAllCards, 100);
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Первоначальный запуск
        setTimeout(processAllCards, 500);
        
        $(document).ready(function() {
            setTimeout(processAllCards, 1000);
        });
        
        if (typeof Lampa !== 'undefined') {
            Lampa.Listener.follow('complete', function() {
                setTimeout(processAllCards, 500);
            });
            
            Lampa.Listener.follow('scroll', function() {
                setTimeout(processAllCards, 200);
            });
        }
    };
    
    // Запускаем плагин когда приложение готово
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
