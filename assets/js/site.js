/* Kunal Wagh — portfolio interactions (no dependencies) */
(function () {
   'use strict';

   var root = document.documentElement;
   var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   root.classList.add('js');

   /* ---------- Theme toggle ---------- */
   var themeBtn = document.getElementById('themeToggle');
   function syncThemeLabel() {
      var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      themeBtn.setAttribute('aria-label', 'Switch to ' + next + ' theme');
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = root.dataset.theme === 'dark' ? '#0b0a10' : '#fbfaff';
   }
   if (themeBtn) {
      syncThemeLabel();
      themeBtn.addEventListener('click', function () {
         root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
         try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
         syncThemeLabel();
      });
   }

   /* ---------- Mobile nav ---------- */
   var navToggle = document.getElementById('navToggle');
   var navLinks = document.getElementById('navLinks');
   function setNav(open) {
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      navLinks.classList.toggle('is-open', open);
   }
   if (navToggle && navLinks) {
      navToggle.addEventListener('click', function () {
         setNav(navToggle.getAttribute('aria-expanded') !== 'true');
      });
      navLinks.addEventListener('click', function (e) {
         if (e.target.closest('a')) setNav(false);
      });
      document.addEventListener('keydown', function (e) {
         if (e.key === 'Escape' && navLinks.classList.contains('is-open')) { setNav(false); navToggle.focus(); }
      });
   }

   /* ---------- Sticky nav border + active link ---------- */
   var nav = document.querySelector('.nav');
   function onScroll() { nav.classList.toggle('is-scrolled', window.scrollY > 8); }
   window.addEventListener('scroll', onScroll, { passive: true });
   onScroll();

   if ('IntersectionObserver' in window) {
      var links = {};
      document.querySelectorAll('.nav__links a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
      var spy = new IntersectionObserver(function (entries) {
         entries.forEach(function (en) {
            var a = links[en.target.id];
            if (a && en.isIntersecting) {
               Object.keys(links).forEach(function (k) { links[k].classList.remove('is-active'); });
               a.classList.add('is-active');
            }
         });
      }, { rootMargin: '-45% 0px -50% 0px' });
      Object.keys(links).forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });
   }

   /* ---------- Reveal on scroll ---------- */
   var reveals = document.querySelectorAll('.reveal');
   if (reduceMotion || !('IntersectionObserver' in window)) {
      reveals.forEach(function (el) { el.classList.add('is-in'); });
   } else {
      var io = new IntersectionObserver(function (entries) {
         entries.forEach(function (en) {
            if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
         });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
      reveals.forEach(function (el) { io.observe(el); });
   }

   /* ---------- Experience: computed from start month, grows monthly ---------- */
   document.querySelectorAll('[data-since]').forEach(function (el) {
      var parts = el.dataset.since.split('-');
      var now = new Date();
      var months = (now.getFullYear() - +parts[0]) * 12 + (now.getMonth() + 1 - +parts[1]);
      var years = Math.floor((months / 12) * 10) / 10; // floor to 1 decimal, never overstates
      if (years > 0) { el.dataset.count = years; el.textContent = years.toFixed(1); }
   });

   /* ---------- Stat count-up ---------- */
   var counters = document.querySelectorAll('[data-count]');
   function countUp(el) {
      var target = parseFloat(el.dataset.count);
      var decimals = parseInt(el.dataset.decimals || '0', 10);
      var start = performance.now(), dur = 1100;
      function frame(now) {
         var p = Math.min((now - start) / dur, 1);
         var eased = 1 - Math.pow(1 - p, 3);
         el.textContent = (target * eased).toFixed(decimals);
         if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
   }
   if (!reduceMotion && 'IntersectionObserver' in window) {
      var co = new IntersectionObserver(function (entries) {
         entries.forEach(function (en) {
            if (en.isIntersecting) { countUp(en.target); co.unobserve(en.target); }
         });
      }, { threshold: 0.6 });
      counters.forEach(function (el) { co.observe(el); });
   }

   /* ---------- Contact form (FormSubmit) ---------- */
   var form = document.getElementById('contactForm');
   if (form) {
      var status = form.querySelector('.form__status');
      var submitBtn = form.querySelector('button[type="submit"]');
      form.addEventListener('submit', function (e) {
         e.preventDefault();
         status.className = 'form__status';
         var firstBad = null;
         form.querySelectorAll('[required]').forEach(function (f) {
            var ok = f.checkValidity() && f.value.trim() !== '';
            f.setAttribute('aria-invalid', ok ? 'false' : 'true');
            if (!ok && !firstBad) firstBad = f;
         });
         if (firstBad) {
            status.textContent = 'Please add your name, a valid email and a message.';
            status.classList.add('is-err');
            firstBad.focus();
            return;
         }
         var fields = form.querySelectorAll('input:not([type="hidden"]), textarea');
         var label = submitBtn.querySelector('.btn__label');
         function setSending(on) {
            form.classList.toggle('is-sending', on);
            form.setAttribute('aria-busy', String(on));
            submitBtn.disabled = on;
            fields.forEach(function (f) { f.readOnly = on; });
            label.textContent = on ? 'Sending…' : 'Send message';
         }

         var body = new FormData(form);
         setSending(true);
         status.textContent = 'Sending your message…';

         var ctrl = 'AbortController' in window ? new AbortController() : null;
         var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);

         fetch('https://formsubmit.co/ajax/kunalwagh282@gmail.com', {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body: body,
            signal: ctrl ? ctrl.signal : undefined
         })
            .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
            .then(function (data) {
               if (!(data.success === true || data.success === 'true')) throw new Error('fail');
               setSending(false);
               form.reset();
               status.textContent = 'Thanks — your message is on its way. I\'ll reply soon.';
               status.classList.add('is-ok');
               label.textContent = 'Sent ✓';
               submitBtn.classList.add('is-done');
               setTimeout(function () {
                  label.textContent = 'Send message';
                  submitBtn.classList.remove('is-done');
               }, 3000);
            })
            .catch(function (err) {
               setSending(false);
               var why = err && err.name === 'AbortError' ? 'The request timed out.' : 'Something went wrong.';
               status.innerHTML = why + ' Please try again or email <a href="mailto:kunalwagh282@gmail.com">kunalwagh282@gmail.com</a> directly.';
               status.classList.add('is-err');
            })
            .finally(function () { clearTimeout(timer); });
      });
   }
})();
