/**
 * ============================================
 * ADMIN.JS - ملف منطق لوحة التحكم
 * يدعم Firebase + Supabase
 * ============================================
 */

console.log("✅ تم تحميل Admin.js بنجاح");

(function checkAdminAccess() {
    const lockout = checkLockout();
    if (lockout.locked) {
        document.body.innerHTML = `
            <div style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;font-family:Inter,sans-serif;">
                <h1 style="color:#dc3545;">⛔ تم حظر الوصول</h1>
                <p>تم حظر الدخول لمدة 30 دقيقة بسبب محاولات خاطئة متكررة.</p>
                <p>حاول بعد: <strong>${lockout.remainingMinutes} دقيقة</strong></p>
                <a href="index.html" style="margin-top:20px;color:#e774b7;">← العودة إلى المتجر</a>
            </div>
        `;
        return;
    }
})();

initDB();

function byId(id) { return document.getElementById(id); }

function safeValue(id, fallback = "") {
    const el = byId(id);
    return el ? el.value : fallback;
}

function safeChecked(id) {
    const el = byId(id);
    return el ? el.checked : false;
}

function showMessage(id, text, isSuccess = true) {
    const el = byId(id);
    if (!el) return;
    el.textContent = text;
    el.style.display = "block";
    el.style.color = isSuccess ? "#12813a" : "#dc3545";
    el.style.background = isSuccess ? "#eaf8ef" : "#ffecec";
    el.style.padding = "12px";
    el.style.borderRadius = "0px";
    el.style.margin = "10px 0";
    el.style.border = isSuccess ? "1px solid #12813a" : "1px solid #dc3545";
    setTimeout(() => { el.style.display = "none"; }, 8000);
}

/* ===== منطقة السحب والإفلات ===== */
function setupDropZone(dropZoneId, fileInputId, previewId, multiple = true) {
    const dropZone = byId(dropZoneId);
    const fileInput = byId(fileInputId);
    const preview = byId(previewId);
    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        fileInput.files = e.dataTransfer.files;
        handleFiles(fileInput, preview);
    });
    fileInput.addEventListener('change', () => handleFiles(fileInput, preview));
}

function handleFiles(fileInput, preview) {
    if (!preview) return;
    const files = fileInput.files;
    if (files.length === 0) { preview.innerHTML = ''; return; }
    preview.innerHTML = '';
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `<img src="${e.target.result}" /><span class="remove-preview" onclick="removePreview(this)">×</span>`;
            preview.appendChild(div);
        };
        reader.readAsDataURL(file);
    }
}

function removePreview(el) {
    const item = el.closest('.preview-item');
    if (item) item.remove();
}

/* ===== رفع الصور إلى Cloudinary ===== */
async function uploadToCloudinary(file) {
    if (!cloudinaryConfig.cloudName || cloudinaryConfig.cloudName === "YOUR_CLOUD_NAME" ||
        !cloudinaryConfig.uploadPreset || cloudinaryConfig.uploadPreset === "YOUR_UPLOAD_PRESET") {
        throw new Error("Cloudinary غير مهيأ - أضف cloudName و uploadPreset في config.js");
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
        method: 'POST', body: formData
    });
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `فشل رفع الصورة (${response.status})`);
    }
    const data = await response.json();
    return data.secure_url;
}

async function uploadImages(files) {
    const urls = [];
    const errors = [];
    if (!files || files.length === 0) return { urls, errors };
    for (let i = 0; i < files.length; i++) {
        try {
            const url = await uploadToCloudinary(files[i]);
            urls.push(url);
        } catch (error) {
            errors.push({ file: files[i].name, message: error.message });
        }
    }
    return { urls, errors };
}

