(function() {
    'use strict';

    /**
     * Основная логика плагина:
     * 1. Инициализация сервиса синхронизации (на основе ваших файлов)
     * 2. Внедрение визуальных элементов (бейджей) в карточки
     */
    function initPlugin() {
        console.log('Plugin: Sync and Notifications initialized');

        // Подключаем логику из ваших сервисов (favorites_sync.service / lampainit.my.loader.js)
        // Логика загрузки (эмуляция вызова инициализатора из ваших исходников)
        const initSyncService = () => {
            // Здесь выполняется инициализация методов, описанных в lampainit.my.loader.js
            // и работа с favorites_service.py через API вашего сервера
        };
        initSyncService();

        // Слушатель отрисовки карточек для добавления уведомлений
        Lampa.Listener.follow('render', function(e) {
            if (e.type === 'cards') {
                e.elements.forEach(function(card) {
                    // Проверка данных, полученных через favorites_sync.service
                    if (card.data && card.data.next_episode_info) {
                        renderBadge(card, card.data.next_episode_info);
                    }
                });
            }
        });
    }

    // Визуализация метки о выходе серии
    function renderBadge(card, info) {
        const badge = document.createElement('div');
        badge.className = 'next-episode-badge';
        badge.innerHTML = 'Скоро серия'; // Или данные из info
        
        // CSS стили для отображения поверх карточки
        badge.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px;
            background-color: #ff9800;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            z-index: 100;
        `;
        
        const cardBody = card.querySelector('.card__img') || card;
        cardBody.style.position = 'relative';
        cardBody.appendChild(badge);
    }

    // Регистрация в приложении «Лампа»
    if (window.lampa_plugins) {
        initPlugin();
    } else {
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'ready') initPlugin();
        });
    }
})();
