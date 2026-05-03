(function () {
    'use strict';

    /**
     * Анализирует качество контента из данных ffprobe
     * Извлекает информацию о разрешении, HDR, Dolby Vision, аудио каналах
     */
    function analyzeContentQuality(ffprobe) {
        if (!ffprobe || !Array.isArray(ffprobe)) return null;

        const quality = {
            resolution: null,
            hdr: false,
            dolbyVision: false,
            audio: null
        };

        // Анализ видео потока
        const video = ffprobe.find(stream => stream.codec_type === 'video');
        if (video) {
            // Разрешение
            if (video.width && video.height) {
                quality.resolution = `${video.width}x${video.height}`;
                
                // Определяем метки качества
                if (video.height >= 2160 || video.width >= 3840) {
                    quality.resolutionLabel = '4K';
                } else if (video.height >= 1440 || video.width >= 2560) {
                    quality.resolutionLabel = '2K';
                } else if (video.height >= 1080 || video.width >= 1920) {
                    quality.resolutionLabel = 'FULL HD';
                } else if (video.height >= 720 || video.width >= 1280) {
                    quality.resolutionLabel = 'HD';
                }
            }

            // HDR определяется через side_data_list или color_transfer
            if (video.side_data_list) {
                const hasMasteringDisplay = video.side_data_list.some(data => 
                    data.side_data_type === 'Mastering display metadata'
                );
                const hasContentLight = video.side_data_list.some(data => 
                    data.side_data_type === 'Content light level metadata'
                );
                const hasDolbyVision = video.side_data_list.some(data => 
                    data.side_data_type === 'DOVI configuration record' ||
                    data.side_data_type === 'Dolby Vision RPU'
                );

                if (hasDolbyVision) {
                    quality.dolbyVision = true;
                    quality.hdr = true;
                } else if (hasMasteringDisplay || hasContentLight) {
                    quality.hdr = true;
                }
            }

            if (!quality.hdr && video.color_transfer) {
                const hdrTransfers = ['smpte2084', 'arib-std-b67'];
                if (hdrTransfers.includes(video.color_transfer.toLowerCase())) {
                    quality.hdr = true;
                }
            }

            if (!quality.dolbyVision && video.codec_name) {
                if (video.codec_name.toLowerCase().includes('dovi') || 
                    video.codec_name.toLowerCase().includes('dolby')) {
                    quality.dolbyVision = true;
                    quality.hdr = true;
                }
            }
        }

        // Анализ аудио потоков
        const audioStreams = ffprobe.filter(stream => stream.codec_type === 'audio');
        let maxChannels = 0;
        
        audioStreams.forEach(audio => {
            if (audio.channels && audio.channels > maxChannels) {
                maxChannels = audio.channels;
            }
        });

        if (maxChannels >= 8) {
            quality.audio = '7.1';
        } else if (maxChannels >= 6) {
            quality.audio = '5.1';
        } else if (maxChannels >= 4) {
            quality.audio = '4.0';
        } else if (maxChannels >= 2) {
            quality.audio = '2.0';
        }

        return quality;
    }

    /**
     * Создает DOM элемент бейджа (без использования HTML строк)
     */
    function createBadgeElement(type, svgContent) {
        const div = document.createElement('div');
        div.className = `quality-badge quality-badge--${type}`;
        
        // Создаем временный контейнер для парсинга SVG
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = svgContent;
        const svg = tempDiv.firstChild;
        
        if (svg) {
            // Удаляем возможные обработчики событий
            svg.onerror = null;
            svg.onload = null;
            
            // Добавляем атрибуты для безопасности
            svg.setAttribute('draggable', 'false');
            svg.setAttribute('oncontextmenu', 'return false;');
            
            div.appendChild(svg);
        }
        
        return div;
    }

    /**
        * Порядок: Quality, Dolby Vision, HDR, Sound, DUB       
        * 1. Quality (4K/2K/FHD/HD)
     */
    function createResolutionBadge(resolution) {
        let svgContent = '';
        
        if (resolution === '4K') {
            svgContent = '<svg viewBox="0 0 311 134" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M291 0C302.046 3.57563e-06 311 8.95431 311 20V114C311 125.046 302.046 134 291 134H20C8.95431 134 0 125.046 0 114V20C0 8.95431 8.95431 0 20 0H291ZM113 20.9092L74.1367 82.1367V97.6367H118.818V114H137.637V97.6367H149.182V81.8633H137.637V20.9092H113ZM162.841 20.9092V114H182.522V87.5459L192.204 75.7275L217.704 114H241.25L206.296 62.5908L240.841 20.9092H217.25L183.75 61.9541H182.522V20.9092H162.841ZM119.182 81.8633H93.9541V81.1367L118.454 42.3633H119.182V81.8633Z" fill="white"/></svg>';
        } else if (resolution === '2K') {
            svgContent = '<svg viewBox="0 0 311 134" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M291 0C302.046 3.57563e-06 311 8.95431 311 20V114C311 125.046 302.046 134 291 134H20C8.95431 134 0 125.046 0 114V20C0 8.95431 8.95431 0 20 0H291ZM110.608 19.6367C104.124 19.6367 98.3955 20.8638 93.4258 23.3184C88.4563 25.7729 84.5925 29.2428 81.835 33.7275C79.0775 38.2123 77.6992 43.5001 77.6992 49.5908H96.3809C96.3809 46.6212 96.9569 44.0607 98.1084 41.9092C99.2599 39.7578 100.896 38.1056 103.017 36.9541C105.138 35.8026 107.623 35.2275 110.472 35.2275C113.199 35.2276 115.639 35.7724 117.79 36.8633C119.941 37.9238 121.638 39.4542 122.881 41.4541C124.123 43.4238 124.744 45.7727 124.744 48.5C124.744 50.9545 124.244 53.2421 123.244 55.3633C122.244 57.4542 120.774 59.5906 118.835 61.7725C116.926 63.9543 114.562 66.4094 111.744 69.1367L78.6084 99.8184V114H144.972V97.9092H105.881V97.2725L119.472 83.9541C125.865 78.1361 130.82 73.1514 134.335 69C137.85 64.8182 140.29 61.0151 141.653 57.5908C143.047 54.1666 143.744 50.6968 143.744 47.1816C143.744 41.8182 142.366 37.0606 139.608 32.9092C136.851 28.7577 132.986 25.515 128.017 23.1816C123.077 20.8182 117.275 19.6368 110.608 19.6367ZM159.778 20.9092V114H179.46V87.5459L189.142 75.7275L214.642 114H238.188L203.233 62.5908L237.778 20.9092H214.188L180.688 61.9541H179.46V20.9092H159.778Z" fill="white"/></svg>';
        } else if (resolution === 'FULL HD') {
            svgContent = '<svg viewBox="331 0 311 134" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M622 0C633.046 3.57563e-06 642 8.95431 642 20V114C642 125.046 633.046 134 622 134H351C339.954 134 331 125.046 331 114V20C331 8.95431 339.954 0 351 0H622ZM362.341 20.9092V114H382.022V75.5459H419.887V59.3184H382.022V37.1367H423.978V20.9092H362.341ZM437.216 20.9092V114H456.897V75.5459H496.853V114H516.488V20.9092H496.853V59.3184H456.897V20.9092H437.216ZM532.716 20.9092V114H565.716C575.17 114 583.291 112.136 590.079 108.409C596.897 104.682 602.125 99.333 605.762 92.3633C609.428 85.3937 611.262 77.0601 611.262 67.3633C611.262 57.6968 609.428 49.3934 605.762 42.4541C602.125 35.5149 596.928 30.1969 590.171 26.5C583.413 22.7727 575.352 20.9092 565.988 20.9092H532.716ZM564.943 37.7725C570.761 37.7725 575.655 38.8027 579.625 40.8633C583.595 42.9239 586.579 46.1364 588.579 50.5C590.609 54.8636 591.625 60.4847 591.625 67.3633C591.625 74.3026 590.609 79.9694 588.579 84.3633C586.579 88.7269 583.579 91.955 579.579 94.0459C575.609 96.1063 570.715 97.1367 564.897 97.1367H552.397V37.7725H564.943Z" fill="white"/></svg>';
        } else if (resolution === 'HD') {
            svgContent = '<svg viewBox="662 0 311 134" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M953 0C964.046 3.57563e-06 973 8.95431 973 20V114C973 125.046 964.046 134 953 134H682C670.954 134 662 125.046 662 114V20C662 8.95431 670.954 0 682 0H953ZM731.278 20.9092V114H750.96V75.5459H790.915V114H810.551V20.9092H790.915V59.3184H750.96V20.9092H731.278ZM826.778 20.9092V114H859.778C869.233 114 877.354 112.136 884.142 108.409C890.96 104.682 896.188 99.333 899.824 92.3633C903.491 85.3937 905.324 77.0601 905.324 67.3633C905.324 57.6968 903.491 49.3934 899.824 42.4541C896.188 35.5149 890.991 30.1969 884.233 26.5C877.476 22.7727 869.414 20.9092 860.051 20.9092H826.778ZM859.006 37.7725C864.824 37.7725 869.718 38.8027 873.688 40.8633C877.657 42.9239 880.642 46.1364 882.642 50.5C884.672 54.8636 885.687 60.4847 885.688 67.3633C885.688 74.3026 884.672 79.9694 882.642 84.3633C880.642 88.7269 877.642 91.955 873.642 94.0459C869.672 96.1063 864.778 97.1367 858.96 97.1367H846.46V37.7725H859.006Z" fill="white"/></svg>';
        }
        
        return createBadgeElement('res', svgContent);
    }

    /**
     * Dolby Vision
     */
    function createDolbyVisionBadge() {
        const svgContent = '<svg viewBox="0 0 1051 393" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0,393) scale(0.1,-0.1)" fill="currentColor"><path d="M50 2905 l0 -1017 223 5 c146 4 244 11 287 21 361 85 638 334 753 677 39 116 50 211 44 366 -7 200 -52 340 -163 511 -130 199 -329 344 -574 419 -79 24 -102 26 -327 31 l-243 4 0 -1017z"/><path d="M2436 3904 c-443 -95 -762 -453 -806 -905 -30 -308 86 -611 320 -832 104 -99 212 -165 345 -213 133 -47 253 -64 468 -64 l177 0 0 1015 0 1015 -217 -1 c-152 0 -239 -5 -287 -15z"/><path d="M3552 2908 l3 -1013 425 0 c309 0 443 4 490 13 213 43 407 148 550 299 119 124 194 255 247 428 25 84 27 103 27 270 1 158 -2 189 -22 259 -72 251 -221 458 -424 590 -97 63 -170 97 -288 134 l-85 26 -463 4 -462 3 2 -1013z m825 701 c165 -22 283 -81 404 -199 227 -223 279 -550 133 -831 -70 -133 -176 -234 -319 -304 -132 -65 -197 -75 -490 -75 l-245 0 0 703 c0 387 3 707 7 710 11 11 425 8 510 -4z"/><path d="M7070 2905 l0 -1015 155 0 155 0 0 1015 0 1015 -155 0 -155 0 0 -1015z"/><path d="M7640 2905 l0 -1015 150 0 150 0 0 60 c0 33 2 60 5 60 2 0 33 -15 67 -34 202 -110 433 -113 648 -9 79 38 108 59 180 132 72 71 95 102 134 181 102 207 102 414 1 625 -120 251 -394 411 -670 391 -115 -8 -225 -42 -307 -93 -21 -13 -42 -23 -48 -23 -7 0 -10 125 -10 370 l0 370 -150 0 -150 0 0 -1015z m832 95 c219 -67 348 -310 280 -527 -62 -198 -268 -328 -466 -295 -96 15 -168 52 -235 119 -131 132 -164 311 -87 478 27 60 101 145 158 181 100 63 234 80 350 44z"/><path d="M6035 3286 c-253 -49 -460 -232 -542 -481 -23 -70 -26 -96 -26 -210 0 -114 3 -140 26 -210 37 -113 90 -198 177 -286 84 -85 170 -138 288 -177 67 -22 94 -26 207 -26 113 0 140 4 207 26 119 39 204 92 288 177 87 89 140 174 177 286 22 67 26 99 27 200 1 137 -14 207 -69 320 -134 277 -457 440 -760 381z m252 -284 c117 -37 206 -114 260 -229 121 -253 -38 -548 -321 -595 -258 -43 -503 183 -483 447 20 271 287 457 544 377z"/><path d="M9059 3258 c10 -24 138 -312 285 -642 l266 -598 -72 -162 c-39 -88 -78 -171 -86 -183 -37 -58 -132 -80 -208 -48 l-35 14 -18 -42 c-10 -23 -37 -84 -60 -135 -23 -52 -39 -97 -36 -102 3 -4 40 -23 83 -41 70 -31 86 -34 177 -34 93 0 105 2 167 33 76 37 149 104 180 166 29 57 799 1777 805 1799 5 16 -6 17 -161 15 l-167 -3 -185 -415 c-102 -228 -192 -431 -200 -450 l-15 -35 -201 453 -201 452 -168 0 -168 0 18 -42z"/><path d="M2650 968 c0 -2 81 -211 179 -463 l179 -460 59 -3 59 -3 178 453 c98 249 180 459 183 466 4 9 -13 12 -65 12 -47 0 -71 -4 -74 -12 -3 -7 -65 -176 -138 -375 -73 -200 -136 -363 -139 -363 -3 0 -67 168 -142 373 l-136 372 -72 3 c-39 2 -71 1 -71 0z"/><path d="M3805 958 c-3 -7 -4 -215 -3 -463 l3 -450 63 -3 62 -3 0 466 0 465 -60 0 c-39 0 -62 -4 -65 -12z"/><path d="M4580 960 c-97 -16 -178 -72 -211 -145 -23 -50 -24 -143 -3 -193 32 -77 91 -117 244 -167 99 -32 146 -64 166 -112 28 -65 -11 -149 -83 -179 -78 -33 -212 -1 -261 61 l-19 24 -48 -43 -48 -42 43 -37 c121 -103 347 -112 462 -17 54 44 88 120 88 194 -1 130 -79 213 -242 256 -24 7 -71 25 -104 41 -48 22 -66 37 -79 65 -32 67 -5 138 65 174 73 37 193 18 244 -39 l20 -22 43 43 c41 40 42 43 25 61 -27 30 -102 64 -167 76 -64 12 -70 12 -135 1z"/><path d="M5320 505 l0 -465 65 0 65 0 0 465 0 465 -65 0 -65 0 0 -465z"/><path d="M6210 960 c-147 -25 -264 -114 -328 -249 -32 -65 -36 -84 -40 -175 -7 -161 33 -271 135 -367 140 -132 360 -164 541 -77 227 108 316 395 198 634 -88 177 -290 271 -506 234z m232 -132 c100 -46 165 -136 188 -261 20 -106 -18 -237 -88 -310 -101 -105 -245 -132 -377 -73 -74 33 -120 79 -157 154 -31 62 -33 74 -33 167 0 87 4 107 26 155 64 137 173 204 320 196 43 -2 85 -12 121 -28z"/><path d="M7135 958 c-3 -7 -4 -215 -3 -463 l3 -450 63 -3 62 -3 0 376 c0 207 3 374 8 371 4 -2 115 -171 247 -375 l240 -371 78 0 77 0 0 465 0 465 -60 0 -60 0 -2 -372 -3 -372 -241 370 -241 369 -82 3 c-59 2 -83 -1 -86 -10z"/></g></svg>';
        return createBadgeElement('dv', svgContent);
    }

    /**
     * HDR
     */
    function createHdrBadge() {
        const svgContent = '<svg viewBox="-1 178 313 136" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="181.5" width="306" height="129" rx="17.5" stroke="currentColor" stroke-width="5" fill="none"/><path d="M27.2784 293V199.909H46.9602V238.318H86.9148V199.909H106.551V293H86.9148V254.545H46.9602V293H27.2784ZM155.778 293H122.778V199.909H156.051C165.415 199.909 173.475 201.773 180.233 205.5C186.991 209.197 192.188 214.515 195.824 221.455C199.491 228.394 201.324 236.697 201.324 246.364C201.324 256.061 199.491 264.394 195.824 271.364C192.188 278.333 186.96 283.682 180.142 287.409C173.354 291.136 165.233 293 155.778 293ZM142.46 276.136H154.96C160.778 276.136 165.672 275.106 169.642 273.045C173.642 270.955 176.642 267.727 178.642 263.364C180.672 258.97 181.688 253.303 181.688 246.364C181.688 239.485 180.672 233.864 178.642 229.5C176.642 225.136 173.657 221.924 169.688 219.864C165.718 217.803 160.824 216.773 155.006 216.773H142.46V276.136ZM215.903 293V199.909H252.631C259.661 199.909 265.661 201.167 270.631 203.682C275.631 206.167 279.434 209.697 282.04 214.273C284.676 218.818 285.994 224.167 285.994 230.318C285.994 236.5 284.661 241.818 281.994 246.273C279.328 250.697 275.464 254.091 270.403 256.455C265.373 258.818 259.282 260 252.131 260H227.54V244.182H248.949C252.706 244.182 255.828 243.667 258.312 242.636C260.797 241.606 262.646 240.061 263.858 238C265.1 235.939 265.722 233.379 265.722 230.318C265.722 227.227 265.1 224.621 263.858 222.5C262.646 220.379 260.782 218.773 258.267 217.682C255.782 216.561 252.646 216 248.858 216H235.585V293H215.903ZM266.176 250.636L289.312 293H267.585L244.949 250.636H266.176Z" fill="currentColor"/></svg>';
        return createBadgeElement('hdr', svgContent);
    }

    /**
     * Sound (7.1/5.1/2.0)
     */
    function createSoundBadge(sound) {
        let svgContent = '';
        
        if (sound === '7.1') {
            svgContent = '<svg viewBox="-1 368 313 136" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="371.5" width="306" height="129" rx="17.5" stroke="currentColor" stroke-width="5" fill="none"/><path d="M91.6023 483L130.193 406.636V406H85.2386V389.909H150.557V406.227L111.92 483H91.6023ZM159.545 484.182C156.545 484.182 153.97 483.121 151.818 481C149.697 478.848 148.636 476.273 148.636 473.273C148.636 470.303 149.697 467.758 151.818 465.636C153.97 463.515 156.545 462.455 159.545 462.455C162.455 462.455 165 463.515 167.182 465.636C169.364 467.758 170.455 470.303 170.455 473.273C170.455 475.273 169.939 477.106 168.909 478.773C167.909 480.409 166.591 481.727 164.955 482.727C163.318 483.697 161.515 484.182 159.545 484.182ZM215.045 389.909V483H195.364V408.591H194.818L173.5 421.955V404.5L196.545 389.909H215.045Z" fill="currentColor"/></svg>';
        } else if (sound === '5.1') {
            svgContent = '<svg viewBox="330 368 313 136" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="333.5" y="371.5" width="306" height="129" rx="17.5" stroke="currentColor" stroke-width="5" fill="none"/><path d="M443.733 484.273C437.309 484.273 431.581 483.091 426.551 480.727C421.551 478.364 417.581 475.106 414.642 470.955C411.703 466.803 410.172 462.045 410.051 456.682H429.142C429.354 460.288 430.869 463.212 433.688 465.455C436.506 467.697 439.854 468.818 443.733 468.818C446.824 468.818 449.551 468.136 451.915 466.773C454.309 465.379 456.172 463.455 457.506 461C458.869 458.515 459.551 455.667 459.551 452.455C459.551 449.182 458.854 446.303 457.46 443.818C456.097 441.333 454.203 439.394 451.778 438C449.354 436.606 446.581 435.894 443.46 435.864C440.733 435.864 438.081 436.424 435.506 437.545C432.96 438.667 430.975 440.197 429.551 442.136L412.051 439L416.46 389.909H473.369V406H432.688L430.278 429.318H430.824C432.46 427.015 434.93 425.106 438.233 423.591C441.536 422.076 445.233 421.318 449.324 421.318C454.93 421.318 459.93 422.636 464.324 425.273C468.718 427.909 472.188 431.53 474.733 436.136C477.278 440.712 478.536 445.985 478.506 451.955C478.536 458.227 477.081 463.803 474.142 468.682C471.233 473.53 467.157 477.348 461.915 480.136C456.703 482.894 450.642 484.273 443.733 484.273ZM500.733 484.182C497.733 484.182 495.157 483.121 493.006 481C490.884 478.848 489.824 476.273 489.824 473.273C489.824 470.303 490.884 467.758 493.006 465.636C495.157 463.515 497.733 462.455 500.733 462.455C503.642 462.455 506.188 463.515 508.369 465.636C510.551 467.758 511.642 470.303 511.642 473.273C511.642 475.273 511.127 477.106 510.097 478.773C509.097 480.409 507.778 481.727 506.142 482.727C504.506 483.697 502.703 484.182 500.733 484.182ZM556.233 389.909V483H536.551V408.591H536.006L514.688 421.955V404.5L537.733 389.909H556.233Z" fill="currentColor"/></svg>';
        } else if (sound === '2.0') {
            svgContent = '<svg viewBox="661 368 313 136" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="664.5" y="371.5" width="306" height="129" rx="17.5" stroke="currentColor" stroke-width="5" fill="none"/><path d="M722.983 483V468.818L756.119 438.136C758.938 435.409 761.301 432.955 763.21 430.773C765.15 428.591 766.619 426.455 767.619 424.364C768.619 422.242 769.119 419.955 769.119 417.5C769.119 414.773 768.498 412.424 767.256 410.455C766.013 408.455 764.316 406.924 762.165 405.864C760.013 404.773 757.574 404.227 754.847 404.227C751.998 404.227 749.513 404.803 747.392 405.955C745.271 407.106 743.634 408.758 742.483 410.909C741.331 413.061 740.756 415.621 740.756 418.591H722.074C722.074 412.5 723.453 407.212 726.21 402.727C728.968 398.242 732.831 394.773 737.801 392.318C742.771 389.864 748.498 388.636 754.983 388.636C761.65 388.636 767.453 389.818 772.392 392.182C777.362 394.515 781.225 397.758 783.983 401.909C786.741 406.061 788.119 410.818 788.119 416.182C788.119 419.697 787.422 423.167 786.028 426.591C784.665 430.015 782.225 433.818 778.71 438C775.195 442.152 770.241 447.136 763.847 452.955L750.256 466.273V466.909H789.347V483H722.983ZM815.108 484.182C812.108 484.182 809.532 483.121 807.381 481C805.259 478.848 804.199 476.273 804.199 473.273C804.199 470.303 805.259 467.758 807.381 465.636C809.532 463.515 812.108 462.455 815.108 462.455C818.017 462.455 820.563 463.515 822.744 465.636C824.926 467.758 826.017 470.303 826.017 473.273C826.017 475.273 825.502 477.106 824.472 478.773C823.472 480.409 822.153 481.727 820.517 482.727C818.881 483.697 817.078 484.182 815.108 484.182ZM874.483 485.045C866.665 485.015 859.938 483.091 854.301 479.273C848.695 475.455 844.377 469.924 841.347 462.682C838.347 455.439 836.862 446.727 836.892 436.545C836.892 426.394 838.392 417.742 841.392 410.591C844.422 403.439 848.741 398 854.347 394.273C859.983 390.515 866.695 388.636 874.483 388.636C882.271 388.636 888.968 390.515 894.574 394.273C900.21 398.03 904.544 403.485 907.574 410.636C910.604 417.758 912.104 426.394 912.074 436.545C912.074 446.758 910.559 455.485 907.528 462.727C904.528 469.97 900.225 475.5 894.619 479.318C889.013 483.136 882.301 485.045 874.483 485.045ZM874.483 468.727C879.816 468.727 884.074 466.045 887.256 460.682C890.438 455.318 892.013 447.273 891.983 436.545C891.983 429.485 891.256 423.606 889.801 418.909C888.377 414.212 886.347 410.682 883.71 408.318C881.104 405.955 878.028 404.773 874.483 404.773C869.18 404.773 864.938 407.424 861.756 412.727C858.574 418.03 856.968 425.97 856.938 436.545C856.938 443.697 857.65 449.667 859.074 454.455C860.528 459.212 862.574 462.788 865.21 465.182C867.847 467.545 870.938 468.727 874.483 468.727Z" fill="currentColor"/></svg>';
        }
        
        return createBadgeElement('sound', svgContent);
    }

    /**
     * DUB
     */
    function createDubBadge() {
        const svgContent = '<svg viewBox="-1 558 313 136" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2.5" y="561.5" width="306" height="129" rx="17.5" stroke="currentColor" stroke-width="5" fill="none"/><path d="M60.5284 673H27.5284V579.909H60.8011C70.1648 579.909 78.2254 581.773 84.983 585.5C91.7405 589.197 96.9375 594.515 100.574 601.455C104.241 608.394 106.074 616.697 106.074 626.364C106.074 636.061 104.241 644.394 100.574 651.364C96.9375 658.333 91.7102 663.682 84.892 667.409C78.1042 671.136 69.983 673 60.5284 673ZM47.2102 656.136H59.7102C65.5284 656.136 70.4223 655.106 74.392 653.045C78.392 650.955 81.392 647.727 83.392 643.364C85.4223 638.97 86.4375 633.303 86.4375 626.364C86.4375 619.485 85.4223 613.864 83.392 609.5C81.392 605.136 78.4072 601.924 74.4375 599.864C70.4678 597.803 65.5739 596.773 59.7557 596.773H47.2102V656.136ZM178.153 579.909H197.835V640.364C197.835 647.152 196.214 653.091 192.972 658.182C189.759 663.273 185.259 667.242 179.472 670.091C173.684 672.909 166.941 674.318 159.244 674.318C151.517 674.318 144.759 672.909 138.972 670.091C133.184 667.242 128.684 663.273 125.472 658.182C122.259 653.091 120.653 647.152 120.653 640.364V579.909H140.335V638.682C140.335 642.227 141.108 645.379 142.653 648.136C144.229 650.894 146.441 653.061 149.29 654.636C152.138 656.212 155.456 657 159.244 657C163.063 657 166.381 656.212 169.199 654.636C172.047 653.061 174.244 650.894 175.79 648.136C177.366 645.379 178.153 642.227 178.153 638.682V579.909ZM214.028 673V579.909H251.301C258.15 579.909 263.862 580.924 268.438 582.955C273.013 584.985 276.453 587.803 278.756 591.409C281.059 594.985 282.21 599.106 282.21 603.773C282.21 607.409 281.483 610.606 280.028 613.364C278.574 616.091 276.574 618.333 274.028 620.091C271.513 621.818 268.634 623.045 265.392 623.773V624.682C268.938 624.833 272.256 625.833 275.347 627.682C278.468 629.53 280.998 632.121 282.938 635.455C284.877 638.758 285.847 642.697 285.847 647.273C285.847 652.212 284.619 656.621 282.165 660.5C279.741 664.348 276.15 667.394 271.392 669.636C266.634 671.879 260.771 673 253.801 673H214.028ZM233.71 656.909H249.756C255.241 656.909 259.241 655.864 261.756 653.773C264.271 651.652 265.528 648.833 265.528 645.318C265.528 642.742 264.907 640.47 263.665 638.5C262.422 636.53 260.65 634.985 258.347 633.864C256.074 632.742 253.362 632.182 250.21 632.182H233.71V656.909ZM233.71 618.864H248.301C250.998 618.864 253.392 618.394 255.483 617.455C257.604 616.485 259.271 615.121 260.483 613.364C261.725 611.606 262.347 609.5 262.347 607.045C262.347 603.682 261.15 600.97 258.756 598.909C256.392 596.848 253.028 595.818 248.665 595.818H233.71V618.864Z" fill="currentColor"/></svg>';
        return createBadgeElement('dub', svgContent);
    }

    /**
     * Анализирует качество контента при переходе на страницу full
     */
    function analyzeContentQualities(movie, activity) {
        if (!movie || !Lampa.Storage.field('parser_use')) return;

        if (!Lampa.Parser || typeof Lampa.Parser.get !== 'function') {
            return;
        }

        const title = movie.title || movie.name || 'Неизвестно';
        const year = ((movie.first_air_date || movie.release_date || '0000') + '').slice(0,4);
        const combinations = {
            'df': movie.original_title,
            'df_year': movie.original_title + ' ' + year,
            'df_lg': movie.original_title + ' ' + movie.title,
            'df_lg_year': movie.original_title + ' ' + movie.title + ' ' + year,
            'lg': movie.title,
            'lg_year': movie.title + ' ' + year,
            'lg_df': movie.title + ' ' + movie.original_title,
            'lg_df_year': movie.title + ' ' + movie.original_title + ' ' + year,
        };

        const searchQuery = combinations[Lampa.Storage.field('parse_lang')] || movie.title;

        Lampa.Parser.get({
            search: searchQuery,
            movie: movie,
            page: 1
        }, (results) => {
            if (!activity || activity.__destroyed) return;

            if (!results || !results.Results || results.Results.length === 0) return;

            const availableQualities = {
                resolutions: new Set(),
                hdr: new Set(),
                audio: new Set(),
                hasDub: false
            };

            results.Results.forEach((torrent) => {
                if (torrent.ffprobe && Array.isArray(torrent.ffprobe)) {
                    const quality = analyzeContentQuality(torrent.ffprobe);
                    
                    if (quality) {
                        if (quality.resolutionLabel) {
                            availableQualities.resolutions.add(quality.resolutionLabel);
                        }
                        if (quality.audio) {
                            availableQualities.audio.add(quality.audio);
                        }
                    }

                    if (!availableQualities.hasDub) {
                        const audioStreams = torrent.ffprobe.filter(stream => stream.codec_type === 'audio' && stream.tags);
                        audioStreams.forEach(audio => {
                            const lang = (audio.tags.language || '').toLowerCase();
                            const title = (audio.tags.title || audio.tags.handler_name || '').toLowerCase();
                            
                            if (lang === 'rus' || lang === 'ru' || lang === 'russian') {
                                if (title.includes('dub') || title.includes('дубляж') || 
                                    title.includes('дублир') || title === 'd') {
                                    availableQualities.hasDub = true;
                                }
                            }
                        });
                    }
                }

                const titleLower = torrent.Title.toLowerCase();
                
                if (titleLower.includes('dolby vision') || titleLower.includes('dovi') || titleLower.match(/\bdv\b/)) {
                    availableQualities.hdr.add('Dolby Vision');
                }
                if (titleLower.includes('hdr10+')) {
                    availableQualities.hdr.add('HDR10+');
                }
                if (titleLower.includes('hdr10')) {
                    availableQualities.hdr.add('HDR10');
                }
                if (titleLower.includes('hdr')) {
                    availableQualities.hdr.add('HDR');
                }
            });

            const qualityInfo = {
                title: title,
                torrents_found: results.Results.length,
                quality: null,
                dv: false,
                hdr: false,
                hdr_type: null,
                sound: null,
                dub: availableQualities.hasDub
            };

            if (availableQualities.resolutions.size > 0) {
                const resOrder = ['8K', '4K', '2K', 'FULL HD', 'HD'];
                for (const res of resOrder) {
                    if (availableQualities.resolutions.has(res)) {
                        qualityInfo.quality = res;
                        break;
                    }
                }
            }
            
            if (availableQualities.hdr.has('Dolby Vision')) {
                qualityInfo.dv = true;
                qualityInfo.hdr = true;
            }
            
            if (availableQualities.hdr.size > 0) {
                qualityInfo.hdr = true;
                
                const hdrOrder = ['HDR10+', 'HDR10', 'HDR'];
                for (const hdr of hdrOrder) {
                    if (availableQualities.hdr.has(hdr)) {
                        qualityInfo.hdr_type = hdr;
                        break;
                    }
                }
            }
            
            if (availableQualities.audio.size > 0) {
                const audioOrder = ['7.1', '5.1', '4.0', '2.0'];
                for (const audio of audioOrder) {
                    if (availableQualities.audio.has(audio)) {
                        qualityInfo.sound = audio;
                        break;
                    }
                }
            }

            if (activity && activity.applecation_quality === undefined) {
                activity.quality = qualityInfo;
                updateQualityBadges(activity, qualityInfo);
            }
            
        }, (error) => {
            console.log('Quality Badges', { error: error });
        });
    }

    /**
     * Обновляет бейджи качества
     */
    function updateQualityBadges(activity, qualityInfo) {
        const render = activity.render();
        let badgesContainer = render.find('.quality-badges');
        
        if (!badgesContainer.length) {
            let metaContainer = render.find('.full-start__details');
            if (!metaContainer.length) {
                metaContainer = render.find('.full-start-new__details');
            }
            if (!metaContainer.length) {
                metaContainer = render.find('.full-start__body');
            }
            if (!metaContainer.length) {
                metaContainer = render.find('.full-start-new__body');
            }
            if (!metaContainer.length) {
                metaContainer = render.find('.full-start__head');
            }
            if (!metaContainer.length) {
                metaContainer = render.find('.full-start-new__head');
            }
            
            if (metaContainer.length) {
                metaContainer.append('<div class="quality-badges"></div>');
                badgesContainer = render.find('.quality-badges');
            }
        }
        
        if (!badgesContainer.length) {
            console.log('Не найден контейнер для бейджей качества');
            return;
        }
        
        // Очищаем контейнер
        badgesContainer.empty();
        
        // Создаем и добавляем бейджи
        if (qualityInfo.quality) {
            badgesContainer.append(createResolutionBadge(qualityInfo.quality));
        }
        
        if (qualityInfo.dv) {
            badgesContainer.append(createDolbyVisionBadge());
        }
        
        if (qualityInfo.hdr && qualityInfo.hdr_type) {
            badgesContainer.append(createHdrBadge());
        }
        
        if (qualityInfo.sound) {
            badgesContainer.append(createSoundBadge(qualityInfo.sound));
        }
        
        if (qualityInfo.dub) {
            badgesContainer.append(createDubBadge());
        }
        
        if (badgesContainer.children().length > 0) {
            badgesContainer.addClass('show');
        }
    }

    /**
     * Добавляет CSS стили
     */
    function addStyles() {
        const styles = `
        <style data-id="quality-badges">
        .quality-badges {
            display: inline-flex;
            align-items: center;
            gap: 0.4em;
            margin-left: 0.6em;
            opacity: 0;
            transform: translateY(10px);
            transition: opacity 0.3s ease-out, transform 0.3s ease-out;
        }
        
        .quality-badges.show {
            opacity: 1;
            transform: translateY(0);
        }
        
        .quality-badge {
            display: inline-flex;
            height: 0.8em;
        }
        
        .quality-badge svg {
            height: 100%;
            width: auto;
            display: block;
            pointer-events: none;
        }
        
        .quality-badge--res svg {
            filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
        }
        
        .quality-badge--dv svg,
        .quality-badge--hdr svg,
        .quality-badge--sound svg,
        .quality-badge--dub svg {
            color: rgba(255, 255, 255, 0.85);
            filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
        }
        </style>`;
        
        if (!$('style[data-id="quality-badges"]').length) {
            $(styles).appendTo('head');
        }
    }

    /**
     * Инициализация плагина
     */
    function initializePlugin() {
        console.log('Quality Badges loaded');
        
        addStyles();
        
        Lampa.Listener.follow('full', (event) => {
            if (event.type === 'complite') {
                const activity = event.object.activity;
                const data = event.data && event.data.movie;
                
                if (data) {
                    setTimeout(() => {
                        analyzeContentQualities(data, activity);
                    }, 500);
                }
            }
        });
    }

    if (window.appready) {
        initializePlugin();
    } else {
        Lampa.Listener.follow('app', (event) => {
            if (event.type === 'ready') {
                initializePlugin();
            }
        });
    }

})();
