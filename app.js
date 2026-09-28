const KEY = "postik_local_v5";
const D17_NUMBER = "25723544";

const DEFAULT_STATE = {
  coins: 0,
  user: null,
  orders: [],
  d17Requests: []
};

let state = loadState();
let selectedOffer = null;
let activePlatform = "all";

const offers = [
  {
    id: "tt-promo-1",
    platform: "TikTok",
    name: "TikTok Promotion Starter",
    desc: "حملة ترويج للمحتوى عبر القنوات الرسمية المتاحة.",
    coins: 500,
    label: "حزمة بداية"
  },
  {
    id: "tt-promo-2",
    platform: "TikTok",
    name: "TikTok Promotion Growth",
    desc: "حملة ترويج أكبر بميزانية ونطاق أعلى.",
    coins: 1200,
    label: "حزمة نمو",
    featured: true
  },
  {
    id: "ig-promo-1",
    platform: "Instagram",
    name: "Instagram Promotion",
    desc: "ترويج رسمي لمنشور أو محتوى حسب الأدوات المتاحة.",
    coins: 700,
    label: "حزمة أساسية"
  },
  {
    id: "yt-promo-1",
    platform: "YouTube",
    name: "YouTube Promotion",
    desc: "حملة ترويج للفيديو عبر الإعلانات الرسمية.",
    coins: 1000,
    label: "حزمة فيديو"
  },
  {
    id: "tt-profile-1",
    platform: "TikTok",
    name: "TikTok Profile Promotion",
    desc: "حملة ترويج للملف الشخصي عبر القنوات الرسمية المتاحة.",
    coins: 900,
    label: "حزمة بروفايل"
  },
  {
    id: "ig-content-1",
    platform: "Instagram",
    name: "Instagram Content Promotion",
    desc: "حملة ترويج للمحتوى مع متابعة حالة الطلب.",
    coins: 900,
    label: "حزمة محتوى"
  }
];

const packs = [
  { coins: 500, price: "5 د.ت" },
  { coins: 1000, price: "10 د.ت" },
  { coins: 2500, price: "25 د.ت" },
  { coins: 5000, price: "50 د.ت" }
];

function $(id) {
  return document.getElementById(id);
}

function loadState() {
  try {
    // Keep existing V3 data when upgrading.
    const raw =
      localStorage.getItem(KEY) ||
      localStorage.getItem("postik_local_v4") ||
      localStorage.getItem("postik_local_v3");

    if (!raw) {
      return {
        coins: 0,
        user: null,
        orders: [],
        d17Requests: []
      };
    }

    const parsed = JSON.parse(raw);

    return {
      coins: Number(parsed.coins) || 0,
      user: parsed.user || null,
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      d17Requests: Array.isArray(parsed.d17Requests)
        ? parsed.d17Requests
        : []
    };
  } catch (error) {
    console.error("POSTIK state error:", error);
    return {
      coins: 0,
      user: null,
      orders: [],
      d17Requests: []
    };
  }
}

