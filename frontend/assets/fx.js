/* ===========================================================================
   CycloTrack India — site intro (preloader) + global action-loading indicator
   ---------------------------------------------------------------------------
   Loaded UNDEFERRED as the first thing inside <body>, so it can paint the
   intro overlay before the rest of the page content. Exposes window.CycloLoader
   for any script on the page to signal a high-level action is in flight:
       CycloLoader.show('Submitting your request…')   // start
       CycloLoader.hide()                              // done (call/count-safe)
       CycloLoader.button(buttonEl, fetchPromise)       // spin a button + auto show/hide
   The intro plays once per browser tab session (sessionStorage), not on every
   page navigation, and always self-dismisses even if something goes wrong.
   ========================================================================= */
(function () {
    "use strict";

    /* ---------------- Intro / preloader ---------------- */
    (function intro() {
        var seen;
        try { seen = sessionStorage.getItem('cyclotrack_intro_seen'); } catch (e) { seen = null; }
        if (seen) return;

        var el = document.createElement('div');
        el.id = 'cyIntro';
        el.setAttribute('aria-hidden', 'true');
        el.innerHTML =
            '<div class="cy-intro-mark"><svg viewBox="0 0 84 84">' +
            '<circle class="cy-intro-ring" cx="42" cy="42" r="34"/>' +
            '<path class="cy-intro-swirl" d="M42 10 C60 10 68 24 62 36 C56 48 40 50 34 40"/>' +
            '<circle class="cy-intro-dot" cx="42" cy="42" r="4"/>' +
            '</svg></div>' +
            '<div class="cy-intro-word">Cyclo<span>Track</span> India</div>' +
            '<div class="cy-intro-tag">Detect &middot; Track &middot; Respond</div>' +
            '<div class="cy-intro-bar"><span></span></div>';

        document.documentElement.classList.add('cy-intro-lock');
        document.body.insertBefore(el, document.body.firstChild);

        var dismissed = false;
        function dismiss() {
            if (dismissed) return;
            dismissed = true;
            try { sessionStorage.setItem('cyclotrack_intro_seen', '1'); } catch (e) {}
            document.documentElement.classList.remove('cy-intro-lock');
            el.classList.add('cy-intro-out');
            setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 700);
        }

        var minShown = new Promise(function (res) { setTimeout(res, 900); });
        var pageLoaded = new Promise(function (res) {
            if (document.readyState === 'complete') res();
            else window.addEventListener('load', res, { once: true });
        });
        Promise.all([minShown, pageLoaded]).then(dismiss);
        setTimeout(dismiss, 3500); // hard cap so a slow asset never traps the visitor
    })();

    /* ---------------- Global action loader ---------------- */
    var bar, toast, toastLabel, active = 0, hideTimer;

    function ensure() {
        if (bar) return;
        bar = document.createElement('div'); bar.id = 'cyLoadBar';
        toast = document.createElement('div'); toast.id = 'cyLoadToast';
        toast.innerHTML = '<span class="cy-spin"></span><span class="cy-load-label">Working&hellip;</span>';
        toastLabel = toast.querySelector('.cy-load-label');
        document.body.appendChild(bar);
        document.body.appendChild(toast);
    }

    function show(label) {
        ensure();
        active++;
        clearTimeout(hideTimer);
        bar.classList.add('cy-active');
        requestAnimationFrame(function () { bar.style.width = '78%'; });
        if (label) toastLabel.textContent = label;
        toast.classList.add('cy-active');
    }

    function hide() {
        ensure();
        active = Math.max(0, active - 1);
        if (active > 0) return;
        bar.style.width = '100%';
        hideTimer = setTimeout(function () {
            bar.classList.remove('cy-active');
            toast.classList.remove('cy-active');
            setTimeout(function () { bar.style.width = '0%'; }, 300);
        }, 220);
    }

    function wrapButton(btn, promiseLike) {
        if (btn) btn.classList.add('cy-btn-busy');
        return Promise.resolve(promiseLike).finally(function () {
            if (btn) btn.classList.remove('cy-btn-busy');
        });
    }

    window.CycloLoader = { show: show, hide: hide, button: wrapButton };
})();
