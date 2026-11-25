(() => {
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => [...c.querySelectorAll(s)];
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;

    const header = $('#header');
    const hero = $('.hero');
    let heroVisible = true;

    // ---- scroll: header state + hero parallax (rAF-throttled) ----
    let ticking = false;
    const frame = () => {
        ticking = false;
        header.classList.toggle('scrolled', scrollY > 8);
        if (!reduce && scrollY < innerHeight * 1.5) hero.style.setProperty('--sy', scrollY);
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
    frame();

    // ---- pointer: parallax + bat-signal spotlight (hero only) ----
    if (fine && !reduce) {
        hero.addEventListener('pointermove', e => {
            const r = hero.getBoundingClientRect();
            hero.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
            hero.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
            $('#signal').style.setProperty('--mx', e.clientX - r.left + 'px');
            $('#signal').style.setProperty('--my', e.clientY - r.top + 'px');
        });
    }

    // ---- reveal (staggered) ----
    $$('.reveal-group').forEach(g => $$('.reveal', g).forEach((el, i) => el.style.setProperty('--d', i * 0.1 + 's')));
    $$('.hero .reveal').forEach((el, i) => el.style.setProperty('--d', 0.1 + i * 0.1 + 's'));

    // ---- count up ----
    const countUp = el => {
        const to = parseFloat(el.dataset.count);
        const dec = +(el.dataset.decimals || 0);
        const suffix = el.dataset.suffix || '';
        if (reduce) { el.textContent = to.toFixed(dec) + suffix; return; }
        const t0 = performance.now(), dur = 1600;
        const tick = now => {
            const p = Math.min((now - t0) / dur, 1);
            el.textContent = (to * (1 - Math.pow(1 - p, 4))).toFixed(dec) + suffix;
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    };

    // ---- decrypt-style text scramble for section titles ----
    const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&$*';
    const decrypt = el => {
        if (reduce) return;
        const final = el.textContent;
        let f = 0;
        const total = final.length * 3 + 6;
        (function run() {
            const done = Math.max(0, Math.floor((f - 6) / 3));
            el.textContent = [...final].map((ch, i) => ch === ' ' || i < done ? ch : glyphs[Math.floor(Math.random() * glyphs.length)]).join('');
            if (++f <= total) setTimeout(run, 30); else el.textContent = final;
        })();
    };

    const io = new IntersectionObserver(entries => {
        entries.forEach(en => {
            // also reveal anything already scrolled past (e.g. after jumping to a #link)
            if (!en.isIntersecting && en.boundingClientRect.top >= 0) return;
            const t = en.target;
            t.classList.add('in');
            $$('[data-count]', t).forEach(countUp);
            const scr = $('.scr', t);
            if (scr) decrypt(scr);
            io.unobserve(t);
        });
    }, { threshold: 0.2 });
    // hero items are observed later by startHero() (after the intro)
    $$('.reveal').filter(el => !el.closest('.hero')).forEach(el => io.observe(el));
    // safety net: never leave on-screen content hidden
    setTimeout(() => $$('.reveal:not(.in)').forEach(el => {
        if (el.getBoundingClientRect().top < innerHeight) { el.classList.add('in'); $$('[data-count]', el).forEach(countUp); }
    }), 4000);

    // ---- typed role ----
    const words = ['Python Backend', 'Machine Learning', 'Flutter Apps', 'AI Projects'];
    const typed = $('#typed');
    const startTyped = () => { if (reduce) {
        typed.textContent = words[0];
    } else {
        let w = 0, c = 0, del = false;
        const type = () => {
            const word = words[w];
            typed.textContent = word.slice(0, c);
            if (!del && c === word.length) { del = true; return setTimeout(type, 1500); }
            if (del && c === 0) { del = false; w = (w + 1) % words.length; }
            c += del ? -1 : 1;
            setTimeout(type, del ? 40 : 85);
        };
        setTimeout(type, 600);
    } };

    // hero entrance: runs right away, or when the intro starts revealing the page
    let heroStarted = false;
    const startHero = () => {
        if (heroStarted) return;
        heroStarted = true;
        $$('.hero .reveal').forEach(el => io.observe(el));
        startTyped();
    };

    // ---- mobile menu ----
    const btn = $('#menuBtn'), nav = $('#nav');
    const setMenu = open => {
        btn.classList.toggle('open', open);
        nav.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', open);
    };
    btn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
    $$('#nav a').forEach(a => a.addEventListener('click', () => setMenu(false)));

    // ---- active nav link ----
    const links = $$('#nav a');
    const spy = new IntersectionObserver(entries => {
        entries.forEach(en => {
            if (en.isIntersecting) links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + en.target.id));
        });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(s => spy.observe(s));

    // ---- lightning flash ----
    // (lightning flash removed: it washed out the page)

    // ---- bat swarm (canvas) ----
    const canvas = $('#bats');
    const ctx = canvas.getContext('2d');
    if (!reduce && ctx) {
        let W = 0, H = 0, dpr = 1;
        const resize = () => {
            dpr = Math.min(devicePixelRatio || 1, 2);
            W = canvas.clientWidth; H = canvas.clientHeight;
            canvas.width = W * dpr; canvas.height = H * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        addEventListener('resize', resize);
        new IntersectionObserver(e => { heroVisible = e[0].isIntersecting; }).observe(hero);

        const count = innerWidth < 720 ? 12 : 26;
        const spawn = (initial) => {
            const s = 0.35 + Math.random() * 0.9;
            const dir = Math.random() < 0.5 ? 1 : -1;
            return {
                x: initial ? Math.random() * W : (dir > 0 ? -60 : W + 60),
                y: H * (0.05 + Math.random() * 0.6),
                s, dir,
                vx: dir * (0.6 + Math.random() * 1.6) * (0.6 + s),
                vy: 0, ph: Math.random() * 6.28, fl: 0.14 + Math.random() * 0.12,
                wob: 0.6 + Math.random() * 1.2
            };
        };
        const bats = Array.from({ length: count }, () => spawn(true));

        const drawBat = b => {
            const flap = Math.sin(b.ph);
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.scale(b.s * b.dir, b.s);
            ctx.fillStyle = '#050506';
            ctx.beginPath();
            // body / head with ears
            ctx.moveTo(0, -6); ctx.lineTo(-3, -13); ctx.lineTo(-1.5, -6);
            ctx.lineTo(1.5, -6); ctx.lineTo(3, -13); ctx.closePath();
            ctx.ellipse(0, 0, 4.5, 8, 0, 0, 6.28);
            ctx.fill();
            // wings (mirrored)
            for (const m of [-1, 1]) {
                ctx.beginPath();
                ctx.moveTo(m * 3, -4);
                ctx.quadraticCurveTo(m * 22, -18 - flap * 16, m * 40, -4 - flap * 22);
                ctx.quadraticCurveTo(m * 33, 2 - flap * 8, m * 28, 8 - flap * 8);
                ctx.quadraticCurveTo(m * 20, 2, m * 14, 9 - flap * 4);
                ctx.quadraticCurveTo(m * 8, 3, m * 3, 8);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        };

        const loop = () => {
            requestAnimationFrame(loop);
            if (!heroVisible || document.hidden) return;
            ctx.clearRect(0, 0, W, H);
            bats.forEach((b, i) => {
                b.ph += b.fl;
                b.x += b.vx;
                b.y += Math.sin(b.ph * 0.5) * b.wob - 0.15;
                drawBat(b);
                if (b.x < -80 || b.x > W + 80 || b.y < -40) bats[i] = spawn(false);
            });
        };
        loop();
    }

    // ---- projects scroller: arrows, drag, keyboard ----
    const sc = $('#scroller');
    if (sc) {
        const prev = $('#scPrev'), next = $('#scNext');
        const step = () => (sc.querySelector('.scard')?.offsetWidth || 340) + 20;
        const go = dir => sc.scrollBy({ left: dir * step(), behavior: reduce ? 'auto' : 'smooth' });
        const sync = () => {
            prev.disabled = sc.scrollLeft <= 2;
            next.disabled = sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - 2;
        };
        prev.addEventListener('click', () => go(-1));
        next.addEventListener('click', () => go(1));
        sc.addEventListener('scroll', sync, { passive: true });
        addEventListener('resize', sync);
        sync();
        sc.addEventListener('keydown', e => {
            if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
        });
        // drag to scroll (mouse only; touch scrolls natively)
        let down = false, startX = 0, startL = 0, moved = false;
        sc.addEventListener('pointerdown', e => {
            if (e.pointerType !== 'mouse') return;
            down = true; moved = false; startX = e.clientX; startL = sc.scrollLeft;
        });
        addEventListener('pointermove', e => {
            if (!down) return;
            const dx = e.clientX - startX;
            if (Math.abs(dx) > 5) { moved = true; sc.classList.add('dragging'); }
            if (moved) sc.scrollLeft = startL - dx;
        });
        addEventListener('pointerup', () => { down = false; sc.classList.remove('dragging'); });
        // a drag must not count as a click on a card
        sc.addEventListener('click', e => { if (moved) { e.preventDefault(); moved = false; } }, true);
    }

    // ---- bat intro: yellow bat, bats burst out, page revealed (~2.2 s) ----
    const ONLY_FIRST_VISIT = false;   // true = play once per browser tab session
    const root = document.documentElement;
    const intro = $('#intro');
    if (!intro || !root.classList.contains('intro-active')) {
        startHero();
    } else {
        let done = false, raf = 0;
        const timers = [];
        const finish = () => {
            if (done) return;
            done = true;
            cancelAnimationFrame(raf);
            timers.forEach(clearTimeout);
            root.classList.remove('intro-active');
            root.classList.add('no-intro');
            intro.remove();
            try { sessionStorage.setItem('introSeen', '1'); } catch (e) { /* storage blocked */ }
            startHero();
        };
        const run = () => {
            const cv = $('#introCanvas'), bg = $('.intro-bg');
            const ctx = cv.getContext('2d');
            const dpr = Math.min(devicePixelRatio || 1, 2);
            const W = innerWidth, H = innerHeight;
            cv.width = W * dpr; cv.height = H * dpr;
            const maxR = Math.hypot(W, H) / 2 + 30;
            const N = W < 720 ? 50 : 110;
            const bats = Array.from({ length: N }, () => ({
                a: Math.random() * Math.PI * 2,
                v: (0.35 + Math.random() * 0.65) * Math.max(W, H) * 0.75,
                delay: 350 + Math.random() * 450,
                life: 1000 + Math.random() * 500,
                ph: Math.random() * 6.28,
                fl: 14 + Math.random() * 8,
                sw: (Math.random() - 0.5) * 80,
                s: 0.35 + Math.random() * 0.9,
                pale: Math.random() < 0.35
            }));
            const drawBat = (b, x, y, sc, rot, alpha, t) => {
                const flap = Math.sin(t * 0.001 * b.fl + b.ph);
                ctx.save();
                ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
                ctx.fillStyle = `rgba(6,6,8,${alpha})`;
                ctx.beginPath();
                ctx.moveTo(0, -6); ctx.lineTo(-3, -13); ctx.lineTo(-1.5, -6);
                ctx.lineTo(1.5, -6); ctx.lineTo(3, -13); ctx.closePath();
                ctx.ellipse(0, 0, 4.5, 8, 0, 0, 6.28);
                ctx.fill();
                for (const m of [-1, 1]) {
                    ctx.beginPath();
                    ctx.moveTo(m * 3, -4);
                    ctx.quadraticCurveTo(m * 22, -18 - flap * 16, m * 40, -4 - flap * 22);
                    ctx.quadraticCurveTo(m * 33, 2 - flap * 8, m * 28, 8 - flap * 8);
                    ctx.quadraticCurveTo(m * 20, 2, m * 14, 9 - flap * 4);
                    ctx.quadraticCurveTo(m * 8, 3, m * 3, 8);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.restore();
            };
            const t0 = performance.now();
            const loop = now => {
                if (done) return;
                const t = now - t0;
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                ctx.clearRect(0, 0, W, H);
                for (const b of bats) {
                    const age = (t - b.delay) / b.life;
                    if (age <= 0 || age >= 1) continue;
                    const e = 1 - Math.pow(1 - age, 2.2);
                    const d = b.v * e;
                    const off = Math.sin(age * 5 + b.ph) * b.sw * age;
                    const x = W / 2 + Math.cos(b.a) * d - Math.sin(b.a) * off;
                    const y = H / 2 + Math.sin(b.a) * d + Math.cos(b.a) * off;
                    const alpha = Math.min(1, age * 8) * (1 - Math.pow(age, 3));
                    drawBat(b, x, y, 0.12 + e * b.s * 1.6, b.a + Math.PI / 2, alpha, t);
                }
                const rp = Math.max(0, Math.min(1, (t - 900) / 1200));
                bg.style.setProperty('--r', (1 - Math.pow(1 - rp, 3)) * maxR + 'px');
                raf = requestAnimationFrame(loop);
            };
            raf = requestAnimationFrame(loop);
            timers.push(setTimeout(startHero, 1000), setTimeout(finish, 2300));
        };
        $('#introSkip').addEventListener('click', finish);
        addEventListener('keydown', e => { if (e.key === 'Escape') finish(); });
        timers.push(setTimeout(finish, 4000));   // hard safety net
        try {
            if (ONLY_FIRST_VISIT && sessionStorage.getItem('introSeen')) finish(); else run();
        } catch (e) { finish(); }
    }

    // ---- contact form: not connected to a backend yet ----
    $('#contactForm').addEventListener('submit', e => e.preventDefault());
})();