function saveState() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function scrollToId(id) {
  const target = $(id);

  if (!target) return;

  target.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function render() {
  if ($("coinBadge")) {
    $("coinBadge").textContent =
      `${state.coins.toLocaleString()} Coins`;
  }

  if ($("dashCoins")) {
    $("dashCoins").textContent =
      state.coins.toLocaleString();
  }

  if ($("dashOrders")) {
    $("dashOrders").textContent =
      state.orders.length;
  }

  renderOffers();
  renderOrders();
}

function renderOffers() {
  const grid = $("offerGrid");

  if (!grid) return;

  const list =
    activePlatform === "all"
      ? offers
      : offers.filter(
          offer => offer.platform === activePlatform
        );

  if (!list.length) {
    grid.innerHTML =
      '<div class="empty">ما فماش عروض متاحة للمنصة هاذي.</div>';
    return;
  }

  grid.innerHTML = list
    .map(
      offer => `
        <article class="offer ${offer.featured ? "featured" : ""}">
          <small>${escapeHtml(offer.platform)}</small>

          <h3>${escapeHtml(offer.name)}</h3>

          <p>${escapeHtml(offer.desc)}</p>

          <div class="coin-price">
            ${offer.coins.toLocaleString()} Coins
          </div>

          <div class="meta">
            ${escapeHtml(offer.label)}
          </div>

          <button
            class="btn offer-order-btn"
            data-offer-id="${escapeHtml(offer.id)}"
            type="button"
          >
            اختار العرض
          </button>
        </article>
      `
    )
    .join("");

  grid
    .querySelectorAll(".offer-order-btn")
    .forEach(button => {
      button.addEventListener("click", () => {
        openOrder(button.dataset.offerId);
      });
    });
}

function renderOrders() {
  const list = $("ordersList");

  if (!list) return;

  const orders = Array.isArray(state.orders)
    ? state.orders
    : [];

  const payments = Array.isArray(state.d17Requests)
    ? state.d17Requests
    : [];

  if (!orders.length && !payments.length) {
    list.innerHTML =
      '<div class="empty">ما عندك حتى طلب توّا.</div>';
    return;
  }

  const paymentRows = payments
    .map(
      payment => `
        <div class="order-row">
          <div>
            <b>💳 ${escapeHtml(payment.id)}</b>

            <div class="muted">
              طلب شحن Coins عبر D17
            </div>

            <small>
              ${escapeHtml(payment.pack || "")}
            </small>

            <div class="muted">
              مرجع العملية:
              ${escapeHtml(payment.reference)}
            </div>
          </div>

          <div>
            <span class="status">
              ${escapeHtml(
                payment.status || "في انتظار التحقق"
              )}
            </span>
          </div>
        </div>
      `
    )
    .join("");

  const orderRows = orders
    .map(
      order => `
        <div class="order-row">
          <div>
            <b>#${escapeHtml(order.id)}</b>

            <div class="muted">
              ${escapeHtml(order.offer)}
              —
              ${escapeHtml(order.platform)}
            </div>

            <small>
              ${escapeHtml(order.url)}
            </small>

            ${
              order.notes
                ? `
                  <div class="muted">
                    ${escapeHtml(order.notes)}
                  </div>
                `
                : ""
            }
          </div>

          <div>
            <span class="status ${
              order.status === "مكتمل" ? "done" : ""
            }">
              ${escapeHtml(order.status)}
            </span>

            <div class="muted">
              ${Number(order.coins).toLocaleString()}
              Coins
            </div>
          </div>
        </div>
      `
    )
    .join("");

  list.innerHTML = paymentRows + orderRows;
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
  activePlatform = platform || "all";

  renderOffers();

  scrollToId("offers");
}

function openAuth() {
  const modal = $("auth");

  if (!modal) return;

  if ($("username")) {
    $("username").value = state.user || "";
  }

  modal.classList.remove("hidden");

  setTimeout(() => {
    $("username")?.focus();
  }, 50);
}

function saveUser() {
  const input = $("username");
  const username = input
    ? input.value.trim()
    : "";

  if (!username) {
    showNotice(
      "authNotice",
      "اكتب اسم المستخدم.",
      "warn"
    );
    return;
  }

  state.user = username;

  saveState();
  render();

  closeModal("auth");

  showNotice(
    "offerNotice",
    `مرحبا ${username} 👋`,
    "ok"
  );
}

function openWallet() {
  const box = $("coinPacks");

  if (!box) return;

  box.innerHTML = packs
    .map(
      pack => `
        <div class="coin-pack">
          <b>
            ${pack.coins.toLocaleString()} Coins
          </b>

          <span>${pack.price}</span>

          <button
            class="btn small topup-btn"
            data-coins="${pack.coins}"
            type="button"
          >
            اختار
          </button>
        </div>
      `
    )
    .join("");

  box
    .querySelectorAll(".topup-btn")
    .forEach(button => {
      button.addEventListener("click", () => {
        openD17Payment(
          Number(button.dataset.coins)
        );
      });
    });

  showNotice(
    "walletNotice",
    "اختار الباقة باش تبدأ الدفع عبر D17.",
    "info"
  );

  $("wallet")?.classList.remove("hidden");
}

function openD17Payment(coins) {
  const pack = packs.find(
    item => item.coins === coins
  );

  if (!pack) return;

  if ($("d17Number")) {
    $("d17Number").textContent =
      D17_NUMBER;
  }

  if ($("d17Pack")) {
    $("d17Pack").textContent =
      `${pack.coins.toLocaleString()} Coins — ${pack.price}`;
  }

  if ($("d17User")) {
    $("d17User").value =
      state.user || "";
  }

  if ($("d17Reference")) {
    $("d17Reference").value = "";
  }

  hideNotice("d17Notice");

  $("wallet")?.classList.add("hidden");
  $("d17Modal")?.classList.remove("hidden");
}

function submitD17Request() {
  const user = $("d17User")
    ? $("d17User").value.trim()
    : "";

  const reference = $("d17Reference")
    ? $("d17Reference").value.trim()
    : "";

  if (!user) {
    showNotice(
      "d17Notice",
      "اكتب اسم المستخدم.",
      "warn"
    );
    return;
  }

  if (!reference) {
    showNotice(
      "d17Notice",
      "اكتب رقم أو مرجع عملية D17.",
      "warn"
    );
    return;
  }

  state.user = user;

  if (!Array.isArray(state.d17Requests)) {
    state.d17Requests = [];
  }

  const id =
    "D17-" +
    Date.now()
      .toString(36)
      .toUpperCase();

  const pack =
    $("d17Pack")?.textContent || "";

  state.d17Requests.unshift({
    id,
    user,
    reference,
    pack,
    status: "في انتظار التحقق",
    createdAt: new Date().toISOString()
  });

  saveState();
  render();

  showNotice(
    "d17Notice",
    `✅ تم إرسال الطلب ${id}. تتم إضافة الـCoins بعد التحقق من الدفع.`,
    "ok"
  );
}

async function copyD17() {
  try {
    await navigator.clipboard.writeText(
      D17_NUMBER
    );

    showNotice(
      "d17Notice",
      "✅ تم نسخ رقم D17.",
      "ok"
    );
  } catch (error) {
    showNotice(
      "d17Notice",
      `رقم D17: ${D17_NUMBER}`,
      "info"
    );
  }
}

function openOrder(id) {
  if (!state.user) {
    openAuth();

    showNotice(
      "authNotice",
      "سجّل اسم المستخدم أولاً باش تفتح الطلب.",
      "warn"
    );

    return;
  }

  selectedOffer = offers.find(
    offer => offer.id === id
  );

  if (!selectedOffer) return;

  if ($("orderTitle")) {
    $("orderTitle").textContent =
      selectedOffer.name;
  }

  if ($("orderDesc")) {
    $("orderDesc").textContent =
      selectedOffer.desc;
  }

  if ($("orderCoins")) {
    $("orderCoins").textContent =
      `${selectedOffer.coins.toLocaleString()} Coins`;
  }

  if ($("contentUrl")) {
    $("contentUrl").value = "";
  }

  if ($("notes")) {
    $("notes").value = "";
  }

  hideNotice("orderNotice");

  $("orderModal")?.classList.remove("hidden");

  setTimeout(() => {
    $("contentUrl")?.focus();
  }, 50);
}

function confirmOrder() {
  if (!selectedOffer) return;

  const url = $("contentUrl")
    ? $("contentUrl").value.trim()
    : "";

  const notes = $("notes")
    ? $("notes").value.trim()
    : "";

  if (!url) {
    showNotice(
      "orderNotice",
      "حط رابط المحتوى.",
      "warn"
    );
    return;
  }

  if (!/^https?:\/\//i.test(url)) {
    showNotice(
      "orderNotice",
      "الرابط لازم يبدأ بـ https:// أو http://",
      "warn"
    );
    return;
  }

  const cost = Number(selectedOffer.coins) || 0;
  const currentCoins = Number(state.coins) || 0;

  if (currentCoins < cost) {
    showNotice(
      "orderNotice",
      "الرصيد ما يكفيش. اشحن Coins أولاً.",
      "warn"
    );
    return;
  }

  // Deduct the exact order cost before saving the order.
  state.coins = currentCoins - cost;

  const id =
    "PK-" +
    Date.now()
      .toString(36)
      .toUpperCase();

  if (!Array.isArray(state.orders)) {
    state.orders = [];
  }

  state.orders.unshift({
    id,
    offer: selectedOffer.name,
    platform: selectedOffer.platform,
    coins: cost,
    url,
    notes,
    status: "قيد المعالجة",
    createdAt: new Date().toISOString()
  });

  saveState();
  render();

  closeModal("orderModal");

  showNotice(
    "offerNotice",
    `✅ تسجّل الطلب ${id} وتم خصم ${selectedOffer.coins.toLocaleString()} Coins.`,
    "ok"
  );

  scrollToId("orders");
}

function showNotice(id, message, type = "info") {
  const element = $(id);

  if (!element) return;

  element.className =
    `notice ${type}`;

  element.textContent =
    message;
}

function hideNotice(id) {
  const element = $(id);

  if (!element) return;

  element.className =
    "notice hidden";

  element.textContent = "";
}

function closeModal(id) {
  $(id)?.classList.add("hidden");
}

function bindNavigation() {
  // Get Started -> Services
  $("getStartedBtn")?.addEventListener(
    "click",
    () => {
      scrollToId("services");
    }
  );

  // Explore Services -> Services
  $("exploreServicesBtn")?.addEventListener(
    "click",
    () => {
      scrollToId("services");
    }
  );

  // Coins
  $("buyCoinsBtn")?.addEventListener(
    "click",
    openWallet
  );

  $("walletNavBtn")?.addEventListener(
    "click",
    openWallet
  );

  // Orders
  $("ordersNavBtn")?.addEventListener(
    "click",
    () => {
      scrollToId("orders");
    }
  );

  // Login
  $("loginBtn")?.addEventListener(
    "click",
    openAuth
  );

  $("saveUserBtn")?.addEventListener(
    "click",
    saveUser
  );

  // Order confirmation
  $("confirmOrderBtn")?.addEventListener(
    "click",
    confirmOrder
  );

  // Close buttons
  $("closeAuthBtn")?.addEventListener(
    "click",
    () => closeModal("auth")
  );

  $("closeWalletBtn")?.addEventListener(
    "click",
    () => closeModal("wallet")
  );

  $("closeD17Btn")?.addEventListener(
    "click",
    () => closeModal("d17Modal")
  );

  $("closeOrderBtn")?.addEventListener(
    "click",
    () => closeModal("orderModal")
  );

  // D17
  $("submitD17Btn")?.addEventListener(
    "click",
    submitD17Request
  );

  $("copyD17Btn")?.addEventListener(
    "click",
    copyD17
  );

  // Platforms
  $("tiktokServiceBtn")?.addEventListener(
    "click",
    () => filterOffers("TikTok")
  );

  $("instagramServiceBtn")?.addEventListener(
    "click",
    () => filterOffers("Instagram")
  );

  $("youtubeServiceBtn")?.addEventListener(
    "click",
    () => filterOffers("YouTube")
  );

  // Close modal by clicking outside it
  [
    "auth",
    "wallet",
    "d17Modal",
    "orderModal"
  ].forEach(id => {
    $(id)?.addEventListener(
      "click",
      event => {
        if (event.target === $(id)) {
          closeModal(id);
        }
      }
    );
  });

  // ESC closes open modal
  document.addEventListener(
    "keydown",
    event => {
      if (event.key !== "Escape") return;

      [
        "auth",
        "wallet",
        "d17Modal",
        "orderModal"
      ].forEach(id => {
        $(id)?.classList.add("hidden");
      });
    }
  );
}

document.addEventListener(
  "DOMContentLoaded",
  () => {
    bindNavigation();
    render();
  }
);

// Keep open tabs synchronized when Coins/orders change.
window.addEventListener("storage", event => {
  if (event.key !== KEY || !event.newValue) return;

  try {
    const parsed = JSON.parse(event.newValue);
    state = {
      coins: Number(parsed.coins) || 0,
      user: parsed.user || null,
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      d17Requests: Array.isArray(parsed.d17Requests) ? parsed.d17Requests : []
    };
    render();
  } catch (error) {
    console.error("POSTIK sync error:", error);
  }
});

window.POSTIK = {
  openWallet,
  openAuth,
  openOrder,
  confirmOrder,
  filterOffers,
  scrollToId
};
