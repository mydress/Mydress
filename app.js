/**
 * ============================================
 * APP.JS - ملف منطق الصفحة الرئيسية
 * يدعم Firebase + Supabase
 * ============================================
 */

console.log("✅ تم تحميل App.js بنجاح");

initDB();

let allProducts = [];
let currentSlideIndex = 0;
let sliderTimer = null;
let cart = JSON.parse(localStorage.getItem('cart')) || [];

function applyStoreSettings() {
    const settings = loadStoreSettings();
    document.documentElement.style.setProperty("--primary-color", settings.primaryColor);
    document.documentElement.style.setProperty("--secondary-color", settings.secondaryColor);
    document.documentElement.style.setProperty("--accent-color", settings.accentColor);
    document.documentElement.style.setProperty("--text-color", settings.textColor);
    const footerText = document.getElementById("footerText");
    if (footerText) footerText.textContent = settings.footerText || "© 2025 MY DRESS - جميع الحقوق محفوظة";
}

/* ===== السلايدر ===== */
function renderSlider(slides) {
    const track = document.getElementById("sliderTrack");
    const dots = document.getElementById("sliderDots");
    if (!track) return;

    if (!slides || !slides.length) {
        slides = [
            { title: "مرحباً بك في MY DRESS", text: "اكتشف أجمل الفساتين للكراء والشراء.", image: "" },
            { title: "عروض خاصة", text: "اطلع على أحدث التخفيضات والعروض.", image: "" }
        ];
    }

    track.innerHTML = slides.map((slide) => {
        const bgStyle = slide.image 
            ? `background-image: url('${slide.image}'); background-size: cover; background-position: center;` 
            : `background: linear-gradient(135deg, #e774b7, #fce4f4);`;
        return `
        <div class="slide" style="${bgStyle}">
            <div class="slide-overlay">
                <div class="slide-content">
                    <h2>${slide.title || ''}</h2>
                    <p>${slide.text || ''}</p>
                </div>
            </div>
        </div>
        `;
    }).join("");

    if (dots) {
        dots.innerHTML = slides.map((_, index) => `
            <span class="dot ${index === 0 ? 'active' : ''}" onclick="goToSlide(${index})"></span>
        `).join("");
    }

    currentSlideIndex = 0;
    updateSliderPosition();
    startAutoSlide();
}

function updateSliderPosition() {
    const track = document.getElementById("sliderTrack");
    const dots = document.querySelectorAll(".dot");
    if (!track) return;
    track.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlideIndex);
    });
}

function goToSlide(index) {
    const track = document.getElementById("sliderTrack");
    if (!track || !track.children.length) return;
    currentSlideIndex = (index + track.children.length) % track.children.length;
    updateSliderPosition();
    resetAutoSlide();
}

function nextSlide() {
    const track = document.getElementById("sliderTrack");
    if (!track || !track.children.length) return;
    currentSlideIndex = (currentSlideIndex + 1) % track.children.length;
    updateSliderPosition();
}

function prevSlide() {
    const track = document.getElementById("sliderTrack");
    if (!track || !track.children.length) return;
    currentSlideIndex = (currentSlideIndex - 1 + track.children.length) % track.children.length;
    updateSliderPosition();
}

function startAutoSlide() {
    if (sliderTimer) clearInterval(sliderTimer);
    sliderTimer = setInterval(nextSlide, 5000);
}

function resetAutoSlide() {
    if (sliderTimer) {
        clearInterval(sliderTimer);
        sliderTimer = setInterval(nextSlide, 5000);
    }
}

/* ===== التصنيفات ===== */
function renderCategories(categories) {
    const grid = document.getElementById("categoriesGrid");
    const filterSelect = document.getElementById("filterCategory");
    if (!grid) return;

    if (!categories || !categories.length) {
        categories = [{ name: "الكل" }, { name: "فساتين سهرة" }, { name: "فساتين زفاف" }, { name: "فساتين عادية" }];
    }

    grid.innerHTML = categories.map(cat => `
        <div class="card category-card" onclick="filterByCategory('${cat.name}')">
            <span class="icon">👗</span>
            <h3>${cat.name}</h3>
        </div>
    `).join("");

    if (filterSelect) {
        filterSelect.innerHTML = '<option value="all">كل التصنيفات</option>' +
            categories.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join("");
    }
}

