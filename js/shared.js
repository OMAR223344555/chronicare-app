/* Chronicare shared UI: theme, skeletons, animations, a11y helpers */
(function () {
    'use strict';

    // ---- Theme ----
    function applyTheme(mode) {
        document.documentElement.classList.toggle('dark', mode === 'dark');
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
            const p = Math.min(1, (now - start) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = (target * eased).toFixed(decimals) + suffix;
            if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    window.CCUI = {
        applyTheme, toggleTheme,
        skeletonRows, skeletonCards, withSkeleton,
        countUp,
    };
})();
