/* =====================================================
   storage.js  —  طبقة البيانات المشتركة لكل الصفحات
   تُحمَّل في كل صفحة قبل أي ملف JS آخر:
   <script src="js/storage.js"></script>
   ===================================================== */

/* مفاتيح LocalStorage: كل مفتاح يشبه "جدول" في قاعدة بيانات.
   نضعها في object واحد حتى لا نكتب النص بشكل خاطئ في مكان ما. */
const KEYS = {
  users: "linkhub_users",
  session: "linkhub_session",
  links: "linkhub_links",
  products: "linkhub_products",
  posts: "linkhub_posts",
  orders: "linkhub_orders", // عمليات الشراء (محاكاة) في المتجر
};

/* -----------------------------------------------------
   1) دوال أساسية: القراءة والكتابة
   LocalStorage يحفظ نصوصاً فقط (strings)،
   لذلك نحوّل: object -> نص بـ JSON.stringify عند الحفظ
              نص -> object بـ JSON.parse عند القراءة
   ----------------------------------------------------- */
function readData(key, fallback) {
  // fallback: القيمة التي نرجعها إذا لم يوجد شيء محفوظ بعد
  try {
    const raw = localStorage.getItem(key); // يرجع null إذا المفتاح غير موجود
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    // إذا كانت البيانات تالفة لا نكسر الموقع
    console.error("Storage read error:", error);
    return fallback;
  }
}

/* ترجع true إذا نجح الحفظ و false إذا فشل.
   سبب الفشل الأشهر: LocalStorage ممتلئ (حوالي 5MB فقط!) خصوصاً مع الصور. */
function writeData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("Storage write error:", error);
    showToast("Storage is full! Use smaller images or delete some items.", "error");
    return false;
  }
}

/* معرّف فريد لكل عنصر: الوقت الحالي + رقم عشوائي */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* -----------------------------------------------------
   2) دوال عامة للجداول (links / products / posts / orders)
   نكتبها مرة واحدة ونستعملها في كل الصفحات (CRUD)
   ----------------------------------------------------- */
function getAll(key) {
  return readData(key, []); // إذا لا شيء محفوظ نرجع مصفوفة فارغة
}

/* ترجع العنصر الجديد، أو null إذا فشل الحفظ */
function addItem(key, item) {
  const items = getAll(key);
  item.id = generateId();
  item.createdAt = new Date().toISOString();
  items.push(item);
  return writeData(key, items) ? item : null;
}

/* ترجع true/false حسب نجاح الحفظ */
function updateItem(key, id, changes) {
  const items = getAll(key).map((item) =>
    item.id === id ? { ...item, ...changes } : item // ندمج التغييرات فوق القديم
  );
  return writeData(key, items);
}

function deleteItem(key, id) {
  const items = getAll(key).filter((item) => item.id !== id); // نُبقي كل ما ليس id
  return writeData(key, items);
}

/* -----------------------------------------------------
   3) المستخدمون
   ملاحظة أمنية: حفظ كلمة المرور كنص عادي مقبول للتعلم فقط.
   في مشروع حقيقي تُشفَّر في Backend.
   ----------------------------------------------------- */
function getUsers() {
  return getAll(KEYS.users);
}

function findUserByEmail(email) {
  return getUsers().find((u) => u.email === email.trim().toLowerCase());
}

function findUserByUsername(username) {
  return getUsers().find(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase()
  );
}

function findUserById(id) {
  return getUsers().find((u) => u.id === id);
}

function createUser({ username, email, password }) {
  return addItem(KEYS.users, {
    username: username.trim(),
    email: email.trim().toLowerCase(),
    password: password,
    bio: "",
    avatar: "", // صورة البروفايل (data URL مضغوطة) — فارغة = نعرض الحرف الأول
    cover: "",  // صورة الغلاف (Cover) — فارغة = نعرض تدرج الثيم
    theme: "purple", // أحد THEMES أدناه
    verified: false, // يصير true بعد التحقق من الحساب
    verifyCode: String(Math.floor(100000 + Math.random() * 900000)),
  });
}

function updateUser(id, changes) {
  return updateItem(KEYS.users, id, changes);
}

/* -----------------------------------------------------
   4) Session: من هو المستخدم المسجّل الآن؟
   نحفظ id فقط، وليس كل بياناته.
   ----------------------------------------------------- */
function setSession(userId) {
  writeData(KEYS.session, { userId: userId });
}

function getCurrentUser() {
  const session = readData(KEYS.session, null);
  if (!session) return null;
  return findUserById(session.userId) || null;
}

function logout() {
  localStorage.removeItem(KEYS.session);
  window.location.href = "login.html";
}

/* نستدعيها في أعلى كل صفحة محمية (dashboard, profile...) */
function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "login.html"; // غير مسجّل: نرسله لصفحة الدخول
    return null;
  }
  return user;
}

/* -----------------------------------------------------
   5) أدوات صغيرة مفيدة
   ----------------------------------------------------- */
/* نحمي الصفحة من HTML خبيث يكتبه المستخدم (XSS)
   قبل وضع نصه داخل innerHTML. نستبدل الرموز الخاصة بما يقابلها.
   نعالج علامات الاقتباس أيضاً لأننا نضع النص أحياناً داخل attribute مثل alt="..." */
function escapeHTML(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* نحوّل ملف صورة إلى نص base64 لنحفظه في LocalStorage */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* -----------------------------------------------------
   6) ضغط الصور (مهم جداً!)
   صورة من الهاتف قد تكون 4MB، و LocalStorage كله 5MB فقط.
   الحل: نصغّر الصورة بـ <canvas> قبل حفظها.
   - file: ملف الصورة من <input type="file">
   - maxSize: أكبر قياس (عرض أو طول) بالبكسل
   - quality: جودة JPEG من 0 إلى 1
   ترجع Promise فيها data URL صغيرة الحجم.
   ----------------------------------------------------- */
