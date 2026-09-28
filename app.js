(() => {
  "use strict";

  const CONFIG = window.POSTIK_CONFIG || {};
  const D17_NUMBER = CONFIG.D17_NUMBER || "25723544";

  let supabase = null;
  let session = null;
  let profile = null;
  let selectedOffer = null;
  let activePlatform = "all";
  let authMode = "login";

  const $ = id => document.getElementById(id);

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

  function formatCoins(value) {
    return Number(value || 0).toLocaleString();
  }

  function showNotice(id, message, type = "info") {
    const element = $(id);

    if (!element) return;

    element.className = `notice ${type}`;
    element.textContent = message;
  }

  function hideNotice(id) {
    const element = $(id);

    if (!element) return;

    element.className = "notice hidden";
    element.textContent = "";
  }

  function closeModal(id) {
    $(id)?.classList.add("hidden");
  }

  function scrollTo(id) {
    $(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
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

    grid.innerHTML = list
      .map(
        offer => `
          <article class="offer ${offer.featured ? "featured" : ""}">

            <small>
              ${escapeHtml(offer.platform)}
            </small>

            <h3>
              ${escapeHtml(offer.name)}
            </h3>

            <p>
              ${escapeHtml(offer.desc)}
            </p>

            <div class="coin-price">
              ${formatCoins(offer.coins)} Coins
            </div>

            <div class="meta">
              ${escapeHtml(offer.label)}
            </div>

            <button
              class="btn offer-order-btn"
              data-id="${escapeHtml(offer.id)}"
              type="button">
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
          openOrder(button.dataset.id);
        });
      });
  }

  function renderProfile() {
    const balance = Number(profile?.coins || 0);

    if ($("coinBadge")) {
      $("coinBadge").textContent =
        `${formatCoins(balance)} Coins`;
    }

    if ($("dashCoins")) {
      $("dashCoins").textContent =
        formatCoins(balance);
    }

    if ($("loginBtn")) {
      $("loginBtn").textContent =
        session
          ? profile?.username || "حسابي"
          : "دخول";
    }

    if ($("dashStatus")) {
      $("dashStatus").textContent =
        session ? "متصل" : "جاهز";
    }

    document
      .querySelectorAll(".admin-only")
      .forEach(element => {
        element.classList.toggle(
          "hidden",
          profile?.role !== "admin"
        );
      });
  }

  async function loadProfile() {
    if (!session) {
      profile = null;
      renderProfile();
      return;
    }

    if (!supabase) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id,username,coins,role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error(error);

      showNotice(
        "authNotice",
        "تعذر تحميل الحساب: " + error.message,
        "error"
      );

      return;
    }

    profile = data;
    renderProfile();
  }

  async function loadOrders() {
    const list = $("ordersList");

    if (!list) return;

    if (!session) {
      list.innerHTML =
        '<div class="empty">سجّل الدخول باش تشوف طلباتك.</div>';

      if ($("dashOrders")) {
        $("dashOrders").textContent = "0";
      }

      return;
    }

    if (!supabase) return;

    const { data, error } = await supabase
      .from("orders")
      .select(
        "id,offer_name,platform,coins,url,notes,status,created_at"
      )
      .eq("user_id", session.user.id)
      .order("created_at", {
        ascending: false
      });

    if (error) {
      console.error(error);

      list.innerHTML =
        '<div class="empty">تعذر تحميل الطلبات.</div>';

      return;
    }

    const orders = data || [];

    if ($("dashOrders")) {
      $("dashOrders").textContent =
        orders.length;
    }

    if (!orders.length) {
      list.innerHTML =
        '<div class="empty">ما عندك حتى طلب توّا.</div>';

      return;
    }

    list.innerHTML = orders
      .map(
        order => `
          <div class="order-row">

            <div>

              <b>
                #${escapeHtml(
                  String(order.id).slice(0, 8)
                )}
              </b>

              <div class="muted">
                ${escapeHtml(order.offer_name)}
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

              <span class="status">
                ${escapeHtml(order.status)}
              </span>

              <div class="muted">
                ${formatCoins(order.coins)} Coins
              </div>

            </div>

          </div>
        `
      )
      .join("");
  }

  async function refreshAdmin() {
    if (
      profile?.role !== "admin" ||
      !supabase
    ) {
      return;
    }

    const paymentResult = await supabase
      .from("payment_requests")
      .select(
        "id,user_id,username,pack_coins,amount_tnd,reference,status,created_at"
      )
      .order("created_at", {
        ascending: false
      });

    if (paymentResult.error) {
      showNotice(
        "adminNotice",
        paymentResult.error.message,
        "error"
      );

      return;
    }

    const payments =
      paymentResult.data || [];

    if ($("adminPayments")) {
      $("adminPayments").innerHTML =
        payments.length
          ? payments
              .map(
                payment => `
                  <div class="order-row">

                    <div>

                      <b>
                        💳
                        ${escapeHtml(
                          String(payment.id).slice(0, 8)
                        )}
                      </b>

                      <div class="muted">
                        ${escapeHtml(
                          payment.username || ""
                        )}
                        —
                        ${formatCoins(
                          payment.pack_coins
                        )}
                        Coins /
                        ${escapeHtml(
                          payment.amount_tnd
                        )}
                        د.ت
                      </div>

                      <div class="muted">
                        مرجع:
                        ${escapeHtml(
                          payment.reference
                        )}
                      </div>

                    </div>

                    <div>

                      <span class="status">
                        ${escapeHtml(
                          payment.status
                        )}
                      </span>

                      ${
                        payment.status ===
                        "pending"
                          ? `
                            <button
                              class="btn small approve-payment"
                              data-id="${escapeHtml(
                                payment.id
                              )}"
                              type="button">
                              تأكيد الدفع
                            </button>

                            <button
                              class="btn small reject-payment"
                              data-id="${escapeHtml(
                                payment.id
                              )}"
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
              .join("")
          : '<div class="empty">ما فماش طلبات دفع.</div>';

      document
