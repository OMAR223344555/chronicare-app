document.addEventListener('DOMContentLoaded', () => {

    function refreshIcons() {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    // Demo state (client-side only, no backend yet)
    const pendingDoctors = [
        { id: 1, name: 'Dr. Youssef Nader', specialty: 'Endocrinology', license: 'MED-2026-4471', applied: '2026-11-24' },
        { id: 2, name: 'Dr. Hana Sherif', specialty: 'Nephrology', license: 'MED-2025-8823', applied: '2026-11-26' },
    ];

    const users = [
        { id: 11, name: 'Dr. Ahmed Farouk', role: 'Doctor', detail: 'Internal Medicine • MED-2019-1024', status: 'Active' },
        { id: 12, name: 'Dr. Salma Nabil', role: 'Doctor', detail: 'Cardiology • MED-2018-5567', status: 'Active' },
        { id: 13, name: 'Dr. Mariam Khaled', role: 'Doctor', detail: 'Nephrology • MED-2021-3390', status: 'Active' },
        { id: 14, name: 'Maya Hassan', role: 'Patient', detail: 'Diabetes, Hypertension', status: 'Active' },
        { id: 15, name: 'Omar Adel', role: 'Patient', detail: 'Hypertension', status: 'Active' },
        { id: 16, name: 'Sara Mahmoud', role: 'Patient', detail: 'Chronic kidney disease', status: 'Active' },
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
        { time: '2026-11-26 21:14', user: 'Dr. Ahmed Farouk', action: 'view', details: 'Viewed "HbA1c Lab Report" (Maya Hassan)' },
        { time: '2026-11-26 21:16', user: 'Dr. Ahmed Farouk', action: 'note', details: 'Added a note on "HbA1c Lab Report"' },
        { time: '2026-11-25 18:02', user: 'Maya Hassan', action: 'share', details: 'Shared 2 files with Dr. Ahmed Farouk, expires 30 Dec 2026' },
        { time: '2026-11-25 10:47', user: 'Dr. Salma Nabil', action: 'download', details: 'Downloaded "Cardiology Follow-up" (Maya Hassan)' },
        { time: '2026-11-24 09:31', user: 'Administrator', action: 'approve', details: 'Approved doctor account Dr. Mariam Khaled' },
        { time: '2026-11-23 16:55', user: 'Maya Hassan', action: 'revoke', details: 'Revoked Dr. Karim Adel\'s access to all files' },
        { time: '2026-11-22 12:20', user: 'Sara Mahmoud', action: 'share', details: 'Shared "Kidney Function Test" with Dr. Ahmed Farouk' },
        { time: '2026-11-21 08:40', user: 'Maya Hassan', action: 'view', details: 'Uploaded "Fasting Glucose Result"' },
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
        refreshIcons();
    }
    document.querySelectorAll('[data-navigate]').forEach(elem => {
        elem.addEventListener('click', (e) => {
            e.preventDefault();
            showView(elem.getAttribute('data-navigate'));
        });
    });

    // ---- Manage Users ----
    function renderPending() {
        const tbody = document.getElementById('pendingDoctorsTable');
        document.getElementById('pendingCount').textContent = `${pendingDoctors.length} pending`;
        tbody.innerHTML = pendingDoctors.length ? pendingDoctors.map(d => `
            <tr>
                <td><strong>${d.name}</strong></td>
                <td>${d.specialty}</td>
                <td><span class="font-mono text-xs">${d.license}</span></td>
                <td>${d.applied}</td>
                <td>
                    <div class="flex gap-2">
                        <button type="button" class="approve-doctor-btn bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-green-200 transition" data-id="${d.id}">Approve</button>
                        <button type="button" class="decline-doctor-btn bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-red-100 transition" data-id="${d.id}">Decline</button>
                    </div>
                </td>
            </tr>`).join('')
            : `<tr><td colspan="5" class="text-center text-slate-400 py-8">No pending applications.</td></tr>`;
        refreshIcons();
    }

    function renderUsers() {
        const tbody = document.getElementById('usersTable');
        tbody.innerHTML = users.map(u => `
            <tr>
                <td><strong>${u.name}</strong></td>
                <td>${u.role}</td>
                <td class="text-slate-500">${u.detail}</td>
                <td>${u.status === 'Active'
                    ? '<span class="status reviewed">Active</span>'
                    : '<span class="status archived">Deactivated</span>'}</td>
                <td><button type="button" class="toggle-user-btn more-btn" data-id="${u.id}">${u.status === 'Active' ? 'Deactivate' : 'Activate'}</button></td>
            </tr>`).join('');
        refreshIcons();
    }

    document.addEventListener('click', (e) => {
        const approveBtn = e.target.closest('.approve-doctor-btn');
        if (approveBtn) {
            const d = pendingDoctors.find(x => x.id === Number(approveBtn.dataset.id));
            if (!d) return;
            pendingDoctors.splice(pendingDoctors.indexOf(d), 1);
            users.push({ id: 100 + d.id, name: d.name, role: 'Doctor', detail: `${d.specialty} • ${d.license}`, status: 'Active' });
            auditEvents.unshift({ time: 'just now', user: 'Administrator', action: 'approve', details: `Approved doctor account ${d.name}` });
            renderPending(); renderUsers(); renderAudit();
            return;
        }
        const declineBtn = e.target.closest('.decline-doctor-btn');
        if (declineBtn) {
            const d = pendingDoctors.find(x => x.id === Number(declineBtn.dataset.id));
            if (!d) return;
            if (!confirm(`Decline ${d.name}'s application?`)) return;
            pendingDoctors.splice(pendingDoctors.indexOf(d), 1);
            renderPending();
            return;
        }
        const toggleBtn = e.target.closest('.toggle-user-btn');
        if (toggleBtn) {
            const u = users.find(x => x.id === Number(toggleBtn.dataset.id));
            if (!u) return;
            u.status = u.status === 'Active' ? 'Deactivated' : 'Active';
            auditEvents.unshift({ time: 'just now', user: 'Administrator', action: u.status === 'Active' ? 'approve' : 'revoke', details: `${u.status} account ${u.name}` });
            renderUsers(); renderAudit();
        }
    });

    // ---- Categories, conditions, ranges ----
    function renderLists() {
        document.getElementById('categoriesList').innerHTML = categories.map(c => `
            <li class="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm">
                <span class="font-semibold text-[#0c2340]">${c}</span>
            </li>`).join('');
        document.getElementById('conditionsList').innerHTML = conditions.map(c => `
            <li class="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm">
                <span class="font-semibold text-[#0c2340]">${c}</span>
            </li>`).join('');
    }

    function renderRanges() {
        document.getElementById('rangesTable').innerHTML = ranges.map(r => `
            <tr>
                <td><strong>${r.test}</strong></td>
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
        if (name && !categories.includes(name)) { categories.push(name); renderLists(); }
        input.value = '';
    });
    document.getElementById('addConditionForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('newConditionName');
        const name = input.value.trim();
        if (name && !conditions.includes(name)) { conditions.push(name); renderLists(); }
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
        if (tag) tag.textContent = 'Saved ✓';
    });

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
                <td class="text-slate-500 whitespace-nowrap">${a.time}</td>
                <td><strong>${a.user}</strong></td>
                <td><span class="text-xs font-bold px-2.5 py-1 rounded-full ${ACTION_STYLES[a.action] || 'bg-slate-100 text-slate-600'}">${a.action}</span></td>
                <td class="text-slate-600">${a.details}</td>
            </tr>`).join('') || `<tr><td colspan="4" class="text-center text-slate-400 py-8">No events match this filter.</td></tr>`;
    }
    document.getElementById('auditFilter').addEventListener('change', renderAudit);

    renderPending();
    renderUsers();
    renderLists();
    renderRanges();
    renderAudit();
    refreshIcons();

    // Deep links: #users, #reference, #audit
    function handleHashRoute() {
        const hash = window.location.hash.replace('#', '').trim();
        if (['users', 'reference', 'audit'].includes(hash)) showView(hash);
    }
    window.addEventListener('hashchange', handleHashRoute);
    handleHashRoute();
});