/* ===== تحميل البيانات ===== */
async function loadProductsAdmin() {
    const list = byId("productsAdminList");
    if (!list) return;
    try {
        const products = await dbGetAll('products', 'createdAt', true);
        if (!products.length) { list.innerHTML = "<p class='small-note'>لا توجد منتجات بعد</p>"; return; }
        list.innerHTML = products.map(p => `
            <div class="card" style="padding:12px;">
                <img src="${p.images && p.images.length > 0 ? p.images[0] : ''}" style="width:100%;height:180px;object-fit:cover;border-radius:0px;" onerror="this.style.display='none'" />
                <h3 style="margin-top:8px;">${p.name}</h3>
                <p>${p.category || "لا يوجد تصنيف"}</p>
                <p><strong>${p.afterDiscount || p.price || 0} دج</strong></p>
                <button onclick="deleteProduct('${p.id}')" style="background:#dc3545;padding:8px 16px;border:none;border-radius:0px;color:white;cursor:pointer;margin-top:8px;">حذف</button>
            </div>
        `).join("");
    } catch (error) { console.error("خطأ في تحميل المنتجات:", error); }
}

async function deleteProduct(id) {
    if (!confirm("هل تريد حذف هذا المنتج؟")) return;
    await dbDelete('products', id);
    loadProductsAdmin();
}

async function loadCategoriesAdmin() {
    const list = byId("categoriesAdminList");
    if (!list) return;
    try {
        const items = await dbGetAll('categories', 'createdAt', true);
        const select = byId("productCategory");
        if (select) {
            select.innerHTML = '<option value="">اختر تصنيفاً</option>';
            (items || []).forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.name; opt.textContent = c.name;
                select.appendChild(opt);
            });
        }
        if (!items || !items.length) { list.innerHTML = "<p class='small-note'>لا توجد تصنيفات بعد</p>"; return; }
        list.innerHTML = items.map(c => `
            <div class="card" style="display:flex;justify-content:space-between;align-items:center;padding:12px;">
                <strong>${c.name}</strong>
                <button onclick="deleteCategory('${c.id}')" style="background:#dc3545;padding:6px 12px;border:none;border-radius:0px;color:white;cursor:pointer;">حذف</button>
            </div>
        `).join("");
    } catch (error) { console.error("خطأ في تحميل التصنيفات:", error); }
}

async function deleteCategory(id) {
    if (!confirm("هل تريد حذف هذا التصنيف؟")) return;
    await dbDelete('categories', id);
    loadCategoriesAdmin();
}

async function loadSlidesAdmin() {
    const list = byId("slidesAdminList");
    if (!list) return;
    try {
        const items = await dbGetAll('slides', 'createdAt', true);
        if (!items || !items.length) { list.innerHTML = "<p class='small-note'>لا توجد شرائح بعد</p>"; return; }
        list.innerHTML = items.map(s => `
            <div class="card" style="padding:12px;margin-bottom:12px;">
                <img src="${s.image || ''}" style="width:100%;height:160px;object-fit:cover;border-radius:0px;" onerror="this.style.display='none'" />
                <h3 style="margin-top:8px;">${s.title}</h3>
                <p>${s.text}</p>
                <button onclick="deleteSlide('${s.id}')" style="background:#dc3545;padding:8px 16px;border:none;border-radius:0px;color:white;cursor:pointer;margin-top:8px;">حذف</button>
            </div>
        `).join("");
    } catch (error) { console.error("خطأ في تحميل الشرائح:", error); }
}

async function deleteSlide(id) {
    if (!confirm("هل تريد حذف هذه الشريحة؟")) return;
    await dbDelete('slides', id);
    loadSlidesAdmin();
}