function resizeImage(file, maxSize = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file); // رابط مؤقت للملف

    img.onload = () => {
      // scale: نسبة التصغير. Math.min(1, ...) حتى لا نكبّر صورة صغيرة أصلاً
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff"; // خلفية بيضاء لأن JPEG لا يدعم الشفافية
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      URL.revokeObjectURL(objectUrl); // نحرر الذاكرة
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("This file is not a valid image"));
    };

    img.src = objectUrl;
  });
}

/* -----------------------------------------------------
   7) Themes (الثيمات)
   الألوان الحقيقية موجودة في style.css داخل [data-theme="..."].
   هنا فقط قائمة الأسماء لنبني منها أزرار الاختيار.
   ----------------------------------------------------- */
const THEMES = [
  { id: "purple", label: "Purple" },
  { id: "blue", label: "Ocean" },
  { id: "pink", label: "Pink" },
  { id: "green", label: "Emerald" },
  { id: "orange", label: "Sunset" },
];

/* نكتب اسم الثيم في <html data-theme="pink">
   فيغيّر CSS قيم --primary و --secondary في كل الصفحة دفعة واحدة */
function applyTheme(themeId) {
  const isValid = THEMES.some((theme) => theme.id === themeId);
  document.documentElement.setAttribute("data-theme", isValid ? themeId : "purple");
}

/* -----------------------------------------------------
   8) Avatar و Cover
   نضع الصورة كـ background-image على عنصر div.
   إذا لا توجد صورة: Avatar يعرض الحرف الأول، و Cover يبقى التدرج الافتراضي من CSS.
   ----------------------------------------------------- */
function setAvatar(el, user) {
  if (user.avatar) {
    el.style.backgroundImage = `url("${user.avatar}")`;
    el.textContent = "";
  } else {
    el.style.backgroundImage = "";
    el.textContent = (user.username || "?").charAt(0).toUpperCase();
  }
}

function setCover(el, user) {
  el.style.backgroundImage = user.cover ? `url("${user.cover}")` : "";
}

/* -----------------------------------------------------
   9) Products + أدوات واجهة مشتركة
   ----------------------------------------------------- */
/* منتجات مستخدم معيّن، الأحدث أولاً */
function getProductsByUser(userId) {
  return getAll(KEYS.products)
    .filter((product) => product.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* 29 -> "$29"   و   9.5 -> "$9.50" */
function formatPrice(value) {
  const number = Number(value) || 0;
  return "$" + (Number.isInteger(number) ? number : number.toFixed(2));
}

/* رسالة صغيرة تظهر ثم تختفي. type: "success" أو "error" */
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = "toast toast-" + type;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show")); // تشغّل animation الظهور
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300); // ننتظر انتهاء animation الاختفاء
  }, 2800);
}

/* نملأ القائمة الجانبية (الصورة + الاسم + زر Logout) في الصفحات المحمية */
function fillSidebar(user) {
  const avatar = document.getElementById("sideAvatar");
  const name = document.getElementById("sideName");
  const handle = document.getElementById("sideHandle");
  const logoutBtn = document.getElementById("logoutBtn");
  const logoutLink = document.getElementById("logoutLink");

  if (avatar) setAvatar(avatar, user);
  if (name) name.textContent = user.username;
  if (handle) handle.textContent = "@" + user.username;
  // نستعمل onclick (وليس addEventListener) حتى لا يتكرر الحدث إذا استدعينا الدالة مرتين
  if (logoutBtn) logoutBtn.onclick = logout;
  if (logoutLink) {
    logoutLink.onclick = (event) => {
      event.preventDefault();
      logout();
    };
  }
}

/* -----------------------------------------------------
   10) أداة مؤقتة للتجربة (احذفها بعد بناء صفحات Login/Register)
   افتح أي صفحة، ثم F12 > Console واكتب:  devLogin()
   تنشئ مستخدماً تجريبياً + منتجات، وتسجّل دخولك.
   ----------------------------------------------------- */
function devLogin() {
  let user = findUserByEmail("demo@linkhub.dev");
  if (!user) {
    user = createUser({ username: "mohamed", email: "demo@linkhub.dev", password: "demo1234" });
    updateUser(user.id, { verified: true, bio: "Creator • Designer • Developer. Welcome to my LinkHub!" });
  }
  setSession(user.id);

  if (getProductsByUser(user.id).length === 0) {
    const demo = [
      { name: "Lava Kitten Wallpaper Pack", description: "20 epic 4K wallpapers for your phone and desktop.", price: 9, category: "Design", image: "assets/images/posts/cat-lava.jpg" },
      { name: "Space Pizza Cat Stickers", description: "Sticker pack ready for Telegram and WhatsApp.", price: 5.5, category: "Design", image: "assets/images/posts/cat-pizza.jpg" },
      { name: "Meme Templates Bundle", description: "50 editable meme templates for Photoshop and Canva.", price: 15, category: "Template", image: "assets/images/posts/cat-dinner.jpg" },
      { name: "Anime Wallpaper Collection", description: "Retro anime wallpapers, 1080p and 4K.", price: 12, category: "Design", image: "assets/images/posts/anime-bliss.jpg" },
      { name: "History Art Poster (PDF)", description: "Printable classic painting poster, A3 size.", price: 19, category: "Ebook", image: "assets/images/posts/painting-battle.jpg" },
    ];
    demo.forEach((product) => addItem(KEYS.products, { ...product, userId: user.id }));
  }
  window.location.href = "store.html";
}
