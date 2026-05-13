(function () {
    'use strict';

    // Проверяем, что плагин ещё не инициализирован
    if (!window.qualityLabelPlugin) {
        window.qualityLabelPlugin = true;

        // Добавляем стили для качества
        var style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = `
            .selectbox-item__title {
                overflow: visible; /* Обязательно для корректного отображения */
                position: relative; /* Для правильного позиционирования */
                z-index: 1;
            }
            .quality-label {
                background: rgb(135 135 135 / 30%); /* Серый полупрозрачный фон */
                border-radius: 25px; /* Закругленные углы */
                padding: 4px 15px; /* Отступы внутри */
                margin-left: 5px; /* Отступ от названия источника */
                display: inline-block; /* Для корректного отображения */
            }
            .quality-label-4k, .quality-label-2k {
                background: linear-gradient(135deg, #ff416c, #ff4b2b); /* Яркий градиент */
                border-radius: 25px; /* Закругленные углы */
                padding: 3px 20px; /* Отступы внутри */
                margin-left: 6px; /* Отступ от названия источника */
                display: inline-block;
                color: white;
                font-weight: bold;
                box-shadow: 0 0 10px rgba(255, 75, 43, 0.5);
                animation: glow-shadow 1.5s ease-in-out infinite alternate; /* Анимация свечения */
            }
            .quality-label-fullhd {
                background: linear-gradient(135deg, #4CAF50, #45a049); /* Зеленый градиент */
                border-radius: 25px; /* Закругленные углы */
                padding: 3px 20px; /* Отступы внутри */
                margin-left: 6px; /* Отступ от названия источника */
                display: inline-block;
                color: white;
                font-weight: bold;
                box-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
            }
            @keyframes glow-shadow {
                0% {
                    box-shadow: 0 0 10px rgba(255, 75, 43, 0.5),
                                0 0 20px rgba(255, 75, 43, 0.3);
                }
                100% {
                    box-shadow: 0 0 20px rgba(255, 75, 43, 0.8),
                                0 0 30px rgba(255, 75, 43, 0.6);
                }
            }
        `;
        document.getElementsByTagName('head')[0].appendChild(style);

        // Функция для обработки качества только в блоке "Сортировать", исключая "Качество"
        function modifyQualityLabels() {
            // Ищем все блоки selectbox__content
            var selectboxContainers = document.querySelectorAll('.selectbox__content');
            if (!selectboxContainers.length) {
                console.log('QualityLabelPlugin: Контейнеры .selectbox__content не найдены');
                return false;
            }

            var foundElements = false;

            selectboxContainers.forEach(function(container) {
                // Проверяем заголовок блока
                var titleElement = container.querySelector('.selectbox__title');
                if (!titleElement) {
                    return; // Пропускаем, если нет заголовка
                }

                var title = titleElement.innerText.trim();
                console.log('QualityLabelPlugin: Найден блок с заголовком: "' + title + '"');

                // Обрабатываем только блок "Сортировать", исключая "Качество"
                if (title === 'Сортировать') {
                    console.log('QualityLabelPlugin: Обрабатываем блок "Сортировать"');
                    
                    // Ищем элементы только внутри этого контейнера
                    var qualityElements = container.querySelectorAll('.selectbox-item__title:not([data-processed])');
                    if (qualityElements.length > 0) {
                        foundElements = true;
                        console.log('QualityLabelPlugin: Найдено новых элементов в блоке "Сортировать": ' + qualityElements.length);

                        qualityElements.forEach(function (element) {
                            var text = element.innerText;
                            console.log('QualityLabelPlugin: Обрабатываем элемент: ' + text);

                            // Заменяем 2160p на 4K
                            if (text.includes('2160p')) {
                                var modifiedText = text.replace('2160p', '4K');
                                element.innerHTML = modifiedText.replace('4K', '<span class="quality-label quality-label-4k">4K</span>');
                                console.log('QualityLabelPlugin: Заменено 2160p на 4K для: ' + text);
                            }
                            // Заменяем 1440p на 2K
                            else if (text.includes('1440p')) {
                                var modifiedText = text.replace('1440p', '2K');
                                element.innerHTML = modifiedText.replace('2K', '<span class="quality-label quality-label-2k">2K</span>');
                                console.log('QualityLabelPlugin: Заменено 1440p на 2K для: ' + text);
                            }
                            // Заменяем 1080p на Full HD с зеленым фоном
                            else if (text.includes('1080p')) {
                                var modifiedText = text.replace('1080p', 'Full HD');
                                element.innerHTML = modifiedText.replace('Full HD', '<span class="quality-label quality-label-fullhd">Full HD</span>');
                                console.log('QualityLabelPlugin: Заменено 1080p на Full HD для: ' + text);
                            }
                            // Для других разрешений (720p и т.д.) добавляем серый фон
                            else if (text.match(/\d+p/)) {
                                var resolution = text.match(/\d+p/)[0];
                                element.innerHTML = text.replace(resolution, `<span class="quality-label">${resolution}</span>`);
                                console.log('QualityLabelPlugin: Добавлен стиль для разрешения ' + resolution + ' в: ' + text);
                            } else {
                                console.log('QualityLabelPlugin: Разрешение не найдено в: ' + text);
                            }

                            // Помечаем элемент как обработанный
                            element.setAttribute('data-processed', 'true');
                        });
                    }
                } else {
                    console.log('QualityLabelPlugin: Пропускаем блок "' + title + '"');
                }
            });

            if (!foundElements) {
                console.log('QualityLabelPlugin: Новые элементы для обработки не найдены');
            }

            return foundElements;
        }

        // Функция для периодической проверки и обработки
        function startPeriodicCheck() {
            let intervalId = setInterval(function () {
                modifyQualityLabels();
            }, 500); // Проверяем каждые 500 мс
            return intervalId;
        }

        // Очищаем предыдущий интервал, если он существует
        if (window.qualityLabelInterval) {
            clearInterval(window.qualityLabelInterval);
        }

        // Выполняем обработку при полной загрузке интерфейса
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                console.log('QualityLabelPlugin: Событие full:complite сработало');
                modifyQualityLabels();
                window.qualityLabelInterval = startPeriodicCheck();
            }
        });

        // Выполняем обработку при изменении активности
        Lampa.Listener.follow('activity', function (e) {
            if (e.type === 'start') {
                console.log('QualityLabelPlugin: Событие activity:start сработало');
                modifyQualityLabels();
                window.qualityLabelInterval = startPeriodicCheck();
            }
        });

        // Выполняем обработку при готовности приложения
        if (window.appready) {
            console.log('QualityLabelPlugin: Приложение уже готово, запускаем обработку');
            modifyQualityLabels();
            window.qualityLabelInterval = startPeriodicCheck();
        } else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') {
                    console.log('QualityLabelPlugin: Событие app:ready сработало');
                    modifyQualityLabels();
                    window.qualityLabelInterval = startPeriodicCheck();
                }
            });
        }
    } else {
        console.log('QualityLabelPlugin: Плагин уже инициализирован');
    }
})();
