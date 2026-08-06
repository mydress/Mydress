/**
 * ============================================
 * PIXEL.JS - تفعيل Facebook Pixel لكل صفحات الموقع
 * يقرأ الإعدادات من facebookPixelConfig في config.js
 * ============================================
 */

(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
})(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

const PIXEL_READY =
    typeof facebookPixelConfig !== "undefined" &&
    facebookPixelConfig.pixelId &&
    facebookPixelConfig.pixelId !== "YOUR_PIXEL_ID_HERE";

if (PIXEL_READY) {
    fbq("init", facebookPixelConfig.pixelId);
    fbq("track", "PageView");
    console.log("✅ Facebook Pixel مفعّل:", facebookPixelConfig.pixelId);
} else {
    console.warn("⚠️ Facebook Pixel: لم يتم إدخال Pixel ID بعد في config.js (facebookPixelConfig.pixelId)");
}

/**
 * دالة موحّدة لإرسال أي حدث قياسي للبيكسل من أي صفحة
 * أمثلة على الاستخدام:
 *   fbTrack('ViewContent', { content_name: product.name, content_ids: [id], value: 1500, currency: 'DZD' });
 *   fbTrack('AddToCart', { content_name: product.name, content_ids: [id], value: 1500, currency: 'DZD' });
 *   fbTrack('InitiateCheckout', { value: 3000, currency: 'DZD', num_items: 2 });
 *   fbTrack('Purchase', { value: 3000, currency: 'DZD' });
 */
function fbTrack(eventName, params) {
    try {
        if (PIXEL_READY && typeof fbq === "function") {
            fbq("track", eventName, params || {});
            console.log("📊 Facebook Pixel event:", eventName, params || {});
        }
    } catch (err) {
        console.error("❌ خطأ في إرسال حدث Facebook Pixel:", err);
    }
}
