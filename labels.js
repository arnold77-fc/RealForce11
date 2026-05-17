(function () {
    'use strict';

    // Основной объект плагина
    var InterFaceMod = {
        name: 'interface_mod',
        version: '2.2.0',
        debug: false,
        settings: {
            show_movie_type: true
        }
    };

    // Функция для изменения лейблов TV и добавления лейбла ФИЛЬМ
    function changeMovieTypeLabels() {
        // Добавляем CSS стили для изменения лейблов
        var styleTag = $('<style id="movie_type_styles"></style>').html(`
            /* Базовый стиль для всех лейблов */
            .content-label {
                position: absolute !important;
                top: 0.6em !important;
                left: 0.0em !important;
                color: white !important;
                padding: 0.4em 0.4em !important;
                border-radius: 0 0.3em 0.3em 0 !important;
                font-size: 0.8em !important;
                z-index: 10 !important;
            }
            
            /* Сериал - синий */
            .serial-label {
                background-color: #3498db !important;
            }
            
            /* Фильм - зелёный */
            .movie-label {
                background-color: #e74c3c !important;
            }
            
            /* Скрываем встроенный лейбл TV только при включенной функции */
            body[data-movie-labels="on"] .card--tv .card__type {
                display: none !important;
            }
        `);
        $('head').append(styleTag);
        
        // Устанавливаем атрибут для body
        $('body').attr('data-movie-labels', InterFaceMod.settings.show_movie_type ? 'on' : 'off');
        
        // Функция для добавления лейбла к карточке
        function addLabelToCard(card) {
            if (!InterFaceMod.settings.show_movie_type) return;
            
            // Если уже есть наш лейбл, пропускаем
            if ($(card).find('.content-label').length) return;
            
            var view = $(card).find('.card__view');
            if (!view.length) return;
            
            // Определяем тип контента
            var is_tv = false;
            
            // 1. Проверяем класс карточки
            if ($(card).hasClass('card--tv')) {
                is_tv = true;
            }
            // 2. Проверяем наличие информации о сезонах/сериях
            else if ($(card).find('.card__type, .card__temp').text().match(/(сезон|серия|серии|эпизод|ТВ|TV)/i)) {
                is_tv = true;
            }
            // 3. Проверяем данные карточки
            else {
                try {
                    var cardData = $(card).data();
                    if (cardData) {
                        if (cardData.type === 'tv' || cardData.card_type === 'tv') {
                            is_tv = true;
                        }
                    }
                } catch (e) {}
            }
            
            // Создаем и добавляем лейбл
            var label = $('<div class="content-label"></div>');
            
            // Определяем тип контента
            if (is_tv) {
                label.addClass('serial-label').text('Сериал');
            } else {
                label.addClass('movie-label').text('Фильм');
            }
            
            // Добавляем лейбл
            view.append(label);
        }
        
        // Обработка всех карточек
        function processAllCards() {
            if (!InterFaceMod.settings.show_movie_type) {
                $('.content-label').remove();
                return;
            }
            
            // Находим все карточки на странице
            $('.card').each(function() {
                addLabelToCard(this);
            });
        }
        
        // Используем MutationObserver для отслеживания новых карточек
        var observer = new MutationObserver(function(mutations) {
            var needCheck = false;
            
            mutations.forEach(function(mutation) {
                // Проверяем добавленные узлы
                if (mutation.addedNodes && mutation.addedNodes.length) {
                    for (var i = 0; i < mutation.addedNodes.length; i++) {
                        var node = mutation.addedNodes[i];
                        // Если добавлен элемент карточки или элемент, содержащий карточки
                        if ($(node).hasClass('card') || $(node).find('.card').length) {
                            needCheck = true;
                            break;
                        }
                    }
                }
            });
            
            if (needCheck) {
                setTimeout(processAllCards, 100);
            }
        });
        
        // Запускаем наблюдатель
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Запускаем первичную проверку
        processAllCards();
    }

    // Функция инициализации плагина
    function startPlugin() {
        // Изменяем лейблы типа контента
        changeMovieTypeLabels();
    }

    // Ждем загрузки приложения и запускаем плагин
    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') {
                startPlugin();
            }
        });
    }

    // Экспортируем объект плагина для внешнего доступа
    window.season_info = InterFaceMod;
})();