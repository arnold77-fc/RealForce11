/**
 * Likhtar Marks Only — плагін (Likhtar Team).
 * Додано підтримку Dolby Vision та Dolby Atmos.
 */
(function () {
    'use strict';

    if (typeof Lampa === 'undefined') return;

    function setupMarksSettings() {
        if (!Lampa.SettingsApi || !Lampa.SettingsApi.addComponent) return;

        Lampa.SettingsApi.addComponent({
            component: 'likhtar_marks',
            name: 'Мітки на постерах',
            icon: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 21h6m-3-18v1m-6.36 1.64l.7.71m12.02-.71l-.7.71M4 12H3m18 0h-1M8 12a4 4 0 108 0 4 4 0 00-8 0zm-1 5h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        });

        Lampa.SettingsApi.addParam({ component: 'likhtar_marks', param: { type: 'title' }, field: { name: 'Відображення міток на картках' } });
        Lampa.SettingsApi.addParam({ component: 'likhtar_marks', param: { name: 'likhtar_badge_ua', type: 'trigger', default: true }, field: { name: 'Українська озвучка (UA)' } });
        Lampa.SettingsApi.addParam({ component: 'likhtar_marks', param: { name: 'likhtar_badge_4k', type: 'trigger', default: true }, field: { name: 'Якість 4K' } });
        Lampa.SettingsApi.addParam({ component: 'likhtar_marks', param: { name: 'likhtar_badge_hdr', type: 'trigger', default: true }, field: { name: 'HDR' } });
        Lampa.SettingsApi.addParam({ component: 'likhtar_marks', param: { name: 'likhtar_badge_dv', type: 'trigger', default: true }, field: { name: 'Dolby Vision' } });
        Lampa.SettingsApi.addParam({ component: 'likhtar_marks', param: { name: 'likhtar_badge_atmos', type: 'trigger', default: true }, field: { name: 'Dolby Atmos' } });
    }

    function initMarksJacRed() {
        var _jacredCache = {};

        function getBestJacred(card, callback) {
            var cacheKey = 'jacred_v4_' + card.id;
            if (_jacredCache[cacheKey]) { callback(_jacredCache[cacheKey]); return; }

            var title = (card.original_title || card.title || '').toLowerCase();
            var year = (card.release_date || card.first_air_date || '').substr(0, 4);
            var apiUrl = 'https://jr.maxvol.pro/api/v1.0/torrents?search=' + encodeURIComponent(title) + '&year=' + year;

            Lampa.Reguest().silent(apiUrl, function (json) {
                var results = (json.contents ? JSON.parse(json.contents) : json) || [];
                var best = { resolution: 'SD', ukr: false, hdr: false, dv: false, atmos: false };
                
                results.forEach(function (item) {
                    var t = (item.title || '').toLowerCase();
                    if (t.includes('4k') || t.includes('2160')) best.resolution = '4K';
                    if (t.includes('ukr') || t.includes('ua')) best.ukr = true;
                    if (t.includes('hdr')) best.hdr = true;
                    if (t.includes('dolby vision') || t.includes('dv')) best.dv = true;
                    if (t.includes('atmos')) best.atmos = true;
                });
                
                best._ts = Date.now();
                _jacredCache[cacheKey] = best;
                callback(best);
            }, function() { callback(null); });
        }

        function createBadge(cssClass, label) {
            var badge = document.createElement('div');
            badge.classList.add('card__mark', 'card__mark--' + cssClass);
            badge.textContent = label;
            return badge;
        }

        function renderBadges(container, data) {
            container.empty();
            if (data.ukr && Lampa.Storage.get('likhtar_badge_ua', true)) container.append(createBadge('ua', 'UA'));
            if (data.resolution === '4K' && Lampa.Storage.get('likhtar_badge_4k', true)) container.append(createBadge('4k', '4K'));
            if (data.hdr && Lampa.Storage.get('likhtar_badge_hdr', true)) container.append(createBadge('hdr', 'HDR'));
            if (data.dv && Lampa.Storage.get('likhtar_badge_dv', true)) container.append(createBadge('dv', 'DV'));
            if (data.atmos && Lampa.Storage.get('likhtar_badge_atmos', true)) container.append(createBadge('atmos', 'Atmos'));
        }

        var style = document.createElement('style');
        style.innerHTML = `
            .card-marks { position: absolute; top: 2.7em; left: -0.2em; display: flex; flex-direction: column; gap: 0.15em; z-index: 10; pointer-events: none; }
            .card__mark { padding: 0.3em 0.4em; font-size: 0.75em; font-weight: 800; border-radius: 0.3em; border: 1px solid rgba(255,255,255,0.1); }
            .card__mark--ua { background: #1565c0; color: #fff; }
            .card__mark--4k { background: #e65100; color: #fff; }
            .card__mark--hdr { background: #fbc02d; color: #000; }
            .card__mark--dv { background: #7c4dff; color: #fff; }
            .card__mark--atmos { background: #00897b; color: #fff; }
        `;
        document.head.appendChild(style);

        var observer = new MutationObserver(function () {
            $('.card:not(.processed)').each(function () {
                var card = $(this);
                card.addClass('processed');
                var movie = card.data('item');
                if (movie) {
                    var container = $('<div class="card-marks"></div>');
                    card.find('.card__view').append(container);
                    getBestJacred(movie, function(data) { if(data) renderBadges(container, data); });
                }
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (window.appready) { setupMarksSettings(); initMarksJacRed(); }
    else { Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') { setupMarksSettings(); initMarksJacRed(); } }); }
})();
