const KEY = "postik_local_v3";
const D17_NUMBER = "25723544";
const DEFAULT_STATE = { coins: 0, user: null, orders: [] };
let state = loadState();
let selectedOffer = null;
let activePlatform = "all";

const offers = [
  { id: "tt-promo-1", platform: "TikTok", name: "TikTok Promotion Starter", desc: "حملة ترويج رسمية للمحتوى عبر القنوات المتاحة.", coins: 500, label: "حزمة بداية" },
  { id: "tt-promo-2", platform: "TikTok", name: "TikTok Promotion Growth", desc: "حملة ترويج أكبر بميزانية ونطاق أعلى.", coins: 1200, label: "حزمة نمو", featured: true },
  { id: "ig-promo-1", platform: "Instagram", name: "Instagram Promotion", desc: "ترويج رسمي لمنشور أو محتوى حسب الأدوات المتاحة.", coins: 700, label: "حزمة أساسية" },
  { id: "yt-promo-1", platform: "YouTube", name: "YouTube Promotion", desc: "حملة ترويج للفيديو عبر الإعلانات الرسمية.", coins: 1000, label: "حزمة فيديو" },
  { id: "tt-profile-1", platform: "TikTok", name: "TikTok Profile Promotion", desc: "حملة ترويج للملف الشخصي عبر القنوات الرسمية المتاحة.", coins: 900, label: "حزمة بروفايل" },
  { id: "ig-content-1", platform: "Instagram", name: "Instagram Content Promotion", desc: "حملة ترويج للمحتوى مع متابعة حالة الطلب.", coins: 900, label: "حزمة محتوى" }
];

const packs = [
  { coins: 500, price: "5 د.ت" },
  { coins: 1000, price: "10 د.ت" },
  { coins: 2500, price: "25 د.ت" },
  { coins: 5000, price: "50 د.ت" }
];

function $(id) { return document.getElementById(id); }

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_STATE, d17Requests: [] };
    const parsed = JSON.parse(raw);
    return {
      coins: Number(parsed.coins) || 0,
      user: parsed.user || null,
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      d17Requests: Array.isArray(parsed.d17Requests) ? parsed.d17Requests : []
    };
  } catch (_) {
    return { ...DEFAULT_STATE, d17Requests: [] };
  }
}

