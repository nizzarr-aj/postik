(() => {
  "use strict";

  const CONFIG = window.POSTIK_CONFIG || {};
  const D17_NUMBER = CONFIG.D17_NUMBER || "25723544";

  let supabase = null;
  let currentUser = null;
  let profile = null;
  let selectedOffer = null;
  let selectedPack = null;

  const $ = (id) => document.getElementById(id);

  const OFFERS = [
    {
      id: "tt-promo-1",
      platform: "TikTok",
      name: "TikTok Promotion Starter",
      desc: "حملة ترويج للمحتوى.",
      coins: 500
    },
    {
      id: "tt-promo-2",
      platform: "TikTok",
      name: "TikTok Promotion Growth",
      desc: "حملة ترويج أكبر.",
      coins: 1200
    },
    {
      id: "ig-promo-1",
      platform: "Instagram",
      name: "Instagram Promotion",
      desc: "ترويج لمحتوى Instagram.",
      coins: 700
    },
    {
      id: "yt-promo-1",
      platform: "YouTube",
      name: "YouTube Promotion",
      desc: "ترويج للفيديو.",
      coins: 1000
    },
    {
      id: "tt-profile-1",
      platform: "TikTok",
      name: "TikTok Profile Promotion",
      desc: "ترويج للملف الشخصي.",
      coins: 900
    },
    {
      id: "ig-content-1",
      platform: "Instagram",
      name: "Instagram Content Promotion",
      desc: "ترويج للمحتوى.",
      coins: 900
    }
  ];

  const PACKS = [
    { coins: 500, price: 5 },
    { coins: 1000, price: 10 },
    { coins: 2500, price: 25 },
    { coins: 5000, price: 50 }
  ];

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function show(id) {
    const el = $(id);
    if (el) el.classList.remove("hidden");
  }

  function hide(id) {
    const el = $(id);
    if (el) el.classList.add("hidden");
  }

  function notice(id, message, success = false) {
    const el = $(id);
    if (!el) return;

    el.textContent = message;
    el.className = "notice " + (success ? "success" : "error");
  }

  function clearNotice(id) {
    const el = $(id);
    if (!el) return;

    el.textContent = "";
    el.className = "notice hidden";
  }

  function renderOffers(platform = "all") {
    const grid = $("offerGrid");
    if (!grid) return;

    const list =
      platform === "all"
        ? OFFERS
        : OFFERS.filter((offer) => offer.platform === platform);

    grid.innerHTML = list
      .map(
        (offer) => `
          <article class="offer-card">
            <small>${escapeHtml(offer.platform)}</small>

            <h3>${escapeHtml(offer.name)}</h3>

            <p>${escapeHtml(offer.desc)}</p>

            <strong>${offer.coins} Coins</strong>

            <br><br>

            <button
              class="btn offer-btn"
              data-id="${escapeHtml(offer.id)}"
              type="button">
              اختار العرض
            </button>
          </article>
        `
      )
      .join("");

    grid.querySelectorAll(".offer-btn").forEach((button) => {
      button.addEventListener("click", () => {
        openOrder(button.dataset.id);
      });
    });
  }

  function renderPacks() {
    const grid = $("coinPacks");
    if (!grid) return;

    grid.innerHTML = PACKS
      .map(
        (pack, index) => `
          <button
            class="pack"
            data-index="${index}"
            type="button">

            <b>${pack.coins} Coins</b>

            <span>${pack.price} د.ت</span>

          </button>
        `
      )
      .join("");

    grid.querySelectorAll(".pack").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.index);
        openD17(PACKS[index]);
      });
    });
  }

  function updateUI() {
    const coins = Number(profile?.coins || 0);

    if ($("coinBadge")) {
      $("coinBadge").textContent = `${coins} Coins`;
    }

    if ($("dashCoins")) {
      $("dashCoins").textContent = coins;
    }

    if ($("dashStatus")) {
      $("dashStatus").textContent = currentUser
        ? "متصل"
        : "جاهز";
    }

    if ($("loginBtn")) {
      $("loginBtn").textContent = currentUser
        ? profile?.username || "حسابي"
        : "دخول";
    }

    document
      .querySelectorAll(".admin-only")
      .forEach((element) => {
        element.classList.toggle(
          "hidden",
          profile?.role !== "admin"
        );
      });
  }

  async function loadProfile() {
    if (!currentUser) {
      profile = null;
      updateUI();
      await loadOrders();
      return;
    }

    if (!supabase) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error) {
      console.error("Profile error:", error);
      return;
    }

    profile = data;

    updateUI();

    await loadOrders();

    if (profile?.role === "admin") {
      await loadAdmin();
    }
  }

  async function loadOrders() {
    const list = $("ordersList");

    if (!list) return;

    if (!currentUser) {
      list.innerHTML =
        `<div class="empty">سجّل الدخول باش تشوف طلباتك.</div>`;

      if ($("dashOrders")) {
        $("dashOrders").textContent = "0";
      }

      return;
    }

    if (!supabase) return;

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", {
        ascending: false
      });

    if (error) {
      console.error("Orders error:", error);

      list.innerHTML =
        `<div class="empty">تعذر تحميل الطلبات.</div>`;

      return;
    }

    const orders = data || [];

    if ($("dashOrders")) {
      $("dashOrders").textContent = orders.length;
    }

    if (!orders.length) {
      list.innerHTML =
        `<div class="empty">ما عندك حتى طلب توّا.</div>`;

      return;
    }

    list.innerHTML = orders
      .map(
        (order) => `
          <div class="order-row">

            <div>
              <b>${escapeHtml(order.offer_name)}</b>

              <div class="muted">
                ${escapeHtml(order.platform)}
                ·
                ${order.coins} Coins
              </div>

              <small>
                ${escapeHtml(order.url || "")}
              </small>
            </div>

            <div>
              <span class="status">
                ${escapeHtml(order.status || "pending")}
              </span>
            </div>

          </div>
        `
      )
      .join("");
  }

  function openAuth(mode = "login") {
    const modal = $("auth");
    if (!modal) return;

    modal.dataset.mode = mode;

    show("auth");

    if ($("authUsernameWrap")) {
      $("authUsernameWrap").classList.toggle(
        "hidden",
        mode !== "signup"
      );
    }

    if ($("authSubmitBtn")) {
      $("authSubmitBtn").textContent =
        mode === "signup"
          ? "إنشاء الحساب"
          : "دخول";
    }

    if ($("showLoginTab")) {
      $("showLoginTab").classList.toggle(
        "active",
        mode === "login"
      );
    }

    if ($("showSignupTab")) {
      $("showSignupTab").classList.toggle(
        "active",
        mode === "signup"
      );
    }

    clearNotice("authNotice");
  }

  function openWallet() {
    if (!currentUser) {
      openAuth("login");
      return;
    }

    show("wallet");
  }

  function openD17(pack) {
    if (!currentUser) {
      openAuth("login");
      return;
    }

    selectedPack = pack;

    if ($("d17Number")) {
      $("d17Number").textContent = D17_NUMBER;
    }

    if ($("d17Pack")) {
      $("d17Pack").textContent =
        `${pack.coins} Coins — ${pack.price} د.ت`;
    }

    if ($("d17Reference")) {
      $("d17Reference").value = "";
    }

    clearNotice("d17Notice");

    show("d17Modal");
  }

  function openOrder(id) {
    if (!currentUser) {
      openAuth("login");
      return;
    }

    selectedOffer = OFFERS.find(
      (offer) => offer.id === id
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
        `${selectedOffer.coins} Coins`;
    }

    if ($("contentUrl")) {
      $("contentUrl").value = "";
    }

    if ($("notes")) {
      $("notes").value = "";
    }

    clearNotice("orderNotice");

    show("orderModal");
  }

  async function submitAuth() {
    if (!supabase) {
      notice(
        "authNotice",
        "الاتصال بـ Supabase ما خدمش."
      );
      return;
    }

    const email =
      $("authEmail")?.value.trim();

    const password =
      $("authPassword")?.value;

    const mode =
      $("auth")?.dataset.mode || "login";

    if (!email || !password) {
      notice(
        "authNotice",
        "اكتب البريد الإلكتروني وكلمة السر."
      );
      return;
    }

    if (password.length < 6) {
      notice(
        "authNotice",
        "كلمة السر لازم تكون 6 أحرف على الأقل."
      );
      return;
    }

    let result;

    if (mode === "signup") {
      const username =
        $("authUsername")?.value.trim() ||
        email.split("@")[0];

      result = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username
          }
        }
      });
    } else {
      result =
        await supabase.auth.signInWithPassword({
          email,
          password
        });
    }

    if (result.error) {
      notice(
        "authNotice",
        result.error.message
      );
      return;
    }

    if (
      mode === "signup" &&
      !result.data.session
    ) {
      notice(
        "authNotice",
        "تم إنشاء الحساب. أكّد البريد الإلكتروني إذا طلب منك ذلك.",
        true
      );
      return;
    }

    hide("auth");
  }

  async function submitD17() {
    if (!currentUser || !selectedPack) {
      return;
    }

    const reference =
      $("d17Reference")?.value.trim();

    if (!reference) {
      notice(
        "d17Notice",
        "اكتب مرجع عملية D17."
      );
      return;
    }

    const { error } =
      await supabase
        .from("payment_requests")
        .insert({
          user_id: currentUser.id,
          username:
            profile?.username ||
            currentUser.email,

          pack_coins:
            selectedPack.coins,

          amount_tnd:
            selectedPack.price,

          reference,

          status: "pending"
        });

    if (error) {
      notice(
        "d17Notice",
        error.message
      );
      return;
    }

    notice(
      "d17Notice",
      "تم إرسال الطلب بنجاح. تتم إضافة Coins بعد التحقق من الدفع.",
      true
    );

    setTimeout(() => {
      hide("d17Modal");
    }, 1500);
  }

  async function submitOrder() {
    if (!currentUser || !selectedOffer) {
      return;
    }

    const url =
      $("contentUrl")?.value.trim();

    const notes =
      $("notes")?.value.trim() || "";

    if (
      !url ||
      !/^https?:\/\//i.test(url)
    ) {
      notice(
        "orderNotice",
        "أدخل رابط صحيح يبدأ بـ https:// أو http://"
      );
      return;
    }

    const { error } =
      await supabase.rpc(
        "place_order",
        {
          p_offer_id:
            selectedOffer.id,

          p_offer_name:
            selectedOffer.name,

          p_platform:
            selectedOffer.platform,

          p_coins:
            selectedOffer.coins,

          p_url:
            url,

          p_notes:
            notes
        }
      );

    if (error) {
      notice(
        "orderNotice",
        error.message
      );
      return;
    }

    notice(
      "orderNotice",
      "تم تسجيل الطلب وخصم Coins بنجاح.",
      true
    );

    await loadProfile();

    setTimeout(() => {
      hide("orderModal");
    }, 1200);
  }

  async function loadAdmin() {
    if (
      !supabase ||
      profile?.role !== "admin"
    ) {
      return;
    }

    const payments =
      await supabase
        .from("payment_requests")
        .select("*")
        .order("created_at", {
          ascending: false
        });

    if (payments.error) {
      console.error(
        "Admin payments:",
        payments.error
      );
      return;
    }

    const paymentList =
      payments.data || [];

    if ($("adminPayments")) {
      if (!paymentList.length) {
        $("adminPayments").innerHTML =
          `<div class="empty">لا توجد طلبات دفع.</div>`;
      } else {
        $("adminPayments").innerHTML =
          paymentList
            .map(
              (payment) => `
                <div class="order-row">

                  <div>
                    <b>
                      ${escapeHtml(
                        payment.username || ""
                      )}
                    </b>

                    <div class="muted">
                      ${payment.pack_coins}
                      Coins —
                      ${payment.amount_tnd}
                      د.ت
                    </div>

                    <div class="muted">
                      مرجع:
                      ${escapeHtml(
                        payment.reference || ""
                      )}
                    </div>

                    <small>
                      الحالة:
                      ${escapeHtml(
                        payment.status
                      )}
                    </small>
                  </div>

                  <div>
                    ${
                      payment.status ===
                      "pending"
                        ? `
                          <button
                            class="btn small approve-btn"
                            data-id="${payment.id}"
                            type="button">
                            قبول
                          </button>

                          <button
                            class="btn small reject-btn"
                            data-id="${payment.id}"
                            type="button">
                            رفض
                          </button>
                        `
                        : ""
                    }
                  </div>

                </div>
              `
            )
            .join("");

        $("adminPayments")
          .querySelectorAll(".approve-btn")
          .forEach((button) => {
            button.addEventListener(
              "click",
              async () => {
                const { error } =
                  await supabase.rpc(
                    "approve_payment",
                    {
                      payment_id:
                        button.dataset.id
                    }
                  );

                if (error) {
                  alert(error.message);
                  return;
                }

                alert(
                  "تم قبول الدفع وإضافة Coins."
                );

                await loadAdmin();
              }
            );
          });

        $("adminPayments")
          .querySelectorAll(".reject-btn")
          .forEach((button) => {
            button.addEventListener(
              "click",
              async () => {
                const { error } =
                  await supabase.rpc(
                    "reject_payment",
                    {
                      payment_id:
                        button.dataset.id
                    }
                  );

                if (error) {
                  alert(error.message);
                  return;
                }

                await loadAdmin();
              }
            );
          });
      }
    }

    const orders =
      await supabase
        .from("orders")
        .select("*")
        .order("created_at", {
          ascending: false
        });

    if ($("adminOrders")) {
      const list = orders.data || [];

      $("adminOrders").innerHTML =
        list.length
          ? list
              .map(
                (order) => `
                  <div class="order-row">
                    <b>
                      ${escapeHtml(
                        order.offer_name
                      )}
                    </b>

                    <div>
                      ${escapeHtml(
                        order.username || ""
                      )}
                      —
                      ${order.coins}
                      Coins
                    </div>
                  </div>
                `
              )
              .join("")
          : `<div class="empty">لا توجد طلبات.</div>`;
    }
  }

  function bindEvents() {

    $("getStartedBtn")
      ?.addEventListener("click", () => {
        openAuth("signup");
      });

    $("loginBtn")
      ?.addEventListener("click", () => {
        if (currentUser) {
          openWallet();
        } else {
          openAuth("login");
        }
      });

    $("buyCoinsBtn")
      ?.addEventListener("click", openWallet);

    $("walletNavBtn")
      ?.addEventListener("click", openWallet);

    $("ordersNavBtn")
      ?.addEventListener("click", () => {
        $("orders")?.scrollIntoView({
          behavior: "smooth"
        });
      });

    $("adminNavBtn")
      ?.addEventListener("click", () => {
        $("adminPanel")?.scrollIntoView({
          behavior: "smooth"
        });
      });

    $("tiktokServiceBtn")
      ?.addEventListener("click", () => {
        renderOffers("TikTok");

        $("offers")?.scrollIntoView({
          behavior: "smooth"
        });
      });

    $("instagramServiceBtn")
      ?.addEventListener("click", () => {
        renderOffers("Instagram");

        $("offers")?.scrollIntoView({
          behavior: "smooth"
        });
      });

    $("youtubeServiceBtn")
      ?.addEventListener("click", () => {
        renderOffers("YouTube");

        $("offers")?.scrollIntoView({
          behavior: "smooth"
        });
      });

    $("exploreServicesBtn")
      ?.addEventListener("click", () => {
        $("services")?.scrollIntoView({
          behavior: "smooth"
        });
      });

    $("showLoginTab")
      ?.addEventListener("click", () => {
        openAuth("login");
      });

    $("showSignupTab")
      ?.addEventListener("click", () => {
        openAuth("signup");
      });

    $("authSubmitBtn")
      ?.addEventListener(
        "click",
        submitAuth
      );

    $("logoutBtn")
      ?.addEventListener(
        "click",
        async () => {
          await supabase.auth.signOut();
          hide("auth");
        }
      );

    $("submitD17Btn")
      ?.addEventListener(
        "click",
        submitD17
      );

    $("confirmOrderBtn")
      ?.addEventListener(
        "click",
        submitOrder
      );

    $("refreshAdminBtn")
      ?.addEventListener(
        "click",
        loadAdmin
      );

    $("copyD17Btn")
      ?.addEventListener(
        "click",
        async () => {
          try {
            await navigator.clipboard.writeText(
              D17_NUMBER
            );

            notice(
              "d17Notice",
              "تم نسخ رقم D17.",
              true
            );
          } catch {
            alert(
              "رقم D17: " +
              D17_NUMBER
            );
          }
        }
      );

    $("closeAuthBtn")
      ?.addEventListener(
        "click",
        () => hide("auth")
      );

    $("closeWalletBtn")
      ?.addEventListener(
        "click",
        () => hide("wallet")
      );

    $("closeD17Btn")
      ?.addEventListener(
        "click",
        () => hide("d17Modal")
      );

    $("closeOrderBtn")
      ?.addEventListener(
        "click",
        () => hide("orderModal")
      );

    document
      .querySelectorAll(".modal")
      .forEach((modal) => {
        modal.addEventListener(
          "click",
          (event) => {
            if (
              event.target === modal
            ) {
              modal.classList.add(
                "hidden"
              );
            }
          }
        );
      });

    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape") {
          document
            .querySelectorAll(".modal")
            .forEach((modal) => {
              modal.classList.add(
                "hidden"
              );
            });
        }
      }
    );
  }

  async function init() {
    renderOffers();
    renderPacks();
    bindEvents();

    if (
      !CONFIG.SUPABASE_URL ||
      !CONFIG.SUPABASE_KEY
    ) {
      console.error(
        "POSTIK: config.js ناقص"
      );
      return;
    }

    if (
      !window.supabase ||
      !window.supabase.createClient
    ) {
      console.error(
        "POSTIK: Supabase لم يتم تحميله"
      );
      return;
    }

    supabase =
      window.supabase.createClient(
        CONFIG.SUPABASE_URL,
        CONFIG.SUPABASE_KEY
      );

    const {
      data
    } = await supabase.auth.getSession();

    currentUser =
      data?.session?.user || null;

    await loadProfile();

    supabase.auth.onAuthStateChange(
      async (
        event,
        sessionData
      ) => {
        currentUser =
          sessionData?.user || null;

        await loadProfile();
      }
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

})();