/* ===== الطلبات كـ Cards ===== */
async function loadOrdersAdmin() {
    const list = byId("ordersAdminList");
    if (!list) return;
    try {
        const items = await dbGetAll('orders', 'createdAt', true);
        if (!items || !items.length) { list.innerHTML = "<p class='small-note'>لا توجد طلبات بعد</p>"; return; }

        const colors = { pending: "#ffc107", done: "#28a745", rejected: "#dc3545", returned: "#fd7e14" };
        const labels = { pending: "قيد الانتظار", done: "مكتمل", rejected: "مرفوض", returned: "مرتجع" };

        list.innerHTML = items.map(o => `
            <div class="card" style="padding:16px;margin-bottom:12px;border-left:5px solid ${colors[o.status] || '#333'};">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
                    <h3 style="margin:0;">${o.fullName}</h3>
                    <span style="background:${colors[o.status] || '#333'};color:white;padding:4px 12px;border-radius:0px;font-size:0.85rem;">${labels[o.status] || o.status}</span>
                </div>
                <p><strong>المنتج:</strong> ${o.productName}</p>
                <p><strong>الهاتف:</strong> ${o.phone}</p>
                <p><strong>التاريخ:</strong> ${o.orderDate || formatDate(o.createdAt)}</p>
                <p><strong>المجموع:</strong> ${o.total} دج</p>
                <p><strong>العنوان:</strong> ${o.state} - ${o.address}</p>
                <select onchange="updateOrderStatus('${o.id}', this.value)" style="width:100%;padding:8px;border-radius:0px;border:1px solid #ddd;margin-top:10px;">
                    <option value="pending" ${o.status === "pending" ? "selected" : ""}>قيد الانتظار</option>
                    <option value="done" ${o.status === "done" ? "selected" : ""}>مكتمل</option>
                    <option value="rejected" ${o.status === "rejected" ? "selected" : ""}>مرفوض</option>
                    <option value="returned" ${o.status === "returned" ? "selected" : ""}>مرتجع</option>
                </select>
            </div>
        `).join("");
        loadMonthlyProfits();
    } catch (error) { console.error("خطأ في تحميل الطلبات:", error); }
}

async function updateOrderStatus(id, status) {
    await dbUpdate('orders', id, { status });
    loadOrdersAdmin();
}

