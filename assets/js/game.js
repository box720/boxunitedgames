/* Box United game pages (W3): trailer play button, muted loops that play only on screen, the yard's
   pause toggle, screenshot lightbox. JS off: links work, the trailer keeps native controls. */
(function () {
  'use strict';
  var d = document, w = window, calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function all(s, r) { return [].slice.call((r || d).querySelectorAll(s)); }
  function press(b, on) { b.setAttribute('aria-pressed', on); } // constant name ("Pause ..."), state in aria-pressed

  // sprite slots: drop the baked still once sprites.js has the sheet (it draws on load)
  var slots = all('.gp-pet'), n = 0;
  (function live() {
    slots = slots.filter(function (s) {
      var h = s.firstChild.__sprite, im = h && h.img;
      if (im && im.complete && im.naturalWidth) { s.classList.add('is-live'); return false; }
      return true;
    });
    if (slots.length && ++n < 600) requestAnimationFrame(live);
  })();

  // yard: hint + pause, only when the pets can move
  var mt = d.querySelector('.gp-motion'), BS = w.BoxSprites;
  if (mt && BS && !calm) {
    mt.hidden = d.querySelector('.gp-yard__hint').hidden = false;
    mt.onclick = function () {
      var off = !BS.paused;
      press(mt, off);
      if (off) BS.pause(); else BS.resume();
    };
  }

  // trailer: big play button; native controls appear once it plays
  all('.gp-video__play').forEach(function (b) {
    var v = d.getElementById(b.getAttribute('data-video'));
    v.controls = false;
    b.hidden = false;
    b.onclick = function () { v.play(); };
    v.addEventListener('play', function () { b.hidden = true; v.controls = true; });
  });
  all('.gp-cta').forEach(function (a) {
    a.addEventListener('click', function () {
      var v = d.getElementById('gp-' + a.getAttribute('data-play') + '-video');
      if (v) { v.play(); v.focus({ preventScroll: true }); }
    });
  });

  // muted loops (no audio track): play while on screen, never under reduced motion, pausable
  if (!calm && w.IntersectionObserver) all('.gp-loop').forEach(function (box) {
    var v = box.querySelector('video'), b = box.querySelector('button'), held = false, seen = false;
    function run() {
      if (seen && !held && !d.hidden) { v.preload = 'auto'; var p = v.play(); if (p) p.catch(function () {}); } else v.pause();
    }
    b.hidden = false;
    new IntersectionObserver(function (es) { seen = es[0].isIntersecting; run(); }, { threshold: 0.25 }).observe(box);
    d.addEventListener('visibilitychange', run);
    b.onclick = function () { held = !held; press(b, held); run(); };
  });

  // screenshot grid: <dialog> lightbox, the 640x360 shot at 1x / 2x
  var grid = d.getElementById('gp-thumbs'), dlg = d.createElement('dialog');
  if (!grid || !dlg.showModal) return;
  var links = all('.gp-thumb', grid), at = 0, box = d.createElement('div'), img = new Image(),
      cap = d.createElement('p'), bar = d.createElement('div');
  dlg.className = 'gp-lightbox'; box.className = 'gp-lightbox__in'; bar.className = 'gp-lightbox__bar';
  cap.id = 'gp-lb-cap'; dlg.setAttribute('aria-labelledby', cap.id);
  img.width = 640; img.height = 360;
  function btn(txt, key, fn) {
    var b = d.createElement('button');
    b.type = 'button'; b.className = 'btn btn--ghost'; b.textContent = txt; b.onclick = fn;
    if (key) b.setAttribute('aria-label', grid.getAttribute(key));
    bar.appendChild(b);
    return b;
  }
  function show(i) {
    at = (i + links.length) % links.length;
    var a = links[at];
    img.src = a.href; img.alt = a.firstChild.alt;
    cap.textContent = a.getAttribute('data-caption') + ' (' + (at + 1) + ' ' + grid.getAttribute('data-of') + ' ' + links.length + ')';
  }
  btn('←', 'data-prev', function () { show(at - 1); });
  var close = btn(grid.getAttribute('data-close'), '', function () { dlg.close(); });
  btn('→', 'data-next', function () { show(at + 1); });
  box.append(img, cap, bar); dlg.append(box); d.body.append(dlg);
  links.forEach(function (a, i) {
    a.onclick = function (e) {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
      e.preventDefault(); show(i); dlg.showModal(); close.focus();
    };
  });
  dlg.onkeydown = function (e) {
    if (e.key === 'ArrowLeft') show(at - 1); else if (e.key === 'ArrowRight') show(at + 1);
  };
  dlg.onclick = function (e) { if (e.target === dlg) dlg.close(); };
})();
