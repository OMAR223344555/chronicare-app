document.addEventListener('DOMContentLoaded', () => {

    // ==========================================================================
    // 0. Demo state (client-side only, no backend yet)
    // ==========================================================================
    const state = {
        records: [
            { id: 1, name: 'HbA1c Lab Report', condition: 'diabetes', category: 'lab', date: '2026-03-18', status: 'Reviewed', facility: 'Cairo Lab', doctor: 'Dr. Ahmed Farouk', specialty: 'Internal Medicine', archived: false },
            { id: 2, name: 'Cardiology Follow-up', condition: 'hypertension', category: 'lab', date: '2026-03-12', status: 'Review', facility: 'Heart Care Clinic', doctor: 'Dr. Salma Nabil', specialty: 'Cardiology', archived: false },
            { id: 3, name: 'Kidney Function Test', condition: 'diabetes', category: 'lab', date: '2026-03-04', status: 'Reviewed', facility: 'Cairo Lab', doctor: 'Dr. Mariam Khaled', specialty: 'Nephrology', archived: false },
            { id: 4, name: 'ECG Report', condition: 'cardiac', category: 'imaging', date: '2026-02-25', status: 'Reviewed', facility: 'Heart Care Clinic', doctor: 'Dr. Salma Nabil', specialty: 'Cardiology', archived: false },
            { id: 5, name: 'Discharge Summary', condition: 'hypertension', category: 'prescription', date: '2026-02-10', status: 'Archived', facility: 'Alex General Hospital', doctor: 'Dr. Ahmed Farouk', specialty: 'Internal Medicine', archived: true },
            { id: 6, name: 'Fasting Glucose Result', condition: 'diabetes', category: 'lab', date: '2026-02-06', status: 'Review', facility: 'Cairo Lab', doctor: 'Dr. Ahmed Farouk', specialty: 'Internal Medicine', archived: false },
        ],
        nextRecordId: 7,
        labs: [
            { test: 'HBA1C', label: 'HbA1c', unit: '%', min: 4.0, max: 5.6, value: 6.4, date: '2026-11-18' },
            { test: 'HBA1C', label: 'HbA1c', unit: '%', min: 4.0, max: 5.6, value: 6.7, date: '2026-08-15' },
            { test: 'HBA1C', label: 'HbA1c', unit: '%', min: 4.0, max: 5.6, value: 7.1, date: '2026-05-10' },
            { test: 'FBG', label: 'Fasting glucose', unit: 'mg/dL', min: 70, max: 99, value: 108, date: '2026-11-18' },
            { test: 'FBG', label: 'Fasting glucose', unit: 'mg/dL', min: 70, max: 99, value: 96, date: '2026-08-15' },
            { test: 'SBP', label: 'Systolic BP', unit: 'mmHg', min: 90, max: 120, value: 128, date: '2026-11-12' },
            { test: 'SBP', label: 'Systolic BP', unit: 'mmHg', min: 90, max: 120, value: 122, date: '2026-08-01' },
            { test: 'EGFR', label: 'eGFR', unit: 'mL/min', min: 90, max: null, value: 88, date: '2026-11-04' },
            { test: 'EGFR', label: 'eGFR', unit: 'mL/min', min: 90, max: null, value: 92, date: '2026-06-20' },
        ],
        shares: [
            { id: 1, doctor: 'Dr. Ahmed Farouk', specialty: 'Internal Medicine', initials: 'AF', color: 'bg-cyan-200', files: 'HbA1c • Prescription', count: 2, expires: '2026-12-30' },
            { id: 2, doctor: 'Dr. Salma Nabil', specialty: 'Cardiology', initials: 'SN', color: 'bg-violet-200', files: 'Cardiology follow-up', count: 1, expires: '2026-12-25' },
            { id: 3, doctor: 'Dr. Mariam Khaled', specialty: 'Nephrology', initials: 'MK', color: 'bg-orange-100', files: 'Kidney function test', count: 1, expires: '2027-01-12' },
        ],
        nextShareId: 4,
        timeline: [
            { month: 'Nov', title: 'HbA1c Lab Test Complete', date: '18 Nov 2026', text: 'Report reviewed with Dr. Ahmed Farouk. Glucose control steady.' },
            { month: 'Nov', title: 'Cardiology Follow-up Consultation', date: '12 Nov 2026', text: 'Dr. Salma Nabil reviewed blood pressure trends. Medication dosage maintained.' },
            { month: 'Feb', title: 'Annual Cardiovascular Assessment', date: '25 Feb 2026', text: 'ECG and stress test completed with normal readings.' },
        ],
    };

    const CONDITION_LABELS = { diabetes: 'Diabetes', hypertension: 'Hypertension', cardiac: 'Cardiac', ckd: 'Chronic kidney disease' };
    const CATEGORY_LABELS = { lab: 'Lab Report', prescription: 'Prescription', imaging: 'Imaging', specialist: 'Specialist Report', discharge: 'Discharge Summary' };

    function refreshIcons() {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }
    refreshIcons();

    function fmtDate(iso) {
        const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    // ==========================================================================
    // 1. Authentication: sign in / sign up switching, roles, password toggle
    // ==========================================================================
    const signInForm = document.getElementById('signin-form-box');
    const signUpForm = document.getElementById('signup-form-box');
    const signInHero = document.getElementById('hero-signin-content');
    const signUpHero = document.getElementById('hero-signup-content');
    const toSignUpBtn = document.getElementById('to-signup-btn');
    const toSignInBtn = document.getElementById('to-signin-btn');

    if (toSignUpBtn && signInForm && signUpForm) {
        toSignUpBtn.addEventListener('click', () => {
            signInForm.classList.add('hidden');
            signUpForm.classList.remove('hidden');
            if (signInHero && signUpHero) {
                signInHero.classList.add('hidden');
                signUpHero.classList.remove('hidden');
            }
            refreshIcons();
        });
    }
    if (toSignInBtn && signInForm && signUpForm) {
        toSignInBtn.addEventListener('click', () => {
            signUpForm.classList.add('hidden');
            signInForm.classList.remove('hidden');
            if (signInHero && signUpHero) {
                signUpHero.classList.add('hidden');
                signInHero.classList.remove('hidden');
            }
            refreshIcons();
        });
    }

    document.querySelectorAll('.toggle-password-btn').forEach(button => {
        button.addEventListener('click', () => {
            const input = document.getElementById(button.getAttribute('data-target'));
            if (!input) return;
            input.type = input.type === 'password' ? 'text' : 'password';
            button.innerHTML = `<i data-lucide="${input.type === 'password' ? 'eye-off' : 'eye'}" class="w-5 h-5"></i>`;
            refreshIcons();
        });
    });

    // Doctor-only registration fields appear when the role is Doctor
    const signupRole = document.getElementById('signup-role');
    const doctorFields = document.getElementById('doctor-fields');
    if (signupRole && doctorFields) {
        signupRole.addEventListener('change', () => {
            const isDoctor = signupRole.value === 'doctor';
            doctorFields.classList.toggle('hidden', !isDoctor);
            doctorFields.querySelectorAll('input').forEach(i => { i.required = isDoctor; });
            refreshIcons();
        });
    }

    // Role-based landing: patient portal in this page, doctor/admin portals elsewhere
    function landForRole(role) {
        if (role === 'doctor') { window.location.href = './doctor.html'; return; }
        if (role === 'admin') { window.location.href = './admin.html'; return; }
        showView('overview');
    }

    const signinRole = document.getElementById('signin-role');
    const signinFormEl = document.querySelector('#signin-form-box form');
    if (signinFormEl) {
        signinFormEl.addEventListener('submit', (e) => {
            e.preventDefault();
            landForRole(signinRole ? signinRole.value : 'patient');
        });
    }

    const signupFormEl = document.querySelector('#signup-form-box form');
    if (signupFormEl) {
        signupFormEl.addEventListener('submit', (e) => {
            e.preventDefault();
            const role = signupRole ? signupRole.value : 'patient';
            if (role === 'doctor') {
                const note = document.getElementById('doctor-pending-note');
                if (note) note.classList.remove('hidden');
                refreshIcons();
                return; // doctors stay pending until an admin approves them
            }
            landForRole('patient');
        });
    }

    // ==========================================================================
    // 2. Single-page navigation
    // ==========================================================================
    const authView = document.getElementById('auth-view');
    const portalView = document.getElementById('portal-view');
    const subviews = document.querySelectorAll('.portal-subview');
    const navItems = document.querySelectorAll('.portal-nav-btn');
    const breadcrumbCurrent = document.getElementById('breadcrumb-current');
    const sidebar = document.getElementById('sidebar');

    const viewTitles = {
        'overview': 'Patient Portal',
        'medical-files': 'My Medical Files',
        'upload-file': 'Upload Record',
        'sharing-access': 'Sharing & Access',
        'lab-trends': 'Lab Trends',
        'timeline-archive': 'Timeline & Archive'
    };

    function showView(viewName, updateHash = true) {
        if (!viewName) viewName = 'auth';

        if (viewName === 'auth') {
            if (authView) authView.classList.remove('hidden');
            if (portalView) portalView.classList.add('hidden');
            if (updateHash) history.replaceState(null, null, '#auth');
        } else {
            if (authView) authView.classList.add('hidden');
            if (portalView) portalView.classList.remove('hidden');

            let matched = false;
            subviews.forEach(sub => {
                if (sub.id === `view-${viewName}`) {
                    sub.classList.remove('hidden');
                    matched = true;
                } else {
                    sub.classList.add('hidden');
                }
            });
            if (!matched && document.getElementById('view-overview')) {
                document.getElementById('view-overview').classList.remove('hidden');
                viewName = 'overview';
            }

            navItems.forEach(item => {
                const target = item.getAttribute('data-target');
                if (target === viewName) {
                    item.classList.add('bg-cyan-50', 'text-[#0c2340]', 'font-bold');
                    item.classList.remove('text-slate-600', 'hover:bg-slate-50');
                } else {
                    item.classList.remove('bg-cyan-50', 'text-[#0c2340]', 'font-bold');
                    item.classList.add('text-slate-600', 'hover:bg-slate-50');
                }
            });

            if (breadcrumbCurrent && viewTitles[viewName]) {
                breadcrumbCurrent.textContent = viewTitles[viewName];
            }
            if (updateHash) history.replaceState(null, null, `#${viewName}`);
            if (sidebar && !sidebar.classList.contains('hidden') && window.innerWidth < 768) {
                sidebar.classList.add('hidden');
            }
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        refreshIcons();
    }

    document.querySelectorAll('[data-navigate]').forEach(elem => {
        elem.addEventListener('click', (e) => {
            e.preventDefault();
            showView(elem.getAttribute('data-navigate'));
        });
    });

    function handleHashRoute() {
        const hash = window.location.hash.replace('#', '').trim();
        if (['overview', 'medical-files', 'upload-file', 'sharing-access', 'lab-trends', 'timeline-archive'].includes(hash)) {
            showView(hash, false);
        } else {
            showView('auth', false);
        }
    }
    window.addEventListener('hashchange', handleHashRoute);
    handleHashRoute();

    const signOutBtn = document.getElementById('sign-out-btn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showView('auth');
        });
    }

    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenuClose = document.getElementById('mobile-menu-close');
    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('hidden');
            sidebar.classList.toggle('fixed');
            sidebar.classList.toggle('inset-0');
            sidebar.classList.toggle('z-50');
            refreshIcons();
        });
    }
    if (mobileMenuClose && sidebar) {
        mobileMenuClose.addEventListener('click', () => {
            sidebar.classList.add('hidden');
            sidebar.classList.remove('fixed', 'inset-0', 'z-50');
        });
    }

    // ==========================================================================
    // 3. My Medical Files: render, search, filter, archive, details pop-up
    // ==========================================================================
    const recordsTable = document.getElementById('recordsTable');
    const searchInput = document.getElementById('searchInput');
    const conditionFilter = document.getElementById('conditionFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const resetBtn = document.getElementById('resetBtn');
    const recordCount = document.getElementById('recordCount');
    const tableFooter = document.getElementById('tableFooterCount');
    const archiveCount = document.getElementById('archiveCount');

    function renderRecords() {
        if (!recordsTable) return;
        const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const cond = conditionFilter ? conditionFilter.value : 'all';
        const cat = categoryFilter ? categoryFilter.value : 'all';

        const active = state.records.filter(r => !r.archived);
        const visible = active.filter(r => {
            const matchesSearch = !search || r.name.toLowerCase().includes(search)
                || (r.facility || '').toLowerCase().includes(search)
                || (r.doctor || '').toLowerCase().includes(search);
            const matchesCond = cond === 'all' || r.condition === cond;
            const matchesCat = cat === 'all' || r.category === cat;
            return matchesSearch && matchesCond && matchesCat;
        });

        recordsTable.innerHTML = visible.map(r => `
            <tr data-id="${r.id}" class="cursor-pointer hover:bg-slate-50 transition">
                <td><span class="file-icon">PDF</span><strong>${r.name}</strong></td>
                <td>${CONDITION_LABELS[r.condition] || r.condition}</td>
                <td>${CATEGORY_LABELS[r.category] || r.category}</td>
                <td>${fmtDate(r.date)}</td>
                <td><span class="status ${r.status === 'Reviewed' ? 'reviewed' : 'review'}">${r.status}</span></td>
                <td>
                    <div class="flex items-center gap-2">
                        <button type="button" class="more-btn view-record-btn" data-id="${r.id}" title="View details"><i data-lucide="eye" class="w-4 h-4"></i></button>
                        <button type="button" class="more-btn archive-record-btn" data-id="${r.id}" title="Archive"><i data-lucide="archive" class="w-4 h-4"></i></button>
                    </div>
                </td>
            </tr>`).join('') || `<tr><td colspan="6" class="text-center text-slate-400 py-8">No records match your filters.</td></tr>`;

        if (recordCount) recordCount.textContent = `${visible.length} Records`;
        if (tableFooter) tableFooter.textContent = `Showing ${visible.length} of ${active.length} records`;
        const archived = state.records.filter(r => r.archived).length;
        if (archiveCount) archiveCount.textContent = `${archived} Files`;
        renderArchiveList();
        refreshIcons();
    }

    if (searchInput) searchInput.addEventListener('input', renderRecords);
    if (conditionFilter) conditionFilter.addEventListener('change', renderRecords);
    if (categoryFilter) categoryFilter.addEventListener('change', renderRecords);
    if (resetBtn) resetBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        if (conditionFilter) conditionFilter.value = 'all';
        if (categoryFilter) categoryFilter.value = 'all';
        renderRecords();
    });

    document.querySelectorAll('.condition-row').forEach(row => {
        row.addEventListener('click', () => {
            if (!conditionFilter) return;
            const text = row.textContent.toLowerCase();
            if (text.includes('diabetes')) conditionFilter.value = 'diabetes';
            else if (text.includes('hypertension')) conditionFilter.value = 'hypertension';
            else conditionFilter.value = 'all';
            renderRecords();
        });
    });

    // Archive / restore
    function setArchived(id, archived) {
        const rec = state.records.find(r => r.id === id);
        if (!rec) return;
        rec.archived = archived;
        rec.status = archived ? 'Archived' : 'Review';
        renderRecords();
    }

    const archiveList = document.getElementById('archiveList');
    function renderArchiveList() {
        if (!archiveList) return;
        const archived = state.records.filter(r => r.archived);
        archiveList.innerHTML = archived.length ? archived.map(r => `
            <div class="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-4">
                <div>
                    <p class="font-bold text-[#0c2340] text-sm">${r.name}</p>
                    <p class="text-xs text-slate-500 mt-0.5">${CATEGORY_LABELS[r.category]} • ${fmtDate(r.date)} • ${r.facility}</p>
                </div>
                <button type="button" class="restore-record-btn text-xs font-bold text-cyan-700 hover:underline shrink-0" data-id="${r.id}">Restore</button>
            </div>`).join('')
            : `<p class="text-sm text-slate-400">No archived files. Archiving keeps old records safe without deleting them.</p>`;
        refreshIcons();
    }

    // File details pop-up
    const fileModal = document.getElementById('fileModal');
    function openFileModal(id) {
        const r = state.records.find(x => x.id === id);
        if (!r || !fileModal) return;
        document.getElementById('modalFileName').textContent = r.name;
        document.getElementById('modalFileBody').innerHTML = `
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div><p class="text-xs text-slate-400 font-bold uppercase tracking-wider">Condition</p><p class="font-semibold text-[#0c2340] mt-1">${CONDITION_LABELS[r.condition]}</p></div>
                <div><p class="text-xs text-slate-400 font-bold uppercase tracking-wider">Category</p><p class="font-semibold text-[#0c2340] mt-1">${CATEGORY_LABELS[r.category]}</p></div>
                <div><p class="text-xs text-slate-400 font-bold uppercase tracking-wider">Record date</p><p class="font-semibold text-[#0c2340] mt-1">${fmtDate(r.date)}</p></div>
                <div><p class="text-xs text-slate-400 font-bold uppercase tracking-wider">Status</p><p class="font-semibold text-[#0c2340] mt-1">${r.status}</p></div>
                <div><p class="text-xs text-slate-400 font-bold uppercase tracking-wider">Issuing facility</p><p class="font-semibold text-[#0c2340] mt-1">${r.facility || '-'}</p></div>
                <div><p class="text-xs text-slate-400 font-bold uppercase tracking-wider">Issuing doctor</p><p class="font-semibold text-[#0c2340] mt-1">${r.doctor || '-'}</p></div>
                <div><p class="text-xs text-slate-400 font-bold uppercase tracking-wider">Specialty</p><p class="font-semibold text-[#0c2340] mt-1">${r.specialty || '-'}</p></div>
            </div>
            <div class="mt-5 h-40 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400">
                <i data-lucide="file-text" class="w-8 h-8 mb-2 text-cyan-600"></i>
                <p class="text-xs">Document preview appears here once the backend is connected.</p>
            </div>`;
        fileModal.classList.remove('hidden');
        fileModal.classList.add('flex');
        refreshIcons();
    }
    function closeFileModal() {
        if (!fileModal) return;
        fileModal.classList.add('hidden');
        fileModal.classList.remove('flex');
    }
    document.querySelectorAll('.close-file-modal').forEach(b => b.addEventListener('click', closeFileModal));
    if (fileModal) fileModal.addEventListener('click', (e) => { if (e.target === fileModal) closeFileModal(); });

    document.addEventListener('click', (e) => {
        const viewBtn = e.target.closest('.view-record-btn');
        if (viewBtn) { openFileModal(Number(viewBtn.dataset.id)); return; }
        const archBtn = e.target.closest('.archive-record-btn');
        if (archBtn) { setArchived(Number(archBtn.dataset.id), true); return; }
        const restoreBtn = e.target.closest('.restore-record-btn');
        if (restoreBtn) { setArchived(Number(restoreBtn.dataset.id), false); return; }
        const row = e.target.closest('#recordsTable tr[data-id]');
        if (row) openFileModal(Number(row.dataset.id));
    });

    // ==========================================================================
    // 4. Upload File page (FR-02)
    // ==========================================================================
    const uploadForm = document.getElementById('uploadForm');
    const uploadFileInput = document.getElementById('uploadFileInput');
    const uploadFileName = document.getElementById('uploadFileName');

    if (uploadFileInput && uploadFileName) {
        uploadFileInput.addEventListener('change', () => {
            uploadFileName.textContent = uploadFileInput.files.length
                ? uploadFileInput.files[0].name
                : 'PDF, JPG or PNG, up to 10 MB';
        });
    }
    if (uploadForm) {
        uploadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const f = new FormData(uploadForm);
            const rec = {
                id: state.nextRecordId++,
                name: f.get('title'),
                condition: f.get('condition'),
                category: f.get('category'),
                date: f.get('record_date'),
                status: 'Review',
                facility: f.get('facility'),
                doctor: f.get('doctor'),
                specialty: f.get('specialty'),
                archived: false,
            };
            state.records.unshift(rec);
            state.timeline.unshift({
                month: new Date(rec.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' }),
                title: `Uploaded: ${rec.name}`,
                date: fmtDate(rec.date),
                text: `${CATEGORY_LABELS[rec.category]} for ${CONDITION_LABELS[rec.condition]}, issued by ${rec.doctor || rec.facility || 'unknown'}.`,
            });
            renderRecords();
            renderTimeline();
            uploadForm.reset();
            if (uploadFileName) uploadFileName.textContent = 'PDF, JPG or PNG, up to 10 MB';
            showView('medical-files');
        });
    }

    // ==========================================================================
    // 5. Timeline (rendered from state)
    // ==========================================================================
    const timelineList = document.getElementById('timelineList');
    function renderTimeline() {
        if (!timelineList) return;
        timelineList.innerHTML = state.timeline.map(t => `
            <div class="relative flex items-start gap-4">
                <div class="w-8 h-8 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0 z-10 font-bold text-xs">${t.month}</div>
                <div class="bg-slate-50 p-4 rounded-xl flex-1 border border-slate-100">
                    <div class="flex justify-between items-start">
                        <p class="font-bold text-[#0c2340] text-sm">${t.title}</p>
                        <span class="text-xs text-slate-400">${t.date}</span>
                    </div>
                    <p class="text-xs text-slate-600 mt-1">${t.text}</p>
                </div>
            </div>`).join('');
        refreshIcons();
    }

    // ==========================================================================
    // 6. Lab Results & Trends (FR-04)
    // ==========================================================================
    const labTestSelect = document.getElementById('labTestSelect');
    const labResultsTable = document.getElementById('labResultsTable');
    const trendChart = document.getElementById('trendChart');
    const labEntryForm = document.getElementById('labEntryForm');
    const labTestTypes = [...new Map(state.labs.map(l => [l.test, l])).values()];

    function outOfRange(l) {
        if (l.min != null && l.value < l.min) return true;
        if (l.max != null && l.value > l.max) return true;
        return false;
    }

    function renderLabTable() {
        if (!labResultsTable) return;
        const test = labTestSelect ? labTestSelect.value : 'all';
        const rows = state.labs
            .filter(l => test === 'all' || l.test === test)
            .sort((a, b) => b.date.localeCompare(a.date));
        labResultsTable.innerHTML = rows.map(l => `
            <tr class="${outOfRange(l) ? 'bg-red-50' : ''}">
                <td class="py-2.5">${l.label}</td>
                <td class="font-bold ${outOfRange(l) ? 'text-red-600' : 'text-[#0c2340]'}">${l.value} <span class="text-xs font-semibold text-slate-400">${l.unit}</span></td>
                <td class="text-slate-500">${l.min != null ? l.min : ''}${l.max != null ? ' - ' + l.max : (l.min != null ? '+' : '')} ${l.unit}</td>
                <td class="text-slate-500">${fmtDate(l.date)}</td>
                <td>${outOfRange(l)
                    ? '<span class="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">Out of range</span>'
                    : '<span class="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">In range</span>'}</td>
            </tr>`).join('') || `<tr><td colspan="5" class="text-center text-slate-400 py-6">No results yet.</td></tr>`;
    }

    function renderTrendChart() {
        if (!trendChart) return;
        const test = labTestSelect && labTestSelect.value !== 'all' ? labTestSelect.value : 'HBA1C';
        const meta = labTestTypes.find(l => l.test === test) || state.labs.find(l => l.test === test);
        const points = state.labs.filter(l => l.test === test).sort((a, b) => a.date.localeCompare(b.date));
        if (!points.length) {
            trendChart.innerHTML = `<p class="text-sm text-slate-400 p-6">No data for this test yet.</p>`;
            return;
        }
        const W = 560, H = 190, PAD = 40;
        const values = points.map(p => p.value);
        const bounds = [...values, meta.min, meta.max].filter(v => v != null);
        const vMin = Math.min(...bounds) * 0.95, vMax = Math.max(...bounds) * 1.05;
        const x = i => PAD + (points.length === 1 ? (W - 2 * PAD) / 2 : i * (W - 2 * PAD) / (points.length - 1));
        const y = v => H - PAD - ((v - vMin) / (vMax - vMin)) * (H - 2 * PAD);
        const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ');
        const rangeBand = (meta.min != null && meta.max != null)
            ? `<rect x="${PAD}" y="${y(meta.max)}" width="${W - 2 * PAD}" height="${y(meta.min) - y(meta.max)}" fill="#dcfce7" opacity="0.6"/>`
            : (meta.min != null ? `<rect x="${PAD}" y="${PAD}" width="${W - 2 * PAD}" height="${y(meta.min) - PAD}" fill="#dcfce7" opacity="0.6"/>` : '');
        trendChart.innerHTML = `
            <svg viewBox="0 0 ${W} ${H}" class="w-full h-48">
                ${rangeBand}
                <line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="#e2e8f0"/>
                <polyline points="${line}" fill="none" stroke="#0891b2" stroke-width="2.5"/>
                ${points.map((p, i) => `
                    <circle cx="${x(i)}" cy="${y(p.value)}" r="4.5" fill="${outOfRange(p) ? '#dc2626' : '#0891b2'}"/>
                    <text x="${x(i)}" y="${y(p.value) - 10}" text-anchor="middle" font-size="10" fill="#0c2340" font-weight="bold">${p.value}</text>
                    <text x="${x(i)}" y="${H - PAD + 16}" text-anchor="middle" font-size="9" fill="#94a3b8">${p.date.slice(5)}</text>`).join('')}
            </svg>
            <p class="text-xs text-slate-400 mt-2">${meta.label} over time (${meta.unit}). Green band = reference range; red points are outside it.</p>`;
    }

    if (labTestSelect) labTestSelect.addEventListener('change', () => { renderLabTable(); renderTrendChart(); });
    if (labEntryForm) {
        labEntryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const f = new FormData(labEntryForm);
            const meta = labTestTypes.find(l => l.test === f.get('test'));
            if (!meta) return;
            state.labs.push({
                test: meta.test, label: meta.label, unit: meta.unit,
                min: meta.min, max: meta.max,
                value: Number(f.get('value')), date: f.get('measured_at'),
            });
            renderLabTable();
            renderTrendChart();
            labEntryForm.reset();
        });
    }

    // ==========================================================================
    // 7. Share Management (FR-05): create, expiry, revoke
    // ==========================================================================
    const sharesList = document.getElementById('sharesList');
    const shareCountBadge = document.getElementById('shareCountBadge');
    const newShareForm = document.getElementById('newShareForm');

    function renderShares() {
        if (!sharesList) return;
        sharesList.innerHTML = state.shares.length ? state.shares.map(s => `
            <div class="flex items-center gap-4 border border-slate-100 rounded-xl p-4 mb-3.5 hover:border-slate-200 transition">
                <div class="w-11 h-11 rounded-full ${s.color} flex items-center justify-center font-bold text-[#0c2340] text-sm shrink-0">${s.initials}</div>
                <div class="flex-1 min-w-0">
                    <p class="font-bold text-sm text-[#0c2340]">${s.doctor}</p>
                    <p class="text-xs text-slate-500">${s.specialty} • Verified doctor</p>
                    <div class="flex flex-wrap items-center gap-2 mt-2">
                        <span class="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">${s.count} file${s.count > 1 ? 's' : ''} shared</span>
                        <span class="text-xs text-slate-400">${s.files}</span>
                    </div>
                </div>
                <div class="text-right shrink-0">
                    <span class="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">Active</span>
                    <p class="text-[11px] text-slate-400 mt-2">Expires ${fmtDate(s.expires)}</p>
                    <button type="button" class="revoke-share-btn text-[11px] font-bold text-red-500 hover:underline mt-1" data-id="${s.id}">Revoke access</button>
                </div>
            </div>`).join('')
            : `<p class="text-sm text-slate-400">No active shares. Create one on the right.</p>`;
        if (shareCountBadge) shareCountBadge.textContent = `${state.shares.length} active share${state.shares.length === 1 ? '' : 's'}`;
        refreshIcons();
    }

    document.addEventListener('click', (e) => {
        const revokeBtn = e.target.closest('.revoke-share-btn');
        if (!revokeBtn) return;
        const share = state.shares.find(s => s.id === Number(revokeBtn.dataset.id));
        if (share && confirm(`Revoke ${share.doctor}'s access? This takes effect immediately.`)) {
            state.shares = state.shares.filter(s => s.id !== share.id);
            renderShares();
        }
    });

    if (newShareForm) {
        newShareForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const doctorSel = document.getElementById('shareDoctor');
            const filesSel = document.getElementById('shareFiles');
            const expiryInput = document.getElementById('shareExpiry');
            const doctorText = doctorSel.options[doctorSel.selectedIndex].text;
            const name = doctorText.split(' (')[0];
            const specialty = (doctorText.match(/\(([^)]+)\)/) || [])[1] || '';
            const fileText = filesSel.options[filesSel.selectedIndex].text;
            const isAll = fileText.startsWith('All');
            state.shares.push({
                id: state.nextShareId++,
                doctor: name,
                specialty,
                initials: name.replace('Dr. ', '').split(' ').map(w => w[0]).join(''),
                color: 'bg-cyan-200',
                files: fileText,
                count: isAll ? state.records.filter(r => !r.archived).length : 1,
                expires: expiryInput.value,
            });
            renderShares();
            newShareForm.reset();
        });
    }

    // ==========================================================================
    // 8. Initial render
    // ==========================================================================
    renderRecords();
    renderTimeline();
    renderShares();
    renderLabTable();
    renderTrendChart();
});
