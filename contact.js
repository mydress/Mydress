/**
 * ============================================
 * CONTACT.JS - ملف منطق صفحة التواصل
 * ============================================
 */

console.log("✅ تم تحميل Contact.js بنجاح");

initDB();

document.getElementById("contactForm")?.addEventListener("submit", async function(e) {
    e.preventDefault();

    const btn = this.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

    try {
        const messageData = {
            name: document.getElementById("contactName").value.trim(),
            phone: document.getElementById("contactPhone").value.trim(),
            email: document.getElementById("contactEmail").value.trim(),
            subject: document.getElementById("contactSubject").value,
            message: document.getElementById("contactMessage").value.trim(),
            createdAt: new Date().toISOString(),
            status: "unread"
        };

        if (!messageData.name || !messageData.email || !messageData.message) {
            showContactResult("❌ يرجى ملء جميع الحقول المطلوبة", false);
            btn.disabled = false;
            btn.innerHTML = originalText;
            return;
        }

        // حفظ في قاعدة البيانات
        await dbAdd('messages', messageData);
        console.log("✅ تم حفظ الرسالة في قاعدة البيانات");

        // إرسال إيميل عبر EmailJS
        try {
            if (typeof emailjs !== "undefined") {
                emailjs.init(emailjsConfig.publicKey);
                await emailjs.send(emailjsConfig.serviceId, emailjsConfig.templateId, {
                    fullName: messageData.name,
                    phone: messageData.phone || 'غير محدد',
                    email: messageData.email,
                    productName: 'رسالة تواصل - ' + messageData.subject,
                    total: '0 دج',
                    state: 'غير محدد',
                    address: 'غير محدد',
                    orderType: 'رسالة تواصل',
                    paymentMethod: 'غير محدد',
                    transactionNumber: 'N/A',
                    couponCode: 'لا يوجد',
                    note: messageData.message,
                    status: 'رسالة جديدة',
                    orderDate: new Date().toLocaleDateString('ar-EG'),
                    shippingPrice: '0 دج',
                    discount: '0 دج'
                });
                console.log("✅ تم إرسال الإيميل");
            }
        } catch (emailErr) {
            console.error("❌ خطأ في EmailJS:", emailErr);
        }

        showContactResult("✅ تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.", true);
        this.reset();

    } catch (error) {
        console.error("❌ خطأ:", error);
        showContactResult("❌ فشل إرسال الرسالة. يرجى المحاولة مرة أخرى.", false);
    }

    btn.disabled = false;
    btn.innerHTML = originalText;
});

function showContactResult(text, isSuccess) {
    const result = document.getElementById("contactResult");
    if (!result) return;
    result.textContent = text;
    result.style.display = "block";
    result.style.color = isSuccess ? "#12813a" : "#dc3545";
    result.style.background = isSuccess ? "#eaf8ef" : "#ffecec";
    result.style.border = isSuccess ? "1px solid #12813a" : "1px solid #dc3545";
    setTimeout(() => { result.style.display = "none"; }, 6000);
}
