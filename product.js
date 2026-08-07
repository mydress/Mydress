/**
 * ============================================
 * PRODUCT.JS - ملف منطق صفحة تفاصيل المنتج
 * يدعم Firebase + Supabase
 * ============================================
 */

console.log("✅ تم تحميل Product.js بنجاح");

initDB();

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

async function loadProduct() {
    const container = document.getElementById("productDetails");
    if (!container || !productId) {
        if (container) container.innerHTML = "<p>المنتج غير موجود</p>";
        return;
    }

    try {
        const product = await dbGetOne('products', productId);
        if (!product) {
            container.innerHTML = "<p>المنتج غير موجود</p>";
            return;
        }

        const images = product.images || [];
        const ratingData = await getProductRating(productId);

        container.innerHTML = `
            <div class="product-layout">
                <div class="product-gallery">
                    <img id="mainProductImage" class="product-main-image" src="${images[0] || ''}" alt="${product.name}" onerror="this.style.display='none'" />
                    <div class="thumbs">
                        ${images.map(img => `<img src="${img}" onclick="changeMainImage('${img}')" onerror="this.style.display='none'" />`).join("")}
                    </div>
                </div>
                <div class="product-info">
                    ${product.isSpecialOffer ? `<span class="badge sale">عرض خاص</span>` : ""}
                    ${product.isBestSeller ? `<span class="badge best">الأكثر مبيعاً</span>` : ""}
                    <h1>${product.name}</h1>
                    <div class="product-rating-detail">
                        <span class="stars">${getStarRatingHTML(ratingData.average)}</span>
                        <span class="rating-text">${ratingData.average.toFixed(1)}</span>
                        <span class="rating-count">(${ratingData.count} تقييمات)</span>
                    </div>
                    <p class="description">${product.description}</p>
                    <div class="price-row">
                        ${product.beforeDiscount ? `<span class="old-price">${product.beforeDiscount} دج</span>` : ""}
                        <strong class="current-price">${product.afterDiscount || product.price || 0} دج</strong>
                    </div>
                    <div class="details-grid">
                        <span><strong>النوع:</strong> ${product.mode === "rent" ? "🔁 كراء" : "🛒 شراء"}</span>
                        <span><strong>المخزون:</strong> ${product.stock || 0}</span>
                        <span><strong>الألوان:</strong> ${product.colors || "-"}</span>
                        <span><strong>المقاسات:</strong> ${product.sizes || "-"}</span>
                        <span><strong>التصنيف:</strong> ${product.category || "-"}</span>
                    </div>
                    <button class="checkout-btn" onclick="addToCartAndCheckout('${productId}')">
                        <i class="fas fa-shopping-cart"></i> أضف إلى السلة وادفع
                    </button>
                </div>
            </div>
        `;

        loadComments();
    } catch (error) {
        console.error("خطأ في تحميل المنتج:", error);
        container.innerHTML = "<p>خطأ في تحميل المنتج</p>";
    }
}

function changeMainImage(img) {
    const main = document.getElementById("mainProductImage");
    if (main) main.src = img;
}

function addToCartAndCheckout(productId) {
    window.location.href = `checkout.html?id=${productId}`;
}

async function getProductRating(productId) {
    try {
        const comments = await dbQuery('comments', 'productId', productId);
        if (!comments || !comments.length) return { average: 0, count: 0 };
        const total = comments.reduce((sum, c) => sum + (c.rating || 0), 0);
        return { average: total / comments.length, count: comments.length };
    } catch (error) {
        return { average: 0, count: 0 };
    }
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

async function loadComments() {
    const section = document.getElementById("commentsSection");
    if (!section) return;

    try {
        const comments = await dbQuery('comments', 'productId', productId);
        const ratingData = await getProductRating(productId);

        section.innerHTML = `
            <h2 class="section-title">آراء العملاء</h2>
            <div class="product-rating-detail" style="margin-bottom:20px;">
                <span class="stars" style="font-size:28px;">${getStarRatingHTML(ratingData.average)}</span>
                <span class="rating-text" style="font-size:22px;">${ratingData.average.toFixed(1)}</span>
                <span class="rating-count">(${ratingData.count} تقييمات)</span>
            </div>
            <div class="comments-grid">
                ${(comments || []).map(c => `
                    <div class="comment-card">
                        <div class="comment-header">
                            <h4>${c.name || 'مجهول'}</h4>
                            <span class="stars">${getStarRatingHTML(c.rating || 0)}</span>
                        </div>
                        <p class="comment-text">${c.text}</p>
                        <p class="comment-date">${c.createdAt ? new Date(c.createdAt).toLocaleDateString('ar-EG') : ''}</p>
                    </div>
                `).join("")}
                ${(!comments || !comments.length) ? "<p class='small-note'>لا توجد تقييمات بعد. كن أول من يقيم!</p>" : ""}
            </div>
            <div class="rating-input-section">
                <h3>اكتب تقييمك</h3>
                <div class="form-group">
                    <label>اسمك</label>
                    <input type="text" id="commentName" placeholder="أدخل اسمك" />
                </div>
                <div class="form-group">
                    <label>التقييم</label>
                    <div class="star-rating-input">
                        <input type="radio" name="rating" id="star5" value="5"><label for="star5">★</label>
                        <input type="radio" name="rating" id="star4" value="4"><label for="star4">★</label>
                        <input type="radio" name="rating" id="star3" value="3"><label for="star3">★</label>
                        <input type="radio" name="rating" id="star2" value="2"><label for="star2">★</label>
                        <input type="radio" name="rating" id="star1" value="1"><label for="star1">★</label>
                    </div>
                </div>
                <div class="form-group">
                    <label>التعليق</label>
                    <textarea id="commentText" rows="3" placeholder="اكتب رأيك عن المنتج..."></textarea>
                </div>
                <button onclick="addComment()" class="save-btn">إرسال التقييم</button>
            </div>
        `;
    } catch (error) {
        console.error("خطأ في تحميل التعليقات:", error);
    }
}

async function addComment() {
    const name = document.getElementById("commentName").value.trim();
    const text = document.getElementById("commentText").value.trim();
    const ratingInput = document.querySelector('input[name="rating"]:checked');
    const rating = ratingInput ? parseInt(ratingInput.value) : 0;

    if (!name) { alert("يرجى إدخال اسمك"); return; }
    if (!text) { alert("يرجى كتابة تعليقك"); return; }
    if (!rating) { alert("يرجى اختيار تقييم"); return; }

    try {
        await dbAdd('comments', {
            productId,
            name,
            text,
            rating,
            createdAt: new Date().toISOString()
        });

        document.getElementById("commentName").value = "";
        document.getElementById("commentText").value = "";
        document.querySelectorAll('input[name="rating"]').forEach(i => i.checked = false);

        alert("✅ تم إرسال التقييم بنجاح!");
        loadComments();
        loadProduct();
    } catch (error) {
        console.error("خطأ في إضافة التعليق:", error);
        alert("❌ خطأ في إرسال التقييم");
    }
}

document.addEventListener("DOMContentLoaded", loadProduct);

window.changeMainImage = changeMainImage;
window.addComment = addComment;
window.addToCartAndCheckout = addToCartAndCheckout;
