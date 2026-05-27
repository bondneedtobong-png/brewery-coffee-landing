(() => {
    'use strict';

    const header = document.getElementById('header');
    const burger = document.getElementById('burger');
    const nav = document.getElementById('nav');
    const body = document.body;

    /* ===== Header scroll state ===== */
    const onScroll = () => {
        if (window.scrollY > 24) {
            header.classList.add('is-scrolled');
        } else {
            header.classList.remove('is-scrolled');
        }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ===== Burger menu ===== */
    const toggleNav = (force) => {
        const willOpen = typeof force === 'boolean'
            ? force
            : !nav.classList.contains('is-open');
        nav.classList.toggle('is-open', willOpen);
        burger.classList.toggle('is-open', willOpen);
        burger.setAttribute('aria-expanded', String(willOpen));
        body.classList.toggle('is-locked', willOpen);
    };

    burger.addEventListener('click', () => toggleNav());

    nav.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (link) toggleNav(false);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && nav.classList.contains('is-open')) {
            toggleNav(false);
        }
    });

    const desktopMQ = window.matchMedia('(min-width: 769px)');
    desktopMQ.addEventListener('change', (e) => {
        if (e.matches) toggleNav(false);
    });

    /* ===== Smooth scroll with header offset ===== */
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (!href || href === '#') return;
            const target = document.querySelector(href);
            if (!target) return;
            e.preventDefault();
            const headerHeight = header.getBoundingClientRect().height;
            const top = target.getBoundingClientRect().top + window.scrollY - headerHeight + 1;
            window.scrollTo({ top, behavior: 'smooth' });
        });
    });

    /* ===== Reveal on scroll ===== */
    const reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && reveals.length) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const siblings = Array.from(entry.target.parentElement?.children || []);
                    const idx = siblings.indexOf(entry.target);
                    entry.target.style.transitionDelay = `${Math.min(idx, 5) * 70}ms`;
                    entry.target.classList.add('is-visible');
                    io.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -40px 0px',
        });
        reveals.forEach((el) => io.observe(el));

        /* Safety net: reveal anything still hidden after 2s */
        setTimeout(() => {
            reveals.forEach((el) => {
                if (!el.classList.contains('is-visible') &&
                    el.getBoundingClientRect().top < window.innerHeight) {
                    el.classList.add('is-visible');
                }
            });
        }, 2000);
    } else {
        reveals.forEach((el) => el.classList.add('is-visible'));
    }

    /* ===== Menu tabs ===== */
    const tabs = document.querySelectorAll('.menu__tab');
    const panels = document.querySelectorAll('.menu__grid');

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            tabs.forEach((t) => t.classList.toggle('is-active', t === tab));
            panels.forEach((panel) => {
                const isActive = panel.dataset.panel === target;
                panel.classList.toggle('is-active', isActive);
                if (isActive) {
                    panel.querySelectorAll('.reveal').forEach((el, i) => {
                        el.classList.remove('is-visible');
                        el.style.transitionDelay = `${i * 70}ms`;
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => el.classList.add('is-visible'));
                        });
                    });
                }
            });
        });
    });

    /* ===== Number counter animation ===== */
    const counters = document.querySelectorAll('[data-count]');
    if ('IntersectionObserver' in window && counters.length) {
        const countIO = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                const target = parseInt(el.dataset.count, 10);
                const duration = 1400;
                const start = performance.now();
                const ease = (t) => 1 - Math.pow(1 - t, 3);
                const animate = (now) => {
                    const p = Math.min((now - start) / duration, 1);
                    el.textContent = Math.floor(ease(p) * target);
                    if (p < 1) requestAnimationFrame(animate);
                    else el.textContent = target;
                };
                requestAnimationFrame(animate);
                countIO.unobserve(el);
            });
        }, { threshold: 0.4 });
        counters.forEach((el) => countIO.observe(el));
    }

    /* ===== Booking date: min = today ===== */
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
    }

    /* ===== Newsletter (front-end stub) ===== */
    const news = document.getElementById('newsletterForm');
    if (news) {
        news.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = news.querySelector('input[type="email"]');
            const btn = news.querySelector('button');
            const value = (input.value || '').trim();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                input.style.borderColor = 'var(--color-error)';
                input.focus();
                return;
            }
            input.style.borderColor = '';
            const orig = btn.querySelector('span').textContent;
            btn.querySelector('span').textContent = 'Готово ✓';
            btn.disabled = true;
            news.reset();
            setTimeout(() => {
                btn.querySelector('span').textContent = orig;
                btn.disabled = false;
            }, 2500);
        });
    }
})();
