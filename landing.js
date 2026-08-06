/**
 * ============================================
 * LANDING.JS - Landing Page Viewer
 * Liquid Glass Product Unveil + Supports Firebase + Supabase
 * ============================================
 */

console.log("✅ Landing.js loaded successfully");

initDB();

const params = new URLSearchParams(window.location.search);
const productId = params.get("productId");

let currentProduct = null;

/* ===== Scroll reveal (self-contained, landing.js does not load app.js) ===== */
function initLandingScrollReveal() {
    const items = document.querySelectorAll('[data-reveal]');
    if (!items.length) return;
    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });
    items.forEach(el => io.observe(el));
}

/* ===== Animated number count-up ===== */
function animateCount(el, target, duration = 900) {
    if (!el) return;
    const start = 0;
    const startTime = performance.now();
    function tick(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(start + (target - start) * eased).toLocaleString('ar-DZ');
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

/* ===== Lift the reveal veil once the hero image is ready ===== */
function unveilHero(price) {
    const veil = document.getElementById("landingRevealVeil");
    const heroBg = document.getElementById("landingHeroBg");
    const heroContent = document.getElementById("landingHeroContent");

    heroBg.classList.add("revealed");
    if (veil) veil.classList.add("hidden");
    if (heroContent) heroContent.classList.add("revealed");

    const priceEl = document.getElementById("landingPriceValue");
    if (priceEl && price) {
        setTimeout(() => animateCount(priceEl, Number(price) || 0, 1000), 500);
    }
}

async function loadLandingPage() {
    if (!productId) {
        document.getElementById("landingBody").innerHTML = "<p>المنتج غير محدد</p>";
        unveilHero(0);
        return;
    }

    try {
        const [product, landings] = await Promise.all([
            dbGetOne('products', productId),
            dbGetAll('landings', 'createdAt', true)
        ]);

        if (!product) {
            document.getElementById("landingBody").innerHTML = "<p>المنتج غير موجود</p>";
            unveilHero(0);
            return;
        }

        currentProduct = product;
        const landing = landings.find(l => l.productId === productId);

        if (!landing) {
            // Redirect to product page if no landing page exists
            window.location.href = `product.html?id=${productId}`;
            return;
        }

        const finalPrice = product.afterDiscount || product.price || 0;

        // Set hero content
        document.getElementById("landingTitle").textContent = landing.title || product.name;
        document.getElementById("landingSubtitle").textContent = landing.subtitle || product.description;

        const heroBg = document.getElementById("landingHeroBg");
        const heroImage = landing.bgImage || (product.images && product.images.length > 0 ? product.images[0] : "");
        if (heroImage) {
            heroBg.style.backgroundImage = `url('${heroImage}')`;
        }

        // Kicker badge (best seller / special offer / generic launch tag)
        const kicker = document.getElementById("landingKicker");
        if (product.isBestSeller) {
            kicker.innerHTML = `<i class="fas fa-fire"></i> الأكثر مبيعاً`;
        } else if (product.isSpecialOffer) {
            kicker.innerHTML = `<i class="fas fa-tag"></i> عرض خاص`;
        } else {
            kicker.innerHTML = `<i class="fas fa-bolt"></i> إطلاق جديد`;
        }

        // Price badge
        const priceBadge = document.getElementById("landingPriceBadge");
        priceBadge.style.display = "flex";

        // CTA
        const ctaBtn = document.getElementById("landingCtaBtn");
        ctaBtn.style.display = "inline-block";
        ctaBtn.textContent = landing.btnText || "اشترِ الآن";
        ctaBtn.onclick = (e) => { e.preventDefault(); buyProduct(); };
        if (landing.btnColor) {
            ctaBtn.style.background = landing.btnColor;
        }

        // Gallery (extra product images, excluding the hero image)
        const gallery = (product.images || []).filter(img => img && img !== heroImage);

        // Body content
        document.getElementById("landingBody").innerHTML = `
            <div class="glass-card animate-in" style="padding: 3rem;">
                ${landing.content || '<p>لا يوجد محتوى</p>'}
            </div>

            <div class="glass-card" data-reveal style="padding: 2rem;">
                <h3 class="landing-section-title"><i class="fas fa-box"></i> تفاصيل المنتج</h3>
                <div class="details-grid">
                    <span><strong>السعر:</strong> ${finalPrice} دج</span>
                    <span><strong>التصنيف:</strong> ${product.category || '-'}</span>
                    <span><strong>التوافق:</strong> ${product.compatibility || 'جميع الأجهزة'}</span>
                    <span><strong>الضمان:</strong> ${product.warranty || 'سنة'}</span>
                </div>
            </div>

            ${gallery.length ? `
            <div data-reveal>
                <h3 class="landing-section-title"><i class="fas fa-images"></i> صور إضافية</h3>
                <div class="landing-gallery">
                    ${gallery.map(img => `<img src="${img}" alt="${product.name}" loading="lazy" onerror="this.style.display='none'" />`).join("")}
                </div>
            </div>` : ""}

            <div data-reveal>
                <h3 class="landing-section-title"><i class="fas fa-star"></i> لماذا تختار هذا المنتج؟</h3>
                <div class="landing-features-grid">
                    <div class="card landing-feature-card"><i class="fas fa-truck"></i><h4>توصيل سريع</h4><p>لجميع ولايات الوطن</p></div>
                    <div class="card landing-feature-card"><i class="fas fa-shield-alt"></i><h4>جودة مضمونة</h4><p>${product.warranty ? 'ضمان ' + product.warranty : 'ضمان لمدة سنة'}</p></div>
                    <div class="card landing-feature-card"><i class="fas fa-money-bill-wave"></i><h4>دفع مرن</h4><p>عند الاستلام أو ببطاقة بنكية</p></div>
                    <div class="card landing-feature-card"><i class="fas fa-headset"></i><h4>دعم فوري</h4><p>فريقنا جاهز لمساعدتك دائماً</p></div>
                </div>
            </div>
        `;

        // Setup sticky CTA bar
        document.getElementById("productName").textContent = product.name;
        document.getElementById("productPrice").textContent = `${finalPrice} دج`;
        document.getElementById("buyBtnText").textContent = landing.btnText || "اشترِ الآن";

        // Reveal the hero once the background image is ready (or immediately if none)
        if (heroImage) {
            const preload = new Image();
            preload.onload = () => unveilHero(finalPrice);
            preload.onerror = () => unveilHero(finalPrice);
            preload.src = heroImage;
        } else {
            unveilHero(finalPrice);
        }

        initLandingScrollReveal();
        setupCtaBarScrollTrigger();

    } catch (error) {
        console.error("Error loading landing page:", error);
        document.getElementById("landingBody").innerHTML = "<p>خطأ في تحميل الصفحة</p>";
        unveilHero(0);
    }
}

/* Show the sticky glass CTA bar once the hero has scrolled out of view */
function setupCtaBarScrollTrigger() {
    const hero = document.getElementById("landingHero");
    const bar = document.getElementById("landingCtaBar");
    if (!hero || !bar) return;
    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            bar.classList.toggle('show', !entry.isIntersecting);
        });
    }, { threshold: 0.1 });
    io.observe(hero);
}

function buyProduct() {
    if (!currentProduct) return;
    window.location.href = `checkout.html?id=${productId}`;
}

document.addEventListener("DOMContentLoaded", loadLandingPage);

window.buyProduct = buyProduct;
