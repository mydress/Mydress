/**
 * ============================================
 * CHECKOUT.JS - ملف منطق صفحة الدفع
 * يدعم Firebase + Supabase
 * ============================================
 */

console.log("✅ تم تحميل Checkout.js بنجاح");

initDB();

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

function getCartItems() {
    try { return JSON.parse(localStorage.getItem('cart')) || []; }
    catch (error) { return []; }
}

function cartTotal(cart) {
    return cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
}

async function loadCheckoutProduct() {
    const info = document.getElementById("checkoutProductInfo");
    const stateSelect = document.getElementById("state");

    // تحميل الولايات من قاعدة البيانات (shipping collection)
    if (stateSelect) {
        try {
            const shippingRules = await dbGetAll('shipping');
            const states = (shippingRules || []).map(s => s.state).filter(Boolean);
            if (states.length === 0) {
                stateSelect.innerHTML = `<option value="">لا توجد ولايات متاحة</option>`;
            } else {
                stateSelect.innerHTML = `<option value="">اختر الولاية</option>` +
                    states.map(s => `<option value="${s}">${s}</option>`).join("");
            }
        } catch (err) {
            console.error("خطأ في تحميل الولايات:", err);
            stateSelect.innerHTML = `<option value="">خطأ في تحميل الولايات</option>`;
        }
    }

    if (!info) return;

    if (productId) {
        try {
            const product = await dbGetOne('products', productId);
            if (!product) {
                info.innerHTML = "<p>المنتج غير موجود</p>";
                return;
            }
            const finalPrice = product.afterDiscount || product.price || 0;

            // 📊 Facebook Pixel: InitiateCheckout
            fbTrack('InitiateCheckout', {
                value: finalPrice,
                currency: 'DZD',
                num_items: 1,
                content_ids: [productId]
            });

            info.innerHTML = `
                <div class="card">
                    <h3>${product.name}</h3>
                    <p>${product.description}</p>
                    <p><strong>السعر:</strong> ${finalPrice} دج</p>
                    <p><strong>النوع:</strong> ${product.mode === "rent" ? "كراء" : "شراء"}</p>
                </div>
            `;
        } catch (error) {
            console.error("خطأ في تحميل منتج الدفع:", error);
        }
        return;
    }

    const cart = getCartItems();
    if (!cart.length) {
        info.innerHTML = `<p>سلة التسوق فارغة. <a href="index.html">العودة إلى المتجر</a></p>`;
        return;
    }
    const subtotal = cartTotal(cart);

    // 📊 Facebook Pixel: InitiateCheckout
    fbTrack('InitiateCheckout', {
        value: subtotal,
        currency: 'DZD',
        num_items: cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0),
        content_ids: cart.map(i => i.id)
    });

    info.innerHTML = `
        <div class="card">
            <h3>ملخص الطلب</h3>
            ${cart.map(item => `
                <p style="display:flex;justify-content:space-between;">
                    <span>${item.name} × ${item.quantity}</span>
                    <strong>${item.price * item.quantity} دج</strong>
                </p>
            `).join("")}
            <hr style="margin:10px 0;" />
            <p style="display:flex;justify-content:space-between;"><strong>المجموع</strong><strong>${subtotal} دج</strong></p>
        </div>
    `;
}

async function getShippingPrice(state) {
    try {
        const items = await dbQuery('shipping', 'state', state);
        if (!items || !items.length) return 0;
        const shipping = items[0];
        return shipping.free ? 0 : Number(shipping.price || 0);
    } catch (error) {
        return 0;
    }
}

async function applyCoupon(code, total) {
    try {
        const items = await dbQuery('coupons', 'code', code.toUpperCase());
        if (!items || !items.length) return { discount: 0, finalTotal: total };
        const coupon = items[0];
        const discount = Number(coupon.value || 0);
        return { discount, finalTotal: Math.max(total - discount, 0) };
    } catch (error) {
        return { discount: 0, finalTotal: total };
    }
}

