/* Chronicare i18n: English/Arabic with RTL support */
(function () {
    'use strict';

    const DICT = {
        en: {
            'app.name': 'Chronicare',
            'app.tagline': 'Care Today .. Healthier Tomorrow',
            'nav.overview': 'Overview',
            'nav.medicalFiles': 'My Medical Files',
            'nav.upload': 'Upload Record',
            'nav.labTrends': 'Lab Trends',
            'nav.timeline': 'Timeline & Archive',
            'nav.sharing': 'Sharing & Access',
            'nav.patients': 'My Patients',
            'nav.patientRecords': 'Patient Records',
            'nav.users': 'Manage Users',
            'nav.reference': 'Categories & Ranges',
            'nav.audit': 'Audit Log',
            'nav.section.overview': 'OVERVIEW',
            'nav.section.myHealth': 'MY HEALTH',
            'nav.section.myPractice': 'MY PRACTICE',
            'nav.section.management': 'MANAGEMENT',
            'action.signOut': 'Sign out',
            'action.save': 'Save',
            'action.cancel': 'Cancel',
            'action.close': 'Close',
            'action.search': 'Search',
            'action.add': 'Add',
            'action.delete': 'Delete',
            'action.export': 'Export',
            'action.filter': 'Filter',
            'action.viewAll': 'View all',
            'action.back': 'Back',
            'topbar.workspace': 'Workspace',
            'topbar.search': 'Search records, doctors...',
            'topbar.notifications': 'Notifications',
            'portal.patient': 'Patient Portal',
            'portal.doctor': 'Doctor Portal',
            'portal.admin': 'Administration',
            'auth.signIn': 'Sign In',
            'auth.signUp': 'Sign Up',
            'auth.welcome': 'Welcome back to Chronicare',
            'auth.createAccount': 'Create your account',
            'auth.email': 'Email Address',
            'auth.password': 'Password',
            'auth.confirmPassword': 'Confirm Password',
            'auth.fullName': 'Full Name',
            'auth.remember': 'Remember me',
            'auth.forgot': 'Forgot password?',
            'auth.or': 'or',
            'auth.google': 'Continue with Google',
            'auth.noAccount': "Don't have an account?",
            'auth.haveAccount': 'Already have an account?',
            'auth.role': 'Sign in as',
            'auth.rolePatient': 'Patient',
            'auth.roleDoctor': 'Doctor',
            'auth.roleAdmin': 'Admin',
            'auth.heroTitle1': 'Your health',
            'auth.heroTitle2': 'is our priority',
            'auth.feat1': 'Track Your Health and Appointments',
            'auth.feat2': 'Manage Your Medications',
            'auth.feat3': 'Monitor Your Condition',
            'help.title': 'Need a hand?',
            'help.text': 'Find answers about managing and sharing your health records.',
            'help.cta': 'Visit Help Center',
            'account.patient': 'Patient account',
            'account.doctor': 'Internal Medicine',
            'account.admin': 'System manager',
            'palette.placeholder': 'Search pages, records, actions...',
            'palette.empty': 'No matches found',
            "careplan.title": "Today's care plan",
            "careplan.sub": "Medication and appointment reminders",
            "upload.drop": "Drag & drop your file here, or click to browse (PDF, JPG, PNG up to 10 MB)",
            "upload.uploading": "Uploading...",
            "timeline.filter.all": "All events",
            "timeline.filter.lab": "Lab results",
            "timeline.filter.visit": "Visits",
            "timeline.filter.rx": "Prescriptions",
            "timeline.filter.upload": "Uploads",
            "timeline.history": "Chronological history",
            "lab.csv": "Export CSV",
            "lab.pdf": "Export PDF",
            "lab.from": "From",
            "lab.to": "To",
            "share.modal.eyebrow": "SECURE SHARE",
            "share.modal.title": "Review & share",
            "share.modal.link": "Share link (expires with access)",
            "share.modal.copy": "Copy link",
            "share.modal.confirm": "Confirm & share securely",
            "chart.fbg": "Fasting glucose",
            "chart.sbp": "Systolic BP",
            'notif.title': 'Notifications',
            'notif.markRead': 'Mark all read',
            'notif.empty': 'You are all caught up',
            'chart.title': 'Health trends',
            'chart.subtitle': 'Track how your key results change over time',
            'lang.switch': 'التبديل إلى العربية',
            'theme.toggle': 'Toggle dark mode',
            'drawer.open': 'Open navigation menu',
            'drawer.close': 'Close navigation menu',
        },
        ar: {
            'app.name': 'كرونيكير',
            'app.tagline': 'رعاية اليوم .. صحة الغد',
            'nav.overview': 'نظرة عامة',
            'nav.medicalFiles': 'ملفاتي الطبية',
            'nav.upload': 'رفع سجل',
            'nav.labTrends': 'اتجاهات التحاليل',
            'nav.timeline': 'السجل الزمني والأرشيف',
            'nav.sharing': 'المشاركة والوصول',
            'nav.patients': 'مرضاي',
            'nav.patientRecords': 'سجلات المريض',
            'nav.users': 'إدارة المستخدمين',
            'nav.reference': 'الفئات والنطاقات',
            'nav.audit': 'سجل التدقيق',
            'nav.section.overview': 'نظرة عامة',
            'nav.section.myHealth': 'صحتي',
            'nav.section.myPractice': 'عيادتي',
            'nav.section.management': 'الإدارة',
            'action.signOut': 'تسجيل الخروج',
            'action.save': 'حفظ',
            'action.cancel': 'إلغاء',
            'action.close': 'إغلاق',
            'action.search': 'بحث',
            'action.add': 'إضافة',
            'action.delete': 'حذف',
            'action.export': 'تصدير',
            'action.filter': 'تصفية',
            'action.viewAll': 'عرض الكل',
            'action.back': 'رجوع',
            'topbar.workspace': 'مساحة العمل',
            'topbar.search': 'ابحث في السجلات والأطباء...',
            'topbar.notifications': 'الإشعارات',
            'portal.patient': 'بوابة المريض',
            'portal.doctor': 'بوابة الطبيب',
            'portal.admin': 'الإدارة',
            'auth.signIn': 'تسجيل الدخول',
            'auth.signUp': 'إنشاء حساب',
            'auth.welcome': 'مرحبًا بعودتك إلى كرونيكير',
            'auth.createAccount': 'أنشئ حسابك',
            'auth.email': 'البريد الإلكتروني',
            'auth.password': 'كلمة المرور',
            'auth.confirmPassword': 'تأكيد كلمة المرور',
            'auth.fullName': 'الاسم الكامل',
            'auth.remember': 'تذكرني',
            'auth.forgot': 'نسيت كلمة المرور؟',
            'auth.or': 'أو',
            'auth.google': 'المتابعة بحساب جوجل',
            'auth.noAccount': 'ليس لديك حساب؟',
            'auth.haveAccount': 'لديك حساب بالفعل؟',
            'auth.role': 'تسجيل الدخول بصفة',
            'auth.rolePatient': 'مريض',
            'auth.roleDoctor': 'طبيب',
            'auth.roleAdmin': 'مدير',
            'auth.heroTitle1': 'صحتك',
            'auth.heroTitle2': 'هي أولويتنا',
            'auth.feat1': 'تابع صحتك ومواعيدك',
            'auth.feat2': 'أدر أدويتك',
            'auth.feat3': 'راقب حالتك الصحية',
            'help.title': 'تحتاج مساعدة؟',
            'help.text': 'اعثر على إجابات حول إدارة سجلاتك الصحية ومشاركتها.',
            'help.cta': 'زيارة مركز المساعدة',
            'account.patient': 'حساب مريض',
            'account.doctor': 'باطنة',
            'account.admin': 'مدير النظام',
            'palette.placeholder': 'ابحث في الصفحات والسجلات والإجراءات...',
            'palette.empty': 'لا توجد نتائج مطابقة',
            "careplan.title": "خطة الرعاية اليومية",
            "careplan.sub": "تذكيرات الأدوية والمواعيد",
            "upload.drop": "اسحب الملف وأفلته هنا، أو انقر للاختيار (PDF أو JPG أو PNG حتى 10 ميجابايت)",
            "upload.uploading": "جارٍ الرفع...",
            "timeline.filter.all": "كل الأحداث",
            "timeline.filter.lab": "نتائج المختبر",
            "timeline.filter.visit": "الزيارات",
            "timeline.filter.rx": "الوصفات",
            "timeline.filter.upload": "المرفوعات",
            "timeline.history": "السجل الزمني",
            "lab.csv": "تصدير CSV",
            "lab.pdf": "تصدير PDF",
            "lab.from": "من",
            "lab.to": "إلى",
            "share.modal.eyebrow": "مشاركة آمنة",
            "share.modal.title": "مراجعة ومشاركة",
            "share.modal.link": "رابط المشاركة (تنتهي صلاحيته مع الوصول)",
            "share.modal.copy": "نسخ الرابط",
            "share.modal.confirm": "تأكيد والمشاركة بأمان",
            "chart.fbg": "سكر الصائم",
            "chart.sbp": "ضغط الدم الانقباضي",
            'notif.title': 'الإشعارات',
            'notif.markRead': 'تحديد الكل كمقروء',
            'notif.empty': 'لا إشعارات جديدة',
            'chart.title': 'الاتجاهات الصحية',
            'chart.subtitle': 'تابع تغيّر نتائجك الأساسية مع الوقت',
            'lang.switch': 'Switch to English',
            'theme.toggle': 'تبديل الوضع الداكن',
            'drawer.open': 'فتح قائمة التنقل',
            'drawer.close': 'إغلاق قائمة التنقل',
        },
    };

    let lang = 'en';
    try { lang = localStorage.getItem('cc-lang') || 'en'; } catch (e) {}

    function t(key, fallback) {
        const d = DICT[lang] || DICT.en;
        return d[key] || DICT.en[key] || fallback || key;
    }

    function applyToDom(root) {
        (root || document).querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = t(el.getAttribute('data-i18n'));
        });
        (root || document).querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
        });
        (root || document).querySelectorAll('[data-i18n-aria]').forEach(el => {
            el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
        });
    }

    function applyDir() {
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }

    function setLang(next) {
        lang = next === 'ar' ? 'ar' : 'en';
        try { localStorage.setItem('cc-lang', lang); } catch (e) {}
        applyDir();
        applyToDom();
        document.querySelectorAll('[data-lang-toggle]').forEach(btn => {
            btn.setAttribute('aria-label', t('lang.switch'));
            btn.textContent = lang === 'ar' ? 'EN' : 'ع';
        });
        document.dispatchEvent(new CustomEvent('cc:lang', { detail: { lang } }));
    }

    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-lang-toggle]')) {
            setLang(lang === 'ar' ? 'en' : 'ar');
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        applyDir();
        applyToDom();
        document.querySelectorAll('[data-lang-toggle]').forEach(btn => {
            btn.setAttribute('aria-label', t('lang.switch'));
            btn.textContent = lang === 'ar' ? 'EN' : 'ع';
        });
    });

    window.CCi18n = {
        t,
        setLang,
        applyToDom,
        get lang() { return lang; },
        get isRTL() { return lang === 'ar'; },
    };
})();
