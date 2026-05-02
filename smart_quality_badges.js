(function () {
    'use strict';

    var plugin_name = 'Smart Quality Badges';

    // 1. Внедряем CSS-стили
    var css = `
    .movie-quality-badges { 
        display: flex; 
        flex-wrap: wrap; 
        gap: 10px; 
        margin-top: 15px; 
        margin-bottom: 15px;
    }
    .badge-item { 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
        padding: 5px 14px; 
        border: 1px solid rgba(255,255,255,0.3); 
        border-radius: 40px; 
        background-color: rgba(10,20,30,0.7); 
        backdrop-filter: blur(4px); 
        min-width: 65px; 
        text-align: center; 
    }
    .badge-title { 
        font-size: 15px; 
        font-weight: bold; 
        text-transform: uppercase; 
        line-height: 1.1; 
    }
    .badge-subtitle { 
        font-size: 8px; 
        font-weight: 600; 
        text-transform: uppercase; 
        letter-spacing: 1px; 
        margin-top: 2px; 
    }
    .badge-gold { border-color: rgba(255,215,0,0.5); }
    .badge-gold .badge-title, .badge-gold .badge-subtitle { color: #ffdb58; }
    .badge-light .badge-title, .badge-light .badge-subtitle { color: #e0f7fa; }
    .badge-red { border-color: rgba(255,82,82,0.5); }
    .badge-red .badge-title { color: #ff5252; }
    .badge-single-line { padding: 9px 16px; }
    `;

    $('<style>').text(css).appendTo('head');

    // 2. Отслеживаем открытие карточки фильма
    Lampa.Listener.follow('full', function (e) {
        if (e.type == 'build') {
            var targetBlock = e.html.find('.info__rate');
            if (targetBlock.length === 0) {
                targetBlock = e.html.find('.info__right');
            }

            if (targetBlock.length && e.data) {
                var movie = e.data;
                var title = (movie.title || movie.name || '').toLowerCase();
                var overview = (movie.overview || '').toLowerCase();

                // Логика автоматического определения полей
                var has4K = title.includes('4k') || title.includes('uhd') || (movie.video_quality && movie.video_quality.includes('4k'));
                var hasHDR = title.includes('hdr') || overview.includes('hdr');
                var hasDolbyVision = title.includes('dv') || title.includes('dolby vision');
                var hasDolbyAtmos = title.includes('atmos') || title.includes('dolby atmos');
                var hasRemux = title.includes('remux');

                // Формируем HTML динамически на основе совпадений
                var htmlParts = [];

                if (has4K) {
                    htmlParts.push(`
                        <div class="badge-item badge-gold">
                            <span class="badge-title">4K</span>
                            <span class="badge-subtitle">ULTRA HD</span>
                        </div>
                    `);
                }

                if (hasHDR) {
                    htmlParts.push(`
                        <div class="badge-item badge-light">
                            <span class="badge-title">HDR</span>
                            <span class="badge-subtitle">TRUE COLOR</span>
                        </div>
                    `);
                }

                if (hasDolbyVision) {
                    htmlParts.push(`
                        <div class="badge-item badge-light">
                            <span class="badge-title">DOLBY</span>
                            <span class="badge-subtitle">VISION</span>
                        </div>
                    `);
                }

                if (hasDolbyAtmos) {
                    htmlParts.push(`
                        <div class="badge-item badge-light">
                            <span class="badge-title">DOLBY</span>
                            <span class="badge-subtitle">ATMOS</span>
                        </div>
                    `);
                }

                if (hasRemux) {
                    htmlParts.push(`
                        <div class="badge-item badge-red badge-single-line">
                            <span class="badge-title">REMUX</span>
                        </div>
                    `);
                }

                // Вставляем блок, только если есть хоть одна подходящая метка
                if (htmlParts.length > 0) {
                    var badgesHtml = '<div class="movie-quality-badges">' + htmlParts.join('') + '</div>';
                    targetBlock.after($(badgesHtml));
                }
            }
        }
    });

    console.log('Lampa Plugin: Smart Quality Badges loaded successfully.');
})();