document.getElementById("checkoutForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const btn = this.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

    try {
        const state = document.getElementById("state").value;
        if (!state) {
            alert("يرجى اختيار الولاية");
            btn.disabled = false;
            btn.innerHTML = 'تأكيد الطلب';
            return;
        }

        let basePrice, productName, orderItems = null, cartToClear = false;

        if (productId) {
            const product = await dbGetOne('products', productId);
            if (!product) {
                btn.disabled = false;
                btn.innerHTML = 'تأكيد الطلب';
                return;
            }
            basePrice = Number(product.afterDiscount || product.price || 0);
            productName = product.name;
        } else {
            const cart = getCartItems();
            if (!cart.length) {
                alert("سلة التسوق فارغة");
                btn.disabled = false;
                btn.innerHTML = 'تأكيد الطلب';
                return;
            }
            basePrice = cartTotal(cart);
            productName = cart.map(i => `${i.name} x${i.quantity}`).join(', ');
            orderItems = cart.map(i => ({
                productId: i.id, productName: i.name, price: i.price, quantity: i.quantity
            }));
            cartToClear = true;
        }

        const shippingPrice = await getShippingPrice(state);
        const couponCode = document.getElementById("couponCode").value.trim();
        const couponResult = couponCode ?
            await applyCoupon(couponCode, basePrice + shippingPrice) :
            { discount: 0, finalTotal: basePrice + shippingPrice };

        const now = new Date();

        const orderData = {
            productId: productId || '',
            productName: productName,
            ...(orderItems ? { items: orderItems } : {}),
            fullName: document.getElementById("fullName").value,
            phone: document.getElementById("phone").value,
            email: document.getElementById("email").value || '',
            orderType: document.getElementById("orderType").value,
            state: state,
            deliveryMethod: document.getElementById("deliveryMethod").value,
            address: document.getElementById("address").value,
            note: document.getElementById("note").value || '',
            paymentMethod: document.getElementById("paymentMethod").value,
            transactionNumber: document.getElementById("transactionNumber").value || '',
            couponCode: couponCode || '',
            shippingPrice: shippingPrice,
            discount: couponResult.discount,
            total: couponResult.finalTotal,
            status: "pending",
            createdAt: now.toISOString(),
            orderDate: now.toLocaleDateString('ar-EG', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            })
        };

        // 1. حفظ في قاعدة البيانات
        await dbAdd('orders', orderData);
        console.log("✅ تم حفظ الطلب في قاعدة البيانات");

        // 📊 Facebook Pixel: Purchase (أهم حدث لقياس عائد الإعلانات)
        fbTrack('Purchase', {
            value: orderData.total,
            currency: 'DZD',
            content_name: orderData.productName,
            content_ids: orderItems ? orderItems.map(i => i.productId) : [orderData.productId],
            num_items: orderItems ? orderItems.reduce((s, i) => s + Number(i.quantity || 1), 0) : 1
        });

        // 2. إرسال إلى Google Sheets
        try {
            if (googleSheetsUrl) {
                await fetch(googleSheetsUrl, {
                    method: "POST",
                    mode: "no-cors",
                    headers: { "Content-Type": "text/plain;charset=utf-8" },
                    body: JSON.stringify(orderData)
                });
                console.log("✅ تم إرسال الطلب إلى Google Sheets");
            }
        } catch (error) {
            console.error("❌ خطأ في Google Sheets:", error);
        }

        // 3. إرسال إيميل تأكيد عبر EmailJS
        try {
            if (typeof emailjs !== "undefined") {
                emailjs.init(emailjsConfig.publicKey);
                const templateParams = {
                    fullName: orderData.fullName,
                    phone: orderData.phone,
                    email: orderData.email,
                    productName: orderData.productName,
                    total: orderData.total + ' دج',
                    state: orderData.state,
                    address: orderData.address,
                    orderType: orderData.orderType,
                    paymentMethod: orderData.paymentMethod,
                    transactionNumber: orderData.transactionNumber || 'N/A',
                    couponCode: orderData.couponCode || 'لا يوجد',
                    note: orderData.note || 'لا توجد ملاحظات',
                    status: orderData.status,
                    orderDate: orderData.orderDate,
                    shippingPrice: orderData.shippingPrice + ' دج',
                    discount: orderData.discount + ' دج'
                };
                await emailjs.send(emailjsConfig.serviceId, emailjsConfig.templateId, templateParams);
                console.log("✅ تم إرسال الإيميل");
            }
        } catch (error) {
            console.error("❌ خطأ في EmailJS:", error);
        }

        document.getElementById("checkoutResult").innerHTML = `
            <div class="card animate-in" style="background:rgba(40,167,69,0.12);border:1px solid #28a745;padding:24px;margin-top:20px;">
                <h3 style="color:#4ade80;">✅ تم إرسال الطلب بنجاح!</h3>
                <p><strong>التاريخ:</strong> ${orderData.orderDate}</p>
                <p><strong>المجموع:</strong> ${orderData.total} دج</p>
                <p><strong>الحالة:</strong> قيد الانتظار</p>
                <a href="index.html"><button style="margin-top:15px;background:linear-gradient(120deg,var(--primary-color),#8fd8ff);color:#ffffff;border:none;padding:12px 30px;border-radius:100px;cursor:pointer;font-weight:700;">🏠 العودة إلى المتجر</button></a>
            </div>
        `;

        this.reset();
        document.getElementById("checkoutProductInfo").innerHTML = '';

        if (cartToClear) {
            localStorage.removeItem('cart');
        }

    } catch (error) {
        console.error("❌ خطأ:", error);
        document.getElementById("checkoutResult").innerHTML = `
            <div class="card animate-in" style="background:rgba(220,53,69,0.12);border:1px solid #dc3545;padding:24px;margin-top:20px;">
                <p style="color:#ff6b6b;">❌ فشل إرسال الطلب. يرجى المحاولة مرة أخرى.</p>
                <p style="font-size:14px;color:var(--muted);">${error.message}</p>
            </div>
        `;
    }

    btn.disabled = false;
    btn.innerHTML = 'تأكيد الطلب';
});

document.addEventListener("DOMContentLoaded", loadCheckoutProduct);
