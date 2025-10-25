# ⚡ حل سريع لمشكلة CORS

## المشكلة:
```
CORS Missing Allow Origin
Cross-Origin Request Blocked
```

## الحل السريع:

### 1. تم تحديث خادم الترخيص:
- ✅ إضافة دعم لجميع تطبيقات Vercel (`*.vercel.app`)
- ✅ إضافة رابط Vercel المحدد
- ✅ دعم Wildcard patterns
- ✅ إضافة سجلات التشخيص

### 2. إعادة نشر الخادم:
```bash
cd license-server
git add .
git commit -m "Fix CORS for Vercel"
git push origin main
```

### 3. انتظار النشر:
- انتظر 2-3 دقائق حتى يكتمل النشر على Render
- تحقق من السجلات للتأكد من التحديث

## 🔍 اختبار سريع:

### اختبار CORS:
```bash
curl -H "Origin: https://your-app.vercel.app" \
     -X OPTIONS \
     https://license-y64y.onrender.com/api/admin/login
```

### اختبار تسجيل الدخول:
```bash
curl -X POST https://license-y64y.onrender.com/api/admin/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://your-app.vercel.app" \
  -d '{"username": "admin", "password": "admin123"}'
```

## ✅ تم الإصلاح!

الآن يجب أن يعمل الاتصال من Vercel إلى Render بدون مشاكل.

## 🔑 بيانات تسجيل الدخول:
- **Username:** `admin`
- **Password:** `admin123`

---

**جرب تسجيل الدخول في لوحة الإدارة!** 🎉
