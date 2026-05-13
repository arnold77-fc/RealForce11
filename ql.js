"use strict";
(function() {
    var plugin = function() {
        // Стили для единого контейнера информации как на скриншоте
        var styles = `
            <style>
                .card__info-overlay {
                    position: absolute;
                    top: 21.5em;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 0.3em 0.6em;
                    border-radius: 0.3em;
                    font-size: 0.8em;
                    font-weight: bold;
                    z-index: 10;
                    display: flex;
                    align-items: center;
                    gap: 0.4em;
                    backdrop-filter: blur(0.2em);
                    white-space: nowrap;
                }
                
                .card__info-quality {
                    color: #3b82f6;
                    font-weight: bold;
                }
                
                .card__info-divider {
                    color: rgba(255, 255, 255, 0.6);
                    font-weight: bold;
                }
                
                .card__info-rating {
                    color: #22c55e;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    gap: 0.1em;
                }
                
                .card__info-star {
                    color: #22c55e;
                    font-size: 0.9em;
                }
                
                .card__info-year {
                    color: white;
                    font-weight: bold;
                }
                
                .card__title {
                    text-align: center !important;
                }
                
                /* Скрываем только дефолтные элементы на главной */
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
        
        // Добавляем стили на страницу
        $('head').append(styles);
        
        // Функция определения качества
        function getQuality(movie) {
            // Сначала проверяем в данных фильма
            if (movie.quality) {
                var quality = movie.quality.toString().toUpperCase();
                if (quality.includes('4K') || quality.includes('UHD')) return '4K';
                if (quality.includes('1080') || quality.includes('FULLHD')) return 'FULLHD';
                if (quality.includes('720') || quality.includes('HD')) return 'HD';
                if (quality.includes('TS')) return 'TS';
                return quality;
            }
            
            // Проверяем в потоках
            if (movie.streams && movie.streams.length > 0) {
                var qualities = [];
                movie.streams.forEach(function(stream) {
                    if (stream.quality) {
                        qualities.push(stream.quality.toString().toUpperCase());
                    }
                });
                
                // Определяем наивысшее качество
                if (qualities.includes('4K') || qualities.includes('UHD')) {
                    return 'UHD';
                } else if (qualities.includes('1080') || qualities.includes('FULLHD')) {
                    return 'FULLHD';
                } else if (qualities.includes('720') || qualities.includes('HD')) {
                    return 'HD';
                } else if (qualities.includes('TS')) {
                    return 'TS';
                }
            }
            
            // Если качества нет в локальных данных, не будем показывать HD пока загрузится TMDB
            return null; // пусть TMDB определит качество
        }
        
        // Функция получения рейтинга и качества из TMDB API
        function getTmdbData(movie) {
            return new Promise(function(resolve, reject) {
                var apiKey = '4ef0d7355d9ffb5151e987764708ce96';
                var title = movie.title || movie.name || '';
                var year = movie.year || (movie.release_date ? new Date(movie.release_date).getFullYear() : '');
                var mediaType = movie.first_air_date ? 'tv' : 'movie';
                
                if (!title) {
                    resolve(null);
                    return;
                }
                
                var searchUrl = 'https://api.themoviedb.org/3/search/' + mediaType + '?api_key=' + apiKey + '&language=ru&query=' + encodeURIComponent(title) + (year ? '&year=' + year : '');
                
                fetch(searchUrl)
                    .then(function(response) {
                        if (!response.ok) {
                            throw new Error('HTTP ' + response.status);
                        }
                        return response.json();
                    })
                    .then(function(data) {
                        if (data.results && data.results.length > 0) {
                            // Ищем точное совпадение
                            var bestMatch = data.results[0];
                            var bestScore = 0;
                            
                            data.results.forEach(function(result) {
                                var score = 0;
                                
                                // Точное совпадение названия
                                if (result.title && result.title.toLowerCase() === title.toLowerCase()) {
                                    score += 10;
                                } else if (result.title && result.title.toLowerCase().includes(title.toLowerCase())) {
                                    score += 5;
                                }
                                
                                // Совпадение по году
                                if (year && result.release_date) {
                                    var resultYear = new Date(result.release_date).getFullYear();
                                    if (Math.abs(resultYear - year) <= 1) {
                                        score += 5;
                                    } else if (Math.abs(resultYear - year) <= 2) {
                                        score += 3;
                                    }
                                }
                                
                                // Учитываем популярность
                                if (result.popularity) {
                                    score += Math.min(result.popularity / 10, 2);
                                }
                                
                                if (score > bestScore) {
                                    bestScore = score;
                                    bestMatch = result;
                                }
                            });
                            
                            if (bestMatch) {
                                resolve({
                                    rating: bestMatch.vote_average ? bestMatch.vote_average.toFixed(1) : null,
                                    quality: getQualityFromTmdb(bestMatch) || 'HD',
                                    year: bestMatch.release_date ? new Date(bestMatch.release_date).getFullYear() : (bestMatch.first_air_date ? new Date(bestMatch.first_air_date).getFullYear() : year)
                                });
                            } else {
                                resolve({
                                    rating: null,
                                    quality: 'HD',
                                    year: year
                                });
                            }
                        } else {
                            resolve({
                                rating: null,
                                quality: 'HD',
                                year: year
                            });
                        }
                    })
                    .catch(function(error) {
                        console.log('TMDB API error:', error);
                        resolve({
                            rating: null,
                            quality: 'HD',
                            year: year
                        });
                    });
            });
        }
        
        // Функция определения качества из данных TMDB
        function getQualityFromTmdb(tmdbData) {
            // Проверяем наличие видео
            if (tmdbData.videos && tmdbData.videos.results) {
                var qualities = [];
                tmdbData.videos.results.forEach(function(video) {
                    if (video.type === 'Trailer') return;
                    
                    if (video.name) {
                        var name = video.name.toLowerCase();
                        if (name.includes('4k') || name.includes('2160')) {
                            qualities.push('UHD');
                        } else if (name.includes('1080')) {
                            qualities.push('FULLHD');
                        } else if (name.includes('720')) {
                            qualities.push('HD');
                        } else if (name.includes('ts')) {
                            qualities.push('TS');
                        }
                    }
                });
                
                if (qualities.includes('UHD')) return '4K';
                if (qualities.includes('FULLHD')) return 'FULLHD';
                if (qualities.includes('HD')) return 'HD';
                if (qualities.includes('TS')) return 'TS';
            }
            
            // Если качество не определено из видео, не делаем предположений по году
            return null;
        }

                
        // Функция получения года
        function getYear(movie) {
            if (movie.year) {
                return movie.year;
            }
            if (movie.release_date) {
                return new Date(movie.release_date).getFullYear();
            }
            if (movie.first_air_date) {
                return new Date(movie.first_air_date).getFullYear();
            }
            return new Date().getFullYear();
        }
        
        // Функция добавления элементов на карточку
        function addQualityInfo(card, movie) {
            if (card.find('.card__info-overlay').length > 0) return;
            
            var quality = getQuality(movie);
            var year = getYear(movie);
            
            // Создаем контейнер
            var infoContainer = $('<div class="card__info-overlay"></div>');
            
            // Добавляем качество, рейтинг и год
            infoContainer.append('<span class="card__info-quality">' + (quality || '...') + '</span>');
            infoContainer.append('<span class="card__info-divider">•</span>');
            infoContainer.append('<span class="card__info-rating"><span class="card__info-star">★</span> ...</span>');
            infoContainer.append('<span class="card__info-divider">•</span>');
            infoContainer.append('<span class="card__info-year">' + year + '</span>');
            
            if (card.css('position') === 'static') {
                card.css('position', 'relative');
            }
            
            card.append(infoContainer);
            
            // Загружаем рейтинг и качество из TMDB
            getTmdbData(movie).then(function(tmdbData) {
                if (tmdbData) {
                    var ratingElement = card.find('.card__info-rating');
                    var qualityElement = card.find('.card__info-quality');
                    var yearElement = card.find('.card__info-year');
                    
                    if (ratingElement.length > 0 && tmdbData.rating) {
                        ratingElement.html('<span class="card__info-star">★</span> ' + tmdbData.rating);
                    }
                    
                    if (qualityElement.length > 0 && tmdbData.quality) {
                        qualityElement.text(tmdbData.quality);
                    }
                    
                    if (yearElement.length > 0 && tmdbData.year) {
                        yearElement.text(tmdbData.year);
                    }
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
                    
                    // Получаем данные фильма
                    var movieData = card.data('movie') || card.data('card') || card.data('item');
                    
                    if (!movieData) {
                        // Пробуем получить из Lampa.Storage
                        var cardId = card.data('id') || card.attr('data-id');
                        if (cardId) {
                            movieData = Lampa.Storage.get('movie_' + cardId);
                        }
                    }
                    
                    if (!movieData) {
                        // Пробуем из активной activity
                        if (typeof Lampa !== 'undefined' && Lampa.Activity && Lampa.Activity.active()) {
                            var activity = Lampa.Activity.active();
                            if (activity && (activity.movie || activity.data)) {
                                movieData = activity.movie || activity.data;
                            }
                        }
                    }
                    
                    if (!movieData) {
                        // Создаем базовые данные из DOM
                        var title = card.find('.card__title, .full__title, .title').text().trim();
                        var yearText = card.find('.card__year, .year').text().trim();
                        var year = yearText ? parseInt(yearText) : '';
                        
                        if (title) {
                            movieData = {
                                title: title,
                                year: year,
                                id: card.data('id') || card.attr('data-id')
                            };
                        }
                    }
                    
                    if (movieData) {
                        addQualityInfo(card, movieData);
                    }
                });
            });
        }
        
        // Наблюдаем за изменениями в DOM
        var observer = new MutationObserver(function() {
            setTimeout(processAllCards, 100);
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Обрабатываем уже существующие карточки
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
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'ready') {
                plugin();
            }
        });
    }
})();
