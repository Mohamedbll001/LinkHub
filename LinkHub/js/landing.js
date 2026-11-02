/* =====================================================
   landing.js  —  كود صفحة index.html
   يُحمَّل بعد storage.js لأنه يستعمل دواله:
   getCurrentUser, logout, applyTheme, THEMES, showToast
   ===================================================== */

/* -----------------------------------------------------
   1) أزرار الـ navbar حسب حالة تسجيل الدخول
   getCurrentUser() ترجع المستخدم إن كانت هناك Session، وإلا null.
   ----------------------------------------------------- */
const currentUser = getCurrentUser();
const navActions = document.getElementById("navActions");

if (currentUser) {
  // نستبدل Login/Create Account بـ Dashboard/Logout
  navActions.innerHTML = `
    <a href="dashboard.html" class="btn btn-primary">Dashboard</a>
    <a href="#" class="btn btn-outline" id="logoutBtn">Logout</a>
  `;
  document.getElementById("logoutBtn").addEventListener("click", (event) => {
    event.preventDefault(); // نمنع الرابط "#" من القفز لأعلى الصفحة
    logout();               // من storage.js: تمسح الـ Session وتنقلنا إلى login.html
  });
  applyTheme(currentUser.theme); // نستعمل ثيم المستخدم المحفوظ
}

/* -----------------------------------------------------
   2) قائمة الجوال (hamburger)
   classList.toggle("open"): يضيف الكلاس إن لم يكن موجوداً، ويحذفه إن كان موجوداً،
   ويرجع true إذا أصبح موجوداً. CSS هو من يُظهر القائمة عندما يوجد الكلاس "open".
   ----------------------------------------------------- */
const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");

menuToggle.addEventListener("click", () => {
  const isOpen = navMenu.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", isOpen); // لقارئات الشاشة، ولتحويل الخطوط إلى X في CSS
});

// عند الضغط على أي رابط داخل القائمة نغلقها
navMenu.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    navMenu.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  }
});

/* -----------------------------------------------------
   3) السكرول: ظل للـ navbar + زر العودة للأعلى
   window.scrollY = كم بكسل نزلنا من أعلى الصفحة.
   classList.toggle(اسم, شرط): يضيف الكلاس إن كان الشرط true ويحذفه إن كان false.
   ----------------------------------------------------- */
const navbar = document.getElementById("navbar");
const backToTop = document.getElementById("backToTop");

function handleScroll() {
  const scrolled = window.scrollY;
  navbar.classList.toggle("scrolled", scrolled > 20);
  backToTop.classList.toggle("show", scrolled > 500);
}
window.addEventListener("scroll", handleScroll);
handleScroll(); // نستدعيها مرة عند التحميل (قد تُفتح الصفحة وهي منزلة)

backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* -----------------------------------------------------
   4) الكلمة المتبدلة في عنوان الـ Hero
   كل 2.2 ثانية: نخفيها (swap-out) ثم نغيّر النص ثم نُظهرها.
   % (باقي القسمة) يجعل الفهرس يرجع إلى 0 بعد آخر كلمة.
   ----------------------------------------------------- */
const words = ["links", "community", "store", "brand"];
const rotatingWord = document.getElementById("rotatingWord");
let wordIndex = 0;

setInterval(() => {
  rotatingWord.classList.add("swap-out");        // CSS يخفيها بحركة
  setTimeout(() => {
    wordIndex = (wordIndex + 1) % words.length;  // 0 -> 1 -> 2 -> 3 -> 0 ...
    rotatingWord.textContent = words[wordIndex];
    rotatingWord.classList.remove("swap-out");   // تظهر بالكلمة الجديدة
  }, 300); // نفس مدة transition في CSS
}, 2200);

/* -----------------------------------------------------
   5) ظهور العناصر عند السكرول (Scroll Reveal)
   IntersectionObserver يخبرنا متى يدخل عنصر إلى شاشة المستخدم.
   threshold: 0.15 = عندما يظهر 15% من العنصر.
   unobserve: بعد أن يظهر مرة لا نراقبه من جديد.
   ----------------------------------------------------- */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);
document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

/* -----------------------------------------------------
   6) عدّاد الأرقام
   الرقم النهائي مكتوب في HTML: <span data-count="100">0</span>
   el.dataset.count يقرأ قيمة data-count (نص، فنحوّله لرقم بـ Number).
   requestAnimationFrame: يستدعي الدالة قبل كل رسم للشاشة (حركة ناعمة).
   progress: رقم من 0 إلى 1 يمثل نسبة الوقت المنقضي.
   ----------------------------------------------------- */
function runCounter(el) {
  const target = Number(el.dataset.count);
  const duration = 1200; // ملي ثانية
  const startTime = performance.now();

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    el.textContent = Math.round(target * progress);
    if (progress < 1) requestAnimationFrame(tick); // نكمل حتى نصل إلى 1
  }
  requestAnimationFrame(tick);
}

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        runCounter(entry.target);
        counterObserver.unobserve(entry.target); // يعمل مرة واحدة فقط
      }
    });
  },
  { threshold: 0.6 }
);
document.querySelectorAll("[data-count]").forEach((el) => counterObserver.observe(el));

/* -----------------------------------------------------
   7) تجربة الثيمات
   نبني زراً لكل عنصر في THEMES (من storage.js).
   الزر يحمل data-theme الخاص به، فيأخذ تدرجه اللوني من CSS تلقائياً.
   عند الضغط نستدعي applyTheme(id) فتتغير ألوان الصفحة كلها.
   ----------------------------------------------------- */
const themeButtons = document.getElementById("themeButtons");
const savedTheme = document.documentElement.getAttribute("data-theme") || "purple";

THEMES.forEach((theme) => {
  const button = document.createElement("button");
  button.className = "theme-dot" + (theme.id === savedTheme ? " active" : "");
  button.setAttribute("data-theme", theme.id);
  button.innerHTML = `<span class="dot"></span>${theme.label}`;

  button.addEventListener("click", () => {
    applyTheme(theme.id);
    // نزيل active من كل الأزرار ثم نضعه على الزر المضغوط
    themeButtons.querySelectorAll(".theme-dot").forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
    showToast("Theme: " + theme.label);
  });

  themeButtons.appendChild(button);
});

/* -----------------------------------------------------
   8) أسئلة شائعة (Accordion)
   نفتح سؤالاً واحداً في كل مرة: نغلق الباقي ثم نبدّل الذي ضُغط عليه.
   CSS يحرّك max-height حسب وجود الكلاس "open".
   ----------------------------------------------------- */
const faqItems = document.querySelectorAll(".faq-item");

faqItems.forEach((item) => {
  const question = item.querySelector(".faq-question");

  question.addEventListener("click", () => {
    const wasOpen = item.classList.contains("open");

    // نغلق كل الأسئلة
    faqItems.forEach((other) => {
      other.classList.remove("open");
      other.querySelector(".faq-question").setAttribute("aria-expanded", "false");
    });

    // إن لم يكن السؤال مفتوحاً من قبل نفتحه (وإلا يبقى مغلقاً)
    if (!wasOpen) {
      item.classList.add("open");
      question.setAttribute("aria-expanded", "true");
    }
  });
});
