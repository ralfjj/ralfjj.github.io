(function () {
  var body = document.body, root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var desktop = window.matchMedia('(min-width: 761px)').matches;
  var hover = window.matchMedia('(hover: hover) and (min-width: 761px)').matches;

  // ---------- images: fade in once decoded (placeholder blur shows until then)
  var lift = function (img) { img.classList.add('is-in'); };
  document.querySelectorAll('.ph img').forEach(function (img) {
    if (img.complete && img.naturalWidth) lift(img);
    else { img.addEventListener('load', function () { lift(img); }, { once: true }); img.addEventListener('error', function () { lift(img); }, { once: true }); }
  });

  // ---------- page wipe: 10 bars lift on arrival, drop on internal navigation (almira: .4s, 30ms stagger, quint out)
  requestAnimationFrame(function () { requestAnimationFrame(function () { body.classList.add('ready'); }); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) { body.classList.remove('leaving'); body.classList.add('ready'); } });
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a || reduce || a.target === '_blank' || a.hasAttribute('download') || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.hash && url.pathname === location.pathname) return;
    e.preventDefault();
    body.classList.remove('ready');
    body.classList.add('leaving');
    setTimeout(function () { location.href = url.href; }, 700);   // last bar lands at 400 + 9 x 30 = 670ms
  });

  // ---------- home: leave exactly enough room under the big image for the statement
  var st = document.querySelector('.statement');
  var fit = function () { if (st) root.style.setProperty('--band', (st.offsetHeight + 40) + 'px'); };
  fit(); window.addEventListener('resize', fit);
  if (document.fonts) document.fonts.ready.then(fit);

  // ---------- home (desktop): the project column loops forever; originals + two copies below, we sit in the middle one
  var list = document.querySelector('.list');
  var loopOn = list && !reduce && desktop;
  if (loopOn) {
    var originals = [].slice.call(list.children);
    [0, 1].forEach(function (n) {
      originals.forEach(function (t) {
        var c = t.cloneNode(true);
        c.setAttribute('aria-hidden', 'true'); c.setAttribute('tabindex', '-1');
        c.querySelectorAll('img').forEach(function (img) {
          img.classList.remove('is-in');
          img.addEventListener('load', function () { lift(img); }, { once: true });
          if (img.complete && img.naturalWidth) lift(img);
        });
        list.appendChild(c);   // append only: content above never moves, so no layout shift
      });
    });
  }

  // ---------- outline twin over big inverted text (thin dark-grey stroke, so white-on-grey never vanishes)
  document.querySelectorAll('.tile .t, .caption, .next').forEach(function (el) {
    var t = el.closest('.tile'); if (t && !t.querySelector('img')) return;   // black tiles need no outline
    var c = el.cloneNode(true);
    c.classList.add('halo');
    c.setAttribute('aria-hidden', 'true');
    c.removeAttribute('id');
    if (c.tagName === 'A') { c.setAttribute('tabindex', '-1'); c.removeAttribute('href'); }
    c.querySelectorAll('a').forEach(function (a) { a.setAttribute('tabindex', '-1'); a.removeAttribute('href'); });
    el.parentNode.insertBefore(c, el.nextSibling);
  });

  // ---------- story: the film's caption steps aside while the set diary runs
  var story = document.querySelector('.story');
  if (story && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { es.forEach(function (x) { body.classList.toggle('in-story', x.isIntersecting); }); },
      { rootMargin: '-45% 0px -45% 0px' }).observe(story);
  }

  // ---------- loops: play only while on screen; never auto-play for reduced motion
  var vids = document.querySelectorAll('video');
  if (vids.length) {
    if (reduce || !('IntersectionObserver' in window)) vids.forEach(function (v) { v.controls = true; v.preload = 'metadata'; });
    else {
      var vo = new IntersectionObserver(function (es) {
        es.forEach(function (x) {
          var v = x.target;
          if (x.isIntersecting) { if (v.preload !== 'auto') { v.preload = 'auto'; } var p = v.play(); if (p && p.catch) p.catch(function () {}); }
          else v.pause();
        });
      }, { rootMargin: '10% 0px' });
      vids.forEach(function (v) { vo.observe(v); });
    }
  }

  // ---------- cursor tag (almira: black box trailing the pointer with lerp .1, wipes open)
  var tag = document.querySelector('.tag');
  if (tag && hover) {
    var tp = tag.firstElementChild, mx = 0, my = 0, tx = 0, ty = 0, on = null, tw = 0, running = false, lastT = '';
    // width is read once when the label changes (not every frame: that forced a layout per frame), loop sleeps once settled
    var follow = function () {
      tx += (mx - tx) * (reduce ? 1 : 0.1); ty += (my - ty) * (reduce ? 1 : 0.1);
      var x = tx + 14 + tw > innerWidth - 10 ? tx - 14 - tw : tx + 14;   // flip left near the right edge
      var v = 'translate3d(' + x.toFixed(1) + 'px,' + (ty + 18).toFixed(1) + 'px,0)';
      if (v !== lastT) { lastT = v; tag.style.transform = v; }
      if (Math.abs(mx - tx) + Math.abs(my - ty) > 0.2) requestAnimationFrame(follow); else running = false;
    };
    var wake = function () { if (!running) { running = true; requestAnimationFrame(follow); } };
    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      var t = e.target.closest && e.target.closest('[data-tag]');
      if (t !== on) {
        on = t;
        if (t) { if (!tag.classList.contains('on')) { tx = mx; ty = my; } tp.textContent = t.getAttribute('data-tag'); tw = tag.offsetWidth; tag.classList.add('on'); }
        else tag.classList.remove('on');
      }
      wake();
    }, { passive: true });
    document.addEventListener('mouseleave', function () { on = null; tag.classList.remove('on'); });
  }

  // ---------- reveal frames: each photo is a window onto a picture that moves slower than the page
  var lenis = null;
  if (!reduce) {
    var frames = [];
    document.querySelectorAll('.tile > .ph, .hero > .ph, .pic > .ph').forEach(function (f) {
      var img = f.querySelector('img');
      if (!img) return;
      f.classList.add('reel');
      frames.push({ f: f, img: img, k: f.parentNode.classList.contains('pic') ? 0.10 : 0.14 });
    });
    var vh = window.innerHeight;
    // frame positions are cached in page coordinates (re-measured on resize / load / layout change),
    // so a scrolling frame does no layout reads at all, only transform writes
    var size = function () {
      vh = window.innerHeight;
      var sy = window.scrollY;
      frames.forEach(function (o) { o.h = o.f.offsetHeight; o.extra = Math.round(o.k * o.h); o.img.style.height = (o.h + o.extra) + 'px'; });
      frames.forEach(function (o) { o.top = o.f.getBoundingClientRect().top + sy; });
    };
    var lastY = null;
    var paint = function (force) {
      var y = window.scrollY;
      if (y === lastY && !force) return;   // nothing moved: no work this frame
      lastY = y;
      var i, o;
      for (i = 0; i < frames.length; i++) {
        o = frames[i];
        var t = o.top - y;
        if (t + o.h < -50 || t > vh + 50) continue;
        var p = Math.min(1, Math.max(0, (vh - t) / (vh + o.h)));   // 0 entering bottom -> 1 leaving top
        var v = (-p * o.extra).toFixed(1);
        if (o.v !== v) { o.v = v; o.img.style.transform = 'translate3d(0,' + v + 'px,0)'; }
      }
    };
    size(); paint(true);
    var resized = function () { size(); paint(true); if (window.__drift) window.__drift(); };
    window.addEventListener('resize', resized);
    window.addEventListener('load', resized);
    if (document.fonts) document.fonts.ready.then(resized);
    if ('ResizeObserver' in window) { var rq = 0; new ResizeObserver(function () { cancelAnimationFrame(rq); rq = requestAnimationFrame(resized); }).observe(body); }

    // almira's Lenis settings: 1.2s, exponential ease-out, wheel x0.8
    lenis = window.Lenis ? new window.Lenis({ duration: 1.2, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, wheelMultiplier: 0.8 }) : null;
    window.__lenis = lenis;
    if (loopOn) {
      var setH = 0;
      var measure = function () { setH = list.scrollHeight / 3; };
      var jump = function (y) { if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y); };
      measure();
      window.addEventListener('resize', measure);
      jump(setH);
      var kb = false;   // while tabbing, the real (focusable) tiles must stay on screen, so the loop holds still
      document.addEventListener('focusin', function (e) { if (list.contains(e.target)) kb = true; });
      ['wheel', 'touchstart', 'mousedown'].forEach(function (t) { window.addEventListener(t, function () { kb = false; }, { passive: true }); });
      // the copies are identical, so moving the page AND the smooth-scroll glide by one set is invisible: no stop, no stutter
      var shift = function (d) {
        if (!lenis) { window.scrollTo(0, window.scrollY + d); return; }
        var a = lenis.animate;
        if (a) { a.from += d; a.to += d; a.value += d; }
        lenis.targetScroll += d; lenis.animatedScroll += d;
        lenis.setScroll(lenis.animatedScroll);
        lastY = null;
      };
      var wrap = function () {
        if (kb) return;
        var y = lenis ? lenis.animatedScroll : window.scrollY;
        if (y > setH * 1.6) shift(-setH);
        else if (y < setH * 0.4) shift(setH);
      };
      if (lenis) lenis.on('scroll', wrap); else window.addEventListener('scroll', wrap, { passive: true });
    }
    // keyboard: smooth scroll swallows the browser's own scroll-to-focus, so bring the focused thing into view ourselves
    document.addEventListener('focusin', function (e) {
      var r = e.target.getBoundingClientRect && e.target.getBoundingClientRect();
      if (!r || e.target.closest('.top, .skip') || (r.top >= 60 && r.bottom <= innerHeight - 20)) return;
      var y = Math.max(0, window.scrollY + r.top - innerHeight / 3);   // window.scrollY: the browser may already have moved, Lenis lags
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
    });
    var loop = function (time) { if (lenis) lenis.raf(time); paint(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  // ---------- home: pointing at (or tabbing to) a project swaps the big image on the left
  var stage = document.getElementById('stage');
  if (stage && desktop) {
    var current = stage.getAttribute('src');
    var vid = null;
    var showVideo = function (v) {
      if (!v) { if (vid) { vid.classList.add('fade'); vid.pause(); } return; }
      if (!vid) { vid = document.createElement('video'); vid.muted = true; vid.loop = true; vid.playsInline = true; vid.setAttribute('aria-hidden', 'true'); vid.className = 'fade'; stage.parentNode.appendChild(vid); }
      if (vid.getAttribute('src') !== v) vid.src = v;
      vid.play().then(function () { vid.classList.remove('fade'); }, function () {});
    };
    var show = function (src, v) {
      showVideo(v);
      if (armed) stage.parentNode.classList.add('alt');   // Ghost Division plays on arrival, gives way once the visitor scrolls or points at a film
      if (!src || src === current) return;
      current = src;
      var img = new Image();
      img.onload = function () {
        if (current !== src) return;   // a newer film was pointed at while this one loaded
        if (img.decode) img.decode().catch(function () {});   // decode off-thread before the swap, so the fade-in never hitches
        stage.classList.add('fade');
        setTimeout(function () { if (current === src) { stage.removeAttribute('srcset'); stage.src = src; stage.classList.remove('fade'); } }, 180);
      };
      img.src = src;
    };
    var timer = null, lastTile = null, px = -1, py = -1;
    var armed = false, arm = function () { armed = true; };
    ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { window.addEventListener(ev, arm, { passive: true, once: true }); });
    // scrolling: the film under the cursor (or, with the cursor elsewhere, the one crossing mid-screen) takes the stage
    var stimer = null, slast = 0;
    window.addEventListener('scroll', function () {
      clearTimeout(stimer);
      var wait = Math.max(0, 140 - (Date.now() - slast));   // at most every 140ms while scrolling, plus once when it settles
      stimer = setTimeout(function () {
        slast = Date.now();
        if (window.scrollY < 40) { lastTile = null; show(stage.dataset.default, null); return; }
        var el = px >= 0 ? document.elementFromPoint(px, py) : null;
        var w = el && el.closest && el.closest('.tile-wrap');
        if (!w) {
          var mid = innerHeight / 2;
          w = [].find.call(document.querySelectorAll('.tile-wrap'), function (x) { var r = x.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; });
        }
        var t = w && w.querySelector('.tile');
        if (!t || t === lastTile) return;
        lastTile = t;
        show(t.dataset.cover || stage.dataset.default, t.dataset.video);
      }, wait);
    }, { passive: true });
    document.addEventListener('mousemove', function (e) {
      if (Math.abs(e.clientX - px) + Math.abs(e.clientY - py) < 2) return;   // Chrome fires fake moves after scrolling
      px = e.clientX; py = e.clientY;
      var w = e.target.closest && e.target.closest('.tile-wrap'), t = w ? w.querySelector('.tile') : (e.target.closest && e.target.closest('.tile'));
      if (!t || (t === lastTile && armed)) return;   // cursor off the tiles: keep the last film on the big screen
      lastTile = t;                                   // (the film the opening scroll already picked silently still counts as a first point)
      armed = true;
      clearTimeout(timer);
      timer = setTimeout(function () { show(t && t.dataset.cover ? t.dataset.cover : stage.dataset.default, t && t.dataset.video); }, 220);
    }, { passive: true });
    document.addEventListener('focusin', function (e) {
      var w = e.target.closest && e.target.closest('.tile-wrap'), t = w ? w.querySelector('.tile') : (e.target.closest && e.target.closest('.tile'));
      if (t) show(t.dataset.cover || stage.dataset.default, t.dataset.video);
    });
  }
})();

