/* ==========================================================================
   Chronicare API client (optional live mode)
   Connects the static frontend to the Django REST backend when available.
   - Base URL: localStorage 'cc-api-url' -> window.CC_API_BASE -> hosted demo API
   - (set localStorage 'cc-api-url' to http://127.0.0.1:8000/api for local dev)
   - Session: token + user cached in localStorage (cc-api-token / cc-api-user)
   - When no session exists or the server is unreachable, pages keep their
     built-in demo data (demo fallback).
   ========================================================================== */
window.CC_GOOGLE_CLIENT_ID = '223774686616-67dftentnt23fomhmm25bjqrgo5n7oiu.apps.googleusercontent.com';
window.CCApi = (function () {
    const LS_URL = 'cc-api-url';
    const LS_TOK = 'cc-api-token';
    const LS_USER = 'cc-api-user';
    const DEFAULT_BASE = 'https://chronicare.pythonanywhere.com/api';

    // Mutable lookup tables filled during hydration
    const refs = { cats: [], conds: [], testTypes: [] };

    function base() {
        return (localStorage.getItem(LS_URL) || window.CC_API_BASE || DEFAULT_BASE).replace(/\/+$/, '');
    }
    function setBase(u) {
        if (u) localStorage.setItem(LS_URL, u); else localStorage.removeItem(LS_URL);
    }
    function token() { return localStorage.getItem(LS_TOK) || ''; }
    function user() {
        try { return JSON.parse(localStorage.getItem(LS_USER) || 'null'); } catch (e) { return null; }
    }
    function hasSession() { return !!token(); }
    function clearSession() {
        localStorage.removeItem(LS_TOK);
        localStorage.removeItem(LS_USER);
    }
    function L(en, ar) {
        return (window.CCi18n && CCi18n.lang === 'ar') ? ar : en;
    }

    async function req(path, opts) {
        opts = opts || {};
        const headers = Object.assign({}, opts.headers || {});
        if (token()) headers['Authorization'] = 'Token ' + token();
        let body = opts.body;
        if (opts.json !== undefined) {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(opts.json);
        }
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs || 10000);
        let res;
        try {
            res = await fetch(base() + path, { method: opts.method || 'GET', headers, body, signal: ctrl.signal });
        } catch (e) {
            clearTimeout(timer);
            if (e && e.name === 'AbortError') { const te = new Error('Request timed out'); te.status = 0; te.timeout = true; throw te; }
            throw e;
        }
        clearTimeout(timer);
        let data = null;
        try { data = await res.json(); } catch (e) { /* empty body */ }
        if (!res.ok) {
            let msg = 'HTTP ' + res.status;
            if (data) {
                if (typeof data.detail === 'string') msg = data.detail;
                else {
                    const k = Object.keys(data)[0];
                    if (k) msg = k + ': ' + String(data[k]);
                }
            }
            const err = new Error(msg);
            err.status = res.status;
            err.data = data;
            throw err;
        }
        return data;
    }
    function get(path) { return req(path); }

    // ---- Live notifications (shared by every portal) ----
    // Each page exposes window.CC_NOTIFS()/CC_NOTIFS_MARK_READ(); in live mode
    // they delegate here. liveNotifs() is synchronous for the panel UI and
    // refreshes the cache in the background when it is stale.
    const NOTIF_ICONS = {
        share: 'folder-heart', revoke: 'share-2', note: 'file-text',
        lab_high: 'flask-conical', approve: 'user-check', upload: 'upload',
        system: 'bell',
    };
    const NOTIF_KINDS = {
        share: 'share', revoke: 'warn', note: 'info',
        lab_high: 'warn', approve: 'success', upload: 'share',
        system: 'info',
    };
    const notifState = { items: [], fetchedAt: 0, loading: false };

    function notifTime(iso) {
        const then = new Date(iso);
        const mins = Math.max(0, Math.round((Date.now() - then.getTime()) / 60000));
        if (mins < 1) return L('Just now', 'الآن');
        if (mins < 60) return L(mins + 'm ago', 'منذ ' + mins + ' د');
        const hours = Math.round(mins / 60);
        if (hours < 24) return L(hours + 'h ago', 'منذ ' + hours + ' س');
        const days = Math.round(hours / 24);
        return L(days + 'd ago', 'منذ ' + days + ' يوم');
    }
    function mapNotif(n) {
        return {
            id: n.id,
            icon: NOTIF_ICONS[n.kind] || 'bell',
            kind: NOTIF_KINDS[n.kind] || 'info',
            text: n.text,
            time: notifTime(n.created_at),
            unread: !n.is_read,
            liveNotifs, refreshNotifs, markAllNotifsRead,
    };
    }
    function notifRefreshed() {
        if (window.CCUI) {
            CCUI.updateNotifDot();
            if (CCUI.renderNotifs) CCUI.renderNotifs();
        }
    }
    async function refreshNotifs(force) {
        if (!hasSession()) return;
        if (notifState.loading) return;
        if (!force && Date.now() - notifState.fetchedAt < 15000) return;
        notifState.loading = true;
        try {
            const data = await get('/notifications/');
            notifState.items = (data || []).map(mapNotif);
            notifState.fetchedAt = Date.now();
            notifRefreshed();
        } catch (e) { /* keep the last good list */ }
        notifState.loading = false;
    }
    function liveNotifs() {
        refreshNotifs(false);
        return notifState.items;
    }
    async function markAllNotifsRead() {
        notifState.items.forEach(n => { n.unread = false; });
        notifRefreshed();
        try { await post('/notifications/read-all/'); } catch (e) { /* server catches up next refresh */ }
    }
    function post(path, json) { return req(path, { method: 'POST', json: json || {} }); }
    function patch(path, json) { return req(path, { method: 'PATCH', json: json || {} }); }

    // Collect all pages of a paginated list endpoint
    async function all(path) {
        const d = await req(path);
        if (Array.isArray(d)) return d;
        let out = d.results || [];
        let next = d.next;
        while (next) {
            const u = new URL(next);
            const d2 = await req(u.pathname.replace(/^\/api/, '') + u.search);
            out = out.concat(d2.results || []);
            next = d2.next;
        }
        return out;
    }

    async function ping() {
        try {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 4000);
            await fetch(base() + '/auth/me/', { signal: ctrl.signal });
            clearTimeout(t);
            return true;
        } catch (e) { return false; }
    }

    async function login(email, password) {
        const d = await post('/auth/login/', { email, password });
        localStorage.setItem(LS_TOK, d.token);
        localStorage.setItem(LS_USER, JSON.stringify(d.user));
        return d.user;
    }

    async function googleLogin(credential, role) {
        const d = await post('/auth/google/', { credential: credential, role: role || 'patient' });
        localStorage.setItem(LS_TOK, d.token);
        localStorage.setItem(LS_USER, JSON.stringify(d.user));
        return d.user;
    }

    async function register(payload) {
        return post('/auth/register/', payload);
    }

    // Open a stored file through the authenticated download endpoint.
    // (The public /media/ URL is not served by the host, so direct links give "Not Found".)
    async function openFile(id, mode, filename) {
        const asDownload = mode === 'download';
        const w = asDownload ? null : window.open('', '_blank'); // opened synchronously so phone pop-up blockers allow it
        try {
            const res = await fetch(base() + '/files/' + id + '/download/' + (asDownload ? '?mode=download' : '?mode=view'), { headers: { 'Authorization': 'Token ' + token() } });
            if (!res.ok) throw new Error(res.status === 404 ? L('The file is missing on the server. Please upload it again.', 'الملف غير موجود على الخادم. من فضلك ارفعه مرة أخرى.') : (res.status === 403 || res.status === 401 ? L('You do not have access to this file.', 'ليس لديك صلاحية لفتح هذا الملف.') : 'HTTP ' + res.status));
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            if (asDownload || !w) {
                const link = document.createElement('a');
                link.href = url; link.download = filename || 'chronicare-file'; document.body.appendChild(link); link.click(); link.remove();
            } else {
                w.location.href = url;
            }
            setTimeout(() => URL.revokeObjectURL(url), 120000);
        } catch (err) {
            if (w) w.close();
            throw err;
        }
    }

    function logout() {
        // Clear locally first so sign-out always works (slow or offline server,
        // or navigating away straight after). The server call is best-effort and
        // keepalive so it still goes out during the redirect.
        const tok = token();
        clearSession();
        if (!tok) return;
        try {
            fetch(base() + '/auth/logout/', {
                method: 'POST', keepalive: true,
                headers: { 'Authorization': 'Token ' + tok, 'Content-Type': 'application/json' },
                body: '{}',
            }).catch(() => {});
        } catch (e) { /* offline is fine */ }
    }

    // ---- name <-> frontend key maps -------------------------------------
    const COND_KEY = {
        'diabetes': 'diabetes', 'hypertension': 'hypertension',
        'chronic kidney disease': 'ckd', 'cardiac': 'cardiac',
    };
    const CAT_KEY = {
        'lab report': 'lab', 'prescription': 'prescription', 'imaging': 'imaging',
        'specialist report': 'specialist', 'discharge summary': 'discharge',
    };
    const TEST_KEY = {
        'hba1c': 'HBA1C', 'fasting glucose': 'FBG', 'systolic bp': 'SBP',
        'diastolic bp': 'DBP', 'creatinine': 'CREA', 'egfr': 'EGFR',
    };
    function keyOf(name, map) {
        const n = String(name || '').toLowerCase().trim();
        return map[n] || n.replace(/[^a-z0-9]+/g, '-') || 'item';
    }
    function initials(name) {
        return String(name || 'D').replace(/^dr\.\s*/i, '').trim().split(/\s+/)
            .map(w => w[0] || '').join('').toUpperCase().slice(0, 3) || 'DR';
    }
    function fmtDay(iso) {
        try {
            return new Date(String(iso).slice(0, 10) + 'T00:00:00')
                .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (e) { return iso; }
    }

    // ---- mappers: API object -> frontend state shape --------------------
    function toRecord(f) {
        const cond = refs.conds.find(c => c.id === f.condition);
        const cat = refs.cats.find(c => c.id === f.category);
        return {
            apiId: f.id,
            name: f.title,
            condition: cond ? cond._key : 'diabetes',
            category: cat ? cat._key : 'lab',
            date: f.record_date,
            status: f.archived ? 'Archived' : 'Review',
            facility: f.issuing_facility || '',
            doctor: f.issuing_doctor || '',
            specialty: f.specialty || '',
            archived: !!f.archived,
            fileUrl: f.file_url || '',
            size: Number(f.file_size) || 0,
            uploaded: String(f.uploaded_at || '').slice(0, 10) || f.record_date,
        };
    }
    function toShare(s, countOverride) {
        return {
            apiId: s.id,
            doctor: s.doctor_name,
            specialty: s.doctor_specialty || '',
            initials: initials(s.doctor_name),
            color: 'bg-cyan-200',
            files: (s.files && s.files.length) ? 'Selected files' : 'All records',
            count: countOverride != null ? countOverride
                : ((s.files && s.files.length) || (s.categories && s.categories.length) || 0),
            expires: s.expires_on,
            active: !!s.is_active,
            revoked: !!s.revoked_at,
        };
    }

    // ---- hydration -------------------------------------------------------
    async function hydratePatient(state, condLabels, catLabels) {
        const [cats, conds, testTypes, files, labs, shares, notes] = await Promise.all([
            all('/categories/'), all('/conditions/'), all('/lab-test-types/'),
            all('/files/'), all('/lab-results/'), all('/shares/'), all('/notes/'),
        ]);
        refs.cats = cats; refs.conds = conds; refs.testTypes = testTypes;
        conds.forEach(c => { c._key = keyOf(c.name, COND_KEY); condLabels[c._key] = c.name; });
        cats.forEach(c => { c._key = keyOf(c.name, CAT_KEY); catLabels[c._key] = c.name; });
        testTypes.forEach(t => { t._key = keyOf(t.name, TEST_KEY); });

        state.records = files.map(f => {
            const r = toRecord(f);
            r.id = f.id;
            return r;
        });
        state.nextRecordId = state.records.reduce((m, r) => Math.max(m, r.id), 0) + 1;

        state.labs = labs.map(l => ({
            apiId: l.id,
            test: keyOf(l.test_name, TEST_KEY),
            label: l.test_name,
            unit: l.unit,
            min: l.ref_min != null ? Number(l.ref_min) : null,
            max: l.ref_max != null ? Number(l.ref_max) : null,
            value: Number(l.value),
            date: l.measured_at,
        }));

        state.shares = shares.map(s => { const sh = toShare(s); sh.id = s.id; return sh; });
        if (state.nextShareId != null) state.nextShareId = state.shares.reduce((m, s) => Math.max(m, s.id), 0) + 1;

        state.notesByFile = {};
        notes.forEach(n => {
            const k = String(n.medical_file);
            (state.notesByFile[k] = state.notesByFile[k] || []).push({
                date: String(n.created_at || '').slice(0, 10),
                text: n.text,
                doctor: n.doctor_name || '',
            });
        });

        state.timeline = state.records.slice()
            .sort((a, b) => String(b.date).localeCompare(String(a.date)))
            .slice(0, 8)
            .map(r => ({
                month: fmtDay(r.date).split(' ')[1] || '',
                type: r.category === 'lab' ? 'lab' : (r.category === 'prescription' ? 'prescription' : 'visit'),
                title: r.name,
                text: [r.facility, r.doctor].filter(Boolean).join(' • '),
                date: fmtDay(r.date),
            }));
        return true;
    }

    async function hydrateDoctor(patients) {
        const [rows, files, labs, notes] = await Promise.all([
            all('/doctor/patients/'), all('/doctor/files/'), all('/lab-results/'), all('/notes/'),
        ]);
        patients.length = 0;
        rows.forEach(r => {
            const pfiles = files.filter(f => f.owner === r.id);
            const pnotes = notes.filter(n => pfiles.some(f => f.id === n.medical_file));
            patients.push({
                id: r.id,
                name: r.full_name,
                conditions: [...new Set(pfiles.map(f => f.condition_name).filter(Boolean))].join(', ') || '-',
                lastShared: String(r.last_shared_at || '').slice(0, 10),
                hasNew: !!r.has_new,
                files: pfiles.map(f => ({
                    name: f.title,
                    category: f.category_name || '',
                    date: f.record_date,
                    apiId: f.id,
                    fileUrl: f.file_url || '',
                })),
                labs: labs.filter(l => l.patient === r.id).map(l => ({
                    test: l.test_name,
                    value: Number(l.value),
                    unit: l.unit,
                    min: l.ref_min != null ? Number(l.ref_min) : null,
                    max: l.ref_max != null ? Number(l.ref_max) : null,
                    date: l.measured_at,
                })),
                notes: pnotes.map(n => ({
                    date: String(n.created_at || '').slice(0, 10),
                    text: n.text,
                })),
            });
        });
        return true;
    }

    async function hydrateAdmin(d) {
        const [usersL, cats, conds, types, logs, stats] = await Promise.all([
            all('/admin/users/'), all('/categories/'), all('/conditions/'),
            all('/lab-test-types/'), all('/admin/audit-log/'),
            req('/admin/users/stats/').catch(() => null),
        ]);
        refs.adminStats = stats;
        refs.cats = cats; refs.conds = conds; refs.testTypes = types;
        d.pendingDoctors.length = 0;
        usersL.filter(u => u.role === 'doctor' && u.status === 'pending').forEach(u => d.pendingDoctors.push({
            id: u.id, name: u.full_name || u.email, email: u.email, specialty: u.specialty || '-',
            license: u.license_number || '-', applied: String(u.date_joined || '').slice(0, 10),
        }));
        d.users.length = 0;
        usersL.filter(u => u.role !== 'admin' && u.status !== 'pending').forEach(u => d.users.push({
            id: u.id,
            name: u.full_name || u.email,
            email: u.email,
            joined: String(u.date_joined || '').slice(0, 10),
            role: u.role === 'doctor' ? 'Doctor' : 'Patient',
            detail: u.role === 'doctor'
                ? (u.specialty || '-') + ' • ' + (u.license_number || '-')
                : (u.email || ''),
            status: u.status === 'active' ? 'Active' : 'Deactivated',
        }));
        d.categories.length = 0;
        cats.forEach(c => d.categories.push(c.name));
        d.conditions.length = 0;
        conds.forEach(c => d.conditions.push(c.name));
        d.ranges.length = 0;
        types.forEach(t => d.ranges.push({
            id: t.id, test: t.name, unit: t.unit,
            min: t.ref_min != null ? Number(t.ref_min) : null,
            max: t.ref_max != null ? Number(t.ref_max) : null,
        }));
        d.auditEvents.length = 0;
        // Audit times come back as UTC ISO strings; show them in the admin's own timezone.
        const localWhen = iso => {
            const dt = new Date(iso);
            if (!iso || isNaN(dt)) return String(iso || '').slice(0, 16).replace('T', ' ');
            const p = n => String(n).padStart(2, '0');
            return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())} ${p(dt.getHours())}:${p(dt.getMinutes())}`;
        };
        logs.forEach(l => d.auditEvents.push({
            time: localWhen(l.created_at),
            user: l.user_email || 'system',
            action: l.action,
            details: l.details || '',
            fileTitle: l.file_title || '',
            targetEmail: l.target_email || '',
        }));
        return true;
    }

    // ---- patient actions ---------------------------------------------------
    function testTypeId(code) {
        const t = refs.testTypes.find(x => x._key === code);
        return t ? t.id : null;
    }
    function allCategoryIds() {
        return refs.cats.map(c => c.id);
    }
    async function uploadFile(f) {
        const fd = new FormData();
        fd.append('title', f.get('title'));
        const cond = refs.conds.find(c => c._key === f.get('condition')) || refs.conds[0];
        const cat = refs.cats.find(c => c._key === f.get('category')) || refs.cats[0];
        if (cond) fd.append('condition', cond.id);
        if (cat) fd.append('category', cat.id);
        fd.append('record_date', f.get('record_date') || f.get('date'));
        if (f.get('facility')) fd.append('issuing_facility', f.get('facility'));
        if (f.get('doctor')) fd.append('issuing_doctor', f.get('doctor'));
        if (f.get('specialty')) fd.append('specialty', f.get('specialty'));
        const file = f.get('file');
        if (file && file.size) fd.append('file', file);
        return req('/files/', { method: 'POST', body: fd });
    }

    // Rebuild the share form's doctor/file selects with live data
    async function populateShareForm(state) {
        const docSel = document.getElementById('shareDoctor');
        const fileSel = document.getElementById('shareFiles');
        if (docSel && !docSel.dataset.api) {
            try {
                const docs = await all('/doctors/');
                if (docs.length) {
                    docSel.innerHTML = docs.map(d =>
                        `<option value="${d.id}">${d.full_name} (${d.specialty || ''})</option>`).join('');
                    docSel.dataset.api = '1';
                }
            } catch (e) { /* keep demo options */ }
        }
        if (fileSel) {
            fileSel.innerHTML = '<option value="all" data-all="1">All Current Medical Files</option>' +
                state.records.filter(r => !r.archived)
                    .map(r => `<option value="${r.apiId}">${r.name}</option>`).join('');
        }
    }

    return {
        base, setBase, token, user, hasSession, clearSession, L,
        req, get, post, patch, all, ping,
        adminStats: () => refs.adminStats || null,
        login, googleLogin, register, logout, openFile,
        hydratePatient, hydrateDoctor, hydrateAdmin,
        toRecord, toShare, uploadFile, testTypeId, allCategoryIds, populateShareForm,
        _refs: refs,
    };
})();
