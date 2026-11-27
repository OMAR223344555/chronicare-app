document.addEventListener('DOMContentLoaded', async () => {

    function refreshIcons() {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    const T = (k, f) => window.CCi18n ? CCi18n.t(k, f) : (f || k);
    const Tp = (k, params, f) => {
        let s = T(k, f);
        Object.keys(params || {}).forEach(p => { s = s.replace('{' + p + '}', params[p]); });
        return s;
    };
    const NAME_KEYS = { 'Dr. Youssef Nader': 'name.youssef', 'Dr. Hana Sherif': 'name.hana', 'Dr. Ahmed Farouk': 'name.farouk', 'Dr. Salma Nabil': 'name.salma', 'Dr. Mariam Khaled': 'name.mariam', 'Maya Hassan': 'name.maya', 'Omar Adel': 'name.omar', 'Sara Mahmoud': 'name.sara', 'Administrator': 'name.admin' };
    const nameLabel = n => T(NAME_KEYS[n] || '', n);
    const SPEC_KEYS = { 'Endocrinology': 'spec.endocrinology', 'Nephrology': 'spec.nephrology', 'Internal Medicine': 'spec.internal', 'Cardiology': 'spec.cardiology' };
    const specLabel = x => T(SPEC_KEYS[x] || '', x);
    const COND_KEYS = { 'Diabetes': 'cond.diabetes', 'Hypertension': 'cond.hypertension', 'Chronic kidney disease': 'cond.ckd' };
    const condsLabel = str => str.split(', ').map(c => T(COND_KEYS[c] || '', c)).join(window.CCi18n && CCi18n.lang === 'ar' ? '، ' : ', ');
    const CAT_KEYS = { 'Lab Report': 'cat.lab', 'Prescription': 'cat.prescription', 'Imaging': 'cat.imaging', 'Specialist Report': 'cat.specialist', 'Discharge Summary': 'cat.discharge' };
    const catLabel = c => T(CAT_KEYS[c] || '', c);
    const labName = t => T('lab.n.' + t, t);
    const statusLabel = st => st === 'Active' ? T('st.active') : T('st.deactivated');

    // Demo state (client-side only, no backend yet)
    const pendingDoctors = [
        { id: 1, name: 'Dr. Youssef Nader', specialty: 'Endocrinology', license: 'MED-2026-4471', applied: '2026-11-24' },
        { id: 2, name: 'Dr. Hana Sherif', specialty: 'Nephrology', license: 'MED-2025-8823', applied: '2026-11-26' },
    ];

    const users = [
        { id: 11, name: 'Dr. Ahmed Farouk', role: 'Doctor', detail: 'Internal Medicine • MED-2019-1024', status: 'Active' },
        { id: 12, name: 'Dr. Salma Nabil', role: 'Doctor', detail: 'Cardiology • MED-2018-5567', status: 'Active' },
        { id: 13, name: 'Dr. Mariam Khaled', role: 'Doctor', detail: 'Nephrology • MED-2021-3390', status: 'Active' },
        { id: 14, name: 'Maya Hassan', role: 'Patient', detail: 'Diabetes, Hypertension', detailKey: 'conds', status: 'Active' },
        { id: 15, name: 'Omar Adel', role: 'Patient', detail: 'Hypertension', detailKey: 'conds', status: 'Active' },
        { id: 16, name: 'Sara Mahmoud', role: 'Patient', detail: 'Chronic kidney disease', detailKey: 'conds', status: 'Active' },
    ];

    const categories = ['Lab Report', 'Prescription', 'Imaging', 'Specialist Report', 'Discharge Summary'];
    const conditions = ['Diabetes', 'Hypertension', 'Chronic kidney disease'];

    const ranges = [
        { id: 1, test: 'HbA1c', unit: '%', min: 4.0, max: 5.6 },
        { id: 2, test: 'Fasting glucose', unit: 'mg/dL', min: 70, max: 99 },
        { id: 3, test: 'Systolic BP', unit: 'mmHg', min: 90, max: 120 },
        { id: 4, test: 'Diastolic BP', unit: 'mmHg', min: 60, max: 80 },
        { id: 5, test: 'Creatinine', unit: 'mg/dL', min: 0.7, max: 1.3 },
        { id: 6, test: 'eGFR', unit: 'mL/min', min: 90, max: null },
    ];

    const auditEvents = [
        { time: '2026-11-26 21:14', user: 'Dr. Ahmed Farouk', action: 'view', detailsKey: 'au.e1' },
        { time: '2026-11-26 21:16', user: 'Dr. Ahmed Farouk', action: 'note', detailsKey: 'au.e2' },
        { time: '2026-11-25 18:02', user: 'Maya Hassan', action: 'share', detailsKey: 'au.e3' },
        { time: '2026-11-25 10:47', user: 'Dr. Salma Nabil', action: 'download', detailsKey: 'au.e4' },
        { time: '2026-11-24 09:31', user: 'Administrator', action: 'approve', detailsKey: 'au.e5' },
        { time: '2026-11-23 16:55', user: 'Maya Hassan', action: 'revoke', detailsKey: 'au.e6' },
        { time: '2026-11-22 12:20', user: 'Sara Mahmoud', action: 'share', detailsKey: 'au.e7' },
        { time: '2026-11-21 08:40', user: 'Maya Hassan', action: 'view', detailsKey: 'au.e8' },
    ];

    // ---- Navigation ----
    const subviews = document.querySelectorAll('.portal-subview');
    const navItems = document.querySelectorAll('.portal-nav-btn');
    function showView(name) {
        subviews.forEach(s => s.classList.toggle('hidden', s.id !== `view-${name}`));
        navItems.forEach(item => {
            const active = item.getAttribute('data-target') === name;
            item.classList.toggle('bg-cyan-50', active);
            item.classList.toggle('text-[#0c2340]', active);
            item.classList.toggle('font-bold', active);
            item.classList.toggle('text-slate-600', !active);
        });
        if (window.CCHist) CCHist.pushView(name);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        refreshIcons();
    }
    document.querySelectorAll('[data-navigate]').forEach(elem => {
        elem.addEventListener('click', (e) => {
            e.preventDefault();
            showView(elem.getAttribute('data-navigate'));
            if (window.innerWidth < 768) closeMobileSidebar();
        });
    });

    // Mobile drawer
    const sidebar = document.getElementById('sidebar');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenuClose = document.getElementById('mobile-menu-close');
    function openMobileSidebar() {
        if (!sidebar) return;
        if (window.CCHist) CCHist.pushOverlay();
        sidebar.classList.remove('hidden');
        sidebar.classList.add('mobile-open');
        document.body.classList.add('drawer-open');
        if (window.CCScrollLock) CCScrollLock.lock();
        if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'true');
        if (!document.querySelector('.drawer-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'drawer-overlay';
            overlay.addEventListener('click', closeMobileSidebar);
            document.body.appendChild(overlay);
        }
        refreshIcons();
    }
    function closeMobileSidebar() {
        if (!sidebar) return;
        sidebar.classList.add('hidden');
        sidebar.classList.remove('mobile-open');
        document.body.classList.remove('drawer-open');
        if (window.CCScrollLock) CCScrollLock.unlock();
        if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'false');
        const overlay = document.querySelector('.drawer-overlay');
        if (overlay) overlay.remove();
    }
    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            if (sidebar.classList.contains('mobile-open')) {
                closeMobileSidebar();
            } else {
                openMobileSidebar();
            }
        });
    }
    if (mobileMenuClose && sidebar) {
        mobileMenuClose.addEventListener('click', closeMobileSidebar);
    }
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) closeMobileSidebar();
    });
    if (window.CCHist) CCHist.registerCloser(() => {
        if (sidebar && sidebar.classList.contains('mobile-open')) { closeMobileSidebar(); return true; }
        return false;
    });

    // ---- Manage Users ----
    // ---- Optional live API mode ----
    let apiMode = false;
    if (window.CCApi && CCApi.hasSession()) {
        const sessUser = CCApi.user();
        if (sessUser && sessUser.role === 'admin') {
            try {
                await CCApi.hydrateAdmin({ pendingDoctors, users, categories, conditions, ranges, auditEvents });
                apiMode = true;
            } catch (err) {
                CCApi.clearSession();
            }
        } else if (sessUser) {
            CCApi.clearSession();
        }
    }

    function renderPending() {
        const tbody = document.getElementById('pendingDoctorsTable');
        document.getElementById('pendingCount').textContent = Tp('ad.pendingN', { n: pendingDoctors.length });
        tbody.innerHTML = pendingDoctors.length ? pendingDoctors.map(d => `
            <tr>
                <td><strong>${nameLabel(d.name)}</strong></td>
                <td>${specLabel(d.specialty)}</td>
                <td><span class="font-mono text-xs">${d.license}</span></td>
                <td>${d.applied}</td>
                <td>
                    <div class="flex gap-2">
                        <button type="button" class="approve-doctor-btn bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-green-200 transition" data-id="${d.id}">${T('ad.approve')}</button>
                        <button type="button" class="decline-doctor-btn bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-red-100 transition" data-id="${d.id}">${T('ad.decline')}</button>
                    </div>
                </td>
            </tr>`).join('')
            : `<tr><td colspan="5" class="text-center text-slate-400 py-8">${T('ad.noPending')}</td></tr>`;
        refreshIcons();
    }

    function renderUsers() {
        const tbody = document.getElementById('usersTable');
        tbody.innerHTML = users.map(u => `
            <tr>
                <td><strong>${nameLabel(u.name)}</strong></td>
                <td>${T(u.role === 'Doctor' ? 'role.doctor' : 'role.patient')}</td>
                <td class="text-slate-500">${u.detailKey === 'conds' ? condsLabel(u.detail) : (SPEC_KEYS[u.detail.split(' • ')[0]] ? specLabel(u.detail.split(' • ')[0]) + ' • ' + u.detail.split(' • ')[1] : u.detail)}</td>
                <td>${u.status === 'Active'
                    ? `<span class="status reviewed">${T('st.active')}</span>`
                    : `<span class="status archived">${T('st.deactivated')}</span>`}</td>
                <td><button type="button" class="toggle-user-btn more-btn" data-id="${u.id}">${u.status === 'Active' ? T('ad.deactivate') : T('ad.activate')}</button></td>
            </tr>`).join('');
        refreshIcons();
    }

    // Toast notifications
    function showToast(message, type) {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            container.setAttribute('aria-live', 'polite');
            container.setAttribute('role', 'status');
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = 'toast' + (type ? ' toast-' + type : '');
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('toast-leaving');
            toast.addEventListener('animationend', () => toast.remove(), { once: true });
        }, 2600);
    }

    document.addEventListener('click', (e) => {
        const approveBtn = e.target.closest('.approve-doctor-btn');
        if (approveBtn) {
            const d = pendingDoctors.find(x => x.id === Number(approveBtn.dataset.id));
            if (!d) return;
            if (apiMode && window.CCApi) CCApi.post('/admin/users/' + d.id + '/approve/').catch(() => {});
            pendingDoctors.splice(pendingDoctors.indexOf(d), 1);
            users.push({ id: apiMode ? d.id : 100 + d.id, name: d.name, role: 'Doctor', detail: `${d.specialty} • ${d.license}`, status: 'Active' });
            auditEvents.unshift({ time: 'just now', user: 'Administrator', action: 'approve', details: Tp('au.dynApprove', { n: nameLabel(d.name) }) });
            renderPending(); renderUsers(); renderAudit(); renderAnalytics();
            showToast(Tp('toast.approved', { name: nameLabel(d.name) }));
            return;
        }
        const declineBtn = e.target.closest('.decline-doctor-btn');
        if (declineBtn) {
            const d = pendingDoctors.find(x => x.id === Number(declineBtn.dataset.id));
            if (!d) return;
            if (!confirm(Tp('ad.declineConfirm', { name: nameLabel(d.name) }))) return;
            if (apiMode && window.CCApi) CCApi.post('/admin/users/' + d.id + '/deactivate/').catch(() => {});
            pendingDoctors.splice(pendingDoctors.indexOf(d), 1);
            renderPending(); renderAnalytics();
            showToast(Tp('toast.declined', { name: nameLabel(d.name) }), 'warn');
            return;
        }
        const toggleBtn = e.target.closest('.toggle-user-btn');
        if (toggleBtn) {
            const u = users.find(x => x.id === Number(toggleBtn.dataset.id));
            if (!u) return;
            u.status = u.status === 'Active' ? 'Deactivated' : 'Active';
            if (apiMode && window.CCApi) CCApi.post('/admin/users/' + u.id + (u.status === 'Active' ? '/activate/' : '/deactivate/')).catch(() => {});
            auditEvents.unshift({ time: 'just now', user: 'Administrator', action: u.status === 'Active' ? 'approve' : 'revoke', details: Tp('au.dynStatus', { s: statusLabel(u.status), n: nameLabel(u.name) }) });
            renderUsers(); renderAudit();
            showToast(Tp(u.status === 'Active' ? 'toast.reactivated' : 'toast.deactivated', { name: nameLabel(u.name) }), u.status === 'Active' ? undefined : 'warn');
        }
    });

    // ---- Categories, conditions, ranges ----
    function renderLists() {
        document.getElementById('categoriesList').innerHTML = categories.map(c => `
            <li class="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm">
                <span class="font-semibold text-[#0c2340]">${catLabel(c)}</span>
            </li>`).join('');
        document.getElementById('conditionsList').innerHTML = conditions.map(c => `
            <li class="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm">
                <span class="font-semibold text-[#0c2340]">${T(COND_KEYS[c] || '', c)}</span>
            </li>`).join('');
    }

    function renderRanges() {
        document.getElementById('rangesTable').innerHTML = ranges.map(r => `
            <tr>
                <td><strong>${labName(r.test)}</strong></td>
                <td>${r.unit}</td>
                <td><input type="number" step="0.01" class="range-min w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm" data-id="${r.id}" value="${r.min != null ? r.min : ''}" placeholder="none"></td>
                <td><input type="number" step="0.01" class="range-max w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm" data-id="${r.id}" value="${r.max != null ? r.max : ''}" placeholder="none"></td>
                <td><span class="range-saved text-xs text-slate-400" data-id="${r.id}"></span></td>
            </tr>`).join('');
    }

    document.getElementById('addCategoryForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('newCategoryName');
        const name = input.value.trim();
        if (name && !categories.includes(name)) { if (apiMode && window.CCApi) CCApi.post('/categories/', { name }).catch(() => {}); categories.push(name); renderLists(); showToast(Tp('toast.catAdded', { n: name })); }
        input.value = '';
    });
    document.getElementById('addConditionForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('newConditionName');
        const name = input.value.trim();
        if (name && !conditions.includes(name)) { if (apiMode && window.CCApi) CCApi.post('/conditions/', { name }).catch(() => {}); conditions.push(name); renderLists(); showToast(Tp('toast.condAdded', { n: name })); }
        input.value = '';
    });

    document.addEventListener('change', (e) => {
        const input = e.target.closest('.range-min, .range-max');
        if (!input) return;
        const r = ranges.find(x => x.id === Number(input.dataset.id));
        if (!r) return;
        const value = input.value === '' ? null : Number(input.value);
        if (input.classList.contains('range-min')) r.min = value; else r.max = value;
        const tag = document.querySelector(`.range-saved[data-id="${r.id}"]`);
        if (apiMode && window.CCApi) {
            CCApi.patch('/lab-test-types/' + r.id + '/', { ref_min: r.min, ref_max: r.max })
                .then(() => { if (tag) tag.textContent = T('rf.saved'); })
                .catch(() => { if (tag) tag.textContent = 'save failed'; });
        } else if (tag) tag.textContent = T('rf.saved');
    });

    // ---- Analytics ----
    const activityDemo = {
        views: [12, 18, 9, 22, 17, 25, 20],
        shares: [3, 5, 2, 6, 4, 7, 5],
        uploads: [2, 4, 1, 5, 3, 6, 4],
    };
    const categoryDemo = { 'Lab Report': 9, 'Prescription': 6, 'Imaging': 4, 'Specialist Report': 3, 'Discharge Summary': 2 };
    let chartRefs = [];
    function last7DayLabels() {
        const out = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(Date.now() - i * 86400000);
            out.push(d.toLocaleDateString(window.CCi18n && CCi18n.lang === 'ar' ? 'ar-EG' : 'en-GB', { weekday: 'short' }));
        }
        return out;
    }
    function renderAnalytics() {
        const totalEl = document.getElementById('statTotalUsers');
        if (!totalEl) return;
        totalEl.textContent = users.length;
        document.getElementById('statDoctors').textContent = users.filter(u => u.role === 'Doctor').length;
        document.getElementById('statPatients').textContent = users.filter(u => u.role === 'Patient').length;
        document.getElementById('statPending').textContent = pendingDoctors.length;
        if (!window.Chart) return;
        chartRefs.forEach(c => c.destroy());
        chartRefs = [];
        const isDark = document.documentElement.classList.contains('dark');
        const gridColor = isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(148, 163, 184, 0.18)';
        const tickColor = isDark ? '#8ea2b8' : '#94a3b8';
        const viewsColor = isDark ? '#e6eef7' : '#0c2340';
        const viewsFill = isDark ? 'rgba(230, 238, 247, 0.08)' : 'rgba(12,35,64,0.08)';
        const barFirst = isDark ? '#38bdf8' : '#0c2340';
        const doughnutBorder = isDark ? '#101f31' : '#ffffff';
        const act = document.getElementById('chartActivity');
        if (act) {
            chartRefs.push(new Chart(act, {
                type: 'line',
                data: {
                    labels: last7DayLabels(),
                    datasets: [
                        { label: T('au.views'), data: activityDemo.views, borderColor: viewsColor, backgroundColor: viewsFill, fill: true, tension: 0.4, pointRadius: 3 },
                        { label: T('au.shares'), data: activityDemo.shares, borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.08)', fill: true, tension: 0.4, pointRadius: 3 },
                        { label: T('an.uploads'), data: activityDemo.uploads, borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.08)', fill: true, tension: 0.4, pointRadius: 3 },
                    ],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
                    scales: { x: { grid: { color: gridColor }, ticks: { color: tickColor } }, y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: tickColor, precision: 0 } } },
                },
            }));
        }
        const cat = document.getElementById('chartCategories');
        if (cat) {
            const keys = Object.keys(categoryDemo);
            chartRefs.push(new Chart(cat, {
                type: 'doughnut',
                data: {
                    labels: keys.map(k => catLabel(k)),
                    datasets: [{ data: keys.map(k => categoryDemo[k]), backgroundColor: ['#06b6d4', isDark ? '#e6eef7' : '#0c2340', '#8b5cf6', '#f59e0b', '#10b981'], borderWidth: 2, borderColor: doughnutBorder }],
                },
                options: {
                    responsive: true, maintainAspectRatio: false, cutout: '62%',
                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
                },
            }));
        }
        const actBar = document.getElementById('chartActions');
        if (actBar) {
            const counts = {};
            auditEvents.forEach(a => { counts[a.action] = (counts[a.action] || 0) + 1; });
            const keys = Object.keys(counts);
            chartRefs.push(new Chart(actBar, {
                type: 'bar',
                data: {
                    labels: keys.map(k => T('au.act.' + k, k)),
                    datasets: [{ data: keys.map(k => counts[k]), backgroundColor: [barFirst, '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'].slice(0, keys.length), borderRadius: 8 }],
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { x: { grid: { display: false }, ticks: { color: tickColor } }, y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: tickColor, precision: 0 } } },
                },
            }));
        }
    }

    // ---- Audit log ----
    function renderAudit() {
        const filter = document.getElementById('auditFilter').value;
        const rows = auditEvents.filter(a => filter === 'all' || a.action === filter);
        const ACTION_STYLES = {
            view: 'bg-slate-100 text-slate-600', download: 'bg-blue-100 text-blue-700',
            share: 'bg-green-100 text-green-700', revoke: 'bg-red-100 text-red-700',
            approve: 'bg-cyan-100 text-cyan-800', note: 'bg-violet-100 text-violet-700',
        };
        document.getElementById('auditTable').innerHTML = rows.map(a => `
            <tr>
                <td class="text-slate-500 whitespace-nowrap">${a.time === 'just now' ? T('tm.justNow') : a.time}</td>
                <td><strong>${nameLabel(a.user)}</strong></td>
                <td><span class="text-xs font-bold px-2.5 py-1 rounded-full ${ACTION_STYLES[a.action] || 'bg-slate-100 text-slate-600'}">${T('au.act.' + a.action, a.action)}</span></td>
                <td class="text-slate-600">${a.detailsKey ? T(a.detailsKey) : a.details}</td>
            </tr>`).join('') || `<tr><td colspan="4" class="text-center text-slate-400 py-8">${T('au.empty')}</td></tr>`;
    }
    document.getElementById('auditFilter').addEventListener('change', renderAudit);

    renderPending();
    renderUsers();
    renderLists();
    renderRanges();
    renderAudit();
    renderAnalytics();
    refreshIcons();
    document.addEventListener('cc:lang', () => {
        renderPending();
        renderUsers();
        renderLists();
        renderRanges();
        renderAudit();
        renderAnalytics();
        refreshIcons();
    });
    document.addEventListener('cc:theme', () => renderAnalytics());

    // Deep links: #users, #reference, #audit
    function handleHashRoute() {
        const hash = window.location.hash.replace('#', '').trim();
        if (hash === '') showView('analytics');
        else if (['analytics', 'users', 'reference', 'audit'].includes(hash)) showView(hash);
    }
    window.addEventListener('hashchange', handleHashRoute);
    document.addEventListener('cc:popview', handleHashRoute);
    handleHashRoute();

    // ---- Stage 2: notifications + palette (admin) ----
    const adminNotifs = [
        { icon: 'user-plus', kind: 'warn', textKey: 'na.1', timeKey: 'tm.1h', unread: true },
        { icon: 'user-check', kind: 'success', textKey: 'na.2', timeKey: 'tm.yest', unread: true },
        { icon: 'shield-alert', kind: 'info', textKey: 'na.3', timeKey: 'tm.2d', unread: false },
    ];
    window.CC_NOTIFS = () => adminNotifs.map(n => ({ ...n, text: T(n.textKey), time: T(n.timeKey) }));
    window.CC_NOTIFS_MARK_READ = () => adminNotifs.forEach(n => { n.unread = false; });
    window.CC_SOURCES = () => {
        const t = (k, f) => window.CCi18n ? CCi18n.t(k, f) : f;
        const pages = [
            { icon: 'bar-chart-3', title: t('nav.analytics', 'Analytics'), keywords: 'stats charts insights', run: () => showView('analytics') },
            { icon: 'users', title: t('nav.users', 'Manage Users'), keywords: 'accounts doctors patients', run: () => showView('users') },
            { icon: 'list-checks', title: t('nav.reference', 'Categories & Ranges'), keywords: 'lab reference', run: () => showView('reference') },
            { icon: 'scroll-text', title: t('nav.audit', 'Audit Log'), keywords: 'history events', run: () => showView('audit') },
        ];
        const pend = pendingDoctors.map(d => ({
            icon: 'user-plus',
            title: d.name,
            subtitle: specLabel(d.specialty) + ' • ' + t('ad.pendingN', '{n} pending').replace('{n}', ''),
            keywords: 'doctor pending approve ' + d.specialty,
            run: () => showView('users'),
        }));
        const actions = [
            { icon: 'moon', title: t('pal.theme', 'Toggle dark mode'), keywords: 'theme', run: () => CCUI.toggleTheme() },
            { icon: 'languages', title: t('pal.lang', 'Switch language'), keywords: 'arabic english', run: () => CCi18n.setLang(CCi18n.lang === 'ar' ? 'en' : 'ar') },
        ];
        return [...pages, ...pend, ...actions];
    };
});
