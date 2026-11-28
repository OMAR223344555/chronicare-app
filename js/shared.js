/* Chronicare shared UI: theme, skeletons, animations, a11y helpers */
(function () {
    'use strict';

    // ---- Scroll lock: freeze the page under drawers, palette and modals ----
    // body becomes position:fixed at the current scroll offset so touch
    // gestures on an overlay cannot rubber-band the document or collapse
    // the mobile browser toolbar; the offset is restored on unlock.
    window.CCScrollLock = (function () {
        let count = 0, lockedY = 0;
        function lock() {
            if (count++ === 0) {
                lockedY = window.scrollY || document.documentElement.scrollTop || 0;
                document.documentElement.classList.add('overlay-open');
                document.body.classList.add('scroll-locked');
                document.body.style.top = `-${lockedY}px`;
            }
        }
        function unlock() {
            if (count > 0 && --count === 0) {
                document.documentElement.classList.remove('overlay-open');
                document.body.classList.remove('scroll-locked');
                document.body.style.top = '';
                try { window.scrollTo({ top: lockedY, behavior: 'instant' }); }
                catch (e) { window.scrollTo(0, lockedY); }
            }
        }
        return { lock, unlock };
    })();

    // ---- Theme ----
    function applyTheme(mode) {
        const root = document.documentElement;
        // One-frame flip: kill every element transition for the switch so rows
        // and cards do not fade through their own grey midpoint at different
        // speeds. Also move the html backdrop, which the head script sets once
        // at load and would otherwise stay on the old colour.
        root.classList.add('cc-theme-switch');
        root.classList.toggle('dark', mode === 'dark');
        root.style.background = mode === 'dark' ? '#0a1522' : '#f1f5f9';
        requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('cc-theme-switch')));
        setTimeout(() => root.classList.remove('cc-theme-switch'), 300);
        try { localStorage.setItem('cc-theme', mode); } catch (e) {}
        document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
            btn.setAttribute('aria-pressed', mode === 'dark' ? 'true' : 'false');
            const icon = btn.querySelector('[data-lucide], svg');
            if (icon) {
                const name = mode === 'dark' ? 'sun' : 'moon';
                btn.innerHTML = '<i data-lucide="' + name + '" class="w-5 h-5"></i>';
            }
        });
        if (window.lucide) window.lucide.createIcons();
        document.dispatchEvent(new CustomEvent('cc:theme', { detail: { mode } }));
    }
    function toggleTheme() {
        const dark = !document.documentElement.classList.contains('dark');
        applyTheme(dark ? 'dark' : 'light');
    }
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-theme-toggle]');
        if (btn) toggleTheme();
    });
    // restore already applied by inline head script; just sync icons on load
    document.addEventListener('DOMContentLoaded', () => {
        const dark = document.documentElement.classList.contains('dark');
        document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
            btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
            btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
            btn.innerHTML = '<i data-lucide="' + (dark ? 'sun' : 'moon') + '" class="w-5 h-5"></i>';
        });
        if (window.lucide) window.lucide.createIcons();
    });

    // ---- Skeleton loaders ----
    // ---- History-aware navigation (Back button support) ----
    const ccClosers = [];
    window.CCHist = {
        pushView(name) {
            const target = '#' + name;
            if (window.location.hash !== target) history.pushState({ cc: 'view', view: name }, '', target);
        },
        pushOverlay() { history.pushState({ cc: 'overlay' }, '', window.location.href); },
        registerCloser(fn) { ccClosers.push(fn); },
    };
    window.addEventListener('popstate', () => {
        for (const close of ccClosers) { if (close()) return; }
        const view = window.location.hash.replace('#', '').trim();
        document.dispatchEvent(new CustomEvent('cc:popview', { detail: { view } }));
    });

    function skeletonRows(container, rows, cols) {
        if (!container) return;
        rows = rows || 4;
        if (container.tagName === 'TBODY') {
            let html = '';
            for (let i = 0; i < rows; i++) {
                html += '<tr aria-hidden="true"><td colspan="20" style="padding:12px 8px"><div class="skeleton" style="height:14px;width:' + (70 - i * 8) + '%"></div></td></tr>';
            }
            container.innerHTML = html;
            return;
        }
        let html = '';
        for (let i = 0; i < rows; i++) {
            html += '<div class="skel-row" aria-hidden="true">';
            const n = cols || 3;
            for (let c = 0; c < n; c++) {
                const w = c === 0 ? '38%' : (c === n - 1 ? '18%' : '26%');
                html += '<div class="skeleton" style="height:14px;width:' + w + '"></div>';
            }
            html += '</div>';
        }
        container.innerHTML = html;
    }
    function skeletonCards(container, count) {
        if (!container) return;
        let html = '';
        for (let i = 0; i < (count || 3); i++) {
            html += '<div class="skel-card" aria-hidden="true">'
                + '<div class="skeleton" style="height:18px;width:45%"></div>'
                + '<div class="skeleton" style="height:12px;width:70%;margin-top:10px"></div>'
                + '<div class="skeleton" style="height:12px;width:55%;margin-top:8px"></div>'
                + '<div class="skeleton" style="height:40px;width:100%;margin-top:14px;border-radius:12px"></div>'
                + '</div>';
        }
        container.innerHTML = html;
    }
    function withSkeleton(container, renderFn, mode, delay) {
        if (!container) { renderFn(); return; }
        if (mode === 'cards') skeletonCards(container); else skeletonRows(container);
        setTimeout(() => {
            renderFn();
            if (window.lucide) window.lucide.createIcons();
        }, delay || 320);
    }

    // ---- Count-up animation for stat numbers ----
    function countUp(el, target, opts) {
        if (!el) return;
        // Token guard: a newer write (e.g. real API data landing mid-animation) cancels this run.
        el.__ccAnim = (el.__ccAnim || 0) + 1;
        const animToken = el.__ccAnim;
        opts = opts || {};
        const dur = opts.duration || 900;
        const decimals = opts.decimals || 0;
        const suffix = opts.suffix || '';
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            el.textContent = target.toFixed(decimals) + suffix;
            return;
        }
        const start = performance.now();
        function tick(now) {
            if (el.__ccAnim !== animToken) return;
            const p = Math.min(1, (now - start) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = (target * eased).toFixed(decimals) + suffix;
            if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }


    // ---- Command palette ----
    let paletteEl = null, paletteList = null, paletteInput = null, paletteIdx = 0, paletteMatches = [];

    function paletteSources() {
        try { return (window.CC_SOURCES ? window.CC_SOURCES() : []) || []; } catch (e) { return []; }
    }
    function buildPalette() {
        if (paletteEl) return;
        paletteEl = document.createElement('div');
        paletteEl.className = 'palette-overlay hidden';
        paletteEl.setAttribute('role', 'dialog');
        paletteEl.setAttribute('aria-modal', 'true');
        paletteEl.setAttribute('aria-label', 'Command palette');
        paletteEl.innerHTML = '<div class="palette-card pop-in">'
            + '<div class="palette-input-row">'
            + '<i data-lucide="search" class="w-4 h-4"></i>'
            + '<input type="text" class="palette-input" data-i18n-placeholder="palette.placeholder" placeholder="Search pages, records, actions...">'
            + '<kbd class="palette-kbd">Esc</kbd>'
            + '</div>'
            + '<div class="palette-list" role="listbox"></div>'
            + '</div>';
        paletteEl.addEventListener('click', (e) => { if (e.target === paletteEl) closePalette(); });
        document.body.appendChild(paletteEl);
        paletteInput = paletteEl.querySelector('.palette-input');
        paletteList = paletteEl.querySelector('.palette-list');
        paletteInput.addEventListener('input', () => renderPaletteItems());
        paletteInput.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); movePalette(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); movePalette(-1); }
            else if (e.key === 'Enter') { e.preventDefault(); pickPalette(); }
            else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
        });
    }
    function renderPaletteItems() {
        const q = (paletteInput.value || '').trim().toLowerCase();
        const all = paletteSources();
        paletteMatches = !q ? all : all.filter(it =>
            (it.title || '').toLowerCase().includes(q) ||
            (it.subtitle || '').toLowerCase().includes(q) ||
            (it.keywords || '').toLowerCase().includes(q));
        paletteIdx = 0;
        if (!paletteMatches.length) {
            paletteList.innerHTML = '<div class="palette-empty" data-i18n="palette.empty">No matches found</div>';
            if (window.CCi18n) CCi18n.applyToDom(paletteList);
            return;
        }
        paletteList.innerHTML = paletteMatches.map((it, i) =>
            '<button type="button" role="option" aria-selected="' + (i === paletteIdx) + '" class="palette-item' + (i === paletteIdx ? ' active' : '') + '" data-idx="' + i + '">'
            + '<span class="palette-item-icon"><i data-lucide="' + (it.icon || 'file') + '" class="w-4 h-4"></i></span>'
            + '<span class="palette-item-text"><span class="palette-item-title">' + it.title + '</span>'
            + (it.subtitle ? '<span class="palette-item-sub">' + it.subtitle + '</span>' : '')
            + '</span>'
            + (it.hint ? '<kbd class="palette-kbd">' + it.hint + '</kbd>' : '')
            + '</button>').join('');
        if (window.lucide) window.lucide.createIcons();
        paletteList.querySelectorAll('.palette-item').forEach(btn => {
            btn.addEventListener('click', () => { paletteIdx = +btn.dataset.idx; pickPalette(); });
            btn.addEventListener('mousemove', () => { if (paletteIdx !== +btn.dataset.idx) { paletteIdx = +btn.dataset.idx; paintPaletteActive(); } });
        });
    }
    function paintPaletteActive() {
        paletteList.querySelectorAll('.palette-item').forEach((btn, i) => {
            btn.classList.toggle('active', i === paletteIdx);
            btn.setAttribute('aria-selected', i === paletteIdx ? 'true' : 'false');
        });
        const active = paletteList.querySelector('.palette-item.active');
        if (active) active.scrollIntoView({ block: 'nearest' });
    }
    function movePalette(d) {
        if (!paletteMatches.length) return;
        paletteIdx = (paletteIdx + d + paletteMatches.length) % paletteMatches.length;
        paintPaletteActive();
    }
    function pickPalette() {
        const it = paletteMatches[paletteIdx];
        if (!it) return;
        closePalette();
        if (typeof it.run === 'function') it.run();
    }
    function openPalette() {
        buildPalette();
        window.CCHist.pushOverlay();
        paletteEl.classList.remove('hidden');
        if (window.CCScrollLock) CCScrollLock.lock();
        paletteInput.value = '';
        renderPaletteItems();
        setTimeout(() => paletteInput.focus(), 30);
        if (window.lucide) window.lucide.createIcons();
        if (window.CCi18n) CCi18n.applyToDom(paletteEl);
    }
    function closePalette() {
        if (paletteEl && !paletteEl.classList.contains('hidden')) {
            paletteEl.classList.add('hidden');
            if (window.CCScrollLock) CCScrollLock.unlock();
        }
    }
    window.CCHist.registerCloser(() => {
        if (paletteEl && !paletteEl.classList.contains('hidden')) { closePalette(); return true; }
        return false;
    });
    document.addEventListener('keydown', (e) => {
        const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || '')) || e.target.isContentEditable;
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
        else if (e.key === '/' && !typing) { e.preventDefault(); openPalette(); }
        else if (e.key === 'Escape' && paletteEl && !paletteEl.classList.contains('hidden')) closePalette();
    });
    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-palette-trigger]')) { e.preventDefault(); openPalette(); }
    });

    // ---- Notifications panel ----
    let notifPanel = null;
    function notifItems() {
        try { return (window.CC_NOTIFS ? window.CC_NOTIFS() : []) || []; } catch (e) { return []; }
    }
    function buildNotifPanel() {
        if (notifPanel) return;
        notifPanel = document.createElement('div');
        notifPanel.className = 'notif-panel hidden';
        notifPanel.setAttribute('role', 'dialog');
        notifPanel.setAttribute('aria-label', window.CCi18n ? CCi18n.t('notif.title') : 'Notifications');
        document.body.appendChild(notifPanel);
        document.addEventListener('click', (e) => {
            if (!notifPanel.classList.contains('hidden')
                && !e.target.closest('.notif-panel') && !e.target.closest('[data-notif-btn]')) {
                notifPanel.classList.add('hidden');
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !notifPanel.classList.contains('hidden')) notifPanel.classList.add('hidden');
        });
    }
    function renderNotifs() {
        const items = notifItems();
        const unread = items.filter(n => n.unread).length;
        notifPanel.innerHTML = '<div class="notif-head">'
            + '<h3 data-i18n="notif.title">Notifications</h3>'
            + (unread ? '<button type="button" class="notif-clear" data-i18n="notif.markRead">Mark all read</button>' : '')
            + '</div>'
            + (items.length ? items.map(n =>
                '<div class="notif-item' + (n.unread ? ' unread' : '') + '">'
                + '<span class="notif-icon notif-icon-' + (n.kind || 'info') + '"><i data-lucide="' + (n.icon || 'bell') + '" class="w-4 h-4"></i></span>'
                + '<div class="notif-body"><p class="notif-text">' + n.text + '</p>'
                + '<p class="notif-time">' + n.time + '</p></div>'
                + '</div>').join('')
              : '<div class="notif-empty" data-i18n="notif.empty">You are all caught up</div>');
        const clearBtn = notifPanel.querySelector('.notif-clear');
        if (clearBtn) clearBtn.addEventListener('click', () => {
            if (window.CC_NOTIFS_MARK_READ) window.CC_NOTIFS_MARK_READ(); else items.forEach(n => n.unread = false);
            updateNotifDot();
            renderNotifs();
            if (window.lucide) window.lucide.createIcons();
        });
        if (window.lucide) window.lucide.createIcons();
        if (window.CCi18n) CCi18n.applyToDom(notifPanel);
    }
    document.addEventListener('cc:lang', () => {
        if (notifPanel) {
            notifPanel.setAttribute('aria-label', window.CCi18n ? CCi18n.t('notif.title') : 'Notifications');
            renderNotifs();
        }
        if (paletteEl && !paletteEl.classList.contains('hidden')) renderPaletteItems();
    });
    function updateNotifDot() {
        const has = notifItems().some(n => n.unread);
        document.querySelectorAll('[data-notif-dot]').forEach(d => d.classList.toggle('hidden', !has));
    }
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-notif-btn]');
        if (!btn) return;
        e.preventDefault();
        buildNotifPanel();
        if (notifPanel.classList.contains('hidden')) {
            window.CCHist.pushOverlay();
            renderNotifs();
            notifPanel.classList.remove('hidden');
        } else {
            notifPanel.classList.add('hidden');
        }
    });
    window.CCHist.registerCloser(() => {
        if (notifPanel && !notifPanel.classList.contains('hidden')) { notifPanel.classList.add('hidden'); return true; }
        return false;
    });
    document.addEventListener('DOMContentLoaded', updateNotifDot);

    window.CCUI = {
        applyTheme, toggleTheme,
        skeletonRows, skeletonCards, withSkeleton,
        countUp,
        openPalette, closePalette, updateNotifDot,
    };
})();
