document.addEventListener('DOMContentLoaded', () => {

    function refreshIcons() {
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    // Demo state: patients who shared with this doctor (client-side only)
    const patients = [
        {
            id: 1, name: 'Maya Hassan', conditions: 'Diabetes, Hypertension', lastShared: '2026-11-25', hasNew: true,
            files: [
                { name: 'HbA1c Lab Report', category: 'Lab Report', date: '2026-11-18' },
                { name: 'Metformin Prescription', category: 'Prescription', date: '2026-11-18' },
            ],
            labs: [
                { test: 'HbA1c', value: 6.4, unit: '%', min: 4.0, max: 5.6, date: '2026-11-18' },
                { test: 'Fasting glucose', value: 108, unit: 'mg/dL', min: 70, max: 99, date: '2026-11-18' },
            ],
            notes: [
                { date: '2026-11-20', text: 'HbA1c improving. Keep current medication, recheck in 3 months.' },
            ],
        },
        {
            id: 2, name: 'Omar Adel', conditions: 'Hypertension', lastShared: '2026-11-22', hasNew: false,
            files: [
                { name: 'Cardiology Follow-up', category: 'Lab Report', date: '2026-11-12' },
            ],
            labs: [
                { test: 'Systolic BP', value: 128, unit: 'mmHg', min: 90, max: 120, date: '2026-11-12' },
            ],
            notes: [],
        },
        {
            id: 3, name: 'Sara Mahmoud', conditions: 'Chronic kidney disease', lastShared: '2026-11-19', hasNew: true,
            files: [
                { name: 'Kidney Function Test', category: 'Lab Report', date: '2026-11-04' },
                { name: 'Ultrasound KUB', category: 'Imaging', date: '2026-10-28' },
            ],
            labs: [
                { test: 'eGFR', value: 88, unit: 'mL/min', min: 90, max: null, date: '2026-11-04' },
                { test: 'Creatinine', value: 1.1, unit: 'mg/dL', min: 0.7, max: 1.3, date: '2026-11-04' },
            ],
            notes: [],
        },
    ];

    let currentPatient = null;

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
            if (window.innerWidth < 768) closeMobileSidebar();
        });
    });

    // Mobile drawer
    const sidebar = document.getElementById('sidebar');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenuClose = document.getElementById('mobile-menu-close');
    function openMobileSidebar() {
        if (!sidebar) return;
        sidebar.classList.remove('hidden');
        sidebar.classList.add('mobile-open');
        document.body.classList.add('drawer-open');
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

    function fmtDate(iso) {
        return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    // Toast notifications
    function showToast(message, type) {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
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

    function outOfRange(l) {
        return (l.min != null && l.value < l.min) || (l.max != null && l.value > l.max);
    }

    // ---- My Patients list ----
    const patientsTable = document.getElementById('patientsTable');
    function renderPatients() {
        patientsTable.innerHTML = patients.map(p => `
            <tr>
                <td><strong>${p.name}</strong></td>
                <td>${p.conditions}</td>
                <td>${p.files.length} file${p.files.length > 1 ? 's' : ''}</td>
                <td>${fmtDate(p.lastShared)}</td>
                <td>${p.hasNew
                    ? '<span class="bg-cyan-100 text-cyan-800 text-xs font-bold px-2.5 py-1 rounded-full">New files</span>'
                    : '<span class="bg-slate-100 text-slate-500 text-xs font-bold px-2.5 py-1 rounded-full">Up to date</span>'}</td>
                <td><button type="button" class="more-btn open-patient-btn" data-id="${p.id}">Open records</button></td>
            </tr>`).join('');

        // Mobile cards keep the action visible without horizontal scrolling
        document.getElementById('patientsCards').innerHTML = patients.map(p => `
            <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div class="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                        <p class="font-bold text-[#0c2340]">${p.name}</p>
                        <p class="text-xs text-slate-500">${p.conditions}</p>
                    </div>
                    ${p.hasNew
                        ? '<span class="bg-cyan-100 text-cyan-800 text-xs font-bold px-2.5 py-1 rounded-full shrink-0">New files</span>'
                        : '<span class="bg-slate-100 text-slate-500 text-xs font-bold px-2.5 py-1 rounded-full shrink-0">Up to date</span>'}
                </div>
                <p class="text-xs text-slate-500 mb-3">${p.files.length} file${p.files.length > 1 ? 's' : ''} • Last shared ${fmtDate(p.lastShared)}</p>
                <button type="button" class="open-patient-btn w-full bg-[#0c2340] hover:bg-blue-950 text-white text-sm font-semibold py-2.5 rounded-xl transition" data-id="${p.id}">Open records</button>
            </div>`).join('');
        refreshIcons();
    }

    // ---- Patient Records ----
    function renderPatientRecords(p) {
        document.getElementById('patientRecordsTitle').textContent = `${p.name}'s Records`;
        document.getElementById('patientRecordsSubtitle').textContent =
            `${p.conditions} • Shared ${fmtDate(p.lastShared)} • Access until the patient's expiry date`;

        document.getElementById('patientFilesTable').innerHTML = p.files.map(f => `
            <tr>
                <td><span class="file-icon">PDF</span><strong>${f.name}</strong></td>
                <td>${f.category}</td>
                <td>${fmtDate(f.date)}</td>
                <td><button type="button" class="more-btn view-shared-file" data-name="${f.name}" title="Open"><i data-lucide="eye" class="w-4 h-4"></i></button></td>
            </tr>`).join('');

        document.getElementById('patientLabsTable').innerHTML = p.labs.map(l => `
            <tr class="${outOfRange(l) ? 'bg-red-50' : ''}">
                <td>${l.test}</td>
                <td class="font-bold ${outOfRange(l) ? 'text-red-600' : ''}">${l.value} <span class="text-xs font-semibold text-slate-400">${l.unit}</span></td>
                <td class="text-slate-500">${l.min != null ? l.min : ''}${l.max != null ? ' - ' + l.max : '+'} ${l.unit}</td>
                <td class="text-slate-500">${fmtDate(l.date)}</td>
            </tr>`).join('');

        renderNotes(p);
        refreshIcons();
    }

    function renderNotes(p) {
        const list = document.getElementById('notesList');
        list.innerHTML = p.notes.length ? p.notes.map(n => `
            <div class="bg-slate-50 border border-slate-100 rounded-xl p-4">
                <p class="text-xs text-slate-400 mb-1">${fmtDate(n.date)} • Dr. Ahmed Farouk</p>
                <p class="text-sm text-slate-700">${n.text}</p>
            </div>`).join('')
            : `<p class="text-sm text-slate-400">No notes yet for this patient.</p>`;
    }

    document.addEventListener('click', (e) => {
        const openBtn = e.target.closest('.open-patient-btn');
        if (openBtn) {
            currentPatient = patients.find(p => p.id === Number(openBtn.dataset.id));
            if (!currentPatient) return;
            currentPatient.hasNew = false; // opening marks the new files as seen
            renderPatients();
            renderPatientRecords(currentPatient);
            document.getElementById('patientRecordsNav').classList.remove('hidden');
            showView('patient-records');
            return;
        }
        const viewFile = e.target.closest('.view-shared-file');
        if (viewFile) {
            showToast(`Opening "${viewFile.dataset.name}". The viewer loads once the backend is connected.`, 'info');
        }
    });

    document.getElementById('noteForm').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentPatient) return;
        const text = document.getElementById('noteText').value.trim();
        if (!text) return;
        currentPatient.notes.unshift({ date: new Date().toISOString().slice(0, 10), text });
        document.getElementById('noteText').value = '';
        renderNotes(currentPatient);
        showToast('Note added');
    });

    renderPatients();
    refreshIcons();

    // Deep links: #patients or #patient-records-<id>
    function handleHashRoute() {
        const hash = window.location.hash.replace('#', '').trim();
        if (hash === 'patients') {
            showView('patients');
        } else if (hash.startsWith('patient-records-')) {
            const p = patients.find(x => x.id === Number(hash.split('-').pop()));
            if (p) {
                currentPatient = p;
                renderPatientRecords(p);
                document.getElementById('patientRecordsNav').classList.remove('hidden');
                showView('patient-records');
            }
        }
    }
    window.addEventListener('hashchange', handleHashRoute);
    handleHashRoute();
});
