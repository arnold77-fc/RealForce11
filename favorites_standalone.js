(function () {
    'use strict';
    
    // Безопасная инициализация
    function startPlugin() {
        console.log('Plugin: Инициализация...');

        // 1. Добавление пункта в меню
        Lampa.Listener.follow('menu', function (e) {
            if (e.type === 'render') {
                var menuList = $('.menu .menu__list');
                if (menuList.find('[data-action="my_favs"]').length === 0) {
                    var btn = $('<li class="menu__item selector" data-action="my_favs"><div class="menu__ico"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div><div class="menu__text">Отслеживаемое</div></li>');
                    btn.on('hover:enter', function() {
                        Lampa.Noty.show('Список открыт');
                        // Здесь будет логика открытия окна
                    });
                    menuList.append(btn);
                }
            }
        });

        // 2. Добавление кнопки в карточку
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                var btn = $('<div class="full-start__button selector"><span>Отслеживать</span></div>');
                btn.on('click', function () {
                    Lampa.Noty.show('Сериал отслеживается!');
                });
                $('.full-start__buttons').append(btn);
            }
        });
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });
})();
