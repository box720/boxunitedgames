/* Box United home.js (W2): reveals + the home toy-box scene (BoxSprites + /assets/sprites/home.js). No network,
   no storage. Reduced motion, no JS or no BoxSprites => the pre-rendered still stays. Other pages use site.js. */
(function () {
  'use strict';
  var d = document, w = window, BS = w.BoxSprites, IO = w.IntersectionObserver;
  var mq = w.matchMedia && matchMedia('(prefers-reduced-motion: reduce)'), calm = mq && mq.matches;
  d.documentElement.classList.add('js');

  // Reveal only blocks that start below the fold, so first paint and JS-off never hide content.
  if (!calm && IO) {
    var ro = new IO(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); ro.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    [].forEach.call(d.querySelectorAll('[data-reveal]'), function (el) {
      if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('reveal'); ro.observe(el); }
    });
  }

  var stage = d.querySelector('.stage[data-scene]');
  if (!stage || calm || !BS) return;
  var hero = stage.closest('.hero') || stage, btn = d.querySelector('.motion-toggle');
  var cast = stage.dataset.cast.split(','), slots = stage.dataset.slots.split(',').map(Number);
  // art px: stage 160 wide, feet line G above its bottom, chest front wall RIM tall
  var G = 4, W = 160, RIM = 18, s = 2, all = [], pets = [], box, live = 0, held = 0, away = 0, raf = 0, last = 0, next = 0;

  function sc() { return parseInt(getComputedStyle(hero).getPropertyValue('--art'), 10) || 2; }
  function put(a) { // whole art pixels; x = left edge, y = feet above the ground line
    a.c.style.transform = 'translate(' + Math.round(a.x) * s + 'px,' + (a.ft - G - Math.round(a.y)) * s + 'px)';
    if (a.inside) a.c.style.clipPath = 'inset(0 0 ' + Math.max(0, a.ft - Math.round(a.y)) * s + 'px 0)'; // nothing below the ground
  }
  function make(id, anim, z) {
    var c = d.createElement('canvas');
    c.setAttribute('aria-hidden', 'true');
    c.style.zIndex = z;
    stage.appendChild(c);
    var h = BS.mount(c, { sprite: id, anim: anim });
    if (!h) { c.remove(); return null; }
    var a = { c: c, h: h, ft: h.s.h - h.s.ay, ax: h.s.ax, x: W / 2 - h.s.ax, y: 0 };
    all.push(a);
    put(a);
    return a;
  }
  // tween to x,y over ms with an extra arc of height ht
  function go(a, x, y, ms, ht, done) { a.tw = { x0: a.x, y0: a.y, x1: x, y1: y, t: 0, ms: ms, ht: ht || 0, done: done }; }
  function once(a, anim) { a.busy = 1; a.h.play(anim, { once: true, then: function () { a.busy = 0; a.h.play('idle'); } }); }
  function beat() { // one small thing every 3-6 s: a hop, a wave, or a look over the shoulder
    var r = Math.random(), free = pets.filter(function (a) { return !a.tw && !a.busy; }), a = free[(r * 97 | 0) % free.length];
    if (!a) return;
    if (r < 0.25) {
      a.busy = 1;
      a.h.flip(a.x + a.ax < W / 2); // face away from the chest for a moment
      setTimeout(function () { a.h.flip(a.x + a.ax > W / 2); a.busy = 0; }, 1400);
    } else once(a, r < 0.5 ? 'wave' : 'hop'); // the hop's jump is drawn in its frames
  }

  function frame(t) {
    raf = 0;
    if (held || away) return;
    var dt = last ? Math.min(64, t - last) : 16;
    last = t;
    all.forEach(function (a) {
      var q = a.tw;
      if (!q) return;
      q.t = Math.min(q.ms, q.t + dt);
      var k = q.t / q.ms;
      a.x = q.x0 + (q.x1 - q.x0) * k;
      a.y = q.y0 + (q.y1 - q.y0) * k + q.ht * 4 * k * (1 - k);
      if (a.inside && a.y > RIM) { a.inside = 0; a.c.style.zIndex = 4; a.c.style.clipPath = 'none'; } // over the front wall
      put(a);
      if (k >= 1) { a.tw = null; if (q.done) q.done(); }
    });
    if (live && t > next) { beat(); next = t + 3000 + Math.random() * 3000; }
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && !held && !away) { last = 0; raf = requestAnimationFrame(frame); } }

  function start() {
    s = sc();
    box = [make('studio/chest-back', 'closed', 1), make('studio/chest-front', 'closed', 3)]; // pets go between
    if (!box[0] || !box[1]) return;
    requestAnimationFrame(function () { stage.classList.add('is-live'); }); // after the canvases' first draw
    if (btn) btn.hidden = false;
    setTimeout(function () { box.forEach(function (a) { a.h.play('pop', { once: true, then: 'open-heart' }); }); }, 150);
    cast.forEach(function (id, i) {
      setTimeout(function () { // from the chest's 'burst' frame: rise out of the chest, land on the slot
        var a = make(id, 'leap', 2);
        if (!a) return;
        a.pet = a.inside = a.busy = 1; a.home = slots[i] - a.ax; a.y = -20; put(a);
        var left = a.home < a.x;
        a.h.flip(left);
        a.h.play('leap', { once: true }); // 460 ms, no shadow, no drawn lift: the arc owns the height
        go(a, a.home, 0, 460, 36, function () { a.h.flip(!left); once(a, 'land'); });
        a.c.addEventListener('pointerdown', function () { if (!held && !a.tw && !a.busy) once(a, 'hop'); });
        pets.push(a);
        kick();
      }, 330 + i * 180);
    });
    setTimeout(function () { live = 1; next = performance.now() + 2500; }, 330 + cast.length * 180 + 900);
    kick();
  }

  function hold(on) { // the button's name stays "Pause animation"; aria-pressed = paused
    held = on;
    if (btn) btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on) BS.pause(); else { BS.resume(); kick(); }
  }
  if (btn) btn.addEventListener('click', function () { hold(!held); });
  if (mq && mq.addEventListener) mq.addEventListener('change', function () { if (mq.matches) hold(1); });
  d.addEventListener('visibilitychange', function () { away = d.hidden; kick(); });
  if (IO) new IO(function (es) { away = !es[0].isIntersecting || d.hidden; kick(); }).observe(stage);
  addEventListener('resize', function () { var n = sc(); if (n !== s) { s = n; all.forEach(put); } });

  Promise.all(stage.dataset.sheets.split(',').map(BS.load)).then(function (ms) { // decode the sheet first: no blank frame
    return Promise.all(ms.map(function (m) { var i = new Image(); i.src = m.sheets[0]; return i.decode ? i.decode().catch(function () {}) : 0; }));
  }).then(start);
})();
