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
            { id: 1, doctorKey: 'name.farouk', specKey: 'spec.internal', initials: 'AF', color: 'bg-cyan-200', filesKey: 'sh.f1', count: 2, expires: '2026-12-30' },
            { id: 2, doctorKey: 'name.salma', specKey: 'spec.cardiology', initials: 'SN', color: 'bg-violet-200', filesKey: 'sh.f2', count: 1, expires: '2026-12-25' },
            { id: 3, doctorKey: 'name.mariam', specKey: 'spec.nephrology', initials: 'MK', color: 'bg-orange-100', filesKey: 'sh.f3', count: 1, expires: '2027-01-12' },
        ],
        nextShareId: 4,
        timeline: [
            { month: 'Nov', type: 'lab', titleKey: 'tl.e1t', textKey: 'tl.e1x', date: '18 Nov 2026' },
            { month: 'Nov', type: 'visit', titleKey: 'tl.e2t', textKey: 'tl.e2x', date: '12 Nov 2026' },
            { month: 'Feb', type: 'visit', titleKey: 'tl.e3t', textKey: 'tl.e3x', date: '25 Feb 2026' },
            { month: 'Feb', type: 'prescription', titleKey: 'tl.e4t', textKey: 'tl.e4x', date: '10 Feb 2026' },
        ],
        meds: [
            { id: 1, nameKey: 'med.metformin', doseKey: 'med.twice', time: '09:00', taken: false },
            { id: 2, nameKey: 'med.metformin', doseKey: 'med.twice', time: '21:00', taken: false },
            { id: 3, nameKey: 'med.lisinopril', doseKey: 'med.once', time: '09:00', taken: true },
        ],
        appointments: [
            { id: 1, doctorKey: 'name.salma', specKey: 'spec.cardiology', date: '2026-11-30', time: '11:30 AM', placeKey: 'cp.place' },
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

    const T = (k, f) => window.CCi18n ? CCi18n.t(k, f) : (f || k);
    const Tp = (k, params, f) => {
        let s = T(k, f);
        Object.keys(params || {}).forEach(p => { s = s.replace('{' + p + '}', params[p]); });
        return s;
    };
    function fmtDate(iso) {
        if (window.CCi18n && CCi18n.fmtDate) return CCi18n.fmtDate(iso);
        const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    const condLabel = c => T('cond.' + c, CONDITION_LABELS[c] || c);
    const catLabel = c => T('cat.' + c, CATEGORY_LABELS[c] || c);
    const statusLabel = s => T('st.' + String(s).toLowerCase(), s);
    const labLabel = l => T('lab.short.' + l.test, l.label);

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
        'overview': ['portal.patient', 'Patient Portal'],
        'medical-files': ['nav.medicalFiles', 'My Medical Files'],
        'upload-file': ['nav.upload', 'Upload Record'],
        'sharing-access': ['sh.title', 'Sharing & Access'],
        'lab-trends': ['nav.labTrends', 'Lab Trends'],
        'timeline-archive': ['nav.timeline', 'Timeline & Archive']
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

            // skeleton loading for list-heavy views
            if (window.CCUI) {
                const listEl = viewName === 'medical-files' ? document.getElementById('recordsTable')
                    : viewName === 'timeline-archive' ? document.getElementById('timelineList') : null;
                if (listEl) {
                    CCUI.withSkeleton(listEl, viewName === 'medical-files' ? renderRecords : renderTimeline);
                }
            }

            if (breadcrumbCurrent && viewTitles[viewName]) {
                breadcrumbCurrent.textContent = T(viewTitles[viewName][0], viewTitles[viewName][1]);
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
    function openMobileSidebar() {
        if (!sidebar) return;
        sidebar.classList.remove('hidden');
        sidebar.classList.add('mobile-open');
        document.body.classList.add('drawer-open');
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
    // Close the drawer after picking a section on phones
    document.querySelectorAll('#sidebar [data-navigate]').forEach(elem => {
        elem.addEventListener('click', () => {
            if (window.innerWidth < 768) closeMobileSidebar();
        });
    });

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

        visible.sort((a, b) => state.sortDir === 'asc'
            ? a.date.localeCompare(b.date)
            : b.date.localeCompare(a.date));

        recordsTable.innerHTML = visible.map(r => `
            <tr data-id="${r.id}" class="cursor-pointer hover:bg-slate-50 transition">
                <td><span class="file-icon">PDF</span><strong>${r.name}</strong></td>
                <td>${condLabel(r.condition)}</td>
                <td>${catLabel(r.category)}</td>
                <td>${fmtDate(r.date)}</td>
                <td><span class="status ${r.status === 'Reviewed' ? 'reviewed' : 'review'}">${statusLabel(r.status)}</span></td>
                <td>
                    <div class="flex items-center gap-2">
                        <button type="button" class="more-btn view-record-btn" data-id="${r.id}" title="View details"><i data-lucide="eye" class="w-4 h-4"></i></button>
                        <button type="button" class="more-btn archive-record-btn" data-id="${r.id}" title="Archive"><i data-lucide="archive" class="w-4 h-4"></i></button>
                    </div>
                </td>
            </tr>`).join('') || `<tr><td colspan="6" class="text-center text-slate-400 py-8">${T('mf.empty')}</td></tr>`;

        if (recordCount) recordCount.textContent = `${visible.length} ${T('mf.records')}`;
        if (tableFooter) tableFooter.textContent = Tp('mf.showing', { a: visible.length, b: active.length });
        const archived = state.records.filter(r => r.archived).length;
        if (archiveCount) archiveCount.textContent = `${archived} ${T('mf.files')}`;
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
    // Sort toggle for the records table
    state.sortDir = 'desc';
    const sortRecordsBtn = document.getElementById('sortRecordsBtn');
    if (sortRecordsBtn) {
        sortRecordsBtn.addEventListener('click', () => {
            state.sortDir = state.sortDir === 'desc' ? 'asc' : 'desc';
            sortRecordsBtn.textContent = state.sortDir === 'desc' ? T('mf.newest') : T('mf.oldest');
            renderRecords();
        });
    }

    function setArchived(id, archived) {
        const rec = state.records.find(r => r.id === id);
        if (!rec) return;
        rec.archived = archived;
        rec.status = archived ? 'Archived' : 'Review';
        renderRecords();
        showToast(archived ? Tp('toast.archived', { n: rec.name }) : Tp('toast.restored', { n: rec.name }), archived ? 'warn' : undefined);
    }

    const archiveList = document.getElementById('archiveList');
    function renderArchiveList() {
        if (!archiveList) return;
        const archived = state.records.filter(r => r.archived);
        archiveList.innerHTML = archived.length ? archived.map(r => `
            <div class="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-4">
                <div>
                    <p class="font-bold text-[#0c2340] text-sm">${r.name}</p>
                    <p class="text-xs text-slate-500 mt-0.5">${catLabel(r.category)} • ${fmtDate(r.date)} • ${r.facility}</p>
                </div>
                <button type="button" class="restore-record-btn text-xs font-bold text-cyan-700 hover:underline shrink-0" data-id="${r.id}">${T('mf.restore')}</button>
            </div>`).join('')
            : `<p class="text-sm text-slate-400">${T('mf.noArchived')}</p>`;
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
                <div><p class="text-xs text-slate-400 font-bold uppercase tracking-wider">${T('fm.condition')}</p><p class="font-semibold text-[#0c2340] mt-1">${condLabel(r.condition)}</p></div>
                <div><p class="text-xs text-slate-400 font-bold uppercase tracking-wider">${T('fm.category')}</p><p class="font-semibold text-[#0c2340] mt-1">${catLabel(r.category)}</p></div>
                <div><p class="text-xs text-slate-400 font-bold uppercase tracking-wider">${T('fm.date')}</p><p class="font-semibold text-[#0c2340] mt-1">${fmtDate(r.date)}</p></div>
                <div><p class="text-xs text-slate-400 font-bold uppercase tracking-wider">${T('fm.status')}</p><p class="font-semibold text-[#0c2340] mt-1">${statusLabel(r.status)}</p></div>
                <div><p class="text-xs text-slate-400 font-bold uppercase tracking-wider">${T('fm.ifac')}</p><p class="font-semibold text-[#0c2340] mt-1">${r.facility || '-'}</p></div>
                <div><p class="text-xs text-slate-400 font-bold uppercase tracking-wider">${T('fm.idoc')}</p><p class="font-semibold text-[#0c2340] mt-1">${r.doctor || '-'}</p></div>
                <div><p class="text-xs text-slate-400 font-bold uppercase tracking-wider">${T('fm.specialty')}</p><p class="font-semibold text-[#0c2340] mt-1">${r.specialty || '-'}</p></div>
            </div>
            <div class="mt-5 h-40 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400">
                <i data-lucide="file-text" class="w-8 h-8 mb-2 text-cyan-600"></i>
                <p class="text-xs">${T('fm.preview')}</p>
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
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFileModal(); });

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
    const dropzone = document.getElementById('dropzone');
    const uploadPreview = document.getElementById('uploadPreview');
    const uploadProgress = document.getElementById('uploadProgress');
    const uploadProgressBar = document.getElementById('uploadProgressBar');
    const uploadProgressPct = document.getElementById('uploadProgressPct');

    function renderUploadPreview(file) {
        if (!uploadPreview) return;
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        const isImg = /^image\//.test(file.type);
        const shell = inner => `
            <div class="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                ${inner}
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold text-[#0c2340] truncate">${file.name}</p>
                    <p class="text-xs text-slate-500">${sizeMb} MB</p>
                </div>
                <button type="button" id="clearUploadFile" class="text-slate-400 hover:text-red-500" aria-label="Remove file"><i data-lucide="x-circle" class="w-5 h-5"></i></button>
            </div>`;
        uploadPreview.classList.remove('hidden');
        if (isImg) {
            const reader = new FileReader();
            reader.onload = () => {
                uploadPreview.innerHTML = shell(`<img src="${reader.result}" alt="" class="w-12 h-12 rounded-lg object-cover border border-slate-200">`);
                afterPreview();
            };
            reader.readAsDataURL(file);
        } else {
            uploadPreview.innerHTML = shell(`<span class="w-12 h-12 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center"><i data-lucide="file-text" class="w-6 h-6"></i></span>`);
            afterPreview();
        }
        function afterPreview() {
            refreshIcons();
            const clearBtn = document.getElementById('clearUploadFile');
            if (clearBtn) clearBtn.addEventListener('click', () => {
                uploadFileInput.value = '';
                uploadPreview.classList.add('hidden');
                uploadPreview.innerHTML = '';
                if (uploadFileName) uploadFileName.textContent = T('upload.drop');
            });
        }
    }

    if (dropzone && uploadFileInput) {
        dropzone.addEventListener('click', () => uploadFileInput.click());
        dropzone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); uploadFileInput.click(); } });
        ['dragenter', 'dragover'].forEach(ev => dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('dropzone-active'); }));
        ['dragleave', 'drop'].forEach(ev => dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('dropzone-active'); }));
        dropzone.addEventListener('drop', (e) => {
            if (e.dataTransfer.files && e.dataTransfer.files.length) {
                uploadFileInput.files = e.dataTransfer.files;
                uploadFileName.textContent = e.dataTransfer.files[0].name;
                renderUploadPreview(e.dataTransfer.files[0]);
            }
        });
        uploadFileInput.addEventListener('change', () => {
            if (uploadFileInput.files.length) {
                uploadFileName.textContent = uploadFileInput.files[0].name;
                renderUploadPreview(uploadFileInput.files[0]);
            }
        });
    }

    function simulateUploadProgress(done) {
        if (!uploadProgress || !uploadProgressBar) { done(); return; }
        uploadProgress.classList.remove('hidden');
        let pct = 0;
        const timer = setInterval(() => {
            pct = Math.min(100, pct + 8 + Math.random() * 14);
            uploadProgressBar.style.width = pct + '%';
            if (uploadProgressPct) uploadProgressPct.textContent = Math.round(pct) + '%';
            if (pct >= 100) {
                clearInterval(timer);
                setTimeout(() => {
                    uploadProgress.classList.add('hidden');
                    uploadProgressBar.style.width = '0%';
                    done();
                }, 250);
            }
        }, 90);
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
            simulateUploadProgress(() => {
                state.records.unshift(rec);
                state.timeline.unshift({
                    month: new Date(rec.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' }),
                    type: 'upload',
                    title: Tp('tl.uploaded', { n: rec.name }),
                    date: fmtDate(rec.date),
                    text: Tp('tl.uploadedText', { cat: catLabel(rec.category), cond: condLabel(rec.condition), who: rec.doctor || rec.facility || '-' }),
                });
                renderRecords();
                renderTimeline();
                uploadForm.reset();
                if (uploadFileName) uploadFileName.textContent = T('upload.drop');
                if (uploadPreview) { uploadPreview.classList.add('hidden'); uploadPreview.innerHTML = ''; }
                showView('medical-files');
                showToast(Tp('toast.uploaded', { n: rec.name }));
            });
        });
    }

    // ==========================================================================
    // 5. Timeline (rendered from state)
    // ==========================================================================
    const timelineList = document.getElementById('timelineList');
    let timelineFilter = 'all';
    function renderTimeline() {
        if (!timelineList) return;
        const items = state.timeline.filter(t => timelineFilter === 'all' || t.type === timelineFilter);
        timelineList.innerHTML = (items.length ? items : [{ month: '-', titleKey: 'tl.noEvents', date: '', text: '' }]).map(t => `
            <div class="relative flex items-start gap-4">
                <div class="w-8 h-8 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0 z-10 font-bold text-xs">${t.month}</div>
                <div class="bg-slate-50 p-4 rounded-xl flex-1 border border-slate-100">
                    <div class="flex justify-between items-start">
                        <p class="font-bold text-[#0c2340] text-sm">${t.titleKey ? T(t.titleKey) : t.title}</p>
                        <span class="text-xs text-slate-400">${t.date}</span>
                    </div>
                    <p class="text-xs text-slate-600 mt-1">${t.textKey ? T(t.textKey) : t.text}</p>
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
            .filter(l => (test === 'all' || l.test === test) && labInRange(l))
            .sort((a, b) => b.date.localeCompare(a.date));
        labResultsTable.innerHTML = rows.map(l => `
            <tr class="${outOfRange(l) ? 'bg-red-50' : ''}">
                <td class="py-2.5">${labLabel(l)}</td>
                <td class="font-bold ${outOfRange(l) ? 'text-red-600' : 'text-[#0c2340]'}">${l.value} <span class="text-xs font-semibold text-slate-400">${l.unit}</span></td>
                <td class="text-slate-500">${l.min != null ? l.min : ''}${l.max != null ? ' - ' + l.max : (l.min != null ? '+' : '')} ${l.unit}</td>
                <td class="text-slate-500">${fmtDate(l.date)}</td>
                <td>${outOfRange(l)
                    ? `<span class="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">${T('st.outRange')}</span>`
                    : `<span class="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">${T('st.inRange')}</span>`}</td>
            </tr>`).join('') || `<tr><td colspan="5" class="text-center text-slate-400 py-6">${T('lt.noResults')}</td></tr>`;
    }

    const labDateFrom = document.getElementById('labDateFrom');
    const labDateTo = document.getElementById('labDateTo');
    const activeLabMetrics = new Set(['HBA1C']);
    const METRIC_COLORS = { HBA1C: '#0891b2', FBG: '#7c3aed', SBP: '#dc2626', EGFR: '#059669' };

    function labInRange(l) {
        const from = labDateFrom && labDateFrom.value ? labDateFrom.value : '0000-01-01';
        const to = labDateTo && labDateTo.value ? labDateTo.value : '9999-12-31';
        return l.date >= from && l.date <= to;
    }

    function renderTrendChart() {
        if (!trendChart) return;
        const metrics = [...activeLabMetrics];
        if (!metrics.length) {
            trendChart.innerHTML = `<p class="text-sm text-slate-400 p-6">Select at least one metric above.</p>`;
            return;
        }
        const W = 560, H = 190, PAD = 40;
        const series = metrics.map(m => ({
            meta: labTestTypes.find(l => l.test === m) || state.labs.find(l => l.test === m),
            points: state.labs.filter(l => l.test === m && labInRange(l)).sort((a, b) => a.date.localeCompare(b.date)),
        })).filter(s => s.points.length);
        if (!series.length) {
            trendChart.innerHTML = `<p class="text-sm text-slate-400 p-6">No data in this date range.</p>`;
            return;
        }
        if (series.length === 1) {
            const { meta, points } = series[0];
            const values = points.map(p => p.value);
            const bounds = [...values, meta.min, meta.max].filter(v => v != null);
            const vMin = Math.min(...bounds) * 0.95, vMax = Math.max(...bounds) * 1.05;
            const x = i => PAD + (points.length === 1 ? (W - 2 * PAD) / 2 : i * (W - 2 * PAD) / (points.length - 1));
            const y = v => H - PAD - ((v - vMin) / (vMax - vMin)) * (H - 2 * PAD);
            const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ');
            const color = METRIC_COLORS[meta.test] || '#0891b2';
            const rangeBand = (meta.min != null && meta.max != null)
                ? `<rect x="${PAD}" y="${y(meta.max)}" width="${W - 2 * PAD}" height="${y(meta.min) - y(meta.max)}" fill="#dcfce7" opacity="0.6"/>`
                : (meta.min != null ? `<rect x="${PAD}" y="${PAD}" width="${W - 2 * PAD}" height="${y(meta.min) - PAD}" fill="#dcfce7" opacity="0.6"/>` : '');
            trendChart.innerHTML = `
                <svg viewBox="0 0 ${W} ${H}" class="w-full h-48">
                    ${rangeBand}
                    <line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="#e2e8f0"/>
                    <polyline points="${line}" fill="none" stroke="${color}" stroke-width="2.5"/>
                    ${points.map((p, i) => `
                        <circle cx="${x(i)}" cy="${y(p.value)}" r="4.5" fill="${outOfRange(p) ? '#dc2626' : color}"/>
                        <text x="${x(i)}" y="${y(p.value) - 10}" text-anchor="middle" font-size="10" fill="#0c2340" font-weight="bold">${p.value}</text>
                        <text x="${x(i)}" y="${H - PAD + 16}" text-anchor="middle" font-size="9" fill="#94a3b8">${p.date.slice(5)}</text>`).join('')}
                </svg>
                <p class="text-xs text-slate-400 mt-2">${Tp('lt.chartNote', { label: labLabel(meta), unit: meta.unit })}</p>`;
            return;
        }
        // multi-metric: each series normalized to its own min/max for overlay comparison
        const maxLen = Math.max(...series.map(s => s.points.length));
        const x = i => PAD + (maxLen === 1 ? (W - 2 * PAD) / 2 : i * (W - 2 * PAD) / (maxLen - 1));
        trendChart.innerHTML = `
            <svg viewBox="0 0 ${W} ${H}" class="w-full h-48">
                <line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="#e2e8f0"/>
                ${series.map(({ meta, points }) => {
                    const vals = points.map(p => p.value);
                    const lo = Math.min(...vals), hi = Math.max(...vals);
                    const span = hi - lo || 1;
                    const y = v => H - PAD - ((v - lo) / span) * (H - 2 * PAD);
                    const color = METRIC_COLORS[meta.test] || '#0891b2';
                    return `<polyline points="${points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5"/>
                        ${points.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.value)}" r="4" fill="${color}"><title>${meta.label}: ${p.value} ${meta.unit} (${p.date})</title></circle>`).join('')}`;
                }).join('')}
            </svg>
            <div class="flex flex-wrap gap-3 mt-2">
                ${series.map(({ meta }) => `<span class="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><span class="w-2.5 h-2.5 rounded-full" style="background:${METRIC_COLORS[meta.test]}"></span>${meta.label} (${meta.unit})</span>`).join('')}
            </div>
            <p class="text-xs text-slate-400 mt-1">${T('lt.overlayNote')}</p>`;
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
            showToast(Tp('toast.labSaved', { label: labLabel(meta) }));
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
            <div class="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 border border-slate-100 rounded-xl p-4 mb-3.5 hover:border-slate-200 transition">
                <div class="w-11 h-11 rounded-full ${s.color} flex items-center justify-center font-bold text-[#0c2340] text-sm shrink-0">${s.initials}</div>
                <div class="flex-1 min-w-0" style="flex-basis: 45%;">
                    <p class="font-bold text-sm text-[#0c2340]">${s.doctorKey ? T(s.doctorKey) : s.doctor}</p>
                    <p class="text-xs text-slate-500">${s.specKey ? T(s.specKey) : s.specialty} • ${T('sh.verified')}</p>
                    <div class="flex flex-wrap items-center gap-2 mt-2">
                        <span class="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">${Tp('sh.filesShared', { n: s.count })}</span>
                        <span class="text-xs text-slate-400">${s.filesKey ? T(s.filesKey) : s.files}</span>
                    </div>
                </div>
                <div class="w-full sm:w-auto sm:text-right sm:shrink-0 flex sm:block items-center justify-between gap-2">
                    <span class="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">${T('st.active')}</span>
                    <p class="text-[11px] text-slate-400 sm:mt-2">${Tp('sh.expires', { date: fmtDate(s.expires) })}</p>
                    <button type="button" class="revoke-share-btn text-[11px] font-bold text-red-500 hover:underline sm:mt-1" data-id="${s.id}">${T('sh.revoke')}</button>
                </div>
            </div>`).join('')
            : `<p class="text-sm text-slate-400">${T('sh.noShares')}</p>`;
        if (shareCountBadge) shareCountBadge.textContent = Tp('sh.activeBadge', { n: state.shares.length });
        refreshIcons();
    }

    document.addEventListener('click', (e) => {
        const revokeBtn = e.target.closest('.revoke-share-btn');
        if (!revokeBtn) return;
        const share = state.shares.find(s => s.id === Number(revokeBtn.dataset.id));
        if (share && confirm(Tp('sh.revokeConfirm', { name: share.doctorKey ? T(share.doctorKey) : share.doctor }))) {
            state.shares = state.shares.filter(s => s.id !== share.id);
            renderShares();
            showToast(Tp('toast.shareRevoked', { name: share.doctorKey ? T(share.doctorKey) : share.doctor }), 'warn');
        }
    });

    // (share creation handled in section 10 via the review modal)

    // ==========================================================================
    // 8. Initial render
    // ==========================================================================
    renderRecords();
    renderTimeline();
    renderShares();
    renderLabTable();
    renderTrendChart();

    // ==========================================================================
    // 9. Stage 2: overview chart, count-up stats, notifications, palette
    // ==========================================================================
    let overviewChart = null;
    let overviewMetric = 'HBA1C';
    function chartColors() {
        const dark = document.documentElement.classList.contains('dark');
        return {
            grid: dark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.12)',
            tick: dark ? '#8ea2b8' : '#64748b',
            line: '#06b6d4',
            fill: dark ? 'rgba(6,182,212,0.18)' : 'rgba(6,182,212,0.12)',
            point: '#0c2340',
            pointDark: '#e6eef7',
        };
    }
    function renderOverviewChart() {
        const canvas = document.getElementById('overviewChart');
        if (!canvas || typeof Chart === 'undefined') return;
        const rows = state.labs.filter(l => l.test === overviewMetric).slice().sort((a, b) => a.date.localeCompare(b.date));
        const c = chartColors();
        const meta = rows[0] || {};
        if (overviewChart) overviewChart.destroy();
        overviewChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: rows.map(r => fmtDate(r.date)),
                datasets: [{
                    label: (meta.test ? labLabel(meta) : overviewMetric) + (meta.unit ? ' (' + meta.unit + ')' : ''),
                    data: rows.map(r => r.value),
                    borderColor: c.line,
                    backgroundColor: c.fill,
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4,
                    pointBackgroundColor: document.documentElement.classList.contains('dark') ? c.pointDark : c.point,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: c.grid }, ticks: { color: c.tick, font: { size: 10 } } },
                    y: { grid: { color: c.grid }, ticks: { color: c.tick, font: { size: 10 } } },
                },
            },
        });
    }
    const chipsWrap = document.getElementById('overviewChartChips');
    if (chipsWrap) {
        chipsWrap.addEventListener('click', (e) => {
            const chip = e.target.closest('.chart-chip');
            if (!chip) return;
            chipsWrap.querySelectorAll('.chart-chip').forEach(x => x.classList.remove('active'));
            chip.classList.add('active');
            overviewMetric = chip.dataset.metric;
            renderOverviewChart();
        });
    }
    document.addEventListener('cc:theme', renderOverviewChart);
    document.addEventListener('cc:lang', renderOverviewChart);
    document.addEventListener('cc:lang', () => {
        renderRecords();
        renderTimeline();
        renderShares();
        renderLabTable();
        renderTrendChart();
        renderCarePlan();
        const bc = document.getElementById('breadcrumb-current');
        const curView = (window.location.hash || '').replace('#', '');
        if (bc && viewTitles[curView]) bc.textContent = T(viewTitles[curView][0], viewTitles[curView][1]);
        const sortBtn = document.getElementById('sortRecordsBtn');
        if (sortBtn) sortBtn.textContent = state.sortDir === 'desc' ? T('mf.newest') : T('mf.oldest');
        refreshIcons();
    });
    const ovCanvas = document.getElementById('overviewChart');
    if (ovCanvas) renderOverviewChart();

    // count-up stats when overview shows
    function animateStats() {
        document.querySelectorAll('.stat-num').forEach(el => {
            CCUI.countUp(el, parseFloat(el.dataset.count), { decimals: +(el.dataset.decimals || 0) });
        });
    }
    if (document.querySelector('.stat-num')) animateStats();

    // notifications (patient)
    const patientNotifs = [
        { icon: 'eye', kind: 'share', textKey: 'np.1', timeKey: 'tm.2h', unread: true },
        { icon: 'flask-conical', kind: 'info', textKey: 'np.2', timeKey: 'tm.yest', unread: true },
        { icon: 'pill', kind: 'warn', textKey: 'np.3', timeKey: 'tm.today', unread: true },
        { icon: 'clock', kind: 'warn', textKey: 'np.4', timeKey: 'tm.2d', unread: false },
        { icon: 'calendar-check', kind: 'success', textKey: 'np.5', timeKey: 'tm.3d', unread: false },
    ];
    window.CC_NOTIFS = () => patientNotifs.map(n => ({ ...n, text: T(n.textKey), time: T(n.timeKey) }));
    window.CC_NOTIFS_MARK_READ = () => patientNotifs.forEach(n => { n.unread = false; });

    // command palette sources (patient)
    window.CC_SOURCES = () => {
        const t = (k, f) => window.CCi18n ? CCi18n.t(k, f) : f;
        const go = (v) => () => showView(v);
        const pages = [
            { icon: 'layout-dashboard', title: t('nav.overview', 'Overview'), keywords: 'home dashboard', run: go('overview') },
            { icon: 'folder-heart', title: t('nav.medicalFiles', 'My Medical Files'), keywords: 'records documents', run: go('medical-files') },
            { icon: 'upload', title: t('nav.upload', 'Upload Record'), keywords: 'add file', run: go('upload-file') },
            { icon: 'trending-up', title: t('nav.labTrends', 'Lab Trends'), keywords: 'charts results', run: go('lab-trends') },
            { icon: 'sliders-horizontal', title: t('nav.timeline', 'Timeline & Archive'), keywords: 'history', run: go('timeline-archive') },
            { icon: 'share-2', title: t('nav.sharing', 'Sharing & Access'), keywords: 'doctors permissions', run: go('sharing-access') },
        ];
        const recs = state.records.map(r => ({
            icon: 'file-text',
            title: r.name,
            subtitle: (window.CCi18n ? CCi18n.t('cond.' + r.condition, CONDITION_LABELS[r.condition] || r.condition) : (CONDITION_LABELS[r.condition] || r.condition)) + ' • ' + fmtDate(r.date),
            keywords: r.condition + ' ' + r.category + ' record file',
            run: () => { showView('medical-files'); },
        }));
        const actions = [
            { icon: 'moon', title: t('pal.theme', 'Toggle dark mode'), keywords: 'theme light', run: () => CCUI.toggleTheme() },
            { icon: 'languages', title: t('pal.lang', 'Switch language'), keywords: 'arabic english rtl', run: () => CCi18n.setLang(CCi18n.lang === 'ar' ? 'en' : 'ar') },
            { icon: 'log-out', title: t('action.signOut', 'Sign out'), keywords: 'logout exit', run: () => showView('auth') },
        ];
        return [...pages, ...recs, ...actions];
    };

    // ==========================================================================
    // 10. Stage 3: care plan, timeline filters, lab exports, share modal
    // ==========================================================================

    // --- Today's care plan: medication + appointment reminders ---
    const carePlanList = document.getElementById('carePlanList');
    const carePlanBadge = document.getElementById('carePlanBadge');
    function renderCarePlan() {
        if (!carePlanList) return;
        const taken = state.meds.filter(m => m.taken).length;
        if (carePlanBadge) carePlanBadge.textContent = Tp('cp.badge', { t: taken, n: state.meds.length });
        const medCards = state.meds.map(m => `
            <div class="flex items-center gap-3 border ${m.taken ? 'border-green-200 bg-green-50/60' : 'border-slate-100 bg-slate-50/60'} rounded-xl p-3.5">
                <span class="w-9 h-9 rounded-lg ${m.taken ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'} flex items-center justify-center shrink-0">
                    <i data-lucide="${m.taken ? 'check-circle-2' : 'pill'}" class="w-4.5 h-4.5"></i>
                </span>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold text-[#0c2340] ${m.taken ? 'line-through opacity-60' : ''}">${T(m.nameKey)}</p>
                    <p class="text-xs text-slate-500">${T(m.doseKey)} • ${m.time}</p>
                </div>
                <button type="button" class="med-take-btn text-xs font-bold ${m.taken ? 'text-green-600' : 'text-cyan-700 hover:underline'}" data-id="${m.id}" ${m.taken ? 'disabled' : ''}>${m.taken ? T('cp.taken') : T('cp.mark')}</button>
            </div>`).join('');
        const apptCards = state.appointments.map(a => `
            <div class="flex items-center gap-3 border border-cyan-100 bg-cyan-50/50 rounded-xl p-3.5">
                <span class="w-9 h-9 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0"><i data-lucide="calendar-clock" class="w-4.5 h-4.5"></i></span>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold text-[#0c2340]">${Tp('cp.appt', { name: T(a.doctorKey) })}</p>
                    <p class="text-xs text-slate-500">${T(a.specKey)} • ${fmtDate(a.date)} ${a.time} • ${T(a.placeKey)}</p>
                </div>
                <span class="text-[10px] font-bold text-cyan-700 bg-cyan-100 px-2 py-1 rounded-full uppercase tracking-wide">${T('cp.upcoming')}</span>
            </div>`).join('');
        carePlanList.innerHTML = medCards + apptCards;
        refreshIcons();
    }
    document.addEventListener('click', (e) => {
        const takeBtn = e.target.closest('.med-take-btn');
        if (!takeBtn) return;
        const med = state.meds.find(m => m.id === Number(takeBtn.dataset.id));
        if (med && !med.taken) {
            med.taken = true;
            renderCarePlan();
            showToast(Tp('toast.medTaken', { n: T(med.nameKey, '') }));
        }
    });
    renderCarePlan();

    // --- Timeline filter chips ---
    const timelineFilters = document.getElementById('timelineFilters');
    if (timelineFilters) {
        timelineFilters.addEventListener('click', (e) => {
            const chip = e.target.closest('[data-tfilter]');
            if (!chip) return;
            timelineFilter = chip.dataset.tfilter;
            timelineFilters.querySelectorAll('.chart-chip').forEach(c => c.classList.toggle('active', c === chip));
            renderTimeline();
        });
    }

    // --- Lab metric chips + date range + exports ---
    document.querySelectorAll('[data-labmetric]').forEach(chip => {
        chip.addEventListener('click', () => {
            const m = chip.dataset.labmetric;
            if (activeLabMetrics.has(m)) { activeLabMetrics.delete(m); chip.classList.remove('active'); }
            else { activeLabMetrics.add(m); chip.classList.add('active'); }
            renderTrendChart();
        });
    });
    [labDateFrom, labDateTo].forEach(inp => inp && inp.addEventListener('change', () => { renderLabTable(); renderTrendChart(); }));

    function labRowsForExport() {
        const test = labTestSelect ? labTestSelect.value : 'all';
        return state.labs.filter(l => (test === 'all' || l.test === test) && labInRange(l)).sort((a, b) => a.date.localeCompare(b.date));
    }
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            const rows = labRowsForExport();
            const csv = ['Test,Value,Unit,Reference min,Reference max,Date,Flag']
                .concat(rows.map(l => [l.label, l.value, l.unit, l.min != null ? l.min : '', l.max != null ? l.max : '', l.date, outOfRange(l) ? 'Out of range' : 'In range'].join(',')))
                .join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `chronicare-lab-results-${labDateFrom.value}-to-${labDateTo.value}.csv`;
            a.click();
            URL.revokeObjectURL(a.href);
            showToast(T('toast.csv'));
        });
    }
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const printReport = document.getElementById('printReport');
    if (exportPdfBtn && printReport) {
        exportPdfBtn.addEventListener('click', () => {
            const rows = labRowsForExport();
            printReport.innerHTML = `
                <h1>Chronicare - Lab Results Report</h1>
                <p>Patient: Maya Hassan &nbsp;•&nbsp; Period: ${fmtDate(labDateFrom.value)} - ${fmtDate(labDateTo.value)} &nbsp;•&nbsp; Generated ${fmtDate(new Date().toISOString().slice(0, 10))}</p>
                <table>
                    <thead><tr><th>Test</th><th>Value</th><th>Reference</th><th>Date</th><th>Flag</th></tr></thead>
                    <tbody>${rows.map(l => `<tr><td>${l.label}</td><td>${l.value} ${l.unit}</td><td>${l.min != null ? l.min : ''}${l.max != null ? ' - ' + l.max : ''} ${l.unit}</td><td>${fmtDate(l.date)}</td><td>${outOfRange(l) ? 'OUT OF RANGE' : 'In range'}</td></tr>`).join('')}</tbody>
                </table>
                <p class="note">Demo report generated from the Chronicare patient portal frontend.</p>`;
            document.body.classList.add('printing');
            const cleanup = () => { document.body.classList.remove('printing'); window.removeEventListener('afterprint', cleanup); };
            window.addEventListener('afterprint', cleanup);
            window.print();
            setTimeout(cleanup, 1500);
        });
    }

    // --- Share flow: review modal with summary + QR + link ---
    const shareModal = document.getElementById('shareModal');
    const shareSummary = document.getElementById('shareSummary');
    const shareQr = document.getElementById('shareQr');
    const shareLinkEl = document.getElementById('shareLink');
    const confirmShareBtn = document.getElementById('confirmShareBtn');
    const copyShareLink = document.getElementById('copyShareLink');
    const closeShareModal = document.getElementById('closeShareModal');
    let pendingShare = null;

    function openShareModal() { if (shareModal) { shareModal.classList.remove('hidden'); shareModal.classList.add('flex'); refreshIcons(); } }
    function hideShareModal() { if (shareModal) { shareModal.classList.add('hidden'); shareModal.classList.remove('flex'); } pendingShare = null; }
    if (closeShareModal) closeShareModal.addEventListener('click', hideShareModal);
    if (shareModal) shareModal.addEventListener('click', (e) => { if (e.target === shareModal) hideShareModal(); });

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
            const perms = [...newShareForm.querySelectorAll('input[type=checkbox]')]
                .map(cb => ({ label: cb.closest('label').querySelector('span').textContent, on: cb.checked }));
            const code = Math.random().toString(36).slice(2, 10).toUpperCase();
            pendingShare = {
                id: state.nextShareId++,
                doctor: name, specialty,
                initials: name.replace('Dr. ', '').split(' ').map(w => w[0]).join(''),
                color: 'bg-cyan-200',
                files: fileText,
                count: isAll ? state.records.filter(r => !r.archived).length : 1,
                expires: expiryInput.value,
                link: `https://chronicare.app/s/${code}`,
            };
            if (shareSummary) {
                shareSummary.innerHTML = `
                    <p><span class="font-bold text-[#0c2340]">${T('share.modal.doctor')}</span> ${name}${specialty ? ` (${specialty})` : ''}</p>
                    <p><span class="font-bold text-[#0c2340]">${T('share.modal.files')}</span> ${fileText}</p>
                    <p><span class="font-bold text-[#0c2340]">${T('share.modal.expires')}</span> ${fmtDate(expiryInput.value)}</p>
                    <p><span class="font-bold text-[#0c2340]">${T('share.modal.permissions')}</span></p>
                    <ul class="list-none space-y-1">${perms.map(p => `<li class="flex items-center gap-2 text-xs"><i data-lucide="${p.on ? 'check-circle-2' : 'x-circle'}" class="w-3.5 h-3.5 ${p.on ? 'text-green-600' : 'text-slate-400'}"></i>${p.label}</li>`).join('')}</ul>`;
            }
            if (shareLinkEl) shareLinkEl.textContent = pendingShare.link;
            if (shareQr) {
                shareQr.innerHTML = '';
                try {
                    if (typeof qrcode === 'function') {
                        const qr = qrcode(0, 'M');
                        qr.addData(pendingShare.link);
                        qr.make();
                        shareQr.innerHTML = qr.createImgTag(3, 4);
                    } else {
                        shareQr.innerHTML = '<span class="w-24 h-24 flex items-center justify-center text-slate-300"><i data-lucide="qr-code" class="w-12 h-12"></i></span>';
                    }
                } catch (err) {
                    shareQr.innerHTML = '<span class="w-24 h-24 flex items-center justify-center text-slate-300"><i data-lucide="qr-code" class="w-12 h-12"></i></span>';
                }
            }
            openShareModal();
        });
    }
    if (confirmShareBtn) {
        confirmShareBtn.addEventListener('click', () => {
            if (!pendingShare) return;
            state.shares.push(pendingShare);
            renderShares();
            newShareForm.reset();
            showToast(Tp('toast.shared', { name: pendingShare.doctor, date: fmtDate(pendingShare.expires) }));
            hideShareModal();
        });
    }
    if (copyShareLink) {
        copyShareLink.addEventListener('click', () => {
            const link = shareLinkEl ? shareLinkEl.textContent : '';
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(link).then(() => showToast(T('toast.linkCopied')), () => showToast(T('toast.linkFail'), 'warn'));
            } else {
                const ta = document.createElement('textarea');
                ta.value = link;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
                showToast(T('toast.linkCopied'));
            }
        });
    }
});
