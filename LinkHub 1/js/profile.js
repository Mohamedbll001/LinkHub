/* =====================================================
   profile.js — تعديل البروفايل: Avatar + Cover + Username + Bio + Theme
   يعتمد على storage.js (يجب تحميله قبله)
   ===================================================== */

/* 1) الحماية: إذا لم يكن المستخدم مسجلاً، requireAuth() ترسله إلى login.html وترجع null */
const currentUser = requireAuth();
if (currentUser) {
  initProfile(currentUser);
}

function initProfile(user) {
  /* 2) نطبّق ثيم المستخدم المحفوظ، ونملأ القائمة الجانبية */
  applyTheme(user.theme);
  fillSidebar(user);

  /* 3) draft = "مسودة" التعديلات.
     لا نغيّر بيانات المستخدم المحفوظة إلا عند الضغط على Save.
     أثناء الكتابة نعدّل المسودة فقط ونحدّث المعاينة. */
  const draft = {
    username: user.username,
    bio: user.bio || "",
    avatar: user.avatar || "",
    cover: user.cover || "",
    theme: user.theme || "purple",
  };

  /* 4) نجمع عناصر الصفحة في object واحد ليسهل استعمالها */
  const el = {
    form: document.getElementById("profileForm"),
    username: document.getElementById("usernameInput"),
    usernameError: document.getElementById("usernameError"),
    bio: document.getElementById("bioInput"),
    bioCount: document.getElementById("bioCount"),
    coverInput: document.getElementById("coverInput"),
    avatarInput: document.getElementById("avatarInput"),
    removeCover: document.getElementById("removeCover"),
    removeAvatar: document.getElementById("removeAvatar"),
    coverPreview: document.getElementById("coverPreview"),
    avatarPreview: document.getElementById("avatarPreview"),
    themeGrid: document.getElementById("themeGrid"),
    pvCover: document.getElementById("pvCover"),
    pvAvatar: document.getElementById("pvAvatar"),
    pvName: document.getElementById("pvName"),
    pvBio: document.getElementById("pvBio"),
    pvLinks: document.getElementById("pvLinks"),
    viewPageLink: document.getElementById("viewPageLink"),
  };

  /* 5) تحديث كل المعاينات من المسودة (دالة واحدة تُستدعى بعد أي تغيير) */
  function updatePreview() {
    setCover(el.coverPreview, draft);
    setAvatar(el.avatarPreview, draft);
    setCover(el.pvCover, draft);
    setAvatar(el.pvAvatar, draft);
    el.pvName.textContent = "@" + draft.username;
    el.pvBio.textContent = draft.bio || "Your bio will appear here.";
    el.bioCount.textContent = draft.bio.length + "/160";
  }

  /* الروابط الحقيقية للمستخدم (جدول links) نعرض أول 4 فقط في المعاينة */
  function renderPreviewLinks() {
    const links = getAll(KEYS.links).filter((link) => link.userId === user.id).slice(0, 4);
    el.pvLinks.innerHTML = links.length
      ? links.map((link) => `<div class="pv-link">${escapeHTML(link.title)}</div>`).join("")
      : `<p class="pv-empty">Your links will appear here.</p>`;
  }

  /* 6) أزرار الثيمات: نبنيها من المصفوفة THEMES (في storage.js).
     data-theme على كل زر يجعل نقطة اللون تأخذ ألوان ذلك الثيم من CSS. */
  function renderThemes() {
    el.themeGrid.innerHTML = THEMES.map(
      (theme) => `
        <button type="button" class="theme-swatch ${theme.id === draft.theme ? "active" : ""}"
                data-theme="${theme.id}" data-theme-id="${theme.id}">
          <span class="swatch-dot"></span>
          <span>${theme.label}</span>
        </button>`
    ).join("");
  }

  /* 7) رفع صورة: نتحقق من النوع والحجم، نضغطها، ثم نضعها في المسودة.
     key هو "avatar" أو "cover" و maxSize أكبر قياس بالبكسل. */
  async function handleImage(input, key, maxSize) {
    const file = input.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please choose an image file", "error");
    } else if (file.size > 10 * 1024 * 1024) {
      showToast("Image is too large (max 10MB)", "error");
    } else {
      try {
        draft[key] = await resizeImage(file, maxSize, 0.82); // await: ننتظر انتهاء الضغط
        updatePreview();
      } catch (error) {
        showToast(error.message, "error");
      }
    }
    input.value = ""; // نفرّغ الحقل ليمكن اختيار نفس الصورة مرة أخرى
  }

  /* 8) التحقق من اسم المستخدم */
  function validateUsername() {
    const name = draft.username.trim();
    let message = "";
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(name)) {
      message = "Use 3–20 letters, numbers or underscore";
    } else {
      const other = findUserByUsername(name);
      if (other && other.id !== user.id) message = "This username is already taken";
    }
    el.usernameError.textContent = message;
    el.username.closest(".field").classList.toggle("invalid", message !== "");
    return message === "";
  }

  /* 9) الأحداث (Events) */
  el.username.addEventListener("input", () => {
    draft.username = el.username.value;
    updatePreview();
  });

  el.bio.addEventListener("input", () => {
    draft.bio = el.bio.value;
    updatePreview();
  });

  el.coverInput.addEventListener("change", () => handleImage(el.coverInput, "cover", 1400));
  el.avatarInput.addEventListener("change", () => handleImage(el.avatarInput, "avatar", 400));

  el.removeCover.addEventListener("click", () => { draft.cover = ""; updatePreview(); });
  el.removeAvatar.addEventListener("click", () => { draft.avatar = ""; updatePreview(); });

  /* Event delegation: مستمع واحد على الحاوية بدل مستمع لكل زر.
     e.target.closest(...) يجد أقرب زر ثيم للعنصر الذي ضُغط عليه. */
  el.themeGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-theme-id]");
    if (!button) return;
    draft.theme = button.dataset.themeId;
    applyTheme(draft.theme); // معاينة فورية على الصفحة كلها
    renderThemes();
  });

  /* الحفظ */
  el.form.addEventListener("submit", (event) => {
    event.preventDefault(); // نمنع إعادة تحميل الصفحة
    if (!validateUsername()) return;

    const saved = updateUser(user.id, {
      username: draft.username.trim(),
      bio: draft.bio.trim(),
      avatar: draft.avatar,
      cover: draft.cover,
      theme: draft.theme,
    });

    if (saved) {
      const fresh = findUserById(user.id); // نقرأ النسخة المحفوظة
      fillSidebar(fresh);
      el.viewPageLink.href = "page.html?u=" + encodeURIComponent(fresh.username);
      showToast("Profile saved ✓");
    }
  });

  /* 10) البداية: نملأ الحقول بالقيم الحالية ونرسم المعاينة */
  el.username.value = draft.username;
  el.bio.value = draft.bio;
  el.viewPageLink.href = "page.html?u=" + encodeURIComponent(user.username);
  renderThemes();
  renderPreviewLinks();
  updatePreview();
}