/* ===== المنتجات ===== */
function renderProducts(products, containerId = "productsGrid") {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!products || !products.length) {
        container.innerHTML = "<p class='small-note'>لا توجد منتجات متاحة حالياً</p>";
        return;
    }

    container.innerHTML = products.map(product => `
        <div class="card product-card">
            <div class="product-image-wrap">
                <img src="${product.images && product.images.length > 0 ? product.images[0] : ''}" alt="${product.name}" loading="lazy" onerror="this.style.display='none'" />
                ${product.isSpecialOffer ? `<span class="badge sale">عرض خاص</span>` : ""}
                ${product.isBestSeller ? `<span class="badge best">الأكثر مبيعاً</span>` : ""}
            </div>
            <div class="card-body">
                <h3>${product.name || ''}</h3>
                <p class="category-tag">${product.category || ''}</p>
                <div class="price-row">
                    ${product.beforeDiscount ? `<span class="old-price">${product.beforeDiscount} دج</span>` : ""}
                    <strong class="current-price">${product.afterDiscount || product.price || 0} دج</strong>
                </div>
                <div class="product-rating">
                    <span class="stars">${getStarRatingHTML(product.averageRating || 0)}</span>
                    <span class="count">(${product.reviewCount || 0})</span>
                </div>
                <div class="card-actions">
                    <button class="add-cart-btn" onclick="addToCart('${product.id}')">
                        <i class="fas fa-cart-plus"></i> أضف إلى السلة
                    </button>
                    <a href="product.html?id=${product.id}">
                        <button class="view-btn">عرض المنتج</button>
                    </a>
                </div>
            </div>
        </div>
    `).join("");
}

function getStarRatingHTML(rating) {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    let html = '';
    for (let i = 0; i < full; i++) html += '★';
    if (half) html += '☆';
    for (let i = 0; i < empty; i++) html += '☆';
    return html || '☆☆☆☆☆';
}

/* ===== التصفية والترتيب ===== */
function filterByCategory(category) {
    const categoryFilter = document.getElementById('filterCategory');
    if (categoryFilter) {
        categoryFilter.value = (category === 'الكل' || category === 'all') ? 'all' : category;
    }
    if (category === 'all' || category === 'الكل') {
        applyFiltersAndSort(allProducts);
    } else {
        const filtered = allProducts.filter(p => p.category === category);
        applyFiltersAndSort(filtered);
    }
}

function applyFiltersAndSort(products) {
    const categoryFilter = document.getElementById('filterCategory');
    const sortSelect = document.getElementById('sortProducts');
    let filtered = [...products];

    if (categoryFilter && categoryFilter.value !== 'all') {
        filtered = filtered.filter(p => p.category === categoryFilter.value);
    }

    if (sortSelect) {
        const sortBy = sortSelect.value;
        switch(sortBy) {
            case 'price-asc':
                filtered.sort((a, b) => (a.afterDiscount || a.price || 0) - (b.afterDiscount || b.price || 0));
                break;
            case 'price-desc':
                filtered.sort((a, b) => (b.afterDiscount || b.price || 0) - (a.afterDiscount || a.price || 0));
                break;
            case 'best-seller':
                filtered = filtered.filter(p => p.isBestSeller);
                break;
            case 'newest':
                filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                break;
        }
    }
    renderProducts(filtered);
}

function setupSearch() {
    const searchInput = document.getElementById("searchInput");
    if (!searchInput) return;
    searchInput.addEventListener("input", function() {
        const term = this.value.trim().toLowerCase();
        if (!term) { applyFiltersAndSort(allProducts); return; }
        const filtered = allProducts.filter(p =>
            (p.name || "").toLowerCase().includes(term) ||
            (p.category || "").toLowerCase().includes(term) ||
            (p.description || "").toLowerCase().includes(term)
        );
        renderProducts(filtered);
    });
}

/* ===== السلة ===== */
function toggleCart() {
    document.getElementById('cartSidebar').classList.toggle('open');
    document.querySelector('.cart-overlay').classList.toggle('open');
}

function openCart() {
    document.getElementById('cartSidebar').classList.add('open');
    document.querySelector('.cart-overlay').classList.add('open');
}

