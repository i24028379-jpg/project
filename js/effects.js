(() => {
    function onReady(fn) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
        else fn();
    }

    onReady(() => {
        // Active nav link
        try {
            const path = (location.pathname.split('/').pop() || '').toLowerCase();
            document.querySelectorAll('header a').forEach(a => {
                const href = (a.getAttribute('href') || '').toLowerCase();
                if (href === path) a.classList.add('active');
            });
        } catch (e) {}

        // Scroll reveal
        const revealElements = Array.from(document.querySelectorAll('.reveal'));
        if (revealElements.length) {
            const io = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const el = entry.target;
                        el.classList.add('is-visible');
                        io.unobserve(el);
                    }
                });
            }, { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.15 });

            // Simple stagger inside containers
            const grouped = new Map();
            revealElements.forEach(el => {
                const parentKey = el.parentElement;
                const idx = grouped.get(parentKey) || 0;
                el.style.transitionDelay = (idx * 0.08).toFixed(2) + 's';
                grouped.set(parentKey, idx + 1);
                io.observe(el);
            });
        }

        // Parallax banner (supports single image or carousel root)
        const bannerEl = document.querySelector('#banner4');
        if (bannerEl) {
            const carouselEl = bannerEl.querySelector('.carousel');
            const singleImg = bannerEl.querySelector(':scope > img');
            const parallaxEl = carouselEl || singleImg;
            if (parallaxEl) {
                let sy = 0, targetSy = 0, mx = 0, targetMx = 0;
                function onScroll() { targetSy = Math.max(0, window.scrollY * 0.15); }
                function onMove(e) { targetMx = (e.clientX / window.innerWidth - 0.5) * 10; }
                function raf() {
                    sy += (targetSy - sy) * 0.08;
                    mx += (targetMx - mx) * 0.12;
                    parallaxEl.style.transform = `translate3d(${mx}px, ${-sy}px, 0)`;
                    requestAnimationFrame(raf);
                }
                window.addEventListener('scroll', onScroll, { passive: true });
                window.addEventListener('mousemove', onMove, { passive: true });
                raf();
            }
        }

        // Carousel (banner)
        (function initCarousel(){
            const carousels = Array.from(document.querySelectorAll('#banner4 .carousel'));
            carousels.forEach(root => {
                const slidesWrap = root.querySelector('.slides');
                const slides = Array.from(root.querySelectorAll('.slide'));
                if (!slidesWrap || !slides.length) return;
                let index = 0;
                let width = root.clientWidth;
                let timer = 0;
                const interval = parseInt(root.getAttribute('data-interval') || '3000', 10);
                const autoplay = (root.getAttribute('data-autoplay') || 'true') !== 'false';

                // Dots
                const dotsWrap = root.querySelector('.carousel-dots');
                if (dotsWrap) {
                    dotsWrap.innerHTML = '';
                    slides.forEach((_, i) => {
                        const d = document.createElement('div');
                        d.className = 'carousel-dot' + (i === 0 ? ' is-active' : '');
                        d.addEventListener('click', () => goTo(i, true));
                        dotsWrap.appendChild(d);
                    });
                }

                function updateDots() {
                    if (!dotsWrap) return;
                    const dots = dotsWrap.querySelectorAll('.carousel-dot');
                    dots.forEach((d, i) => d.classList.toggle('is-active', i === index));
                }

                function layout() {
                    width = root.clientWidth;
                    slidesWrap.style.transform = `translateX(${-index * width}px)`;
                }

                function goTo(i, user) {
                    index = (i + slides.length) % slides.length;
                    slidesWrap.style.transform = `translateX(${-index * width}px)`;
                    updateDots();
                    if (user) restart();
                }

                function next() { goTo(index + 1); }
                function prev() { goTo(index - 1); }

                function start() {
                    if (!autoplay) return;
                    stop();
                    timer = window.setInterval(next, interval);
                }
                function stop() { if (timer) { clearInterval(timer); timer = 0; } }
                function restart() { stop(); start(); }

                // Arrows
                const btnPrev = root.querySelector('.carousel-prev');
                const btnNext = root.querySelector('.carousel-next');
                if (btnPrev) btnPrev.addEventListener('click', prev);
                if (btnNext) btnNext.addEventListener('click', next);

                // Hover pause
                root.addEventListener('mouseenter', stop);
                root.addEventListener('mouseleave', start);

                // Swipe
                let sx = 0, dx = 0, dragging = false;
                function onDown(e) {
                    dragging = true;
                    sx = (e.touches ? e.touches[0].clientX : e.clientX);
                    dx = 0;
                    slidesWrap.style.transition = 'none';
                }
                function onMove(e) {
                    if (!dragging) return;
                    const x = (e.touches ? e.touches[0].clientX : e.clientX);
                    dx = x - sx;
                    slidesWrap.style.transform = `translateX(${(-index * width) + dx}px)`;
                }
                function onUp() {
                    if (!dragging) return;
                    dragging = false;
                    slidesWrap.style.transition = '';
                    const threshold = Math.min(120, width * 0.2);
                    if (dx > threshold) prev();
                    else if (dx < -threshold) next();
                    else goTo(index);
                    dx = 0;
                }
                root.addEventListener('mousedown', onDown);
                root.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
                root.addEventListener('touchstart', onDown, { passive: true });
                root.addEventListener('touchmove', onMove, { passive: true });
                root.addEventListener('touchend', onUp, { passive: true });

                window.addEventListener('resize', () => { layout(); });
                layout();
                start();
            });
        })();

        // Tilt effect for images
        const tiltTargets = Array.from(document.querySelectorAll(
            '.img_list img, .role_left img, .intro-image, .jianjie_img'
        ));
        tiltTargets.forEach(el => {
            el.classList.add('tilt');
            let rAF = 0;
            function onMove(e) {
                const rect = el.getBoundingClientRect();
                const px = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
                const py = (e.clientY - rect.top) / rect.height - 0.5;
                const rx = (py * -8);
                const ry = (px * 8);
                cancelAnimationFrame(rAF);
                rAF = requestAnimationFrame(() => {
                    el.style.transform = `perspective(600px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`;
                });
            }
            function onLeave() {
                cancelAnimationFrame(rAF);
                el.style.transform = '';
            }
            el.addEventListener('mousemove', onMove);
            el.addEventListener('mouseleave', onLeave);
            el.addEventListener('touchmove', (e) => {
                if (e.touches && e.touches[0]) onMove(e.touches[0]);
            }, { passive: true });
            el.addEventListener('touchend', onLeave, { passive: true });
        });

        // Lightbox
        const clickableImgs = Array.from(document.querySelectorAll(
            '.img_list img, .intro-image, .jianjie_img, .role_left img'
        ));
        if (clickableImgs.length) {
            const overlay = document.createElement('div');
            overlay.className = 'lightbox-overlay';
            overlay.innerHTML = `
                <div class="lightbox-content">
                    <img class="lightbox-img" alt="preview" />
                    <div class="lightbox-close" title="Close">×</div>
                </div>
            `;
            document.body.appendChild(overlay);
            const imgEl = overlay.querySelector('.lightbox-img');
            const closeEl = overlay.querySelector('.lightbox-close');

            function open(src) {
                imgEl.src = src;
                overlay.classList.add('open');
            }
            function close() { overlay.classList.remove('open'); }

            clickableImgs.forEach(img => {
                img.style.cursor = 'zoom-in';
                img.addEventListener('click', () => open(img.currentSrc || img.src));
            });
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay || e.target === closeEl) close();
            });
            window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
        }

        // Back to top
        let backBtn = document.getElementById('backToTop');
        if (!backBtn) {
            backBtn = document.createElement('div');
            backBtn.id = 'backToTop';
            backBtn.setAttribute('title', 'Back to top');
            backBtn.innerHTML = '↑';
            document.body.appendChild(backBtn);
        }
        function updateBackBtn() {
            if (window.scrollY > 200) backBtn.classList.add('show');
            else backBtn.classList.remove('show');
        }
        backBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        window.addEventListener('scroll', updateBackBtn, { passive: true });
        updateBackBtn();

        // Animated arrow cursor (desktop only)
        try {
            if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
                const cursor = document.createElement('div');
                cursor.className = 'cursor-arrow hidden';
                cursor.innerHTML = `
                    <svg viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path class="head" d="M2 1 L2 23 L8 18 L12 30 L16 28 L12 18 L22 18 Z" />
                        <path class="edge" d="M2 1 L2 23 L8 18 L12 30 L16 28 L12 18 L22 18 Z" fill="none"/>
                    </svg>
                `;
                document.body.appendChild(cursor);

                let x = 0, y = 0, tx = 0, ty = 0;
                let rafId = 0;
                function moveTo(nx, ny) { x = nx; y = ny; }
                function loop() {
                    tx += (x - tx) * 0.25;
                    ty += (y - ty) * 0.25;
                    cursor.style.transform = `translate(${tx}px, ${ty}px)`;
                    rafId = requestAnimationFrame(loop);
                }
                function onMouseMove(e) {
                    if (cursor.classList.contains('hidden')) cursor.classList.remove('hidden');
                    moveTo(e.clientX, e.clientY);
                    if (!rafId) rafId = requestAnimationFrame(loop);
                }
                function onMouseLeave() { cursor.classList.add('hidden'); }
                function onDown() { cursor.classList.add('active'); }
                function onUp() { cursor.classList.remove('active'); }

                window.addEventListener('mousemove', onMouseMove, { passive: true });
                window.addEventListener('mouseleave', onMouseLeave, { passive: true });
                window.addEventListener('mousedown', onDown, { passive: true });
                window.addEventListener('mouseup', onUp, { passive: true });
            }
        } catch (e) {}
    });
})();


