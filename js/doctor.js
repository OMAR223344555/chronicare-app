document.addEventListener('DOMContentLoaded', async () => {

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
                { date: '2026-11-20', textKey: 'dp.note1' },
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
        if (window.CCUI && name === 'patients') {
            const ptEl = document.getElementById('patientsTable');
            if (ptEl) CCUI.withSkeleton(ptEl, renderPatients);
        }
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

    const T = (k, f) => window.CCi18n ? CCi18n.t(k, f) : (f || k);
    const Tp = (k, params, f) => {
        let s = T(k, f);
        Object.keys(params || {}).forEach(p => { s = s.replace('{' + p + '}', params[p]); });
        return s;
    };
    function fmtDate(iso) {
        if (window.CCi18n && CCi18n.fmtDate) return CCi18n.fmtDate(iso);
        return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    const COND_MAP = { 'Diabetes': 'cond.diabetes', 'Hypertension': 'cond.hypertension', 'Chronic kidney disease': 'cond.ckd' };
    const condsLabel = str => str.split(', ').map(c => T(COND_MAP[c] || '', c)).join(window.CCi18n && CCi18n.lang === 'ar' ? '، ' : ', ');
    const CAT_MAP = { 'Lab Report': 'cat.lab', 'Prescription': 'cat.prescription', 'Imaging': 'cat.imaging' };
    const catLabel = c => T(CAT_MAP[c] || '', c);
    const labName = t => T('lab.n.' + t, t);
    const NAME_KEYS = { 'Maya Hassan': 'name.maya', 'Omar Adel': 'name.omar', 'Sara Mahmoud': 'name.sara' };
    const nameLabel = n => T(NAME_KEYS[n] || '', n);

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

    function outOfRange(l) {
        return (l.min != null && l.value < l.min) || (l.max != null && l.value > l.max);
    }

    // ---- My Patients list ----
    const patientsTable = document.getElementById('patientsTable');
    let patientQuery = '';
    let patientStatusFilter = 'all';
    let patientCondFilter = 'all';
    function filteredPatients() {
        const q = patientQuery.trim().toLowerCase();
        return patients.filter(p => {
            if (patientStatusFilter === 'new' && !p.hasNew) return false;
            if (patientStatusFilter === 'uptodate' && p.hasNew) return false;
            if (patientCondFilter !== 'all' && !p.conditions.split(', ').includes(patientCondFilter)) return false;
            if (q && !(p.name.toLowerCase().includes(q) || nameLabel(p.name).toLowerCase().includes(q) ||
                p.conditions.toLowerCase().includes(q) || condsLabel(p.conditions).toLowerCase().includes(q))) return false;
            return true;
        });
    }
    // ---- Optional live API mode ----
    let apiMode = false;
    if (window.CCApi && CCApi.hasSession()) {
        const sessUser = CCApi.user();
        if (sessUser && sessUser.role === 'doctor') {
            try {
                await CCApi.hydrateDoctor(patients);
                apiMode = true;
                CCApi.refreshNotifs(true);
                // Reflect the signed-in doctor in the demo-authored chrome
                const nameEl = document.querySelector('[data-i18n="name.farouk"]');
                if (nameEl) { nameEl.textContent = sessUser.full_name || nameEl.textContent; nameEl.removeAttribute('data-i18n'); }
                if (sessUser.specialty) {
                    const specEl = document.querySelector('[data-i18n="account.doctor"]');
                    if (specEl) { specEl.textContent = sessUser.specialty; specEl.removeAttribute('data-i18n'); }
                }
                const initials = (sessUser.full_name || '').replace(/^Dr\.?\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || 'DR';
                document.querySelectorAll('div.rounded-full.bg-cyan-200').forEach(el => { if (el.textContent.trim() === 'AF') el.textContent = initials; });
            } catch (err) {
                CCApi.clearSession();
            }
        } else if (sessUser) {
            CCApi.clearSession();
        }
    }
    setTimeout(() => { if (window.ccGateOpen) window.ccGateOpen(); }, 60);

    // ---- Live sync: poll the cheap /sync/ fingerprint and refresh only what moved ----
    async function resyncPatientsLive() {
        const scroller = document.scrollingElement || document.documentElement;
        const y = scroller.scrollTop;
        const openId = currentPatient ? currentPatient.id : null;
        try { await CCApi.hydrateDoctor(patients); } catch (e) { return; }
        if (openId != null) currentPatient = patients.find(p => p.id === openId) || currentPatient;
        renderPatients();
        if (currentPatient) {
            const recordsView = document.getElementById('view-patient-records');
            if (recordsView && !recordsView.classList.contains('hidden')) {
                renderPatientRecords(currentPatient);
                renderPatientMeds(currentPatient);
                renderNotes(currentPatient);
            }
        }
        scroller.scrollTop = y;
        refreshIcons();
    }

    if (window.CCApi && CCApi.startLiveSync) {
        CCApi.startLiveSync((chg) => {
            if (!apiMode) return;
            if (chg.notifications) CCApi.refreshNotifs(true);
            if (chg.appointments) {
                if (chg.prev && chg.prev.appointments && chg.snap.appointments.count > chg.prev.appointments.count) {
                    showToast(CCApi.L('New appointment request', 'طلب موعد جديد'), 'success');
                }
                loadAppointmentsD(true);
            }
            if (chg.shares) resyncPatientsLive();
        });
    }

    function renderPatients() {
        const list = filteredPatients();
        patientsTable.innerHTML = (list.map(p => `
            <tr>
                <td><strong>${nameLabel(p.name)}</strong></td>
                <td>${condsLabel(p.conditions)}</td>
                <td>${Tp('dp.filesN', { n: p.files.length })}</td>
                <td>${fmtDate(p.lastShared)}</td>
                <td>${p.hasNew
                    ? `<span class="bg-cyan-100 text-cyan-800 text-xs font-bold px-2.5 py-1 rounded-full">${T('st.newFiles')}</span>`
                    : `<span class="bg-slate-100 text-slate-500 text-xs font-bold px-2.5 py-1 rounded-full">${T('st.upToDate')}</span>`}</td>
                <td><button type="button" class="more-btn open-patient-btn" data-id="${p.id}">${T('dp.openRecords')}</button></td>
            </tr>`).join(''))
            || `<tr><td colspan="6" class="text-center text-slate-400 py-8">${T('dp.noMatch')}</td></tr>`;

        // Mobile cards keep the action visible without horizontal scrolling
        document.getElementById('patientsCards').innerHTML = (list.map(p => `
            <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div class="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                        <p class="font-bold text-[#0c2340]">${nameLabel(p.name)}</p>
                        <p class="text-xs text-slate-500">${condsLabel(p.conditions)}</p>
                    </div>
                    ${p.hasNew
                        ? `<span class="bg-cyan-100 text-cyan-800 text-xs font-bold px-2.5 py-1 rounded-full shrink-0">${T('st.newFiles')}</span>`
                        : `<span class="bg-slate-100 text-slate-500 text-xs font-bold px-2.5 py-1 rounded-full shrink-0">${T('st.upToDate')}</span>`}
                </div>
                <p class="text-xs text-slate-500 mb-3">${Tp('dp.filesN', { n: p.files.length })} • ${Tp('dp.lastShared', { d: fmtDate(p.lastShared) })}</p>
                <button type="button" class="open-patient-btn w-full bg-[#0c2340] hover:bg-blue-950 text-white text-sm font-semibold py-2.5 rounded-xl transition" data-id="${p.id}">${T('dp.openRecords')}</button>
            </div>`).join(''))
            || `<p class="text-center text-slate-400 text-sm py-6">${T('dp.noMatch')}</p>`;
        refreshIcons();
    }

    // Search + filter wiring
    const patientSearch = document.getElementById('patientSearch');
    if (patientSearch) {
        patientSearch.addEventListener('input', () => { patientQuery = patientSearch.value; renderPatients(); });
    }
    document.querySelectorAll('.patient-filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            patientStatusFilter = chip.dataset.filter;
            document.querySelectorAll('.patient-filter-chip').forEach(c => {
                const active = c === chip;
                c.classList.toggle('bg-[#0c2340]', active);
                c.classList.toggle('text-white', active);
                c.classList.toggle('bg-slate-100', !active);
                c.classList.toggle('text-slate-600', !active);
            });
            renderPatients();
        });
    });
    const patientCondFilterEl = document.getElementById('patientCondFilter');
    if (patientCondFilterEl) {
        patientCondFilterEl.addEventListener('change', () => { patientCondFilter = patientCondFilterEl.value; renderPatients(); });
    }

    // ---- Note templates ----
    const NOTE_TEMPLATES = [
        { labelKey: 'tpl.followup', bodyKey: 'tpl.followupBody' },
        { labelKey: 'tpl.medAdjust', bodyKey: 'tpl.medAdjustBody' },
        { labelKey: 'tpl.labReview', bodyKey: 'tpl.labReviewBody' },
        { labelKey: 'tpl.lifestyle', bodyKey: 'tpl.lifestyleBody' },
    ];
    function renderNoteTemplates() {
        const box = document.getElementById('noteTemplates');
        if (!box) return;
        box.innerHTML = NOTE_TEMPLATES.map(t => `
            <button type="button" class="note-template-chip bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-[11px] font-bold px-3 py-1.5 rounded-full border border-cyan-100 transition" data-body="${t.bodyKey}">${T(t.labelKey)}</button>`).join('');
    }
    document.addEventListener('click', (e) => {
        const chip = e.target.closest('.note-template-chip');
        if (!chip) return;
        const ta = document.getElementById('noteText');
        if (!ta) return;
        const add = T(chip.dataset.body);
        ta.value = ta.value.trim() ? ta.value.trim() + '\n' + add : add;
        ta.focus();
    });

    // ---- Patient Records ----
    function renderPatientRecords(p) {
        document.getElementById('patientRecordsTitle').textContent = Tp('dp.recordsTitle', { name: nameLabel(p.name) });
        document.getElementById('patientRecordsSubtitle').textContent =
            Tp('dp.recordsSub', { cond: condsLabel(p.conditions), d: fmtDate(p.lastShared) });

        document.getElementById('patientFilesCount').textContent = Tp('dp.filesN', { n: p.files.length });
        document.getElementById('patientFilesList').innerHTML = p.files.map(f => `
            <li class="dr-row">
                <span class="dr-file">PDF</span>
                <div class="dr-id">
                    <p class="dr-title">${f.name}</p>
                    <p class="dr-meta">${catLabel(f.category)} <span class="dr-sep">·</span> ${fmtDate(f.date)}</p>
                </div>
                <button type="button" class="dr-open view-shared-file" data-name="${f.name}" data-api-id="${f.apiId || ''}" aria-label="${T('pr.view')}" title="${T('pr.view')}"><i data-lucide="eye"></i><span>${T('pr.view')}</span></button>
            </li>`).join('') || `<li class="dr-empty">${T('pr.noFiles')}</li>`;

        document.getElementById('patientLabsCount').textContent = Tp('pr.resultsN', { n: p.labs.length });
        document.getElementById('patientLabsList').innerHTML = p.labs.map(l => {
            const oor = outOfRange(l);
            const low = oor && l.min != null && l.value < l.min;
            const range = (l.min != null ? l.min : '') + (l.max != null ? ' - ' + l.max : (l.min != null ? '+' : '')) + ' ' + l.unit;
            return `<li class="dr-row">
                <div class="dr-id">
                    <p class="dr-title">${labName(l.test)}${oor ? ` <span class="dr-tag ${low ? 'dr-tag-low' : 'dr-tag-high'}">${T(low ? 'pr.low' : 'pr.high')}</span>` : ''}</p>
                    <p class="dr-meta">${Tp('pr.ref', { r: range })} <span class="dr-sep">·</span> ${fmtDate(l.date)}</p>
                </div>
                <p class="dr-value${oor ? ' is-out' : ''}">${l.value} <span class="dr-unit">${l.unit}</span></p>
            </li>`;
        }).join('') || `<li class="dr-empty">${T('pr.noLabs')}</li>`;

        renderNotes(p);
        renderPatientMeds(p);
        refreshIcons();
    }

    // Medications this patient tracks (live API only; read-only for the doctor)
    function renderPatientMeds(p) {
        const card = document.getElementById('patientMedsCard');
        const listEl = document.getElementById('patientMedsList');
        const countEl = document.getElementById('patientMedsCount');
        if (!card || !listEl) return;
        if (!apiMode || !window.CCApi) { card.classList.add('hidden'); return; }
        card.classList.remove('hidden');
        countEl.textContent = '…';
        listEl.innerHTML = `<li class="dr-empty">…</li>`;
        const forPatient = p;
        CCApi.all('/medications/?patient=' + p.id).then(meds => {
            if (currentPatient !== forPatient) return;
            countEl.textContent = meds.length;
            listEl.innerHTML = meds.map(m => `
                <li class="dr-row">
                    <span class="dr-file" style="background:#fffbeb;color:#b45309"><i data-lucide="pill" class="w-4 h-4"></i></span>
                    <div class="dr-id">
                        <p class="dr-title">${m.name}${m.taken_today ? ` <span class="dr-tag" style="background:#ecfdf5;color:#047857">${T('pr.takenToday', 'Taken today')}</span>` : ''}</p>
                        <p class="dr-meta">${m.dose} <span class="dr-sep">·</span> ${T('pr.dailyAt', 'daily at')} ${m.time}</p>
                    </div>
                </li>`).join('') || `<li class="dr-empty">${T('pr.noMeds', 'No medications tracked yet.')}</li>`;
            refreshIcons();
        }).catch(() => {
            if (currentPatient !== forPatient) return;
            countEl.textContent = '0';
            listEl.innerHTML = `<li class="dr-empty">${T('pr.noMeds', 'No medications tracked yet.')}</li>`;
        });
    }

    function renderNotes(p) {
        const list = document.getElementById('notesList');
        list.innerHTML = p.notes.length ? p.notes.map(n => `
            <li class="dr-note">
                <p class="dr-note-meta">${fmtDate(n.date)} <span class="dr-sep">·</span> ${n.doctor || T('name.farouk')}</p>
                <p class="dr-note-text">${n.textKey ? T(n.textKey) : n.text}</p>
            </li>`).join('')
            : `<li class="dr-empty">${T('dp.noNotes')}</li>`;
    }

    document.addEventListener('click', (e) => {
        const openBtn = e.target.closest('.open-patient-btn');
        if (openBtn) {
            currentPatient = patients.find(p => p.id === Number(openBtn.dataset.id));
            if (!currentPatient) return;
            currentPatient.hasNew = false; // opening marks the new files as seen
            if (apiMode && window.CCApi) CCApi.post('/doctor/patients/' + currentPatient.id + '/mark-seen/').catch(() => {});
            renderPatients();
            renderPatientRecords(currentPatient);
            document.getElementById('patientRecordsNav').classList.remove('hidden');
            showView('patient-records');
            return;
        }
        const viewFile = e.target.closest('.view-shared-file');
        if (viewFile && viewFile.dataset.apiId && window.CCApi) {
            CCApi.openFile(viewFile.dataset.apiId).catch(err => showToast(String(err.message || err), 'warn'));
            return;
        }
        if (viewFile) {
            showToast(Tp('dp.openFile', { n: viewFile.dataset.name }), 'info');
        }
    });

    document.getElementById('noteForm').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentPatient) return;
        const text = document.getElementById('noteText').value.trim();
        if (!text) return;
        const addLocal = () => {
            currentPatient.notes.unshift({ date: new Date().toISOString().slice(0, 10), text });
            document.getElementById('noteText').value = '';
            renderNotes(currentPatient);
            showToast(T('toast.noteAdded'));
        };
        if (apiMode && window.CCApi) {
            const target = (currentPatient.files || []).find(fl => fl.apiId);
            if (!target) { showToast('No shared file to attach the note to', 'warn'); return; }
            CCApi.post('/notes/', { medical_file: target.apiId, text }).then(addLocal)
                .catch(err => showToast(String(err.message || err), 'warn'));
            return;
        }
        addLocal();
    });

    renderPatients();
    renderNoteTemplates();
    refreshIcons();
    document.addEventListener('cc:lang', () => {
        renderPatients();
        renderNoteTemplates();
        if (currentPatient) renderPatientRecords(currentPatient);
        refreshIcons();
    });

    // Deep links: #patients or #patient-records-<id>
    function handleHashRoute() {
        const hash = window.location.hash.replace('#', '').trim();
        if (hash === '' || hash === 'patients') {
            showView('patients');
        } else if (hash === 'patient-records') {
            if (currentPatient) showView('patient-records'); else showView('patients');
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
    document.addEventListener('cc:popview', handleHashRoute);
    handleHashRoute();

    // ---- Appointments (doctor) ----
    let apptDItems = [];
    let apptDLoaded = false;
    function apptDDemo() {
        const d1 = new Date(Date.now() + 2 * 86400000); d1.setMinutes(0, 0, 0);
        const d2 = new Date(Date.now() + 4 * 86400000); d2.setMinutes(30, 0, 0);
        return [
            { id: 'demo1', patient_name: 'Maya Hassan', scheduled_at: d1.toISOString(), reason: 'HbA1c follow-up', status: 'pending' },
            { id: 'demo2', patient_name: 'Omar Adel', scheduled_at: d2.toISOString(), reason: 'Medication review', status: 'confirmed' },
        ];
    }
    async function loadAppointmentsD(force) {
        if (apptDLoaded && !force) return;
        apptDLoaded = true;
        if (apiMode && window.CCApi) {
            try { apptDItems = await CCApi.all('/appointments/'); } catch (e) { apptDItems = []; }
        } else {
            apptDItems = apptDDemo();
        }
        const rank = { pending: 0, confirmed: 1, completed: 2, declined: 3, cancelled: 4 };
        apptDItems = apptDItems.slice().sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || new Date(a.scheduled_at) - new Date(b.scheduled_at));
        renderAppointmentsD();
    }
    function apptDParts(iso) {
        const d = new Date(iso);
        const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
        const time = d.toLocaleTimeString(window.CCi18n && CCi18n.lang === 'ar' ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
        return { day: String(d.getDate()).padStart(2, '0'), mon: months[d.getMonth()], time };
    }
    function renderAppointmentsD() {
        const list = document.getElementById('apptDList');
        if (!list) return;
        const countEl = document.getElementById('apptDCount');
        if (countEl) countEl.textContent = apptDItems.length;
        const now = Date.now();
        list.innerHTML = apptDItems.map(a => {
            const w = apptDParts(a.scheduled_at);
            let actions = '';
            if (apiMode && a.status === 'pending') {
                actions = `<span class="appt-act"><button type="button" class="appt-btn ok" data-appt-act="confirm" data-appt-id="${a.id}">${T('appt.confirm', 'Confirm')}</button><button type="button" class="appt-btn no" data-appt-act="decline" data-appt-id="${a.id}">${T('appt.decline', 'Decline')}</button></span>`;
            } else if (apiMode && a.status === 'confirmed' && new Date(a.scheduled_at).getTime() < now) {
                actions = `<span class="appt-act"><button type="button" class="appt-btn mute" data-appt-act="complete" data-appt-id="${a.id}">${T('appt.complete', 'Complete')}</button></span>`;
            }
            return `
            <li class="au-row appt-row">
                <span class="appt-date"><b>${w.day}</b><span>${w.mon}</span></span>
                <div class="appt-main">
                    <p class="appt-name">${a.patient_name || ''}</p>
                    <p class="appt-meta">${w.time}${a.reason ? ' · ' + a.reason : ''}</p>
                </div>
                <span class="appt-pill ${a.status}">${T('appt.st.' + a.status, a.status)}</span>
                ${actions}
            </li>`;
        }).join('') || `<li class="au-empty">${T('appt.dEmpty', 'No appointment requests yet.')}</li>`;
        list.querySelectorAll('[data-appt-act]').forEach(btn => btn.addEventListener('click', async () => {
            btn.disabled = true;
            try {
                await CCApi.post(`/appointments/${btn.dataset.apptId}/status/`, { action: btn.dataset.apptAct });
                await loadAppointmentsD(true);
            } catch (e) { btn.disabled = false; showToast(T('appt.bookErr', 'Could not book right now - please try again.'), 'warn'); }
        }));
        refreshIcons();
    }
    document.addEventListener('cc:lang', () => { if (apptDLoaded) { if (!apiMode) apptDItems = apptDDemo(); renderAppointmentsD(); } });
    document.querySelectorAll('[data-navigate="appointments"]').forEach(b =>
        b.addEventListener('click', () => loadAppointmentsD()));

    // ---- Stage 2: notifications + palette (doctor) ----
    const doctorNotifs = [
        { icon: 'folder-heart', kind: 'share', textKey: 'nd.1', timeKey: 'tm.3h', unread: true },
        { icon: 'flask-conical', kind: 'info', textKey: 'nd.2', timeKey: 'tm.yest', unread: true },
        { icon: 'calendar-check', kind: 'success', textKey: 'nd.3', timeKey: 'tm.2d', unread: false },
    ];
    window.CC_NOTIFS = () => apiMode ? CCApi.liveNotifs() : doctorNotifs.map(n => ({ ...n, text: T(n.textKey), time: T(n.timeKey) }));
    window.CC_NOTIFS_MARK_READ = () => { if (apiMode) { CCApi.markAllNotifsRead(); } else doctorNotifs.forEach(n => { n.unread = false; }); };
    window.CC_SOURCES = () => {
        const t = (k, f) => window.CCi18n ? CCi18n.t(k, f) : f;
        const pages = [
            { icon: 'users', title: t('nav.patients', 'My Patients'), keywords: 'list', run: () => showView('patients') },
            { icon: 'folder-heart', title: t('nav.patientRecords', 'Patient Records'), keywords: 'files notes', run: () => showView('patient-records') },
            { icon: 'calendar-check', title: t('nav.appointments', 'Appointments'), keywords: 'schedule bookings', run: () => showView('appointments') },
        ];
        const pats = patients.map(p => ({
            icon: 'user',
            title: p.name,
            subtitle: condsLabel(p.conditions),
            keywords: 'patient ' + p.conditions,
            run: () => {
                const btn = document.querySelector('.open-patient-btn[data-id="' + p.id + '"]');
                if (btn) btn.click();
            },
        }));
        const actions = [
            { icon: 'moon', title: t('pal.theme', 'Toggle dark mode'), keywords: 'theme', run: () => CCUI.toggleTheme() },
            { icon: 'languages', title: t('pal.lang', 'Switch language'), keywords: 'arabic english', run: () => CCi18n.setLang(CCi18n.lang === 'ar' ? 'en' : 'ar') },
        ];
        return [...pages, ...pats, ...actions];
    };
});