function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    const existing = cart.find(item => item.id === productId);
    if (existing) { existing.quantity += 1; }
    else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.afterDiscount || product.price || 0,
            image: product.images && product.images.length > 0 ? product.images[0] : '',
            quantity: 1
        });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
    showNotification(`تم إضافة ${product.name} إلى السلة!`, 'success');
    openCart();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
    showNotification('تم إزالة المنتج من السلة', 'info');
}

function updateCartUI() {
    const count = document.getElementById('cartCount');
    const items = document.getElementById('cartItems');
    const total = document.getElementById('cartTotal');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (count) count.textContent = totalItems;

    if (items) {
        if (cart.length === 0) {
            items.innerHTML = '<p class="empty-cart">سلة التسوق فارغة</p>';
        } else {
            items.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'" />
                    <div class="item-info">
                        <h4>${item.name}</h4>
                        <div class="item-price">${item.price} دج × ${item.quantity}</div>
                        <span class="remove-item" onclick="removeFromCart('${item.id}')">إزالة</span>
                    </div>
                </div>
            `).join('');
        }
    }

    if (total) {
        const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        total.textContent = `${totalPrice} دج`;
    }
}

function proceedToCheckout() {
    if (cart.length === 0) { showNotification('سلة التسوق فارغة!', 'error'); return; }
    window.location.href = 'checkout.html';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 400);
    }, 3000);
}

/* ===== تسجيل الدخول ===== */
function showAdminLogin() {
    const lockout = checkLockout();
    if (lockout.locked) {
        showNotification(`تم حظر الدخول. حاول بعد ${lockout.remainingMinutes} دقيقة.`, 'error');
        return;
    }
    document.getElementById('adminLoginModal').classList.add('show');
    document.getElementById('adminPasswordInput').value = '';
    document.getElementById('adminLoginError').style.display = 'none';
}

function closeAdminLogin() {
    document.getElementById('adminLoginModal').classList.remove('show');
}

function verifyAdminPassword() {
    const lockout = checkLockout();
    if (lockout.locked) {
        showNotification(`تم حظر الدخول. حاول بعد ${lockout.remainingMinutes} دقيقة.`, 'error');
        return;
    }
    const password = document.getElementById('adminPasswordInput').value;
    const errorDiv = document.getElementById('adminLoginError');
    if (password === ADMIN_PASSWORD) {
        resetSecurity();
        window.location.href = 'admin.html';
    } else {
        const isLocked = recordFailedAttempt();
        if (isLocked) {
            errorDiv.textContent = `❌ تم حظر الدخول لمدة 30 دقيقة بسبب ${SECURITY.MAX_ATTEMPTS} محاولات خاطئة.`;
        } else {
            const attempts = parseInt(localStorage.getItem(SECURITY.ATTEMPTS_KEY) || '0');
            const remaining = SECURITY.MAX_ATTEMPTS - attempts;
            errorDiv.textContent = `❌ كلمة المرور غير صحيحة! محاولات متبقية: ${remaining}`;
        }
        errorDiv.style.display = 'block';
    }
}

window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeAdminLogin();
});

/* ===== تحميل الصفحة ===== */
async function loadHomePage() {
    applyStoreSettings();
    try {
        const products = await dbGetAll('products', 'createdAt', true);
        allProducts = products;

        const categories = await dbGetAll('categories', 'createdAt', true);
        const slides = await dbGetAll('slides', 'createdAt', true);

        renderSlider(slides);
        renderCategories(categories);
        applyFiltersAndSort(allProducts);

        document.getElementById('filterCategory')?.addEventListener('change', () => applyFiltersAndSort(allProducts));
        document.getElementById('sortProducts')?.addEventListener('change', () => applyFiltersAndSort(allProducts));

        updateCartUI();
        setupSearch();
    } catch (error) {
        console.error("خطأ في تحميل الصفحة الرئيسية:", error);
        renderSlider([]);
        renderCategories([]);
        renderProducts([]);
    }
}

document.addEventListener("DOMContentLoaded", loadHomePage);

window.toggleCart = toggleCart;
window.openCart = openCart;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.proceedToCheckout = proceedToCheckout;
window.filterByCategory = filterByCategory;
window.goToSlide = goToSlide;
window.nextSlide = nextSlide;
window.prevSlide = prevSlide;
window.showAdminLogin = showAdminLogin;
window.closeAdminLogin = closeAdminLogin;
window.verifyAdminPassword = verifyAdminPassword;
