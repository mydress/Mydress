/**
 * ============================================
 * CONFIG.JS - ملف الإعدادات العامة
 * يدعم Firebase (افتراضي) + Supabase (اختياري)
 * ============================================
 */

const STORE_SETTINGS_KEY = "store_settings";

const defaultStoreSettings = {
    storeName: "MY DRESS",
    nickname: "كراء وشراء الفساتين",
    brandIdentity: "modern",
    currency: "DZD",
    primaryColor: "#e774b7",
    secondaryColor: "#fce4f4",
    accentColor: "#e774b7",
    textColor: "#1a1a2e",
    logoUrl: "assets/images/logo.png",
    footerText: "© 2025 MY DRESS - جميع الحقوق محفوظة",
    cardStyle: "classic"
};

const ADMIN_PASSWORD = "admin123";

// ===== إعدادات Firebase (كما كانت - تعمل فوراً) =====
const firebaseConfig = {
    apiKey: "AIzaSyCp1d6k0K_-7u_kFGbB2TkLkZC-RbjVYcw",
    authDomain: "test-8a022.firebaseapp.com",
    databaseURL: "https://test-8a022-default-rtdb.firebaseio.com",
    projectId: "test-8a022",
    storageBucket: "test-8a022.firebasestorage.app",
    messagingSenderId: "259248448691",
    appId: "1:259248448691:web:99e580448e04b7d8c5bcc6",
    measurementId: "G-K1L594RXJQ"
};

// ===== إعدادات Supabase (اختياري - غيّرها إذا تبي تستخدم Supabase) =====
const supabaseConfig = {
    url: "https://your-project.supabase.co",
    anonKey: "your-anon-key"
};

// ===== إعدادات Cloudinary (رفع الصور) =====
const cloudinaryConfig = {
    cloudName: "y0apmkuz",
    uploadPreset: "mydress"
};

// ===== إعدادات EmailJS (إرسال الإيميلات) =====
const emailjsConfig = {
    publicKey: "CKWFEy1mLeWLKlkkC",
    serviceId: "service_y29ncb9",
    templateId: "template_w2nxpda"
};

// ===== رابط Google Sheets (Apps Script Web App) =====
const googleSheetsUrl = "https://script.google.com/macros/s/AKfycbzvGFNJiBEzya6sIiEpK2zn7LDeeQpaAmbHXMU-w_TmJANHW6A3TXEK1C73k96VBe_b/exec";

// ===== دوال مساعدة =====
function loadStoreSettings() {
    const saved = localStorage.getItem(STORE_SETTINGS_KEY);
    return saved ? JSON.parse(saved) : defaultStoreSettings;
}

function saveStoreSettings(settings) {
    localStorage.setItem(STORE_SETTINGS_KEY, JSON.stringify(settings));
}

function formatDate(dateString) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function getMonthName(monthIndex) {
    const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    return months[monthIndex] || '';
}

// ===== نظام الحماية للوحة التحكم =====
const SECURITY = {
    MAX_ATTEMPTS: 5,
    LOCKOUT_DURATION: 30 * 60 * 1000,
    ATTEMPTS_KEY: 'admin_failed_attempts',
    LOCKOUT_KEY: 'admin_lockout_end'
};

function checkLockout() {
    const lockoutEnd = localStorage.getItem(SECURITY.LOCKOUT_KEY);
    if (lockoutEnd && Date.now() < parseInt(lockoutEnd)) {
        const remaining = Math.ceil((parseInt(lockoutEnd) - Date.now()) / 60000);
        return { locked: true, remainingMinutes: remaining };
    }
    localStorage.removeItem(SECURITY.LOCKOUT_KEY);
    localStorage.removeItem(SECURITY.ATTEMPTS_KEY);
    return { locked: false, remainingMinutes: 0 };
}

function recordFailedAttempt() {
    let attempts = parseInt(localStorage.getItem(SECURITY.ATTEMPTS_KEY) || '0');
    attempts++;
    localStorage.setItem(SECURITY.ATTEMPTS_KEY, attempts);
    if (attempts >= SECURITY.MAX_ATTEMPTS) {
        localStorage.setItem(SECURITY.LOCKOUT_KEY, (Date.now() + SECURITY.LOCKOUT_DURATION).toString());
        localStorage.removeItem(SECURITY.ATTEMPTS_KEY);
        return true;
    }
    return false;
}

function resetSecurity() {
    localStorage.removeItem(SECURITY.ATTEMPTS_KEY);
    localStorage.removeItem(SECURITY.LOCKOUT_KEY);
}

// ===== نظام قاعدة البيانات الموحد (Firebase + Supabase) =====
let db;
let dbType = 'none';

function initDB() {
    // محاولة Firebase أولاً (لأنه مهيأ)
    if (typeof firebase !== 'undefined' && firebaseConfig && firebaseConfig.apiKey) {
        try {
            if (firebase.apps.length === 0) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.firestore();
            dbType = 'firebase';
            console.log("✅ Firebase متصل");
            return;
        } catch(e) {
            console.error("❌ Firebase فشل:", e);
        }
    }

    // محاولة Supabase
    if (typeof supabase !== 'undefined' && supabaseConfig && supabaseConfig.url && 
        supabaseConfig.url !== "https://your-project.supabase.co") {
        try {
            db = supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey);
            dbType = 'supabase';
            console.log("✅ Supabase متصل");
            return;
        } catch(e) {
            console.error("❌ Supabase فشل:", e);
        }
    }

    console.warn("⚠️ لا يوجد قاعدة بيانات متصلة");
}

// ===== دوال CRUD الموحدة =====
async function dbGetAll(collection, orderField, desc) {
    if (dbType === 'firebase') {
        const snap = await db.collection(collection).orderBy(orderField || 'createdAt', desc !== false ? 'desc' : 'asc').get();
        const items = [];
        snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        return items;
    } else if (dbType === 'supabase') {
        const { data, error } = await db.from(collection).select('*').order(orderField || 'createdAt', { ascending: desc === false });
        if (error) throw error;
        return data || [];
    }
    return [];
}

async function dbGetOne(collection, id) {
    if (dbType === 'firebase') {
        const doc = await db.collection(collection).doc(id).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } else if (dbType === 'supabase') {
        const { data, error } = await db.from(collection).select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }
    return null;
}

async function dbAdd(collection, data) {
    if (dbType === 'firebase') {
        const ref = await db.collection(collection).add(data);
        return ref.id;
    } else if (dbType === 'supabase') {
        const { data: result, error } = await db.from(collection).insert([data]).select();
        if (error) throw error;
        return result[0].id;
    }
}

async function dbUpdate(collection, id, data) {
    if (dbType === 'firebase') {
        await db.collection(collection).doc(id).update(data);
    } else if (dbType === 'supabase') {
        await db.from(collection).update(data).eq('id', id);
    }
}

async function dbDelete(collection, id) {
    if (dbType === 'firebase') {
        await db.collection(collection).doc(id).delete();
    } else if (dbType === 'supabase') {
        await db.from(collection).delete().eq('id', id);
    }
}

async function dbQuery(collection, field, value) {
    if (dbType === 'firebase') {
        const snap = await db.collection(collection).where(field, '==', value).get();
        const items = [];
        snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        return items;
    } else if (dbType === 'supabase') {
        const { data, error } = await db.from(collection).select('*').eq(field, value);
        if (error) throw error;
        return data || [];
    }
    return [];
}