/* ===== الأرباح كـ Calendar ===== */
async function loadMonthlyProfits() {
    const container = byId("monthlyProfits");
    if (!container) return;
    try {
        const orders = await dbGetAll('orders', 'createdAt', false);
        const done = (orders || []).filter(o => o.status === "done");
        if (!done.length) { container.innerHTML = "<p class='small-note'>لا توجد طلبات مكتملة بعد</p>"; return; }

        const monthly = {};
        done.forEach(o => {
            const d = new Date(o.createdAt);
            const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
            if (!monthly[key]) monthly[key] = {
                month: getMonthName(d.getMonth()),
                year: d.getFullYear(),
                total: 0, orders: 0, items: [],
                profitMargin: 0, paid: 0
            };
            const total = Number(o.total || 0);
            monthly[key].total += total;
            monthly[key].orders += 1;
            monthly[key].items.push(o);
        });

        const grandTotal = done.reduce((s, o) => s + Number(o.total || 0), 0);

        let html = `<div class="card" style="background:linear-gradient(135deg,#e774b7,#d95a9e);color:white;text-align:center;padding:30px;border-radius:0px;">
            <h2>💰 إجمالي الأرباح</h2>
            <h1 style="font-size:48px;">${grandTotal.toLocaleString()} دج</h1>
            <p>من ${done.length} طلب مكتمل</p>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:15px;margin-top:20px;">`;

        Object.keys(monthly).sort().forEach(key => {
            const d = monthly[key];
            const profitMargin = Math.round(d.total * 0.30);
            const netProfit = d.total - profitMargin;
            html += `
            <div class="card" style="padding:20px;border-left:4px solid #e774b7;">
                <h3 style="margin-bottom:15px;">${d.month} ${d.year}</h3>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:10px 0;">
                    <div style="background:#f8f4fc;padding:10px;text-align:center;">
                        <p style="font-size:11px;color:#888;">الإجمالي</p>
                        <p style="font-size:16px;font-weight:bold;color:#e774b7;">${d.total.toLocaleString()} دج</p>
                    </div>
                    <div style="background:#f8f4fc;padding:10px;text-align:center;">
                        <p style="font-size:11px;color:#888;">هامش الربح (30%)</p>
                        <p style="font-size:16px;font-weight:bold;color:#28a745;">${profitMargin.toLocaleString()} دج</p>
                    </div>
                    <div style="background:#f8f4fc;padding:10px;text-align:center;">
                        <p style="font-size:11px;color:#888;">المبلغ المدفوع</p>
                        <p style="font-size:16px;font-weight:bold;color:#dc3545;">${netProfit.toLocaleString()} دج</p>
                    </div>
                </div>
                <p style="font-size:14px;color:#666;margin-bottom:10px;">عدد الطلبات: ${d.orders}</p>
                <div style="max-height:250px;overflow-y:auto;border:1px solid #eee;">
                    <table style="width:100%;font-size:13px;border-collapse:collapse;">
                        <thead style="background:#f0ece8;">
                            <tr>
                                <th style="padding:8px;text-align:right;">العميل</th>
                                <th style="padding:8px;text-align:right;">الهاتف</th>
                                <th style="padding:8px;text-align:right;">المنتج</th>
                                <th style="padding:8px;text-align:right;">المبلغ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${d.items.map(item => `
                                <tr style="border-bottom:1px solid #eee;">
                                    <td style="padding:8px;">${item.fullName}</td>
                                    <td style="padding:8px;">${item.phone}</td>
                                    <td style="padding:8px;">${item.productName}</td>
                                    <td style="padding:8px;font-weight:bold;">${item.total} دج</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>`;
        });
        container.innerHTML = html + "</div>";
    } catch (error) { console.error("خطأ في تحميل الأرباح:", error); }
}

async function loadCouponsAdmin() {
    const list = byId("couponsAdminList");
    if (!list) return;
    try {
        const items = await dbGetAll('coupons');
        if (!items || !items.length) { list.innerHTML = "<p class='small-note'>لا توجد كوبونات بعد</p>"; return; }
        list.innerHTML = items.map(c => `
            <div class="card" style="display:flex;justify-content:space-between;align-items:center;padding:12px;">
                <div><strong>${c.code}</strong> - ${c.value} دج</div>
                <button onclick="deleteCoupon('${c.id}')" style="background:#dc3545;padding:6px 12px;border:none;border-radius:0px;color:white;cursor:pointer;">حذف</button>
            </div>
        `).join("");
    } catch (error) { console.error("خطأ في تحميل الكوبونات:", error); }
}

async function deleteCoupon(id) {
    if (!confirm("هل تريد حذف هذا الكوبون؟")) return;
    await dbDelete('coupons', id);
    loadCouponsAdmin();
}

async function loadShippingAdmin() {
    const list = byId("shippingAdminList");
    if (!list) return;
    try {
        const items = await dbGetAll('shipping');
        if (!items || !items.length) { list.innerHTML = "<p class='small-note'>لا توجد قواعد شحن بعد</p>"; return; }
        list.innerHTML = items.map(s => `
            <div class="card" style="display:flex;justify-content:space-between;align-items:center;padding:12px;">
                <div><strong>${s.state}</strong> - ${s.free ? "مجاني" : s.price + " دج"}</div>
                <button onclick="deleteShipping('${s.id}')" style="background:#dc3545;padding:6px 12px;border:none;border-radius:0px;color:white;cursor:pointer;">حذف</button>
            </div>
        `).join("");
    } catch (error) { console.error("خطأ في تحميل الشحن:", error); }
}

async function deleteShipping(id) {
    if (!confirm("هل تريد حذف قاعدة الشحن هذه؟")) return;
    await dbDelete('shipping', id);
    loadShippingAdmin();
}

async function loadCommentsAdmin() {
    const list = byId("commentsAdminList");
    if (!list) return;
    try {
        const items = await dbGetAll('comments', 'createdAt', true);
        if (!items || !items.length) { list.innerHTML = "<p class='small-note'>لا توجد تعليقات بعد</p>"; return; }
        list.innerHTML = items.map(c => `
            <div class="card" style="display:flex;justify-content:space-between;align-items:center;padding:12px;">
                <div><strong>${c.name}</strong><br />${c.text}<br /><small>${c.rating || 0}★</small></div>
                <button onclick="deleteComment('${c.id}')" style="background:#dc3545;padding:6px 12px;border:none;border-radius:0px;color:white;cursor:pointer;">حذف</button>
            </div>
        `).join("");
    } catch (error) { console.error("خطأ في تحميل التعليقات:", error); }
}

async function deleteComment(id) {
    if (!confirm("هل تريد حذف هذا التعليق؟")) return;
    await dbDelete('comments', id);
    loadCommentsAdmin();
}

function loadDesignInputs() {
    var saved = loadStoreSettings();
    const fields = [
        ["storeNameInput", saved.storeName],
        ["nicknameInput", saved.nickname],
        ["primaryColorInput", saved.primaryColor],
        ["secondaryColorInput", saved.secondaryColor],
        ["accentColorInput", saved.accentColor],
        ["textColorInput", saved.textColor],
        ["footerTextInput", saved.footerText]
    ];
    fields.forEach(([id, val]) => {
        const el = byId(id);
        if (el) el.value = val || "";
    });
}

/* ===== مستمعي الأحداث ===== */
function setupEventListeners() {
    byId("saveDesignBtn")?.addEventListener("click", () => {
        const settings = {
            storeName: safeValue("storeNameInput"),
            nickname: safeValue("nicknameInput"),
            primaryColor: safeValue("primaryColorInput", "#e774b7"),
            secondaryColor: safeValue("secondaryColorInput", "#fce4f4"),
            accentColor: safeValue("accentColorInput", "#e774b7"),
            textColor: safeValue("textColorInput", "#1a1a2e"),
            footerText: safeValue("footerTextInput"),
            cardStyle: "classic", currency: "DZD"
        };
        saveStoreSettings(settings);
        showMessage("designMessage", "✅ تم حفظ التصميم بنجاح!");
    });

    byId("productForm")?.addEventListener("submit", async function(e) {
        e.preventDefault();
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = "⏳ جاري الحفظ...";

        try {
            const name = safeValue("productName").trim();
            const description = safeValue("productDescription").trim();
            const price = Number(safeValue("productPrice", 0));
            const beforeDiscount = Number(safeValue("productBeforeDiscount", 0));
            const afterDiscount = Number(safeValue("productAfterDiscount", 0));
            const mode = safeValue("productMode", "buy");
            const stock = Number(safeValue("productStock", 0));
            const sizes = safeValue("productSizes");
            const colors = safeValue("productColors");
            const category = safeValue("productCategory");
            const isBestSeller = safeChecked("isBestSeller");
            const isSpecialOffer = safeChecked("isSpecialOffer");

            if (!name || !description || !price) {
                showMessage("productMessage", "❌ اسم المنتج والوصف والسعر مطلوبة!", false);
                submitBtn.disabled = false; submitBtn.textContent = "💾 حفظ المنتج";
                return;
            }

            const fileInput = byId("productImages");
            const files = fileInput ? fileInput.files : [];
            if (!files || files.length === 0) {
                showMessage("productMessage", "❌ يرجى رفع صورة واحدة على الأقل!", false);
                submitBtn.disabled = false; submitBtn.textContent = "💾 حفظ المنتج";
                return;
            }

            showMessage("productMessage", "⏳ جاري رفع الصور...", true);
            const uploadResult = await uploadImages(files);
            if (!uploadResult.urls.length) {
                showMessage("productMessage", "❌ فشل رفع الصور. تحقق من إعدادات Cloudinary.", false);
                submitBtn.disabled = false; submitBtn.textContent = "💾 حفظ المنتج";
                return;
            }

            const productData = {
                name, description, images: uploadResult.urls,
                price, beforeDiscount: beforeDiscount || 0,
                afterDiscount: afterDiscount || price,
                mode, stock: stock || 0, sizes, colors, category,
                isBestSeller, isSpecialOffer,
                averageRating: 0, reviewCount: 0,
                createdAt: new Date().toISOString()
            };

            await dbAdd('products', productData);
            showMessage("productMessage", "✅ تم حفظ المنتج بنجاح!");
            this.reset();
            byId("productImagePreview").innerHTML = "";
            loadProductsAdmin();
        } catch (error) {
            console.error(error);
            showMessage("productMessage", "❌ خطأ: " + error.message, false);
        }
        submitBtn.disabled = false;
        submitBtn.textContent = "💾 حفظ المنتج";
    });

    byId("addCategoryBtn")?.addEventListener("click", async () => {
        const name = safeValue("categoryName").trim();
        if (!name) { showMessage("categoryMessage", "❌ أدخل اسم التصنيف", false); return; }
        await dbAdd('categories', { name, createdAt: new Date().toISOString() });
        byId("categoryName").value = "";
        showMessage("categoryMessage", "✅ تم إضافة التصنيف!");
        loadCategoriesAdmin();
    });

    byId("addSlideBtn")?.addEventListener("click", async function() {
        const title = safeValue("slideTitle").trim();
        const text = safeValue("slideText").trim();
        const fileInput = byId("slideImageFile");
        const file = fileInput ? fileInput.files[0] : null;

        if (!title || !text) { showMessage("slideMessage", "❌ العنوان والنص مطلوبان!", false); return; }
        if (!file) { showMessage("slideMessage", "❌ يرجى رفع صورة!", false); return; }

        this.disabled = true;
        try {
            const imageUrl = await uploadToCloudinary(file);
            await dbAdd('slides', { title, text, image: imageUrl, createdAt: new Date().toISOString() });
            byId("slideTitle").value = ""; byId("slideText").value = "";
            byId("slideImageFile").value = ""; byId("slideImagePreview").innerHTML = "";
            showMessage("slideMessage", "✅ تم إضافة الشريحة!");
            loadSlidesAdmin();
        } catch (error) {
            showMessage("slideMessage", "❌ خطأ: " + error.message, false);
        }
        this.disabled = false;
    });

    byId("addCouponBtn")?.addEventListener("click", async () => {
        const code = safeValue("couponName").trim().toUpperCase();
        const value = Number(safeValue("couponValue", 0));
        if (!code || !value) { showMessage("couponMessage", "❌ أدخل الكود والقيمة", false); return; }
        await dbAdd('coupons', { code, value, createdAt: new Date().toISOString() });
        byId("couponName").value = ""; byId("couponValue").value = "";
        showMessage("couponMessage", "✅ تم إضافة الكوبون!");
        loadCouponsAdmin();
    });

    byId("saveShippingBtn")?.addEventListener("click", async () => {
        const state = safeValue("shippingState").trim();
        const price = Number(safeValue("shippingPrice", 0));
        if (!state) { showMessage("shippingMessage", "❌ أدخل اسم الولاية", false); return; }
        await dbAdd('shipping', { state, price, free: safeChecked("shippingFree"), createdAt: new Date().toISOString() });
        byId("shippingState").value = ""; byId("shippingPrice").value = "";
        byId("shippingFree").checked = false;
        showMessage("shippingMessage", "✅ تم إضافة قاعدة الشحن!");
        loadShippingAdmin();
    });
}

document.addEventListener("DOMContentLoaded", function() {
    document.querySelectorAll(".menu-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            document.querySelectorAll(".menu-btn").forEach(b => b.classList.remove("active"));
            this.classList.add("active");
            document.querySelectorAll(".admin-panel").forEach(p => p.classList.remove("active"));
            const target = byId(this.dataset.target);
            if (target) target.classList.add("active");
        });
    });

    setupDropZone('productDropZone', 'productImages', 'productImagePreview', true);
    setupDropZone('slideDropZone', 'slideImageFile', 'slideImagePreview', false);

    loadDesignInputs();
    loadProductsAdmin();
    loadCategoriesAdmin();
    loadSlidesAdmin();
    loadOrdersAdmin();
    loadCouponsAdmin();
    loadShippingAdmin();
    loadCommentsAdmin();
    loadMonthlyProfits();
    setupEventListeners();
});

window.deleteProduct = deleteProduct;
window.deleteCategory = deleteCategory;
window.deleteSlide = deleteSlide;
window.updateOrderStatus = updateOrderStatus;
window.deleteCoupon = deleteCoupon;
window.deleteShipping = deleteShipping;
window.deleteComment = deleteComment;
window.removePreview = removePreview;
