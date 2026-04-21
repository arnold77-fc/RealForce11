(function() {
    'use strict';

    /* ==========================================================================
       1. ДОПОМІЖНІ ФУНКЦІЇ ДЛЯ КОЛЬОРІВ ТА МАТЕМАТИКИ (ES5 Safe)
       ========================================================================== */
    function hexToHsl(hex) {
        var r = parseInt(hex.slice(1, 3), 16) / 255;
        var g = parseInt(hex.slice(3, 5), 16) / 255;
        var b = parseInt(hex.slice(5, 7), 16) / 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    function hslToHex(h, s, l) {
        l /= 100;
        var a = s * Math.min(l, 1 - l) / 100;
        function f(n) {
            var k = (n + h / 30) % 12;
            var color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            var hex = Math.round(255 * color).toString(16);
            return ('00' + hex).slice(-2); 
        }
        return '#' + f(0) + f(8) + f(4);
    }

    function rgbToHex(r, g, b) {
        return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
    }

    function getContrastColor(hex) {
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 140) ? '#000000' : '#ffffff';
    }

    /* ==========================================================================
       2. ПРЕСЕТИ ТА БАЗОВІ ТЕМИ
       ========================================================================== */
    var themes = {
        'default': ':root{--main-color:#ffffff}.activity__loader{position:absolute;top:0;left:0;width:100%;height:100%;display:none;background:url("data:image/svg+xml,${svgCode}") no-repeat 50% 50%}',
        'violet_stroke': ':root{--main-color:#8B29B9;--background-color:#1d1f20;--text-color:#fff;--transparent-white:rgba(255,255,255,.2)}body{background-color:#1d1f20;color:#fff}.menu__ico{color:#000;-webkit-filter:invert(1);filter:invert(1)}.activity__loader{position:absolute;top:0;left:0;width:100%;height:100%;display:none;background:url("data:image/svg+xml,${svgCode}") no-repeat 50% 50%}.modal-loading{height:6em;-webkit-background-size:contain;-moz-background-size:contain;-o-background-size:contain;background-size:contain}.console__tab.focus,.menu__item.focus,.menu__item.traverse,.menu__item.hover,.full-person.focus,.full-start__button.focus,.full-descr__tag.focus,.simple-button.focus,.head__action.focus,.head__action.hover,.player-panel .button.focus,.search-source.active{background:#8B29B9;color:#fff}.navigation-tabs__button.focus,.time-line>div,.player-panel__position,.player-panel__position>div:after{background-color:#8B29B9;color:#fff}.iptv-menu__list-item.focus,.iptv-program__timeline>div{background-color:#8B29B9!important;color:#fff!important}.radio-item.focus,.lang__selector-item.focus,.simple-keyboard .hg-button.focus,.modal__button.focus,.search-history-key.focus,.simple-keyboard-mic.focus,.torrent-serial__progress,.full-review-add.focus,.full-review.focus,.tag-count.focus,.settings-folder.focus,.settings-param.focus,.selectbox-item.focus,.selectbox-item.hover{background:#8B29B9;color:#fff}.online.focus{box-shadow:0 0 0 .2em #8B29B9}.online_modss.focus::after,.online-prestige.focus::after,.radio-item.focus .radio-item__imgbox:after,.iptv-channel.focus::before,.iptv-channel.last--focus::before{border-color:#8B29B9!important}.card-more.focus .card-more__box::after{border:.3em solid #8B29B9}.simple-button--filter>div{background-color:rgba(255,255,255,.1)}.iptv-playlist-item.focus::after,.iptv-playlist-item.hover::after{border-color:#8B29B9!important}.ad-bot.focus .ad-bot__content::after,.ad-bot.hover .ad-bot__content::after,.card-episode.focus .full-episode::after,.register.focus::after,.season-episode.focus::after,.full-episode.focus::after,.full-review-add.focus::after,.card.focus .card__view::after,.card.hover .card__view::after,.extensions__item.focus:after,.torrent-item.focus::after,.extensions__block-add.focus:after{border-color:#8B29B9}.items-line__more{background:rgba(255,255,255,.1)}.items-line__more.focus{background:#8B29B9!important;color:#fff!important}.torrent-serial__size{background-color:#fff;color:#000}.broadcast__scan>div,.broadcast__device.focus{background-color:#8B29B9;color:#fff}.card:hover .card__img,.card.focus .card__img{border-color:#8B29B9}.noty{background:#8B29B9;color:#fff}.radio-player.focus{background-color:#8B29B9;color:#fff}.explorer-card__head-img.focus::after{border:.3em solid #8B29B9}',
        'mint_dark': ':root{--main-color:#3da18d}.navigation-bar__body{background: rgba(18, 32, 36, 0.96);}.card__quality, .card--tv .card__type {background: linear-gradient(to right, #1e6262dd, #3da18ddd);}.screensaver__preload {background:url("data:image/svg+xml,${svgCode}") no-repeat 50% 50%}.activity__loader {position:absolute;top:0;left:0;width:100%;height:100%;display:none;background:url("data:image/svg+xml,${svgCode}") no-repeat 50% 50%}body, .extensions {background: linear-gradient(135deg, #0a1b2a, #1a4036);color: #ffffff;}.company-start.icon--broken .company-start__icon,.explorer-card__head-img > img,.bookmarks-folder__layer,.card-more__box,.card__img,.extensions__block-add,.extensions__item {background-color: #1e2c2f;}.search-source.focus,.simple-button.focus,.menu__item.focus,.menu__item.traverse,.menu__item.hover,.full-start__button.focus,.full-descr__tag.focus,.player-panel .button.focus,.full-person.selector.focus,.tag-count.selector.focus,.full-review.focus {background: linear-gradient(to right, #1e6262, #3da18d);color: #fff;box-shadow: 0 0.0em 0.4em rgba(61, 161, 141, 0.0);}.selectbox-item.focus,.settings-folder.focus,.settings-param.focus {background: linear-gradient(to right, #1e6262, #3da18d);color: #fff;box-shadow: 0 0.0em 0.4em rgba(61, 161, 141, 0.0);border-radius: 0.5em 0 0 0.5em;}.full-episode.focus::after,.card-episode.focus .full-episode::after,.items-cards .selector.focus::after, .card-more.focus .card-more__box::after,.card-episode.focus .full-episode::after,.card-episode.hover .full-episode::after,.card.focus .card__view::after,.card.hover .card__view::after,.torrent-item.focus::after,.online-prestige.selector.focus::after,.online-prestige--full.selector.focus::after,.explorer-card__head-img.selector.focus::after,.extensions__item.focus::after,.extensions__block-add.focus::after,.full-review-add.focus::after {border: 0.2em solid #3da18d;box-shadow: 0 0 0.8em rgba(61, 161, 141, 0.0);}.head__action.focus,.head__action.hover {background: linear-gradient(45deg, #3da18d, #1e6262);}.modal__content {background: rgba(18, 32, 36, 0.96);border: 0em solid rgba(18, 32, 36, 0.96);}.settings__content,.settings-input__content,.selectbox__content,.settings-input {background: rgba(18, 32, 36, 0.96);}.torrent-serial {background: rgba(0, 0, 0, 0.22);border: 0.2em solid rgba(0, 0, 0, 0.22);}.torrent-serial.focus {background-color: #1a3b36cc;border: 0.2em solid #3da18d;}',
        'retro': 'body{background-color: #564335;} body, .card__vote{color: #dfd9ce;} body.black--style {background: #201911;} .menu__item.focus, .menu__item.traverse, .menu__item.hover, .settings-folder.focus, .settings-param.focus, .selectbox-item.focus, .selectbox-item.hover, .full-person.focus, .full-start__button.focus, .full-descr__tag.focus, .simple-button.focus, .iptv-list__item.focus, .iptv-menu__list-item.focus, .head__action.focus, .head__action.hover, .player-panel .button.focus, .search-source.active{background: linear-gradient(to right, rgba(254,244,222,1) 1%,rgba(237,207,171,1) 100%); color: #000;} .settings-folder.focus .settings-folder__icon{filter: invert(1);} .settings-param-title > span{color: #fff;} .settings__content, .settings-input__content, .selectbox__content, .modal__content{background: linear-gradient(135deg, rgb(50,46,37) 1%,rgb(10,8,6) 100%);} .card.focus .card__view::after, .card.hover .card__view::after, .extensions__item.focus:after, .torrent-item.focus::after, .extensions__block-add.focus:after{border-color: rgb(254,244,222);} .online-prestige.focus::after, .iptv-channel.focus::before, .iptv-channel.last--focus::before{border-color: rgb(254,244,222) !important;} .time-line > div, .player-panel__position, .player-panel__position > div:after{background-color: rgb(254,244,222);} .extensions{background: #201911;} .extensions__item, .extensions__block-add{background-color: #423a32;} .torrent-item__size, .torrent-item__exe, .torrent-item__viewed, .torrent-serial__size{background-color: #dfd9ce; color: #000;} .torrent-serial{background-color: rgba(223,217,206,0.1);} .torrent-file.focus, .torrent-serial.focus{background-color: rgba(223,217,206,0.36);} .iptv-channel{background-color: #624e3f !important;} .activity__loader{position:absolute;top:0;left:0;width:100%;height:100%;display:none;background:url("data:image/svg+xml,${svgCode}") no-repeat 50% 50%}',
        'emerald': ':root{--main-color:#43cea2;--secondary-color:#185a9d;--background-color:rgba(26,42,58,.98);--text-color:#fff;--transparent-accent:rgba(67,206,162,.1)}body{background:linear-gradient(135deg,#1a2a3a 0%,#2C5364 50%,#203A43 100%);color:#fff}.menu__ico{color:#000;-webkit-filter:invert(1);filter:invert(1)}.activity__loader{position:absolute;top:0;left:0;width:100%;height:100%;display:none;background:url("data:image/svg+xml,${svgCode}") no-repeat 50% 50%}.modal-loading{height:6em;-webkit-background-size:contain;-moz-background-size:contain;-o-background-size:contain;background-size:contain}.console__tab.focus,.menu__item.focus,.menu__item.traverse,.menu__item.hover,.full-person.focus,.full-start__button.focus,.full-descr__tag.focus,.simple-button.focus,.head__action.focus,.head__action.hover,.player-panel .button.focus,.search-source.active,.navigation-tabs__button.focus,.radio-item.focus,.lang__selector-item.focus,.simple-keyboard .hg-button.focus,.modal__button.focus,.search-history-key.focus,.simple-keyboard-mic.focus,.torrent-serial__progress,.full-review-add.focus,.full-review.focus,.tag-count.focus,.settings-folder.focus,.settings-param.focus,.selectbox-item.focus,.selectbox-item.hover,.radio-player.focus,.broadcast__device.focus{background:linear-gradient(to right,#43cea2,#185a9d);color:#fff;box-shadow:0 4px 15px rgba(67,206,162,.3)}.time-line>div,.player-panel__position,.player-panel__position>div:after,.iptv-menu__list-item.focus,.iptv-program__timeline>div,.broadcast__scan>div{background-color:#43cea2;color:#fff}.card.focus .card__view::after,.card.hover .card__view::after{border:3px solid #43cea2!important;box-shadow:0 0 20px rgba(67,206,162,.4)}.online.focus{border:3px solid #43cea2!important;box-shadow:0 0 20px rgba(67,206,162,.4)}.online_modss.focus::after,.online-prestige.focus::after,.radio-item.focus .radio-item__imgbox:after,.iptv-channel.focus::before,.iptv-channel.last--focus::before,.iptv-playlist-item.focus::after,.iptv-playlist-item.hover::after,.ad-bot.focus .ad-bot__content::after,.ad-bot.hover .ad-bot__content::after,.card-episode.focus .full-episode::after,.register.focus::after,.season-episode.focus::after,.full-episode.focus::after,.full-review-add.focus::after,.extensions__item.focus:after,.torrent-item.focus::after,.extensions__block-add.focus:after,.card-more.focus .card-more__box::after,.explorer-card__head-img.focus::after{border:3px solid #43cea2!important;box-shadow:0 0 20px rgba(67,206,162,.4)}.items-line__more{background:rgba(67,206,162,.1)}.items-line__more.focus{background:linear-gradient(to right,#43cea2,#185a9d)!important;color:#fff!important;box-shadow:0 4px 15px rgba(67,206,162,.3)}.simple-button--filter>div{background-color:rgba(67,206,162,.1)}.torrent-serial__size{background-color:#fff;color:#000}.noty{background:linear-gradient(to right,#43cea2,#185a9d);color:#fff}.full-start__background{opacity:.85;filter:brightness(1.1) saturate(1.2)}.settings__content,.settings-input__content,.selectbox__content,.modal__content,.lang{background:rgba(26,42,58,.98) !important;border:1px solid rgba(67,206,162,.1) !important;box-shadow:0 0 20px rgba(67,206,162,.1) !important}'
    };

    var loaderColors = {
        default: '#fff',
        violet_stroke: '#8B29B9',
        mint_dark: '#3da18d',
        retro: '#fcf6ba',
        emerald: '#43cea2'
    };

    // ГЕНЕРАТОР БАЗОВОЇ ТЕМИ
    function generateCustomMintCSS(mainHex, svgCode) {
        var hsl = hexToHsl(mainHex);
        var secondary = hslToHex((hsl.h + 12) % 360, hsl.s + 8, hsl.l - 19);
        var bg1 = hslToHex((hsl.h + 40) % 360, 60, 10);
        var bg2 = hslToHex((hsl.h - 4 + 360) % 360, hsl.s - 3, hsl.l - 26);
        
        var modalHex = hslToHex((hsl.h + 25) % 360, 33, 11);
        var mR = parseInt(modalHex.slice(1, 3), 16);
        var mG = parseInt(modalHex.slice(3, 5), 16);
        var mB = parseInt(modalHex.slice(5, 7), 16);
        var modal = 'rgba(' + mR + ', ' + mG + ', ' + mB + ', 0.96)';

        var cardBg = hslToHex((hsl.h + 15) % 360, 21, 15);
        var txtCol = getContrastColor(mainHex);
        var iconFilter = (txtCol === '#000000') ? 'brightness(0)' : 'brightness(0) invert(1)';

        return ':root{--main-color:' + mainHex + '} .navigation-bar__body{background: ' + modal + ';}' +
               '.card__quality, .card--tv .card__type {background: linear-gradient(to right, ' + secondary + 'dd, ' + mainHex + 'dd);}' +
               '.screensaver__preload {background:url("data:image/svg+xml,' + svgCode + '") no-repeat 50% 50%}' +
               '.activity__loader {position:absolute;top:0;left:0;width:100%;height:100%;display:none;background:url("data:image/svg+xml,' + svgCode + '") no-repeat 50% 50%}' +
               'body, .extensions {background: linear-gradient(135deg, ' + bg1 + ', ' + bg2 + ');color: #ffffff;}' +
               '.company-start.icon--broken .company-start__icon,.explorer-card__head-img > img,.bookmarks-folder__layer,.card-more__box,.card__img,.extensions__block-add,.extensions__item {background-color: ' + cardBg + ';}' +
               '.search-source.focus,.simple-button.focus,.menu__item.focus,.menu__item.traverse,.menu__item.hover,.full-start__button.focus,.full-descr__tag.focus,.player-panel .button.focus,.full-person.selector.focus,.tag-count.selector.focus,.full-review.focus {background: linear-gradient(to right, ' + secondary + ', ' + mainHex + ');color: ' + txtCol + ';box-shadow: 0 0.0em 0.4em rgba(0,0,0, 0.0);}' +
               '.selectbox-item.focus,.settings-folder.focus,.settings-param.focus {background: linear-gradient(to right, ' + secondary + ', ' + mainHex + ');color: ' + txtCol + ';box-shadow: 0 0.0em 0.4em rgba(0,0,0, 0.0);border-radius: 0.5em 0 0 0.5em;}' +
               '.full-episode.focus::after,.card-episode.focus .full-episode::after,.items-cards .selector.focus::after, .card-more.focus .card-more__box::after,.card-episode.focus .full-episode::after,.card-episode.hover .full-episode::after,.card.focus .card__view::after,.card.hover .card__view::after,.torrent-item.focus::after,.online-prestige.selector.focus::after,.online-prestige--full.selector.focus::after,.explorer-card__head-img.selector.focus::after,.extensions__item.focus::after,.extensions__block-add.focus::after,.full-review-add.focus::after {border: 0.2em solid ' + mainHex + ';box-shadow: 0 0 0.8em rgba(0,0,0, 0.0);}' +
               '.head__action.focus,.head__action.hover {background: linear-gradient(45deg, ' + mainHex + ', ' + secondary + ');}' +
               '.modal__content {background: ' + modal + ';border: 0em solid ' + modal + ';}' +
               '.settings__content,.settings-input__content,.selectbox__content,.settings-input {background: ' + modal + ';}' +
               '.torrent-serial {background: rgba(0, 0, 0, 0.22);border: 0.2em solid rgba(0, 0, 0, 0.22);}' +
               '.torrent-serial.focus {background-color: ' + bg2 + 'cc;border: 0.2em solid ' + mainHex + ';}' +
               '.search-source.focus svg, .simple-button.focus svg, .menu__item.focus svg, .menu__item.traverse svg, .menu__item.hover svg, .full-start__button.focus svg, .full-descr__tag.focus svg, .player-panel .button.focus svg, .full-person.selector.focus svg, .tag-count.selector.focus svg, .full-review.focus svg, .selectbox-item.focus svg, .settings-folder.focus svg, .settings-param.focus svg { fill: ' + txtCol + '; color: ' + txtCol + '; } ' +
               '.settings-folder.focus .settings-folder__icon img { filter: ' + iconFilter + '; }';
    }

    // ДИНАМІЧНИЙ ФОКУС (Зміщення 10%, без штучних кольорів)
    function generateDynamicFocusCSS(mainHex) {
        var hsl = hexToHsl(mainHex);
        var r = parseInt(mainHex.slice(1, 3), 16);
        var g = parseInt(mainHex.slice(3, 5), 16);
        var b = parseInt(mainHex.slice(5, 7), 16);
        var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        
        var isLight = yiq >= 140;
        var txtCol = isLight ? '#000000' : '#ffffff';
        
        // Зміщення градієнта строго на 10%
        var gradL = isLight ? hsl.l - 10 : hsl.l + 10;
        gradL = Math.max(0, Math.min(100, gradL));
        var secondaryHex = hslToHex(hsl.h, hsl.s, gradL);

        // Жорстко блокуємо анімацію тексту
        var resetTransition = 'transition: background-color 0.1s ease, border-color 0.1s ease, transform 0.3s ease !important; ';

        return ':root{--main-color:' + mainHex + '} html body .full-start__button.focus, html body .player-panel .button.focus, html body .full-person.selector.focus, html body .tag-count.selector.focus, html body .full-review.focus, html body .navigation-tabs__button.focus, html body .radio-item.focus { ' +
               'background: linear-gradient(to right, ' + secondaryHex + ', ' + mainHex + ') !important; ' +
               'color: ' + txtCol + ' !important; ' +
               'border: none !important; ' + resetTransition + '} ' +
               
               'html body .full-start__button.focus svg, html body .player-panel .button.focus svg, html body .full-person.selector.focus svg, html body .tag-count.selector.focus svg, html body .full-review.focus svg, html body .navigation-tabs__button.focus svg, html body .radio-item.focus svg { ' +
               'fill: ' + txtCol + ' !important; color: ' + txtCol + ' !important; transition: none !important; } ' +
               
               'html body .full-episode.focus::after, html body .card-episode.focus .full-episode::after, html body .card.focus .card__view::after, html body .card.hover .card__view::after, html body .torrent-item.focus::after { ' +
               'border: 0.2em solid ' + mainHex + ' !important; box-shadow: none !important; } ' + 
               
               'html body .torrent-serial.focus { background-color: ' + secondaryHex + '44 !important; border: 0.2em solid ' + mainHex + ' !important; }';
    }

    window.themes_dynamic_current_hex = null;

    function applyTheme() {
        var type = Lampa.Storage.get('themes_theme_type', 'presets');
        var theme = Lampa.Storage.get('interface_theme', 'default');
        var customHex = Lampa.Storage.get('themes_custom_hex', '#3da18d');
        var isDynamicEnabled = Lampa.Storage.get('themes_dynamic_theme', false);

        var oldStyle = document.querySelector('#interface_theme_mod_style');
        if (oldStyle) oldStyle.parentNode.removeChild(oldStyle);

        var style = document.createElement('style');
        style.id = 'interface_theme_mod_style';
        
        var active = Lampa.Activity.active();
        var baseHex = (type === 'custom') ? customHex : (loaderColors[theme] || loaderColors.default);
        
        var currentThemesColor = null;
        if (isDynamicEnabled && active) {
            if (active.themes_color) {
                currentThemesColor = active.themes_color;
            } else {
                // Шукаємо ID фільму в поточної активності (працює для Торрентів та Онлайну)
                var card = active.card || active.movie;
                if (card && card.id) {
                    var cached = getCachedLogoColor(card);
                    if (cached) {
                        currentThemesColor = rgbToHex(cached.r, cached.g, cached.b);
                        active.themes_color = currentThemesColor;
                    }
                }
            }
        }

        
        var svgCode = encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="135" height="140" fill="' + (currentThemesColor || baseHex) + '"><rect width="15" height="120" y="10" rx="6"><animate attributeName="height" begin="0.5s" calcMode="linear" dur="1s" repeatCount="indefinite" values="120;110;100;90;80;70;60;50;40;140;120"/><animate attributeName="y" begin="0.5s" calcMode="linear" dur="1s" repeatCount="indefinite" values="10;15;20;25;30;35;40;45;50;0;10"/></rect><rect width="15" height="120" x="30" y="10" rx="6"><animate attributeName="height" begin="0.25s" calcMode="linear" dur="1s" repeatCount="indefinite" values="120;110;100;90;80;70;60;50;40;140;120"/><animate attributeName="y" begin="0.25s" calcMode="linear" dur="1s" repeatCount="indefinite" values="10;15;20;25;30;35;40;45;50;0;10"/></rect><rect width="15" height="140" x="60" rx="6"><animate attributeName="height" begin="0s" calcMode="linear" dur="1s" repeatCount="indefinite" values="120;110;100;90;80;70;60;50;40;140;120"/><animate attributeName="y" begin="0s" calcMode="linear" dur="1s" repeatCount="indefinite" values="10;15;20;25;30;35;40;45;50;0;10"/></rect><rect width="15" height="120" x="90" y="10" rx="6"><animate attributeName="height" begin="0.25s" calcMode="linear" dur="1s" repeatCount="indefinite" values="120;110;100;90;80;70;60;50;40;140;120"/><animate attributeName="y" begin="0.25s" calcMode="linear" dur="1s" repeatCount="indefinite" values="10;15;20;25;30;35;40;45;50;0;10"/></rect><rect width="15" height="120" x="120" y="10" rx="6"><animate attributeName="height" begin="0.5s" calcMode="linear" dur="1s" repeatCount="indefinite" values="120;110;100;90;80;70;60;50;40;140;120"/><animate attributeName="y" begin="0.5s" calcMode="linear" dur="1s" repeatCount="indefinite" values="10;15;20;25;30;35;40;45;50;0;10"/></rect></svg>'
        );

        var finalCSS = '';
        if (type === 'custom') {
            finalCSS = generateCustomMintCSS(customHex, svgCode);
        } else {
            finalCSS = (themes[theme] || themes['default']).replace(/\${svgCode}/g, svgCode);
        }

        // Застосовуємо динамічний фокус, якщо колір знайдено для цієї активності
        if (currentThemesColor) {
            finalCSS += '\n/* Dynamic Focus Overrides */\n' + generateDynamicFocusCSS(currentThemesColor);
        }


        style.textContent = finalCSS;
        document.head.appendChild(style);
    }

    /* ==========================================================================
       3. ЛОГІКА ВИТЯГУВАННЯ КОЛЬОРУ З ПОСТЕРА/ЛОГО (Новий План Б)
       ========================================================================== */
    function getCachedLogoColor(card) {
        var type = card.name ? 'tv' : 'movie';
        var id = card.id;
        var cacheKey = 'theme_color_' + type + '_' + id;
        try {
            var cache = JSON.parse(localStorage.getItem('themes_plugin_cache') || '{}');
            if (cache[cacheKey] && cache[cacheKey].timestamp > Date.now()) {
                return cache[cacheKey].data;
            }
        } catch (e) {}
        return null;
    }

    function fetchLogoColor(card, callback) {
        var tmdbKey = Lampa.Storage.get('tmdb_api_key', '');
        if (!tmdbKey || tmdbKey.trim() === '' || tmdbKey.trim() === 'c87a543116135a4120443155bf680876') {
            tmdbKey = '4ef0d7355d9ffb5151e987764708ce96';
        }

        var type = card.name ? 'tv' : 'movie';
        var id = card.id;
        var url = 'https://api.themoviedb.org/3/' + type + '/' + id + '/images?api_key=' + tmdbKey;
        
        var network = new Lampa.Reguest();
        network.silent(url, function(data) {
            if (!data || !data.logos || data.logos.length === 0) return callback(null);

            var logo = null;
            var i;
            for (i = 0; i < data.logos.length; i++) {
                if (data.logos[i].iso_639_1 === 'uk') { logo = data.logos[i]; break; }
            }
            if (!logo) {
                for (i = 0; i < data.logos.length; i++) {
                    if (data.logos[i].iso_639_1 === 'en') { logo = data.logos[i]; break; }
                }
            }
            // Якщо немає ні UK, ні EN - скасовуємо динаміку
            if (!logo || !logo.file_path) return callback(null);

            var img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = function() {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                canvas.width = img.width; canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                var imgData;
                try { imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data; } 
                catch (e) { return callback(null); }

                var buckets = {};
                var totalPixels = 0;
                var wCount = 0, wR = 0, wG = 0, wB = 0;
                var bCount = 0, bR = 0, bG = 0, bB = 0;
                var j;

                for (j = 0; j < imgData.length; j += 16) {
                    var a = imgData[j + 3];
                    if (a < 50) continue; 
                    var r = imgData[j], g = imgData[j + 1], b = imgData[j + 2];
                    totalPixels++;

                    var isWhite = r > 240 && g > 240 && b > 240;
                    var isBlack = r < 25 && g < 25 && b < 25;
                    var isGray = Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(r - b) < 15;

                    if (isWhite) { wCount++; wR += r; wG += g; wB += b; } 
                    else if (isBlack) { bCount++; bR += r; bG += g; bB += b; } 
                    else if (isGray) { /* Ігноруємо брудний сірий */ }
                    else {
                        var step = 32;
                        var key = Math.floor(r / step) + ',' + Math.floor(g / step) + ',' + Math.floor(b / step);
                        if (!buckets[key]) buckets[key] = { count: 0, r: 0, g: 0, b: 0 };
                        
                        // Розрахунок насиченості пікселя (Saturation)
                        var maxVal = Math.max(r, g, b), minVal = Math.min(r, g, b);
                        var sat = maxVal === 0 ? 0 : (maxVal - minVal) / maxVal;
                        
                        // Чим соковитіший колір, тим більше "голосів" він отримує (до 6 разів більше за білий)
                        var weight = 1 + (sat * 5); 
                        
                        buckets[key].count += weight; 
                        buckets[key].r += r * weight; 
                        buckets[key].g += g * weight; 
                        buckets[key].b += b * weight;
                    }
                }

                if (totalPixels === 0) return callback(null);

                var validBuckets = [];
                var k;

                // ФАЗА 1: Шукаємо колір >= 10%
                for (k in buckets) {
                    if ((buckets[k].count / totalPixels) * 100 >= 10) validBuckets.push(buckets[k]);
                }

                // ФАЗА 2: План Б (Синдром веселки). Якщо немає 10%, шукаємо найбільший колір >= 3%
                if (validBuckets.length === 0) {
                    var maxColorBkt = null;
                    for (k in buckets) {
                        if (!maxColorBkt || buckets[k].count > maxColorBkt.count) maxColorBkt = buckets[k];
                    }
                    if (maxColorBkt && (maxColorBkt.count / totalPixels) * 100 >= 3) {
                        validBuckets.push(maxColorBkt);
                    }
                }

                // ФАЗА 3: Якщо навіть 3% кольору немає, перевіряємо чорний та білий (>= 10%)
                if (validBuckets.length === 0) {
                    var ignoreWhite = Lampa.Storage.get('themes_dynamic_ignore_white', true);
                    var wPercent = (wCount / totalPixels) * 100;
                    var bPercent = (bCount / totalPixels) * 100;

                    if (wPercent >= 10 || bPercent >= 10) {
                        if (wPercent > bPercent) {
                            // Якщо переважає білий колір
                            if (ignoreWhite) return callback(null); 
                            validBuckets.push({ count: wCount, r: wR, g: wG, b: wB });
                        } else {
                            // Якщо переважає чорний колір
                            validBuckets.push({ count: bCount, r: bR, g: bG, b: bB });
                        }
                    }
                }

                if (validBuckets.length === 0) return callback(null);

                validBuckets.sort(function(a, b) { return b.count - a.count; });
                var best = validBuckets[0];

                // Колір береться РІВНО ТАКИМ, ЯКИМ ВІН Є
                var finalR = Math.floor(best.r / best.count);
                var finalG = Math.floor(best.g / best.count);
                var finalB = Math.floor(best.b / best.count);

                var colorData = { r: finalR, g: finalG, b: finalB };

                try {
                    var cacheKey = 'theme_color_' + type + '_' + id;
                    var cache = JSON.parse(localStorage.getItem('themes_plugin_cache') || '{}');
                    cache[cacheKey] = { data: colorData, timestamp: Date.now() + (10 * 24 * 60 * 60 * 1000) };
                    localStorage.setItem('themes_plugin_cache', JSON.stringify(cache));
                } catch (e) {}
                
                callback(colorData);
            };
            img.onerror = function() { callback(null); };
            img.src = 'https://image.tmdb.org/t/p/w300' + logo.file_path;
        }, function() { 
            callback(null); 
        });
    }

    /* ==========================================================================
       4. ГЛОБАЛЬНИЙ СЛУХАЧ АКТИВНОСТІ
       ========================================================================== */
    Lampa.Listener.follow('activity', function (e) {
        if (e.type === 'start') {
            var active = Lampa.Activity.active();
            var history = Lampa.Activity.history();
            
            // Якщо ми на головній - завжди скидаємо динамічний колір
            if (e.component === 'main') {
                if (active) active.themes_color = null;
            } 
            // Якщо колір ще не заданий, перевіряємо "спадковість"
            else if (active && !active.themes_color && history.length > 1) {
                var prev = history[history.length - 2]; // Попередня сторінка
                // Успадковуємо колір тільки якщо прийшли прямо з картки фільму (full)
                if (prev.component === 'full' && prev.themes_color) {
                    active.themes_color = prev.themes_color;
                }
            }
            
            applyTheme();
        }
    });


    Lampa.Listener.follow('full', function (e) {
        if (!Lampa.Storage.get('themes_dynamic_theme', false)) return;

        if (e.type === 'complite') {
            var card = e.data.movie || e.object || {};
            var cachedColor = getCachedLogoColor(card);
            
            var targetActivity = e.object; 
            if (cachedColor) {
                targetActivity.themes_color = rgbToHex(cachedColor.r, cachedColor.g, cachedColor.b);
                applyTheme();
            } else {
                var targetActivity = e.object;
                fetchLogoColor(card, function(colorData) {
                    if (colorData && targetActivity) {
                        targetActivity.themes_color = rgbToHex(colorData.r, colorData.g, colorData.b);
                        // Оновлюємо інтерфейс тільки якщо ця картка все ще активна на екрані
                        if (Lampa.Activity.active() === targetActivity) applyTheme();
                    }
                });

            }
        }
    });

    /* ==========================================================================
       5. НАЛАШТУВАННЯ В МЕНЮ
       ========================================================================== */
    function initPlugin() {
        Lampa.SettingsApi.addComponent({
            component: 'themes_plugin',
            name: 'Персоналізація',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3V4M12 20V21M4 12H3M21 12H20M18.364 5.636L17.6569 6.34315M6.34315 17.6569L5.63604 18.364M18.364 18.364L17.6569 17.6569M6.34315 6.34315L5.63604 5.636M12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        });

        Lampa.SettingsApi.addParam({
            component: 'themes_plugin',
            param: { name: 'themes_theme_type', type: 'select', values: { presets: 'Готові пресети', custom: 'Власний колір' }, 'default': 'presets' },
            field: { name: 'Режим оформлення', description: 'Оберіть готову тему або створіть свою' },
            onChange: function() { applyTheme(); Lampa.Settings.update(); }
        });

        Lampa.SettingsApi.addParam({
            component: 'themes_plugin',
            param: { name: 'interface_theme', type: 'select', values: { 'default': 'Стандартна', 'violet_stroke': 'Фіолетова', 'mint_dark': 'Mint Dark', 'retro': 'Ретро (Шоколад)', 'emerald': 'Emerald' }, 'default': 'default' },
            field: { name: 'Пресети тем', description: 'Оберіть одну з підготовлених тем' },
            onChange: function() { applyTheme(); }
        });

        Lampa.SettingsApi.addParam({
            component: 'themes_plugin',
            param: { name: 'themes_custom_hex', type: 'input', values: '', 'default': '#3da18d' },
            field: { name: 'Власний HEX колір', description: 'Введіть колір у форматі #RRGGBB' },
            onChange: function() { applyTheme(); }
        });

        Lampa.SettingsApi.addParam({
            component: 'themes_plugin',
            param: { name: 'themes_dynamic_theme', type: 'trigger', values: '', 'default': false },
            field: { name: 'Динамічна тема в картці фільму', description: 'Підлаштовує кнопки під колір логотипу' },
            onChange: function(val) {
                var ignoreItem = $('div[data-name="themes_dynamic_ignore_white"]');
                if (val) ignoreItem.show(); else ignoreItem.hide();
                if (!val && window.themes_dynamic_current_hex) {
                    window.themes_dynamic_current_hex = null;
                    applyTheme();
                }
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'themes_plugin',
            param: { name: 'themes_dynamic_ignore_white', type: 'trigger', values: '', 'default': true },
            field: { name: 'Ігнорувати білі логотипи', description: 'Якщо логотип білий, залишати обрану вище базову тему' },
            onChange: function() { applyTheme(); },
            onRender: function(item) {
                setTimeout(function() {
                    if (!Lampa.Storage.get('themes_dynamic_theme', false)) item.hide();
                }, 10);
            }
        });

        applyTheme();
    }

    if (window.appready) initPlugin();
    else Lampa.Listener.follow('app', function(e) { if (e.type === 'ready') initPlugin(); });
})();
