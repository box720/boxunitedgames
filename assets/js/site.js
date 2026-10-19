/* Box United site.js (W2): scroll reveals for every page except the home (home.js has its own copy).
   Only blocks that start below the fold get hidden, so first paint and JS-off never hide content. */
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  if (!window.IntersectionObserver || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  [].forEach.call(document.querySelectorAll('[data-reveal]'), function (el) {
    if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('reveal'); io.observe(el); }
  });
})();
