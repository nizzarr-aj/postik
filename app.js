/* POSTIK V6 - stable app.js */
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
  let initialized = false;

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

  const $ = id => document.getElementById(id);

  const moneyCoins = n =>
    Number(n || 0).toLocaleString();

  function escapeHtml(v) {
    return String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showNotice(id, msg, type = "info") {
    const e = $(id);
    if (!e) return;

    e.className = `notice ${type}`;
    e.textContent = msg;
  }

  function hideNotice(id) {
    const e = $(id);

    if (e) {
      e.className = "notice hidden";
      e.textContent = "";
    }
  }

  function closeModal(id) {
    $(id)?.classList.add("hidden");
  }

  function scrollToId(id) {
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
            o => o.platform === activePlatform
          );

    grid.innerHTML = list
      .map(
        o => `
        <article class="offer ${o.featured ? "featured" : ""}">
          <small>${escapeHtml(o.platform)}</small>

          <h3>${escapeHtml(o.name)}</h3>

          <p>${escapeHtml(o.desc)}</p>

          <div class="coin-price">
            ${moneyCoins(o.coins)} Coins
          </div>

          <div class="meta">
            ${escapeHtml(o.label)}
          </div>

          <button
            class="btn offer-order-btn"
            data-id="${escapeHtml(o.id)}"
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
    const coins = Number(profile?.coins || 0);

    if ($("coinBadge")) {
      $("coinBadge").textContent =
        `${moneyCoins(coins)} Coins`;
    }

    if ($("dashCoins")) {
      $("dashCoins").textContent =
        moneyCoins(coins);
    }

    if ($("loginBtn")) {
      $("loginBtn").textContent =
        session
          ? profile?.username || "حسابي"
          : "دخول";
    }

    document
      .querySelectorAll(".admin-only")
      .forEach(element => {
        element.classList.toggle(
          "hidden",
          profile?.role !== "admin"
        );
      });

    if ($("dashStatus")) {
      $("dashStatus").textContent =
        session ? "متصل" : "جاهز";
    }
  }

  function showAppError(message) {
    console.error("POSTIK:", message);

    if ($("offerNotice")) {
      showNotice(
        "offerNotice",
        message,
        "error"
      );
    }
  }

  async function refreshProfile() {
    if (!session) {
      profile = null;
      renderProfile();
      return;
    }

    if (!supabase) return;

    const {
      data,
      error
    } = await supabase
      .from("profiles")
      .select("id,username,coins,role")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) {
      console.error(error);

      showNotice(
        "authNotice",
        "تعذر تحميل الحساب: " +
          error.message,
        "error"
      );

      return;
    }

    profile = data;
    renderProfile();
  }

  async function refreshOrders() {
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

    const {
      data,
      error
    } = await supabase
      .from("orders")
      .select(
        "id,offer_name,platform,coins,url,notes,status,created_at"
      )
      .eq("user_id", session.user.id)
      .order("created_at", {
        ascending: false
      });

    if (error) {
      list.innerHTML =
        '<div class="empty">تعذر تحميل الطلبات.</div>';

      return;
    }

    const rows = data || [];

    if ($("dashOrders")) {
      $("dashOrders").textContent =
        rows.length;
    }

    if (!rows.length) {
      list.innerHTML =
        '<div class="empty">ما عندك حتى طلب توّا.</div>';

      return;
    }

    list.innerHTML = rows
      .map(
        o => `
        <div class="order-row">

          <div>
            <b>
              #${escapeHtml(
                String(o.id).slice(0, 8)
              )}
            </b>

            <div class="muted">
              ${escapeHtml(o.offer_name)}
              —
              ${escapeHtml(o.platform)}
            </div>

            <small>
              ${escapeHtml(o.url)}
            </small>

            ${
              o.notes
                ? `
                <div class="muted">
                  ${escapeHtml(o.notes)}
                </div>
              `
                : ""
            }
          </div>

          <div>
            <span class="status">
              ${escapeHtml(o.status)}
            </span>

            <div class="muted">
              ${moneyCoins(o.coins)}
              Coins
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

    const [paymentsResult, ordersResult] =
      await Promise.all([
        supabase
          .from("payment_requests")
          .select(
            "id,user_id,username,pack_coins,amount_tnd,reference,status,created_at"
          )
          .order("created_at", {
            ascending: false
          }),

        supabase
          .from("orders")
          .select(
            "id,user_id,username,offer_name,platform,coins,url,status,created_at"
          )
          .order("created_at", {
            ascending: false
          })
          .limit(50)
      ]);

    if (paymentsResult.error) {
      showNotice(
        "adminNotice",
        "تعذر تحميل طلبات الدفع: " +
          paymentsResult.error.message,
        "error"
      );

      return;
    }

    const payments =
      paymentsResult.data || [];

    if ($("adminPayments")) {
      $("adminPayments").innerHTML =
        payments.length
          ? payments
              .map(
                x => `
                <div class="order-row">

                  <div>
                    <b>
                      💳
                      ${escapeHtml(
                        String(x.id).slice(0, 8)
                      )}
                    </b>

                    <div class="muted">
                      ${escapeHtml(
                        x.username || ""
                      )}
                      —
                      ${moneyCoins(
                        x.pack_coins
                      )}
                      Coins /
                      ${escapeHtml(
                        x.amount_tnd
                      )}
                      د.ت
                    </div>

                    <div class="muted">
                      مرجع:
                      ${escapeHtml(
                        x.reference
                      )}
                    </div>
                  </div>

                  <div>
                    <span class="status">
                      ${escapeHtml(x.status)}
                    </span>

                    ${
                      x.status === "pending"
                        ? `
                          <button
                            class="btn small approve-payment"
                            data-id="${escapeHtml(
                              x.id
                            )}"
                            type="button">
                            تأكيد الدفع
                          </button>

                          <button
                            class="btn small reject-payment"
                            data-id="${escapeHtml(
                              x.id
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

      $("adminPayments")
        .querySelectorAll(".approve-payment")
        .forEach(button => {
          button.addEventListener(
            "click",
            () =>
              approvePayment(
                button.dataset.id
              )
          );
        });

      $("adminPayments")
        .querySelectorAll(".reject-payment")
        .forEach(button => {
          button.addEventListener(
            "click",
            () =>
              rejectPayment(
                button.dataset.id
              )
          );
        });
    }

    if (ordersResult.error) {
      if ($("adminOrders")) {
        $("adminOrders").innerHTML =
          '<div class="empty">تعذر تحميل الطلبات.</div>';
      }

      return;
    }

    const orders =
      ordersResult.data || [];

    if ($("adminOrders")) {
      $("adminOrders").innerHTML =
        orders.length
          ? orders
              .map(
                x => `
                <div class="order-row">

                  <div>
                    <b>
                      #${escapeHtml(
                        String(x.id).slice(0, 8)
                      )}
                    </b>

                    <div class="muted">
                      ${escapeHtml(
                        x.username || ""
                      )}
                      —
                      ${escapeHtml(
                        x.offer_name
                      )}
                    </div>
                  </div>

                  <span class="status">
                    ${escapeHtml(x.status)}
                  </span>

                </div>
              `
              )
              .join("")
          : '<div class="empty">ما فماش طلبات.</div>';
    }
  }

  async function approvePayment(id) {
    if (!supabase) return;

    if (
      !confirm(
        "تأكيد أنك تحققت من تحويل D17؟"
      )
    ) {
      return;
    }

    const { error } =
      await supabase.rpc(
        "approve_payment",
        {
          p_payment_id: id
        }
      );

    if (error) {
      showNotice(
        "adminNotice",
        error.message,
        "error"
      );

      return;
    }

    showNotice(
      "adminNotice",
      "✅ تم تأكيد الدفع وإضافة الـCoins للحساب.",
      "ok"
    );

    await refreshAdmin();
  }

  async function rejectPayment(id) {
    if (!supabase) return;

    if (
      !confirm(
        "هل تريد رفض طلب الدفع؟"
      )
    ) {
      return;
    }

    const { error } =
      await supabase.rpc(
        "reject_payment",
        {
          p_payment_id
