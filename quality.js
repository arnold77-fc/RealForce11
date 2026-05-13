(function () {
    'use strict';

    function initQualityBadges() {
        // Добавляем стили только для бейджа качества
        if (!$('#lampa_quality_badges_css').length) {
            $('body').append(`
                <style id="lampa_quality_badges_css">
                    .card__badge--custom {
                        position: absolute;
                        z-index: 15;
                        padding: 0.2em 0.45em;
                        font-size: 1.1em;
                        font-weight: bold;
                        line-height: 1;
                        color: #fff;
                        opacity: 0;
                        animation: badge-fade-in 0.3s ease-out forwards;
                        font-family: Roboto, Arial, sans-serif;
                    }
                    @keyframes badge-fade-in {
                        from { opacity: 0; transform: scale(0.8); }
                        to { opacity: 1; transform: scale(1); }
                    }
                    .card__badge--quality {
                        bottom: 0 !important;
                        left: 0 !important;
                        background: rgba(51, 153, 153, 0.9) !important;
                        color: #fff !important;
                        border-radius: 0 0.8em 0 0.8em !important;
                        font-weight: bold !important;
                        text-transform: uppercase !important;
                    }
                </style>
            `);
        }

        // Вспомогательные функции из оригинального кода
        function normalizeCardForQuality(data) {
            let type = 'movie';
            if (data && (data.name || data.first_air_date || data.media_type === 'tv' || data.type === 'tv')) {
                type = 'tv';
            }
            let release_date = '';
            if (data) {
                if (typeof data.release_date === 'string' && data.release_date.length >= 4) {
                    release_date = data.release_date;
                } else if (typeof data.first_air_date === 'string' && data.first_air_date.length >= 4) {
                    release_date = data.first_air_date;
                } else if (data.year) {
                    let yearMatch = String(data.year).match(/(19|20)\d{2}/);
                    if (yearMatch) release_date = yearMatch[0] + '-01-01';
                }
            }
            return {
                title: data && (data.title || data.name || '') || '',
                original_title: data && (data.original_title || data.original_name || '') || '',
                type: type,
                release_date: release_date
            };
        }

        function estimateFallbackQuality(normalized, originalData) {
            let year = 0;
            if (normalized && normalized.release_date && normalized.release_date.length >= 4) {
                year = parseInt(normalized.release_date.substring(0, 4), 10);
            }
            if (!year || isNaN(year)) return null;
            
            if (year >= 2023) return '4K';
            if (year >= 2020) return 'FHD';
            if (year >= 2015) return 'HD';
            return 'SD';
        }

        function resolveRealQuality(cardData, callback) {
            try {
                let parserEnabled = Lampa.Storage.get('parser_use', false);
                if (!parserEnabled || !Lampa.Parser || typeof Lampa.Parser.get !== 'function') {
                    let normalized = normalizeCardForQuality(cardData);
                    callback(estimateFallbackQuality(normalized, cardData));
                    return;
                }

                let title = cardData.title || cardData.name || '';
                let year = ((cardData.first_air_date || cardData.release_date || '0000') + '').slice(0, 4);
                let searchQuery = {
                    df: cardData.original_title,
                    df_year: cardData.original_title + ' ' + year,
                    lg: title,
                    lg_year: title + ' ' + year
                }[Lampa.Storage.get('parse_lang', 'ru')] || title;

                Lampa.Parser.get({ search: searchQuery, movie: cardData, page: 1 }, function(data) {
                    if (!data || !data.Results || data.Results.length === 0) {
                        let normalized = normalizeCardForQuality(cardData);
                        callback(estimateFallbackQuality(normalized, cardData));
                        return;
                    }

                    let resolutions = new Set();
                    data.Results.forEach(function(result) {
                        if (result.ffprobe && Array.isArray(result.ffprobe)) {
                            let videoTrack = result.ffprobe.find(t => t.codec_type === 'video');
                            if (videoTrack && videoTrack.width && videoTrack.height) {
                                if (videoTrack.height >= 2160 || videoTrack.width >= 3840) resolutions.add('4K');
                                else if (videoTrack.height >= 1440 || videoTrack.width >= 2560) resolutions.add('2K');
                                else if (videoTrack.height >= 1080 || videoTrack.width >= 1920) resolutions.add('FHD');
                                else if (videoTrack.height >= 720 || videoTrack.width >= 1280) resolutions.add('HD');
                            }
                        }
                    });

                    if (resolutions.size > 0) {
                        let qualityPriority = ['4K', '2K', 'FHD', 'HD'];
                        for (let i = 0; i < qualityPriority.length; i++) {
                            if (resolutions.has(qualityPriority[i])) {
                                callback(qualityPriority[i]);
                                return;
                            }
                        }
                    }

                    let normalized = normalizeCardForQuality(cardData);
                    callback(estimateFallbackQuality(normalized, cardData));
                });
            } catch (e) {
                let normalized = normalizeCardForQuality(cardData);
                callback(estimateFallbackQuality(normalized, cardData));
            }
        }

        function addBadges(cardEl, movie) {
            if (!movie || !movie.id) return;
            let view = $(cardEl).find('.card__view');
            if (!view.length) view = $(cardEl);

            // 1. Ставим базовое качество по году мгновенно
            let normalized = normalizeCardForQuality(movie);
            let estimated = estimateFallbackQuality(normalized, movie);
            
            if (estimated) {
                let qualityBadge = $('<div>', {
                    class: 'card__badge card__badge--custom card__badge--quality',
                    text: estimated
                });
                view.append(qualityBadge);
            }

            // 2. Асинхронно уточняем через парсер
            resolveRealQuality(movie, function(realQuality) {
                if (!realQuality || !view.isConnected) return;
                
                let existingBadge = view.find('.card__badge--quality');
                if (existingBadge.length > 0) {
                    existingBadge.text(realQuality);
                } else {
                    let qualityBadge = $('<div>', {
                        class: 'card__badge card__badge--custom card__badge--quality',
                        text: realQuality
                    });
                    view.append(qualityBadge);
                }
            });
        }

        // Наблюдатель за появлением новых карточек
        function processCards() {
            $('.card:not(.quality-badge-processed)').each(function () {
                let card = $(this);
                card.addClass('quality-badge-processed');

                let movie = card.data('item') || (card[0] && (card[0].card_data || card[0].item)) || null;
                if (movie && movie.id && !movie.size) {
                    addBadges(card[0], movie);
                }
            });
        }

        let cardsObserver = new MutationObserver(function () {
            processCards();
        });
        
        cardsObserver.observe(document.body, { childList: true, subtree: true });
        processCards();
    }

    if (window.appready) {
        initQualityBadges();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initQualityBadges();
        });
    }

})();