/* trailer = header: muted background loop, sound on click */
(function () {
  var Y = 'https://www.youtube-nocookie.com/embed/', V = 'https://player.vimeo.com/video/';   // 'v:ID' = Vimeo
  document.querySelectorAll('.ytbg[data-yt]').forEach(function (bg) {
    var id = bg.dataset.yt, f = document.createElement('iframe');
    f.src = id.indexOf('v:') === 0 ? V + id.slice(2) + '?background=1&autoplay=1&muted=1&loop=1&dnt=1'
      : Y + id + '?autoplay=1&mute=1&loop=1&playlist=' + id + '&controls=0&disablekb=1&playsinline=1&rel=0&iv_load_policy=3&modestbranding=1';
    f.allow = 'autoplay; encrypted-media'; f.tabIndex = -1; f.title = '';
    f.addEventListener('load', function () { setTimeout(function () { bg.classList.add('on'); }, 1200); });
    bg.appendChild(f);
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.watch');
    if (!b) return;
    var hero = b.closest('.hero'), f = document.createElement('iframe');
    f.className = 'player';
    var id = b.dataset.yt;
    f.src = id.indexOf('v:') === 0 ? V + id.slice(2) + '?autoplay=1&dnt=1' : Y + id + '?autoplay=1&rel=0&playsinline=1';
    f.title = b.getAttribute('aria-label');
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    var bg = hero.querySelector('.ytbg'); if (bg) bg.remove();
    var v = hero.querySelector('video'); if (v) v.pause();
    b.replaceWith(f);
    document.body.classList.add('watching');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

/* scroll cue: 'Behind the scenes ↓' at the top, 'Next project' once you scroll */
(function () {
  var d = document.querySelector('.down');
  if (!d) return;
  var set = function () { document.body.classList.toggle('at-top', window.scrollY < 30); };
  set(); window.addEventListener('scroll', set, { passive: true });
  d.addEventListener('click', function (e) {
    e.preventDefault();
    var m = document.getElementById('more'), y = m ? m.getBoundingClientRect().top + window.scrollY : window.innerHeight;
    if (window.__lenis) window.__lenis.scrollTo(y); else window.scrollTo({ top: y, behavior: 'smooth' });
  });
})();

/* arriving via a home quick link: #trailer opens the trailer with sound, section anchors scroll there */
(function () {
  var h = location.hash;
  if (h === '#trailer') {
    var b = document.querySelector('.watch'); if (b) setTimeout(function () { b.click(); }, 300);
  } else if (h && h.length > 1 && window.__lenis) {
    var el = document.getElementById(h.slice(1));
    if (el) setTimeout(function () { window.__lenis.scrollTo(el, { offset: -90, immediate: true }); }, 50);
  }
})();

/* extra videos + commercials: play in a full-screen overlay, thumbnail stays clean */
(function () {
  var box = null;
  function close() {
    if (!box) return;
    var b = box._from; box.remove(); box = null;
    document.documentElement.classList.remove('lb-open');
    if (window.__lenis) window.__lenis.start();
    if (b) b.focus();
  }
  document.addEventListener('click', function (e) {
    if (box && (e.target === box || e.target.closest('.lb-x'))) { close(); return; }
    var b = e.target.closest && e.target.closest('button.vid');
    if (!b) return;
    var f;
    if (b.dataset.mp4) {
      f = document.createElement('video'); f.src = b.dataset.mp4; f.controls = true; f.autoplay = true; f.playsInline = true;
    } else {
      f = document.createElement('iframe');
      f.src = b.dataset.vimeo ? 'https://player.vimeo.com/video/' + b.dataset.vimeo + '?autoplay=1&dnt=1&title=0&byline=0&portrait=0'
                              : 'https://www.youtube-nocookie.com/embed/' + b.dataset.yt + '?autoplay=1&rel=0&playsinline=1&modestbranding=1';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true;
    }
    f.title = b.getAttribute('aria-label');
    box = document.createElement('div'); box.className = 'lb'; box._from = b;
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', f.title);
    var x = document.createElement('button'); x.type = 'button'; x.className = 'lb-x'; x.setAttribute('aria-label', 'Close video'); x.textContent = '✕';
    var fr = document.createElement('div'); fr.className = 'lb-f'; fr.appendChild(f);
    box.appendChild(x); box.appendChild(fr); document.body.appendChild(box);
    document.documentElement.classList.add('lb-open');
    if (window.__lenis) window.__lenis.stop();
    x.focus();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();

/* works reel: start a trailer loop only while its section is on screen */
(function () {
  var items = document.querySelectorAll('.reel-item');
  if (!items.length || !('IntersectionObserver' in window)) return;
  var Y = 'https://www.youtube-nocookie.com/embed/', V = 'https://player.vimeo.com/video/';
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (en) {
      var s = en.target, bg = s.querySelector('.ytbg'), v = s.querySelector('video[data-src]');
      if (en.isIntersecting) {
        if (bg && !bg.firstChild) {
          var id = bg.dataset.lazy, f = document.createElement('iframe');
          f.src = id.indexOf('v:') === 0 ? V + id.slice(2) + '?background=1&autoplay=1&muted=1&loop=1&dnt=1'
            : Y + id + '?autoplay=1&mute=1&loop=1&playlist=' + id + '&controls=0&disablekb=1&playsinline=1&rel=0&iv_load_policy=3&modestbranding=1';
          f.allow = 'autoplay; encrypted-media'; f.tabIndex = -1; f.title = '';
          f.addEventListener('load', function () { setTimeout(function () { bg.classList.add('on'); }, 1200); });
          bg.appendChild(f);
        }
        if (v) { if (!v.src) v.src = v.dataset.src; v.play().catch(function () {}); }
      } else {
        if (bg && bg.firstChild) { bg.classList.remove('on'); bg.innerHTML = ''; }
        if (v) v.pause();
      }
    });
  }, { rootMargin: '-10% 0px' });
  items.forEach(function (s) { io.observe(s); });
  // captions rise in once a film is a third on screen, reset when it leaves
  var cap = new IntersectionObserver(function (es) {
    es.forEach(function (en) { en.target.classList.toggle('in', en.intersectionRatio > 0.3); });
  }, { threshold: [0, 0.3] });
  items.forEach(function (s) { cap.observe(s); });
})();

/* project pages: ← → keys and sideways swipe go to the previous/next project */
(function () {
  if (!document.body.classList.contains('work')) return;
  var prev = document.querySelector('a.prev'), next = document.querySelector('a.next');
  var go = function (a) { if (a) location.href = a.href; };
  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey || document.querySelector('.lb')) return;
    if (/INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === 'ArrowLeft') go(prev); else if (e.key === 'ArrowRight') go(next);
  });
  var x0 = null, y0 = 0;
  document.addEventListener('touchstart', function (e) { var t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2 && !e.target.closest('iframe, .vid, .lb')) go(dx < 0 ? next : prev);
  }, { passive: true });
})();

/* works reel: a small automatic scroll "peek" at the start, so it's clear the page scrolls */
(function () {
  if (!document.querySelector('.reel-item') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var stop = false, cancel = function () { stop = true; };
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (t) { window.addEventListener(t, cancel, { passive: true, once: true }); });
  var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  setTimeout(function () {
    if (stop || window.scrollY > 5) return;
    var L = window.__lenis, d = Math.round(window.innerHeight * 0.22);
    if (L) {
      L.scrollTo(d, { duration: 1.1, easing: ease, onComplete: function () {
        setTimeout(function () { if (!stop) L.scrollTo(0, { duration: 1.2, easing: ease }); }, 350);
      } });
    } else {
      window.scrollTo({ top: d, behavior: 'smooth' });
      setTimeout(function () { if (!stop) window.scrollTo({ top: 0, behavior: 'smooth' }); }, 1300);
    }
  }, 2600);
})();

/* home: film names on the tiles drift at their own pace while scrolling (soft, lagging follow)
   tile positions are cached (no layout reads per frame); the looping copies of one film share one drift value,
   so the invisible jump between copies never makes a title hop */
(function () {
  if (!document.querySelector('main.split') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var tiles = [].slice.call(document.querySelectorAll('main.split .tile'));
  var n = tiles.filter(function (t) { return !t.closest('[aria-hidden="true"]'); }).length || tiles.length;
  var shared = [];
  var items = tiles.map(function (tile, i) {
    var k = i % n; shared[k] = shared[k] || { c: 0, f: -1 };
    return { tile: tile, t: [].slice.call(tile.querySelectorAll('.t')), y: tile.querySelector('.y'), s: shared[k], v: '' };
  }).filter(function (o) { return o.t.length; });
  if (!items.length) return;
  var vh = 0, frame = 0;
  var measure = function () {
    vh = window.innerHeight;
    var sy = window.scrollY;
    items.forEach(function (o) { var r = o.tile.getBoundingClientRect(); o.top = r.top + sy; o.h = r.height; });
  };
  window.__drift = measure;
  measure();
  window.addEventListener('resize', measure);
  var tick = function () {
    frame++;
    var y = window.scrollY;
    for (var i = 0; i < items.length; i++) {
      var o = items[i], top = o.top - y;
      if (top + o.h < -100 || top > vh + 100) continue;
      var s = o.s;
      if (s.f !== frame) {                                   // advance each film's follow once per frame
        s.f = frame;
        var goal = (top + o.h / 2 - vh / 2) / vh * vh * 0.16;   // names lag behind the picture
        s.c += (goal - s.c) * 0.07;                            // eased follow = the floaty motion
        if (Math.abs(goal - s.c) < 0.05) s.c = goal;
      }
      var v = s.c.toFixed(2);
      if (v === o.v) continue;
      o.v = v;
      o.t.forEach(function (el) { el.style.transform = 'translate3d(0,' + v + 'px,0)'; });
      if (o.y) o.y.style.transform = 'translate3d(0,' + (s.c * 1.35).toFixed(2) + 'px,0)';
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();
