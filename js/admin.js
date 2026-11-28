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
        { id: 1, name: 'Dr. Youssef Nader', email: 'youssef.nader@chronicare.demo', specialty: 'Endocrinology', license: 'MED-2026-4471', applied: '2026-11-24' },
        { id: 2, name: 'Dr. Hana Sherif', email: 'hana.sherif@chronicare.demo', specialty: 'Nephrology', license: 'MED-2025-8823', applied: '2026-11-26' },
    ];

    const users = [
        { id: 11, name: 'Dr. Ahmed Farouk', email: 'ahmed.farouk@chronicare.demo', role: 'Doctor', detail: 'Internal Medicine • MED-2019-1024', status: 'Active' },
        { id: 12, name: 'Dr. Salma Nabil', email: 'salma.nabil@chronicare.demo', role: 'Doctor', detail: 'Cardiology • MED-2018-5567', status: 'Active' },
        { id: 13, name: 'Dr. Mariam Khaled', email: 'mariam.khaled@chronicare.demo', role: 'Doctor', detail: 'Nephrology • MED-2021-3390', status: 'Active' },
        { id: 14, name: 'Maya Hassan', email: 'maya.hassan@chronicare.demo', role: 'Patient', detail: 'Diabetes, Hypertension', detailKey: 'conds', status: 'Active' },
        { id: 15, name: 'Omar Adel', email: 'omar.adel@chronicare.demo', role: 'Patient', detail: 'Hypertension', detailKey: 'conds', status: 'Active' },
        { id: 16, name: 'Sara Mahmoud', email: 'sara.mahmoud@chronicare.demo', role: 'Patient', detail: 'Chronic kidney disease', detailKey: 'conds', status: 'Active' },
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
                CCApi.refreshNotifs(true);
            } catch (err) {
                CCApi.clearSession();
            }
        } else if (sessUser) {
            CCApi.clearSession();
        }
    }
    if (window.ccGateOpen && !apiMode) window.ccGateOpen();

    // ---- Manage Users: compact, aligned rows with explicit actions ----
    const meId = (window.CCApi && CCApi.user() && CCApi.user().id) || null;
    let userAction = null;   // { key: 'u:11' | 'p:1', kind: 'delete' | 'deactivate' | 'decline' }
    let userQuery = '';
    let userRole = 'all';

    function initials(name) {
        const parts = String(name || '?').replace(/^Dr\.?\s+/i, '').trim().split(/\s+/).filter(Boolean);
        return (parts[0] ? parts[0][0] : '?').toUpperCase() + (parts[1] ? parts[1][0].toUpperCase() : '');
    }
    function detailText(u) {
        if (u.detailKey === 'conds') return condsLabel(u.detail);
        const bits = String(u.detail || '').split(' • ');
        return SPEC_KEYS[bits[0]] ? specLabel(bits[0]) + (bits[1] ? ' • ' + bits[1] : '') : (u.detail || '');
    }
    function apiError(err, fallbackKey) {
        if (err && err.status === 403) return T('ad.notAllowed');
        if (err && err.data && typeof err.data.detail === 'string' && !(window.CCi18n && CCi18n.lang === 'ar')) return err.data.detail;
        return T(fallbackKey);
    }
    function confirmBar(key, kind, name) {
        const isDelete = kind === 'delete';
        const title = isDelete ? Tp('ad.deleteConfirm', { name }) : Tp('ad.deactivateConfirm', { name });
        const warn = isDelete ? T('ad.deleteWarn') : T('ad.deactivateWarn');
        return `<div class="um-confirm" role="group">
            <p class="um-confirm-text"><i data-lucide="alert-triangle"></i><span><strong>${title}</strong> ${warn}</span></p>
            <div class="um-confirm-actions">
                <button type="button" class="um-btn ${isDelete ? 'um-btn-danger' : 'um-btn-warn'}" data-um-confirm="${key}">${isDelete ? T('action.delete') : T('ad.deactivate')}</button>
                <button type="button" class="um-btn um-btn-quiet" data-um-cancel="${key}">${T('action.cancel')}</button>
            </div>
        </div>`;
    }

    function renderPending() {
        const list = document.getElementById('pendingDoctorsList');
        document.getElementById('pendingCount').textContent = Tp('ad.pendingN', { n: pendingDoctors.length });
        list.innerHTML = pendingDoctors.length ? pendingDoctors.map(d => {
            const key = 'p:' + d.id;
            return `<li class="um-row">
                <span class="um-avatar um-av-pending">${initials(d.name)}</span>
                <div class="um-id">
                    <p class="um-name">${nameLabel(d.name)}</p>
                    ${d.email ? `<p class="um-meta">${d.email}</p>` : ''}
                    <p class="um-meta um-meta-sub">${Tp('ad.appliedOn', { d: d.applied })}</p>
                </div>
                <div class="um-badges">
                    <span class="um-badge um-role-doctor">${specLabel(d.specialty)}</span>
                    <span class="um-badge um-lic"><i data-lucide="id-card"></i>${d.license}</span>
                </div>
                ${userAction && userAction.key === key
                    ? `<div class="um-confirm" role="group">
                          <p class="um-confirm-text"><i data-lucide="alert-triangle"></i><span><strong>${Tp('ad.declineConfirm', { name: nameLabel(d.name) })}</strong> ${T('ad.declineWarn')}</span></p>
                          <div class="um-confirm-actions">
                              <button type="button" class="um-btn um-btn-danger" data-um-confirm="${key}">${T('ad.decline')}</button>
                              <button type="button" class="um-btn um-btn-quiet" data-um-cancel="${key}">${T('action.cancel')}</button>
                          </div>
                      </div>`
                    : `<div class="um-actions">
                          <button type="button" class="um-btn um-btn-solid" data-um-approve="${d.id}"><i data-lucide="check"></i>${T('ad.approve')}</button>
                          <button type="button" class="um-btn um-btn-warn" data-um-decline="${d.id}"><i data-lucide="x"></i>${T('ad.decline')}</button>
                      </div>`}
            </li>`;
        }).join('')
        : `<li class="um-empty">${T('ad.noPending')}</li>`;
        refreshIcons();
    }

    function visibleUsers() {
        const q = userQuery.trim().toLowerCase();
        return users.filter(u => {
            if (userRole !== 'all' && u.role !== userRole) return false;
            if (!q) return true;
            return [u.name, u.email, u.detail].filter(Boolean).some(v => String(v).toLowerCase().includes(q));
        });
    }

    function renderUsers() {
        const list = document.getElementById('usersList');
        document.getElementById('usersCount').textContent = Tp('ad.accountsN', { n: users.length });
        document.getElementById('umCountAll').textContent = users.length;
        document.getElementById('umCountDoctors').textContent = users.filter(u => u.role === 'Doctor').length;
        document.getElementById('umCountPatients').textContent = users.filter(u => u.role === 'Patient').length;
        const rows = visibleUsers();
        list.innerHTML = rows.length ? rows.map(u => {
            const key = 'u:' + u.id;
            const active = u.status === 'Active';
            const isSelf = meId != null && u.id === meId;
            let meta = detailText(u);
            if (!meta || meta === u.email || meta === '- • -') meta = '';
            return `<li class="um-row${active ? '' : ' is-off'}">
                <span class="um-avatar ${u.role === 'Doctor' ? 'um-av-doctor' : 'um-av-patient'}">${initials(u.name)}</span>
                <div class="um-id">
                    <p class="um-name">${nameLabel(u.name)}${isSelf ? ` <span class="um-you">${T('ad.you')}</span>` : ''}</p>
                    ${u.email ? `<p class="um-meta">${u.email}</p>` : ''}
                    ${meta ? `<p class="um-meta um-meta-sub">${meta}</p>` : ''}
                </div>
                <div class="um-badges">
                    <span class="um-badge ${u.role === 'Doctor' ? 'um-role-doctor' : 'um-role-patient'}">${T(u.role === 'Doctor' ? 'role.doctor' : 'role.patient')}</span>
                    <span class="um-badge ${active ? 'um-st-active' : 'um-st-off'}"><span class="um-dot"></span>${statusLabel(u.status)}</span>
                </div>
                ${userAction && userAction.key === key
                    ? confirmBar(key, userAction.kind, nameLabel(u.name))
                    : `<div class="um-actions">
                          ${active
                              ? `<button type="button" class="um-btn um-btn-ghost" data-um-toggle="${u.id}"><i data-lucide="user-x"></i>${T('ad.deactivate')}</button>`
                              : `<button type="button" class="um-btn um-btn-solid" data-um-toggle="${u.id}"><i data-lucide="user-check"></i>${T('ad.activate')}</button>`}
                          ${isSelf ? '' : `<button type="button" class="um-btn um-btn-icon" data-um-delete="${u.id}" aria-label="${T('ad.deleteAccount')}" title="${T('ad.deleteAccount')}"><i data-lucide="trash-2"></i></button>`}
                      </div>`}
            </li>`;
        }).join('')
        : `<li class="um-empty">${T('ad.noUsers')}</li>`;
        refreshIcons();
    }

    document.getElementById('umSearch').addEventListener('input', (e) => {
        userQuery = e.target.value || '';
        renderUsers();
    });
    document.querySelectorAll('[data-um-filter]').forEach(chip => {
        chip.addEventListener('click', () => {
            userRole = chip.getAttribute('data-um-filter');
            document.querySelectorAll('[data-um-filter]').forEach(c => c.classList.toggle('is-active', c === chip));
            renderUsers();
        });
    });

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

    // ---- Account actions (approve, decline, deactivate, activate, delete) ----
    const findUser = id => users.find(x => x.id === Number(id));

    async function approveDoctor(d) {
        if (apiMode && window.CCApi) {
            try { await CCApi.post('/admin/users/' + d.id + '/approve/'); }
            catch (err) { showToast(apiError(err, 'ad.actionFailed'), 'warn'); return; }
        }
        pendingDoctors.splice(pendingDoctors.indexOf(d), 1);
        users.push({ id: d.id, name: d.name, email: d.email || '', role: 'Doctor', detail: `${d.specialty} • ${d.license}`, status: 'Active' });
        auditEvents.unshift({ time: 'just now', user: 'Administrator', action: 'approve', details: Tp('au.dynApprove', { n: nameLabel(d.name) }) });
        userAction = null;
        renderPending(); renderUsers(); renderAudit(); renderAnalytics();
        showToast(Tp('toast.approved', { name: nameLabel(d.name) }));
    }

    async function declineDoctor(d) {
        if (apiMode && window.CCApi) {
            try { await CCApi.post('/admin/users/' + d.id + '/deactivate/'); }
            catch (err) { showToast(apiError(err, 'ad.actionFailed'), 'warn'); return; }
        }
        pendingDoctors.splice(pendingDoctors.indexOf(d), 1);
        auditEvents.unshift({ time: 'just now', user: 'Administrator', action: 'deactivate', details: Tp('au.dynStatus', { s: statusLabel('Deactivated'), n: nameLabel(d.name) }) });
        userAction = null;
        renderPending(); renderUsers(); renderAudit(); renderAnalytics();
        showToast(Tp('toast.declined', { name: nameLabel(d.name) }), 'warn');
    }

    async function toggleUser(u) {
        const activating = u.status !== 'Active';
        if (apiMode && window.CCApi) {
            try { await CCApi.post('/admin/users/' + u.id + (activating ? '/activate/' : '/deactivate/')); }
            catch (err) { showToast(apiError(err, 'ad.actionFailed'), 'warn'); userAction = null; renderUsers(); return; }
        }
        u.status = activating ? 'Active' : 'Deactivated';
        auditEvents.unshift({ time: 'just now', user: 'Administrator', action: activating ? 'activate' : 'deactivate', details: Tp('au.dynStatus', { s: statusLabel(u.status), n: nameLabel(u.name) }) });
        userAction = null;
        renderUsers(); renderAudit();
        showToast(Tp(activating ? 'toast.reactivated' : 'toast.deactivated', { name: nameLabel(u.name) }), activating ? undefined : 'warn');
    }

    async function deleteUser(u) {
        if (apiMode && window.CCApi) {
            try { await CCApi.req('/admin/users/' + u.id + '/delete_account/', { method: 'DELETE' }); }
            catch (err) { showToast(apiError(err, 'ad.deleteFailed'), 'warn'); userAction = null; renderUsers(); return; }
        }
        const i = users.indexOf(u);
        if (i > -1) users.splice(i, 1);
        auditEvents.unshift({ time: 'just now', user: 'Administrator', action: 'delete', details: Tp('au.dynDelete', { n: nameLabel(u.name) }) });
        userAction = null;
        renderUsers(); renderAudit(); renderAnalytics();
        showToast(Tp('toast.userDeleted', { name: nameLabel(u.name) }));
    }

    document.addEventListener('click', (e) => {
        const approveBtn = e.target.closest('[data-um-approve]');
        if (approveBtn) {
            const d = pendingDoctors.find(x => x.id === Number(approveBtn.getAttribute('data-um-approve')));
            if (d) approveDoctor(d);
            return;
        }
        const declineBtn = e.target.closest('[data-um-decline]');
        if (declineBtn) {
            userAction = { key: 'p:' + declineBtn.getAttribute('data-um-decline'), kind: 'decline' };
            renderPending();
            return;
        }
        const toggleBtn = e.target.closest('[data-um-toggle]');
        if (toggleBtn) {
            const u = findUser(toggleBtn.getAttribute('data-um-toggle'));
            if (!u) return;
            if (u.status === 'Active') {
                userAction = { key: 'u:' + u.id, kind: 'deactivate' };
                renderUsers();
            } else {
                toggleUser(u);
            }
            return;
        }
        const delBtn = e.target.closest('[data-um-delete]');
        if (delBtn) {
            userAction = { key: 'u:' + delBtn.getAttribute('data-um-delete'), kind: 'delete' };
            renderUsers();
            return;
        }
        const cancelBtn = e.target.closest('[data-um-cancel]');
        if (cancelBtn) {
            userAction = null;
            renderPending(); renderUsers();
            return;
        }
        const confirmBtn = e.target.closest('[data-um-confirm]');
        if (confirmBtn) {
            const key = String(confirmBtn.getAttribute('data-um-confirm'));
            const id = Number(key.slice(2));
            if (key.startsWith('p:')) {
                const d = pendingDoctors.find(x => x.id === id);
                if (d) declineDoctor(d);
                return;
            }
            const u = findUser(id);
            if (!u) return;
            if (userAction && userAction.kind === 'deactivate') toggleUser(u);
            else deleteUser(u);
        }
    });

    // ---- Categories, conditions, ranges ----
    let pendingDelete = null; // "cat:2" while a row is asking for confirmation

    function delButton(kind, index) {
        if (pendingDelete === kind + ':' + index) {
            return `<span class="flex items-center gap-1.5 shrink-0">
                <button type="button" class="cc-confirm-del" data-del-${kind}="${index}" data-confirm="1">${T('rf.delete')}</button>
                <button type="button" class="cc-cancel-del" data-cancel-${kind}="${index}">${T('action.cancel')}</button>
            </span>`;
        }
        return `<button type="button" class="cc-del-btn shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl" data-del-${kind}="${index}"
            aria-label="${T('rf.delete')}" title="${T('rf.delete')}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
    }

    function renderLists() {
        document.getElementById('categoriesList').innerHTML = categories.map((c, i) => `
            <li class="flex justify-between items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl pl-4 pr-1.5 py-1.5 text-sm">
                <span class="font-semibold text-[#0c2340] min-w-0 break-words">${catLabel(c)}</span>
                ${delButton('cat', i)}
            </li>`).join('');
        document.getElementById('conditionsList').innerHTML = conditions.map((c, i) => `
            <li class="flex justify-between items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl pl-4 pr-1.5 py-1.5 text-sm">
                <span class="font-semibold text-[#0c2340] min-w-0 break-words">${T(COND_KEYS[c] || '', c)}</span>
                ${delButton('cond', i)}
            </li>`).join('');
        refreshIcons();
    }

    // One compact, table-like row per test: name + unit, Min, Max, save state.
    function renderRanges() {
        document.getElementById('rangesTable').innerHTML = ranges.map(r => `
            <li class="rr-row">
                <div class="rr-name"><strong>${labName(r.test)}</strong><span class="rr-unit">${r.unit}</span></div>
                <input type="number" step="0.01" inputmode="decimal" class="rr-input range-min" data-id="${r.id}"
                       value="${r.min != null ? r.min : ''}" placeholder="—" aria-label="${T('th.min')} ${labName(r.test)}">
                <input type="number" step="0.01" inputmode="decimal" class="rr-input range-max" data-id="${r.id}"
                       value="${r.max != null ? r.max : ''}" placeholder="—" aria-label="${T('th.max')} ${labName(r.test)}">
                <span class="range-saved rr-saved" data-id="${r.id}"></span>
            </li>`).join('');
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

    // Remove a category/condition: confirm, delete on the server (admin only,
    // enforced by the API), then drop it from the list. A 409 means files still
    // use it - show how many instead of pretending it went away.
    function apiIdFor(kind, name) {
        const refs = (window.CCApi && CCApi._refs) || {};
        const list = kind === 'cat' ? (refs.cats || []) : (refs.conds || []);
        const hit = list.find(x => x.name === name);
        return hit ? hit.id : null;
    }

    async function removeListItem(kind, index) {
        const list = kind === 'cat' ? categories : conditions;
        const name = list[index];
        if (name == null) return;
        pendingDelete = null;
        if (apiMode && window.CCApi) {
            const id = apiIdFor(kind, name);
            if (!id) { showToast(T('rf.deleteFailed'), 'warn'); return; }
            try {
                await CCApi.req('/' + (kind === 'cat' ? 'categories' : 'conditions') + '/' + id + '/', { method: 'DELETE' });
                const refs = CCApi._refs;
                const arr = kind === 'cat' ? refs.cats : refs.conds;
                const ri = arr.findIndex(x => x.id === id);
                if (ri > -1) arr.splice(ri, 1);
            } catch (err) {
                if (err && err.status === 409 && err.data && err.data.in_use) {
                    showToast(Tp(kind === 'cat' ? 'rf.catInUse' : 'rf.condInUse', { n: err.data.in_use }), 'warn');
                } else {
                    showToast(T('rf.deleteFailed'), 'warn');
                }
                return;
            }
        }
        const i = list.indexOf(name);
        if (i > -1) list.splice(i, 1);
        renderLists();
        showToast(Tp(kind === 'cat' ? 'toast.catDeleted' : 'toast.condDeleted', { n: name }));
    }

    function handleListClick(kind, e) {
        const cancel = e.target.closest(kind === 'cat' ? '[data-cancel-cat]' : '[data-cancel-cond]');
        if (cancel) { pendingDelete = null; renderLists(); return; }
        const btn = e.target.closest(kind === 'cat' ? '[data-del-cat]' : '[data-del-cond]');
        if (!btn) return;
        const index = Number(kind === 'cat' ? btn.dataset.delCat : btn.dataset.delCond);
        // Two-step confirm in the row itself: no native dialog, works the same
        // on phones and desktops, and the name stays visible while deciding.
        if (btn.dataset.confirm === '1') { removeListItem(kind, index); return; }
        pendingDelete = kind + ':' + index;
        renderLists();
    }
    document.getElementById('categoriesList').addEventListener('click', (e) => handleListClick('cat', e));
    document.getElementById('conditionsList').addEventListener('click', (e) => handleListClick('cond', e));

    document.addEventListener('change', (e) => {
        const input = e.target.closest('.range-min, .range-max');
        if (!input) return;
        const r = ranges.find(x => x.id === Number(input.dataset.id));
        if (!r) return;
        const value = input.value === '' ? null : Number(input.value);
        if (input.classList.contains('range-min')) r.min = value; else r.max = value;
        const tag = document.querySelector(`.range-saved[data-id="${r.id}"]`);
        const setTag = (text, ok) => {
            if (!tag) return;
            tag.textContent = text;
            tag.classList.toggle('is-ok', ok === true);
            tag.classList.toggle('is-err', ok === false);
        };
        if (apiMode && window.CCApi) {
            setTag(T('rr.saving'), null);
            CCApi.patch('/lab-test-types/' + r.id + '/', { ref_min: r.min, ref_max: r.max })
                .then(() => setTag(T('rf.saved'), true))
                .catch(() => setTag(T('rr.saveFailed'), false));
        } else {
            setTag(T('rf.saved'), true);
        }
    });

    // ---- Analytics ----
    const activityDemo = {
        views: [12, 18, 9, 22, 17, 25, 20],
        shares: [3, 5, 2, 6, 4, 7, 5],
        uploads: [2, 4, 1, 5, 3, 6, 4],
    };
    const categoryDemo = { 'Lab Report': 9, 'Prescription': 6, 'Imaging': 4, 'Specialist Report': 3, 'Discharge Summary': 2 };
    let chartRefs = [];
    // In live mode, count real audit events per day (event time is "YYYY-MM-DD HH:MM").
    function last7DayCounts(action) {
        const out = [];
        for (let i = 6; i >= 0; i--) {
            const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
            out.push(auditEvents.filter(a => String(a.time || '').startsWith(day) && a.action === action).length);
        }
        return out;
    }
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
        const st = apiMode && window.CCApi && CCApi.adminStats ? CCApi.adminStats() : null;
        const fmtMB = b => b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
        const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        setText('statFiles', st ? st.files_total : '-');
        setText('statStorage', st ? fmtMB(st.storage_bytes || 0) : '-');
        setText('statShares', st ? st.shares_active : '-');
        setText('statAppts', st ? st.appointments_upcoming : '-');
        setText('statViews7d', st ? st.views_7d : '-');
        setText('statDl7d', st ? st.downloads_7d : '-');
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
                        { label: T('au.views'), data: apiMode ? last7DayCounts('view') : activityDemo.views, borderColor: viewsColor, backgroundColor: viewsFill, fill: true, tension: 0.4, pointRadius: 3 },
                        { label: T('au.shares'), data: apiMode ? last7DayCounts('share') : activityDemo.shares, borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.08)', fill: true, tension: 0.4, pointRadius: 3 },
                        { label: T('an.uploads'), data: apiMode ? last7DayCounts('upload') : activityDemo.uploads, borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.08)', fill: true, tension: 0.4, pointRadius: 3 },
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
            const adminStats = apiMode && window.CCApi && CCApi.adminStats ? CCApi.adminStats() : null;
            const catData = adminStats && adminStats.categories
                ? Object.fromEntries(adminStats.categories.filter(c => c.count > 0).map(c => [c.name, c.count]))
                : categoryDemo;
            const keys = Object.keys(catData);
            if (keys.length === 0) {
                cat.parentElement.innerHTML = '<p class="text-sm" style="color: var(--cc-muted); padding: 2rem; text-align: center;">' + T('admin.noFilesYet', 'No files uploaded yet.') + '</p>';
            }
            chartRefs.push(new Chart(cat, {
                type: 'doughnut',
                data: {
                    labels: keys.map(k => catLabel(k)),
                    datasets: [{ data: keys.map(k => catData[k]), backgroundColor: ['#06b6d4', isDark ? '#e6eef7' : '#0c2340', '#8b5cf6', '#f59e0b', '#10b981'], borderWidth: 2, borderColor: doughnutBorder }],
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
    // Compact rows: action icon, actor + action badge, details on one meta line,
    // time pinned at the end (desktop) or on the actor line (phone).
    const AU_ICONS = {
        view: 'eye', download: 'download', share: 'share-2', revoke: 'shield-off',
        approve: 'user-check', note: 'file-text', delete: 'trash-2', deactivate: 'user-x',
        activate: 'user-check', upload: 'upload', archive: 'archive', restore: 'rotate-ccw',
        login: 'log-in', register: 'user-plus', lab_add: 'flask-conical',
    };
    let auditFilterValue = 'all';

    function auditWhen(raw) {
        const t = String(raw || '').trim();
        if (!t) return { time: '', date: '' };
        if (t === 'just now') return { time: T('tm.justNow'), date: '' };
        const parts = t.split(' ');
        const day = parts[0] || '';
        const hm = (parts[1] || '').slice(0, 5);
        const pad = n => String(n).padStart(2, '0');
        const localIso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
        let label = day;
        if (day === localIso(new Date())) label = T('au.today');
        else if (day === localIso(new Date(Date.now() - 86400000))) label = T('au.yesterday');
        else if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
            label = window.CCi18n ? CCi18n.fmtDate(day, { day: '2-digit', month: 'short' }) : day;
        }
        return { time: hm, date: label };
    }

    function auditDetails(a) {
        if (a.detailsKey) return T(a.detailsKey);
        const bits = [];
        const seen = String(a.details || '');
        if (seen) bits.push(seen);
        if (a.fileTitle && !seen.includes(a.fileTitle)) bits.push('"' + a.fileTitle + '"');
        if (a.targetEmail && !seen.includes(a.targetEmail)) bits.push(T('au.with') + ' ' + a.targetEmail);
        return bits.join(' · ');
    }

    function auditSearchText(a) {
        return [a.user, a.action, a.details, a.detailsKey ? T(a.detailsKey) : '', a.fileTitle, a.targetEmail]
            .filter(Boolean).join(' ').toLowerCase();
    }

    function renderAudit() {
        const list = document.getElementById('auditList');
        if (!list) return;
        const searchEl = document.getElementById('auditSearch');
        const q = (searchEl && searchEl.value ? searchEl.value : '').trim().toLowerCase();

        document.querySelectorAll('.au-chip').forEach(chip => {
            const f = chip.getAttribute('data-au-filter') || 'all';
            const n = auditEvents.filter(a => f === 'all' || a.action === f).length;
            const b = chip.querySelector('b');
            if (b) b.textContent = n;
            chip.classList.toggle('is-active', f === auditFilterValue);
        });

        const rows = auditEvents.filter(a =>
            (auditFilterValue === 'all' || a.action === auditFilterValue) &&
            (!q || auditSearchText(a).includes(q)));

        const countEl = document.getElementById('auditCount');
        if (countEl) countEl.textContent = rows.length;

        list.innerHTML = rows.map(a => {
            const when = auditWhen(a.time);
            const icon = AU_ICONS[a.action] || 'activity';
            const badge = T('au.act.' + a.action, a.action);
            const actor = nameLabel(a.user);
            const whenSm = [when.time, when.date].filter(Boolean).join(' · ');
            const detail = auditDetails(a);
            return `
            <li class="au-row au-is-${a.action}">
                <span class="au-ic"><i data-lucide="${icon}"></i></span>
                <div class="au-main">
                    <p class="au-top">
                        <strong class="au-actor">${actor}</strong>
                        <span class="au-badge au-b-${a.action}">${badge}</span>
                        <span class="au-when-sm">${whenSm}</span>
                    </p>
                    ${detail ? `<p class="au-detail">${detail}</p>` : ''}
                </div>
                <span class="au-when"><b>${when.time}</b><span>${when.date}</span></span>
            </li>`;
        }).join('') || `<li class="au-empty">${T('au.empty')}</li>`;
        refreshIcons();
    }
    document.querySelectorAll('.au-chip').forEach(chip => chip.addEventListener('click', () => {
        auditFilterValue = chip.getAttribute('data-au-filter') || 'all';
        renderAudit();
    }));
    const auditSearchInput = document.getElementById('auditSearch');
    if (auditSearchInput) auditSearchInput.addEventListener('input', renderAudit);

    renderPending();
    renderUsers();
    renderLists();
    renderRanges();
    renderAudit();
    renderAnalytics();
    refreshIcons();
    if (window.ccGateOpen) window.ccGateOpen();
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
    window.CC_NOTIFS = () => apiMode ? CCApi.liveNotifs() : adminNotifs.map(n => ({ ...n, text: T(n.textKey), time: T(n.timeKey) }));
    window.CC_NOTIFS_MARK_READ = () => { if (apiMode) { CCApi.markAllNotifsRead(); } else adminNotifs.forEach(n => { n.unread = false; }); };
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
