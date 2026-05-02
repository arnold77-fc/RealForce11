(function () {
    'use strict';

    var plugin_name = 'Smart Quality Badges';

    var css = `
    .movie-quality-badges { 
        display: flex; 
        flex-wrap: wrap; 
        gap: 10px; 
        margin-top: 15px; 
        margin-bottom: 15px;
        justify-content: center;
    }
    .badge-item { 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
        padding: 6px 14px; 
        border: 1px solid rgba(255,255,255,0.3); 
        border-radius: 40px; 
        background-color: rgba(10,20,30,0.8); 
        backdrop-filter: blur(4px); 
        min-width: 65px; 
        text-align: center; 
    }
    .badge-title { 
        font-size: 14px; 
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
    .badge-single-line { padding: 10px 16px; }
    `;

    // Добавляем стили один раз
    if (!$('#smart-badges-style').length) {
        $('<style>').attr('id', 'smart-badges-style').text(css).appendTo('head');
    }

    Lampa.Listener.follow('full', function (e) {
        if (e.type == 'build') {
            // Ждем полсекунды, пока прогрузится интерфейс Lampa
            setTimeout(function () {
                var targetBlock = e.html.find('.info__rate');
                if (targetBlock.length === 0) {
                    targetBlock = e.html.find('.info__right');
                }
                // Если блок все еще не найден, используем контейнер описания
                if (targetBlock.length === 0) {
                    targetBlock = e.html.find('.full-start__body');
                }

                // Удаляем старые метки, чтобы они не дублировались
                e.html.find('.movie-quality-badges').remove();

                if (targetBlock.length && e.data) {
                    var movie = e.data;
                    var title = (movie.title || movie.name || '').toLowerCase();
                    var overview = (movie.overview || '').toLowerCase();

                    var has4K = title.includes('4k') || title.includes('uhd') || (movie.video_quality && movie.video_quality.includes('4k'));
                    var hasHDR = title.includes('hdr') || overview.includes('hdr');
                    var hasDolbyVision = title.includes('dv') || title.includes('dolby vision');
                    var hasDolbyAtmos = title.includes('atmos') || title.includes('dolby atmos');
                    var hasRemux = title.includes('remux');

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

                    if (htmlParts.length > 0) {
                        var badgesHtml = '<div class="movie-quality-badges">' + htmlParts.join('') + '</div>';
                        targetBlock.after($(badgesHtml));
                    }
                }
            }, 500); // Задержка в полсекунды
        }
    });

    console.log('Lampa Plugin: Smart Quality Badges initialized.');
})();
