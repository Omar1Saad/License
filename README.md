# License Server - نظام إدارة التراخيص

نظام إدارة التراخيص لتطبيق إدارة درجات الطلبة، مصمم للعمل مع Electron والويب.

## 🚀 النشر على Render

### المتطلبات:
- حساب Render مجاني أو مدفوع
- مستودع Git يحتوي على الكود

### خطوات النشر:

1. **إنشاء مستودع Git:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/license-server.git
   git push -u origin main
   ```

2. **النشر على Render:**
   - اذهب إلى [render.com](https://render.com)
   - سجل دخول أو أنشئ حساب
   - انقر على "New +" ثم "Web Service"
   - اربط المستودع
   - استخدم الإعدادات التالية:
     - **Name:** license-server
     - **Environment:** Node
     - **Build Command:** `npm install`
     - **Start Command:** `npm start`
     - **Root Directory:** `license-server`

3. **إعداد متغيرات البيئة:**
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (سيتم تعيينه تلقائياً)
   - `JWT_SECRET`: (مفتاح عشوائي آمن)
   - `ADMIN_USERNAME`: `admin`
   - `ADMIN_PASSWORD`: (كلمة مرور قوية)
   - `ENCRYPTION_KEY`: (مفتاح تشفير 32 حرف)
   - `ADMIN_PANEL_URL`: `https://your-admin-panel.vercel.app`

## 🔧 التطوير المحلي

### التثبيت:
```bash
npm install
```

### التشغيل:
```bash
# وضع التطوير
npm run dev

# وضع الإنتاج
npm start
```

### متغيرات البيئة:
انسخ `.env.example` إلى `.env` وحدث القيم:
```bash
cp .env.example .env
```

## 📡 API Endpoints

### التحقق من الترخيص:
```http
POST /api/licenses/validate
Content-Type: application/json

{
  "license_key": "YOUR_LICENSE_KEY",
  "machine_id": "MACHINE_ID"
}
```

### إنشاء ترخيص (Admin):
```http
POST /api/admin/licenses
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "user_email": "user@example.com",
  "user_name": "User Name",
  "notes": "Optional notes"
}
```

### تسجيل دخول Admin:
```http
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

## 🗄️ قاعدة البيانات

يستخدم SQLite كقاعدة بيانات محلية. الملفات:
- `database/licenses.db` - قاعدة البيانات الرئيسية
- `src/models/database.js` - نماذج قاعدة البيانات

## 🔒 الأمان

- تشفير كلمات المرور باستخدام bcrypt
- JWT للتحقق من هوية Admin
- CORS محدود للمصادر المسموحة
- Helmet للحماية الأساسية

## 📊 المراقبة

### Health Check:
```http
GET /health
```

### السجلات:
جميع العمليات مسجلة في console مع timestamps.

## 🌐 CORS

المصادر المسموحة:
- `http://localhost:3002` (تطوير محلي)
- `https://your-admin-panel.vercel.app` (لوحة الإدارة)
- متغير البيئة `ADMIN_PANEL_URL`

## 🔄 التحديثات

للتحديث على Render:
```bash
git add .
git commit -m "Update license server"
git push origin main
```

سيتم النشر التلقائي إذا كان `autoDeploy` مفعل.

## 📞 الدعم

للحصول على المساعدة:
1. تحقق من سجلات Render
2. اختبر `/health` endpoint
3. تحقق من متغيرات البيئة
4. راجع سجلات التطبيق

---

**تم إعداد النظام للنشر على Render بنجاح!** 🎉