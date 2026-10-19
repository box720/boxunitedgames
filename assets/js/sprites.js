/* Box United sprites: plays 1x pixel-art sheets on <canvas>. API + rules: docs/brand/BRAND.md s.7.
   No libraries, no network besides the sheet PNGs, no cookies, no storage. */
(function () {
  'use strict';
  var games = {}, waits = {}, sheets = {}, items = [], paused = false, raf = 0, last = 0, io = null;
  var ticking = false, again = false, W = window, D = document;
  var mm = function (q) { return W.matchMedia ? matchMedia(q) : null; };
  var mq = mm('(prefers-reduced-motion: reduce)'), dq = mm('(prefers-color-scheme: dark)');
  var reduced = !!(mq && mq.matches);
  var on = function (m, f) { if (m) { if (m.addEventListener) m.addEventListener('change', f); else m.addListener(f); } };

  // dark mode (<html data-theme> wins): '<name>-night' if present
  function variant(h) {
    var t = D.documentElement.getAttribute('data-theme');
    var dark = t ? t === 'dark' : !!(dq && dq.matches);
    h.s = (dark && h.g.sprites[h.base + '-night']) || h.g.sprites[h.base];
  }

  function sheet(src) {
    var im = sheets[src];
    if (!im) {
      im = sheets[src] = new Image();
      im.onload = function () { items.forEach(function (h) { if (h.img === im) draw(h); }); kick(); };
      im.src = src;
    }
    return im;
  }

  function size(h) {
    var s = h.s, k = parseInt(h.el.getAttribute('data-scale') || getComputedStyle(h.el).getPropertyValue('--sprite-scale'), 10);
    k = k > 0 ? k : 2;
    if (h.el.width !== s.w) h.el.width = s.w;
    if (h.el.height !== s.h) h.el.height = s.h;
    h.el.style.width = s.w * k + 'px';
    h.el.style.height = s.h * k + 'px';
    h.scale = k;
  }

  function draw(h) {
    if (!h.seq || !h.img.naturalWidth) return;
    var s = h.s, i = h.seq[h.k], f = s.f, c = h.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, s.w, s.h);
    if (h.flipped) c.setTransform(-1, 0, 0, 1, s.w, 0);
    c.drawImage(h.img, f[0] + (i % f[2]) * s.w, f[1] + Math.floor(i / f[2]) * s.h, s.w, s.h, 0, 0, s.w, s.h);
  }

  function still(h, anim) {
    var a = h.s.a[anim] || h.s.a.idle;
    h.seq = [a ? a.st : 0, 1e9];
    h.k = 0;
    draw(h);
  }

  // anim: a name or a sequence "idle,hop,wave*3" (the list loops)
  function play(h, anim, o) {
    o = o || {};
    var names = String(anim).split(','), first = names[0].split('*')[0], then = o.then;
    if (!h.s.a[first]) return h;
    h.anim = first;
    if (reduced) { // show where it would settle
      h.then = null;
      still(h, typeof then === 'string' && h.s.a[then] ? then : first);
      if (typeof then === 'function') then(h);
      return h;
    }
    h.then = then;
    h.once = !!o.once || names.length > 1 || !h.s.a[first].l;
    h.loopSeq = names.length > 1 && !o.once;
    h.seq = [];
    names.forEach(function (n) {
      var m = /^([\w-]+)(?:\*(\d+))?$/.exec(n.trim()), a = m && h.s.a[m[1]];
      for (var r = 0; a && r < (+m[2] || 1); r++) h.seq = h.seq.concat(a.s);
    });
    h.k = 0;
    h.t = o.offset || 0;
    advance(h, 0);
    draw(h);
    kick();
    return h;
  }

  function advance(h, dt) {
    var moved = false;
    h.t += dt;
    while (h.t >= h.seq[h.k + 1]) {
      h.t -= h.seq[h.k + 1];
      if (h.k + 2 < h.seq.length) h.k += 2;
      else if (h.loopSeq || !h.once) h.k = 0;
      else {
        var then = h.then;
        h.t = h.k = 0;
        h.seq = [h.seq[h.seq.length - 2], 1e9];
        h.then = null;
        if (typeof then === 'function') then(h);
        else if (then) play(h, then);
        return true;
      }
      moved = true;
    }
    return moved;
  }

  // one rAF loop at most (kick() mid-tick sets `again`); none when paused/reduced/hidden
  function idle() { return paused || reduced || D.hidden; }
  function tick(now) {
    raf = 0;
    if (idle()) { last = 0; return; }
    var dt = last ? Math.min(now - last, 250) : 0, live = false;
    last = now;
    ticking = true;
    again = false;
    items.forEach(function (h) {
      if (!h.vis || !h.seq) return;
      if (advance(h, dt)) draw(h);
      if (h.seq[h.k + 1] < 1e9) live = true;
    });
    ticking = false;
    if ((live || again) && !idle()) raf = requestAnimationFrame(tick);
    else last = 0;
  }
  function kick() {
    if (ticking) again = true;
    else if (!raf && !idle()) { last = 0; raf = requestAnimationFrame(tick); }
  }
  function halt() { if (raf) cancelAnimationFrame(raf); raf = last = 0; }

  // el: a <canvas> or a host element (canvas made inside); data-* read from el
  function mount(el, o) {
    o = o || {};
    if (el.__sprite) return el.__sprite;
    var host = el, attr = function (n) { return host.getAttribute(n); };
    var id = o.sprite || attr('data-sprite') || '', k = id.indexOf('/'), g = games[id.slice(0, k)];
    if (!g || !g.sprites[id.slice(k + 1)]) { host.__spritePending = o; return null; }
    if (el.tagName !== 'CANVAS') {
      el = D.createElement('canvas');
      el.className = 'sprite';
      el.setAttribute('aria-hidden', 'true');
      host.appendChild(el);
    }
    if (o.scale || attr('data-scale')) el.setAttribute('data-scale', o.scale || attr('data-scale'));
    var h = {
      el: el, g: g, base: id.slice(k + 1), ctx: el.getContext('2d'), vis: true, k: 0, t: 0,
      flipped: o.flip != null ? !!o.flip : host.hasAttribute('data-flip'),
      play: function (a, p) { return play(h, a, p); },
      flip: function (v) { h.flipped = !!v; draw(h); return h; },
      stop: function () { still(h, h.anim); return h; },
      anchor: function () { return { x: (h.flipped ? h.s.w - h.s.ax : h.s.ax) * h.scale, y: h.s.ay * h.scale }; }
    };
    variant(h);
    h.img = sheet(g.sheets[h.s.i]);
    h.ctx.imageSmoothingEnabled = false;
    el.__sprite = host.__sprite = h;
    delete host.__spritePending;
    size(h);
    items.push(h);
    if (io) io.observe(el);
    var tap = attr('data-tap');
    if (tap && !reduced) {
      el.addEventListener('click', function () {
        if (h.anim !== tap) play(h, tap, { once: true, then: function () { play(h, h.seqAttr); } });
      });
    }
    h.seqAttr = o.anim || attr('data-seq') || attr('data-anim') || 'idle';
    play(h, h.seqAttr, { offset: +(o.offset || attr('data-offset') || 0) });
    return h;
  }

  function scan(root) {
    var list = (root || D).querySelectorAll('[data-sprite]');
    for (var i = 0; i < list.length; i++) if (!list[i].__sprite) mount(list[i], list[i].__spritePending);
  }

  // anims [template, base, loop, still] over shared timelines T
  function register(name, man) {
    Object.keys(man.sprites).forEach(function (k) {
      var a = man.sprites[k].a;
      Object.keys(a).forEach(function (n) {
        var v = a[n];
        if (Array.isArray(v)) a[n] = { s: man.T[v[0]].map(function (x, j) { return j % 2 ? x : x + v[1]; }), l: v[2], st: v[3] };
      });
    });
    games[name] = man;
    (waits[name] || []).forEach(function (f) { f(man); });
    delete waits[name];
    if (D.readyState !== 'loading') scan(D);
  }

  if ('IntersectionObserver' in W) {
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.target.__sprite) e.target.__sprite.vis = e.isIntersecting; });
      kick();
    }, { rootMargin: '64px' });
  }
  D.addEventListener('visibilitychange', function () { if (D.hidden) halt(); else kick(); });
  var rt = 0;
  W.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { items.forEach(size); }, 150);
  });
  on(mq, function () {
    reduced = mq.matches;
    items.forEach(function (h) { if (reduced) still(h, h.anim); else play(h, h.seqAttr); });
    if (reduced) halt(); else kick();
  });
  function retheme() { items.forEach(function (h) { variant(h); draw(h); }); }
  on(dq, retheme);
  function fire(t) { D.dispatchEvent(new CustomEvent(t)); }

  W.BoxSprites = {
    register: register,
    mount: mount,
    scan: scan,
    play: function (el, a, o) { return el.__sprite ? play(el.__sprite, a, o) : null; },
    load: function (n) { return new Promise(function (ok) { if (games[n]) ok(games[n]); else (waits[n] = waits[n] || []).push(ok); }); },
    pause: function () { if (!paused) { paused = true; halt(); fire('boxsprites:pause'); } },
    resume: function () { if (paused) { paused = false; kick(); fire('boxsprites:resume'); } },
    retheme: retheme,
    get paused() { return paused; },
    get reduced() { return reduced; }
  };

  var q = W.__boxq || [];
  W.__boxq = { push: function (e) { register(e[0], e[1]); } };
  q.forEach(function (e) { register(e[0], e[1]); });
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', function () { scan(D); });
  else scan(D);
})();