function saveState() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function scrollToId(id) {
  const target = $(id);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function render() {
  if ($("coinBadge")) $("coinBadge").textContent = `${state.coins.toLocaleString()} Coins`;
  if ($("dashCoins")) $("dashCoins").textContent = state.coins.toLocaleString();
  if ($("dashOrders")) $("dashOrders").textContent = state.orders.length;
  renderOffers();
  renderOrders();
}

function renderOffers() {
  const grid = $("offerGrid");
  if (!grid) return;
  const list = activePlatform === "all" ? offers : offers.filter(o => o.platform === activePlatform);
  grid.innerHTML = list.map(o => `
    <article class="offer ${o.featured ? "featured" : ""}">
      <small>${o.platform}</small>
      <h3>${o.name}</h3>
      <p>${o.desc}</p>
      <div class="coin-price">${o.coins.toLocaleString()} Coins</div>
      <div class="meta">${o.label}</div>
      <button class="btn offer-order-btn" data-offer-id="${o.id}" type="button">اختار العرض</button>
    </article>
  `).join("");

  grid.querySelectorAll(".offer-order-btn").forEach(btn => {
    btn.addEventListener("click", () => openOrder(btn.dataset.offerId));
  });
}

function renderOrders() {
  const list = $("ordersList");
  if (!list) return;
  if (!state.orders.length) {
    list.innerHTML = '<div class="empty">ما عندك حتى طلب توّا.</div>';
    return;
  }

  list.innerHTML = state.orders.map(o => `
    <div class="order-row">
      <div>
        <b>#${escapeHtml(o.id)}</b>
        <div class="muted">${escapeHtml(o.offer)} — ${escapeHtml(o.platform)}</div>
        <small>${escapeHtml(o.url)}</small>
        ${o.notes ? `<div class="muted">${escapeHtml(o.notes)}</div>` : ""}
      </div>
      <div>
        <span class="status ${o.status === "مكتمل" ? "done" : ""}">${escapeHtml(o.status)}</span>
        <div class="muted">${Number(o.coins).toLocaleString()} Coins</div>
      </div>
    </div>
  `).join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function filterOffers(platform) {
  activePlatform = platform;
  renderOffers();
  scrollToId("offers");
}

function openAuth() {
  if (!$("auth")) return;
  $("username").value = state.user || "";
  $("auth").classList.remove("hidden");
  setTimeout(() => $("username")?.focus(), 50);
}

function saveUser() {
  const input = $("username");
  const u = input ? input.value.trim() : "";
  if (!u) {
    showNotice("authNotice", "اكتب اسم المستخدم.", "warn");
    return;
  }
  state.user = u;
  saveState();
  render();
  closeModal("auth");
}

function openWallet() {
  const box = $("coinPacks");
  if (!box) return;
  box.innerHTML = packs.map(p => `
    <div class="coin-pack">
      <b>${p.coins.toLocaleString()} Coins</b>
      <span>${p.price}</span>
      <button class="btn small topup-btn" data-coins="${p.coins}" type="button">اختار</button>
    </div>
  `).join("");

  box.querySelectorAll(".topup-btn").forEach(btn => {
    btn.addEventListener("click", () => openD17Payment(Number(btn.dataset.coins)));
  });

  showNotice("walletNotice", "اختار الباقة باش تبدأ الدفع عبر D17.", "info");
  $("wallet")?.classList.remove("hidden");
}

function demoTopup(coins) {
  if (!Number.isFinite(coins) || coins <= 0) return;
  state.coins += coins;
  saveState();
  render();
  showNotice("walletNotice", `✅ تمت إضافة ${coins.toLocaleString()} Coins للتجربة على هذا الجهاز.`, "ok");
}

function openD17Payment(coins) {
  const pack = packs.find(p => p.coins === coins);
  if (!pack) return;
  $("d17Number").textContent = D17_NUMBER;
  $("d17Pack").textContent = `${pack.coins.toLocaleString()} Coins — ${pack.price}`;
  $("d17User").value = state.user || "";
  $("d17Reference").value = "";
  hideNotice("d17Notice");
  $("d17Modal")?.classList.remove("hidden");
}

function submitD17Request() {
  const user = $("d17User").value.trim();
  const reference = $("d17Reference").value.trim();
  if (!user) { showNotice("d17Notice", "اكتب اسم المستخدم.", "warn"); return; }
  if (!reference) { showNotice("d17Notice", "اكتب رقم/مرجع عملية D17.", "warn"); return; }
  state.user = user;
  state.d17Requests = Array.isArray(state.d17Requests) ? state.d17Requests : [];
  const id = "D17-" + Date.now().toString(36).toUpperCase();
  const packText = $("d17Pack").textContent;
  state.d17Requests.unshift({ id, user, reference, pack: packText, status: "في انتظار التحقق", createdAt: new Date().toISOString() });
  saveState();
  render();
  showNotice("d17Notice", `✅ تم إرسال الطلب ${id}. سيتم إضافة الـCoins بعد التحقق من الدفع.`, "ok");
}

async function copyD17() {
  try {
    await navigator.clipboard.writeText(D17_NUMBER);
    showNotice("d17Notice", "✅ تم نسخ رقم D17.", "ok");
  } catch (_) {
    showNotice("d17Notice", `رقم D17: ${D17_NUMBER}`, "info");
  }
}

function openOrder(id) {
  if (!state.user) {
    openAuth();
    showNotice("authNotice", "سجّل اسم المستخدم أولاً باش تفتح الطلب.", "warn");
    return;
  }

  selectedOffer = offers.find(o => o.id === id);
  if (!selectedOffer) return;

  $("orderTitle").textContent = selectedOffer.name;
  $("orderDesc").textContent = selectedOffer.desc;
  $("orderCoins").textContent = `${selectedOffer.coins.toLocaleString()} Coins`;
  $("contentUrl").value = "";
  $("notes").value = "";
  hideNotice("orderNotice");
  $("orderModal")?.classList.remove("hidden");
  setTimeout(() => $("contentUrl")?.focus(), 50);
}

function confirmOrder() {
  if (!selectedOffer) return;
  const url = $("contentUrl").value.trim();
  const notes = $("notes").value.trim();

  if (!url) {
    showNotice("orderNotice", "حط رابط المحتوى.", "warn");
    return;
  }

  if (!/^https?:\/\//i.test(url)) {
    showNotice("orderNotice", "الرابط لازم يبدأ بـ https:// أو http://", "warn");
    return;
  }

  if (state.coins < selectedOffer.coins) {
    showNotice("orderNotice", "الرصيد ما يكفيش. اشحن Coins أولاً.", "warn");
    return;
  }

  state.coins -= selectedOffer.coins;
  const id = "PK-" + Date.now().toString(36).toUpperCase();
  state.orders.unshift({
    id,
    offer: selectedOffer.name,
    platform: selectedOffer.platform,
    coins: selectedOffer.coins,
    url,
    notes,
    status: "قيد المعالجة",
    createdAt: new Date().toISOString()
  });

  saveState();
  render();
  closeModal("orderModal");
  showNotice("offerNotice", `✅ تسجّل الطلب ${id} وتم خصم ${selectedOffer.coins.toLocaleString()} Coins.`, "ok");
  scrollToId("orders");
}

function showNotice(id, message, type = "info") {
  const el = $(id);
  if (!el) return;
  el.className = `notice ${type}`;
  el.textContent = message;
}

function hideNotice(id) {
  const el = $(id);
  if (!el) return;
  el.className = "notice hidden";
  el.textContent = "";
}

function closeModal(id) {
  $(id)?.classList.add("hidden");
}

function bindNavigation() {
  $("getStartedBtn")?.addEventListener("click", () => scrollToId("services"));
  $("exploreServicesBtn")?.addEventListener("click", () => scrollToId("services"));
  $("buyCoinsBtn")?.addEventListener("click", openWallet);
  $("walletNavBtn")?.addEventListener("click", openWallet);
  $("ordersNavBtn")?.addEventListener("click", () => scrollToId("orders"));
  $("loginBtn")?.addEventListener("click", openAuth);
  $("saveUserBtn")?.addEventListener("click", saveUser);
  $("confirmOrderBtn")?.addEventListener("click", confirmOrder);
  $("closeAuthBtn")?.addEventListener("click", () => closeModal("auth"));
  $("closeWalletBtn")?.addEventListener("click", () => closeModal("wallet"));
  $("closeD17Btn")?.addEventListener("click", () => closeModal("d17Modal"));
  $("submitD17Btn")?.addEventListener("click", submitD17Request);
  $("copyD17Btn")?.addEventListener("click", copyD17);
  $("closeOrderBtn")?.addEventListener("click", () => closeModal("orderModal"));
  $("tiktokServiceBtn")?.addEventListener("click", () => filterOffers("TikTok"));
  $("instagramServiceBtn")?.addEventListener("click", () => filterOffers("Instagram"));
  $("youtubeServiceBtn")?.addEventListener("click", () => filterOffers("YouTube"));

  ["auth", "wallet", "d17Modal", "orderModal"].forEach(id => {
    $(id)?.addEventListener("click", e => {
      if (e.target === $(id)) closeModal(id);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindNavigation();
  render();
});

window.POSTIK = { openWallet, openAuth, openOrder, confirmOrder, filterOffers, scrollToId };
