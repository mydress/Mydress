# TECH GLASS - متجر إكسسوارات هواتف إلكتروني (ثيم Liquid Glass 🧡🖤)

## 📁 هيكل المشروع

```
tech-glass/
├── index.html          # الصفحة الرئيسية
├── admin.html          # لوحة التحكم
├── checkout.html       # صفحة الدفع
├── product.html        # صفحة تفاصيل المنتج
├── style.css           # التنسيقات (بدون border-radius)
├── config.js           # الإعدادات + نظام DB موحد (Firebase/Supabase)
├── app.js              # منطق المتجر
├── admin.js            # منطق لوحة التحكم
├── checkout.js         # منطق الدفع
└── product.js          # منطق صفحة المنتج
```

## ✅ ما تم إصلاحه

### 1. البطاقات بدون Border Radius
- تم تغيير `--radius: 0px` في `style.css`
- جميع البطاقات والمنتجات والأزرار بزوايا حادة

### 2. الكاتيقوريس تعمل
- عند الضغط على تصنيف، يتم تحديث الفلتر وعرض المنتجات
- `filterByCategory` يزامن قائمة التصفية مع الـ select box

### 3. الولايات من الداش بورد
- تم إزالة قائمة الولايات الثابتة
- الولايات تُحمل ديناميكياً من جدول `shipping` في قاعدة البيانات
- عند إضافة/حذف ولاية من الداش بورد، تظهر/تختفي في صفحة الدفع

### 4. صور السلايدر
- تم إصلاح `renderSlider` لاستخدام `slide.image` كـ `background-image`
- الصورة تظهر بشكل صحيح مع النص

### 5. الطلبات كـ Cards
- كل طلب يظهر كـ Card مستقل مع:
  - لون حالة الطلب (أصفر=معلق، أخضر=مكتمل، أحمر=مرفوض، برتقالي=مرتجع)
  - قائمة منسدلة لتغيير الحالة
  - معلومات العميل والمنتج والعنوان

### 6. Google Sheets + EmailJS
- عند تأكيد الطلب يُرسل لـ 3 جهات:
  1. قاعدة البيانات (Firebase/Supabase)
  2. Google Sheets
  3. EmailJS (إيميل تأكيد)

### 7. Supabase + Cloudinary
- **نظام DB موحد**: يدعم Firebase (افتراضي) و Supabase (اختياري)
- **Cloudinary**: رفع الصور (كما كان)
- لتفعيل Supabase: غيّر `supabaseConfig` في `config.js`

### 8. الأرباح كـ Calendar
- يعرض لكل شهر:
  - **الإجمالي**: مجموع المبيعات
  - **هامش الربح (30%)**: تلقائي
  - **المبلغ المدفوع**: الإجمالي - هامش الربح
  - **جدول الطلبات**: أسماء العملاء، أرقام الهواتف، المنتجات، المبالغ

### 9. Responsive Design
- يعمل على الهواتف (أقل من 480px)
- يعمل على الأجهزة اللوحية (أقل من 768px)
- يعمل على الشاشات الكبيرة

---

## ⚙️ الإعدادات

### Firebase (يعمل فوراً - كما كان)
- الإعدادات موجودة في `config.js` ومهيأة
- لا يحتاج أي تعديل

### Supabase (اختياري - إذا تبي تستخدمه)
1. اذهب إلى [supabase.com](https://supabase.com)
2. أنشئ مشروع جديد
3. اذهب إلى Project Settings → API
4. انسخ `URL` و `anon key`
5. غيّر في `config.js`:
```javascript
const supabaseConfig = {
    url: "https://your-project.supabase.co",
    anonKey: "your-anon-key"
};
```
6. أنشئ الجداول: `products`, `categories`, `slides`, `orders`, `coupons`, `shipping`, `comments`
7. فعّل RLS واضف سياسة `Enable all` لكل جدول

### Cloudinary
- `cloudName` و `uploadPreset` موجودان في `config.js`

### EmailJS
- `publicKey`, `serviceId`, `templateId` موجودان في `config.js`

### Google Sheets
- `googleSheetsUrl` موجود في `config.js`

---

## 🔐 الحماية
- كلمة مرور لوحة التحكم: `admin123` (غيّرها في `config.js`)
- إذا أخطأت 5 مرات → حظر 30 دقيقة
- يتم حفظ المحاولات في `localStorage`

## 📱 المميزات
- ✅ سلة تسوق كاملة
- ✅ بحث وفلترة المنتجات
- ✅ نظام تقييم وتعليقات
- ✅ كوبونات خصم
- ✅ أسعار شحن حسب الولاية (ديناميكية)
- ✅ إحصائيات وأرباح شهرية مفصلة
- ✅ رفع صور عبر Cloudinary
- ✅ إشعارات فورية
- ✅ تصميم متجاوب (Responsive)
- ✅ ربط بـ Google Sheets + EmailJS
- ✅ يدعم Firebase + Supabase
