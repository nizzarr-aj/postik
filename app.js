/* POSTIK V6 - stable app.js */
(() => {
  "use strict";
  const CONFIG = window.POSTIK_CONFIG || {};
  const D17_NUMBER = CONFIG.D17_NUMBER || "25723544";
  let supabase=null, session=null, profile=null, selectedOffer=null;
  let activePlatform="all", authMode="login", initialized=false, notificationsCache=[];
  const offers=[
    {id:"tt-promo-1",platform:"TikTok",name:"TikTok Promotion Starter",desc:"حملة ترويج للمحتوى عبر القنوات الرسمية المتاحة.",coins:500,label:"حزمة بداية"},
    {id:"tt-promo-2",platform:"TikTok",name:"TikTok Promotion Growth",desc:"حملة ترويج أكبر بميزانية ونطاق أعلى.",coins:1200,label:"حزمة نمو",featured:true},
    {id:"ig-promo-1",platform:"Instagram",name:"Instagram Promotion",desc:"ترويج رسمي لمنشور أو محتوى حسب الأدوات المتاحة.",coins:700,label:"حزمة أساسية"},
    {id:"yt-promo-1",platform:"YouTube",name:"YouTube Promotion",desc:"حملة ترويج للفيديو عبر الإعلانات الرسمية.",coins:1000,label:"حزمة فيديو"},
    {id:"tt-profile-1",platform:"TikTok",name:"TikTok Profile Promotion",desc:"حملة ترويج للملف الشخصي عبر القنوات الرسمية المتاحة.",coins:900,label:"حزمة بروفايل"},
    {id:"ig-content-1",platform:"Instagram",name:"Instagram Content Promotion",desc:"حملة ترويج للمحتوى مع متابعة حالة الطلب.",coins:900,label:"حزمة محتوى"}
  ];
  const packs=[{coins:500,price:"5 د.ت"},{coins:1000,price:"10 د.ت"},{coins:2500,price:"25 د.ت"},{coins:5000,price:"50 د.ت"}];
  const $=id=>document.getElementById(id);
  const moneyCoins=n=>Number(n||0).toLocaleString();
  function escapeHtml(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");}
  function showNotice(id,msg,type="info"){const e=$(id);if(!e)return;e.className=`notice ${type}`;e.textContent=msg;}
  function hideNotice(id){const e=$(id);if(e){e.className="notice hidden";e.textContent="";}}
  function closeModal(id){$(id)?.classList.add("hidden");}

  // FIX: never use scrollIntoView in the RTL Android WebView.
  function scrollToId(id){
    const e=$(id); if(!e)return;
    const top=e.getBoundingClientRect().top+window.scrollY-10;
    window.scrollTo({top:Math.max(0,top),left:0,behavior:"smooth"});
    setTimeout(()=>window.scrollTo({top:Math.max(0,top),left:0,behavior:"auto"}),450);
  }

  function renderOffers(){
    const grid=$("offerGrid");if(!grid)return;
    const list=activePlatform==="all"?offers:offers.filter(o=>o.platform===activePlatform);
    grid.innerHTML=list.map(o=>`<article class="offer ${o.featured?"featured":""}"><small>${escapeHtml(o.platform)}</small><h3>${escapeHtml(o.name)}</h3><p>${escapeHtml(o.desc)}</p><div class="coin-price">${moneyCoins(o.coins)} Coins</div><div class="meta">${escapeHtml(o.label)}</div><button class="btn offer-order-btn" data-id="${escapeHtml(o.id)}" type="button">اختار العرض</button></article>`).join("");
    grid.querySelectorAll(".offer-order-btn").forEach(b=>b.addEventListener("click",()=>openOrder(b.dataset.id)));
  }
  function renderProfile(){
    const coins=Number(profile?.coins||0);
    if($("coinBadge"))$("coinBadge").textContent=`${moneyCoins(coins)} Coins`;
    if($("dashCoins"))$("dashCoins").textContent=moneyCoins(coins);
    if($("loginBtn"))$("loginBtn").textContent=session?(profile?.username||"حسابي ✓"):"دخول";
    document.querySelectorAll(".admin-only").forEach(e=>e.classList.toggle("hidden",profile?.role!=="admin"));
    if($("dashStatus"))$("dashStatus").textContent=session?"متصل":"جاهز";
  }
  function showAppError(message){console.error("POSTIK:",message);if($("offerNotice"))showNotice("offerNotice",message,"error");}
  async function refreshProfile(){
    if(!session){profile=null;renderProfile();return;}if(!supabase)return;
    const {data,error}=await supabase.from("profiles").select("id,username,coins,role").eq("id",session.user.id).maybeSingle();
    if(error){console.error(error);renderProfile();showNotice("authNotice","تعذر تحميل الحساب: "+error.message,"error");return;}profile=data;renderProfile();
  }
  async function refreshOrders(){
    const list=$("ordersList");if(!list)return;
    if(!session){list.innerHTML='<div class="empty">سجّل الدخول باش تشوف طلباتك.</div>';if($("dashOrders"))$("dashOrders").textContent="0";return;}if(!supabase)return;
    const {data,error}=await supabase.from("orders").select("id,offer_name,platform,coins,url,notes,status,created_at").eq("user_id",session.user.id).order("created_at",{ascending:false});
    if(error){list.innerHTML='<div class="empty">تعذر تحميل الطلبات.</div>';return;}const rows=data||[];
    if($("dashOrders"))$("dashOrders").textContent=rows.length;if(!rows.length){list.innerHTML='<div class="empty">ما عندك حتى طلب توّا.</div>';return;}
    list.innerHTML=rows.map(o=>`<div class="order-row"><div><b>#${escapeHtml(String(o.id).slice(0,8))}</b><div class="muted">${escapeHtml(o.offer_name)} — ${escapeHtml(o.platform)}</div><small>${escapeHtml(o.url)}</small>${o.notes?`<div class="muted">${escapeHtml(o.notes)}</div>`:""}</div><div><span class="status">${escapeHtml(o.status)}</span><div class="muted">${moneyCoins(o.coins)} Coins</div></div></div>`).join("");
  }
  async function refreshAdmin(){
    if(profile?.role!=="admin"||!supabase)return;
    const [p,o]=await Promise.all([
      supabase.from("payment_requests").select("id,user_id,username,pack_coins,amount_tnd,reference,status,created_at").order("created_at",{ascending:false}),
      supabase.from("orders").select("id,user_id,username,offer_name,platform,coins,url,status,created_at").order("created_at",{ascending:false}).limit(50)
    ]);
    if(p.error){showNotice("adminNotice","تعذر تحميل طلبات الدفع: "+p.error.message,"error");return;}
    const payments=p.data||[];
    if($("adminPayments")){
      $("adminPayments").innerHTML=payments.length?payments.map(x=>`<div class="order-row"><div><b>💳 ${escapeHtml(String(x.id).slice(0,8))}</b><div class="muted">${escapeHtml(x.username||"")} — ${moneyCoins(x.pack_coins)} Coins / ${escapeHtml(x.amount_tnd)} د.ت</div><div class="muted">مرجع: ${escapeHtml(x.reference)}</div></div><div><span class="status">${escapeHtml(x.status)}</span>${x.status==="pending"?`<button class="btn small approve-payment" data-id="${escapeHtml(x.id)}" type="button">تأكيد الدفع</button> <button class="btn small reject-payment" data-id="${escapeHtml(x.id)}" type="button">رفض</button>`:""}</div></div>`).join(""):'<div class="empty">ما فماش طلبات دفع.</div>';
      $("adminPayments").querySelectorAll(".approve-payment").forEach(b=>b.addEventListener("click",()=>approvePayment(b.dataset.id)));
      $("adminPayments").querySelectorAll(".reject-payment").forEach(b=>b.addEventListener("click",()=>rejectPayment(b.dataset.id)));
    }
    if(o.error){if($("adminOrders"))$("adminOrders").innerHTML='<div class="empty">تعذر تحميل الطلبات.</div>';return;}
    const orders=o.data||[];
    if($("adminOrders")){
      $("adminOrders").innerHTML=orders.length?orders.map(x=>`<div class="order-row"><div><b>#${escapeHtml(String(x.id).slice(0,8))}</b><div class="muted">${escapeHtml(x.username||"")} — ${escapeHtml(x.offer_name)}</div></div><div><span class="status">${escapeHtml(x.status)}</span>${x.status!=="completed"&&x.status!=="rejected"?` <select class="admin-status" data-order-id="${escapeHtml(String(x.id||""))}"><option value="pending" ${x.status==="pending"?"selected":""}>pending</option><option value="processing" ${x.status==="processing"?"selected":""}>processing</option><option value="completed">completed</option><option value="rejected">rejected</option></select>`:""}</div></div>`).join(""):'<div class="empty">ما فماش طلبات.</div>';
      $("adminOrders").querySelectorAll(".admin-status").forEach(s=>s.addEventListener("change",async()=>{
        const orderId=String(s.dataset.orderId||"").trim(),newStatus=String(s.value||"").trim();
        const idIsUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId),idIsInteger=/^[0-9]+$/.test(orderId);
        if(!orderId||(!idIsUuid&&!idIsInteger)||!["pending","processing","completed","rejected"].includes(newStatus)){showNotice("adminNotice","⚠️ معرّف الطلب أو الحالة غير صالحة.","error");await refreshAdmin();return;}
        s.disabled=true;const {error}=await supabase.rpc("admin_update_order_status",{p_order_id:orderId,p_status:newStatus});s.disabled=false;
        if(error)showNotice("adminNotice",error.message,"error");else{showNotice("adminNotice","✅ تم تحديث حالة الطلب.","ok");await refreshAdmin();}
      }));
    }
  }
  async function approvePayment(id){if(!supabase||!confirm("تأكيد أنك تحققت من تحويل D17؟"))return;const {error}=await supabase.rpc("approve_payment",{p_payment_id:id});if(error){showNotice("adminNotice",error.message,"error");return;}showNotice("adminNotice","✅ تم تأكيد الدفع وإضافة الـCoins للحساب.","ok");await refreshAdmin();}
  async function rejectPayment(id){if(!supabase||!confirm("هل تريد رفض طلب الدفع؟"))return;const {error}=await supabase.rpc("reject_payment",{p_payment_id:id});if(error){showNotice("adminNotice",error.message,"error");return;}showNotice("adminNotice","تم رفض طلب الدفع.","ok");await refreshAdmin();}
  function renderNotifications(){
    const list=$("notificationsList"),badge=$("notificationBadge");if(!list)return;
    if(!session){list.innerHTML='<div class="empty">سجّل الدخول باش تشوف الإشعارات.</div>';badge?.classList.add("hidden");return;}
    const unread=notificationsCache.filter(n=>!n.read_at).length;if(badge){badge.textContent=String(unread);badge.classList.toggle("hidden",unread===0);}
    list.innerHTML=notificationsCache.length?notificationsCache.map(n=>`<button class="notification-row ${n.read_at?'read':''}" data-id="${escapeHtml(n.id)}" type="button"><div><b>${escapeHtml(n.title)}</b><div class="muted">${escapeHtml(n.message)}</div></div><small class="muted">${escapeHtml(new Date(n.created_at).toLocaleString('ar-TN'))}</small></button>`).join(""):'<div class="empty">ما فماش إشعارات جديدة.</div>';
    list.querySelectorAll(".notification-row").forEach(b=>b.addEventListener("click",async()=>{const n=notificationsCache.find(x=>x.id===b.dataset.id);if(n&&!n.read_at){await supabase.rpc("mark_notification_read",{p_id:n.id});n.read_at=new Date().toISOString();renderNotifications();}}));
  }
  async function refreshNotifications(){if(!session||!supabase){notificationsCache=[];renderNotifications();return;}const {data,error}=await supabase.rpc("get_my_notifications");if(error){console.warn("notifications:",error.message);return;}notificationsCache=data||[];renderNotifications();}
  async function refreshPaymentHistory(){const list=$("paymentsHistory");if(!list)return;if(!session){list.innerHTML='<div class="empty">سجّل الدخول باش تشوف عمليات الشحن.</div>';return;}const {data,error}=await supabase.from("payment_requests").select("id,pack_coins,amount_tnd,reference,status,created_at").eq("user_id",session.user.id).order("created_at",{ascending:false}).limit(30);if(error){list.innerHTML='<div class="empty">تعذر تحميل سجل الشحن.</div>';return;}list.innerHTML=(data||[]).length?(data||[]).map(x=>`<div class="history-row"><div><b>${moneyCoins(x.pack_coins)} Coins</b><div class="muted">${escapeHtml(x.amount_tnd)} د.ت — ${escapeHtml(x.reference)}</div></div><span class="status ${escapeHtml(x.status)}">${escapeHtml(x.status)}</span></div>`).join(""):'<div class="empty">ما فماش عمليات شحن.</div>';}
  async function refreshHistory(){await Promise.all([refreshNotifications(),refreshPaymentHistory()]);}
  function openAuth(){const modal=$("auth");if(!modal)return;renderProfile();modal.classList.remove("hidden");if($("authEmail"))$("authEmail").value="";if($("authPassword"))$("authPassword").value="";if($("authUsername"))$("authUsername").value=profile?.username||"";setAuthMode(session?"login":authMode);hideNotice("authNotice");}
  function setAuthMode(mode){authMode=mode;$("showLoginTab")?.classList.toggle("active",mode==="login");$("showSignupTab")?.classList.toggle("active",mode==="signup");$("authUsernameWrap")?.classList.toggle("hidden",mode!=="signup");$("authSubmitBtn")?.classList.toggle("hidden",!!session);$("logoutBtn")?.classList.toggle("hidden",!session);if($("authSubmitBtn"))$("authSubmitBtn").textContent=mode==="signup"?"إنشاء الحساب":"دخول";}
  async function authSubmit(){
    if(!supabase)return showNotice("authNotice","الاتصال بـSupabase مازال ما تجهزش. عاود افتح الصفحة.","error");
    const email=$("authEmail")?.value.trim(),password=$("authPassword")?.value||"";if(!email||!password)return showNotice("authNotice","اكتب البريد وكلمة السر.","warn");
    if(authMode==="signup"){const username=$("authUsername")?.value.trim();if(!username)return showNotice("authNotice","اكتب اسم المستخدم.","warn");const {data,error}=await supabase.auth.signUp({email,password,options:{data:{username}}});if(error)return showNotice("authNotice",error.message,"error");showNotice("authNotice",data.session?"✅ الحساب تخلق وتعمل دخول.":"✅ الحساب تخلق. إذا طلب التأكيد، أكّد البريد ثم ادخل.","ok");if(data.session){session=data.session;await refreshProfile();await refreshOrders();await refreshHistory();closeModal("auth");}return;}
    const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)return showNotice("authNotice",error.message,"error");session=data.session;renderProfile();await refreshProfile();await refreshOrders();closeModal("auth");
  }
  async function logout(){if(supabase)await supabase.auth.signOut();session=null;profile=null;notificationsCache=[];renderProfile();await refreshOrders();await refreshHistory();closeModal("auth");}
  function openWallet(){const packBox=$("coinPacks");if(!packBox)return;packBox.innerHTML=packs.map(p=>`<div class="coin-pack"><b>${moneyCoins(p.coins)} Coins</b><span>${p.price}</span><button class="btn small topup-btn" data-coins="${p.coins}" type="button">اختار</button></div>`).join("");$("wallet")?.classList.remove("hidden");packBox.querySelectorAll(".topup-btn").forEach(b=>b.addEventListener("click",()=>openD17Payment(Number(b.dataset.coins))));}
  function openD17Payment(coins){if(!session){openAuth();showNotice("authNotice","سجّل الدخول أولاً.","warn");return;}const pack=packs.find(p=>p.coins===coins);if(!pack)return;if($("d17Number"))$("d17Number").textContent=D17_NUMBER;if($("d17Pack"))$("d17Pack").textContent=`${moneyCoins(pack.coins)} Coins — ${pack.price}`;if($("d17Reference"))$("d17Reference").value="";hideNotice("d17Notice");closeModal("wallet");$("d17Modal")?.classList.remove("hidden");}
  async function copyD17(){try{await navigator.clipboard.writeText(D17_NUMBER);showNotice("d17Notice","✅ تم نسخ رقم D17.","ok");}catch(e){showNotice("d17Notice",`رقم D17: ${D17_NUMBER}`,"info");}}
  async function submitD17Request(){
    if(!session)return showNotice("d17Notice","سجّل الدخول أولاً.","warn");if(!supabase)return showNotice("d17Notice","الاتصال بـSupabase غير جاهز.","error");
    const reference=$("d17Reference")?.value.trim(),packText=$("d17Pack")?.textContent||"",pack=packs.find(p=>packText.includes(moneyCoins(p.coins)));
    if(!reference)return showNotice("d17Notice","اكتب رقم أو مرجع عملية D17.","warn");if(!pack)return showNotice("d17Notice","تعذر تحديد الباقة.","error");
    const {error}=await supabase.from("payment_requests").insert({user_id:session.user.id,username:profile?.username||session.user.email,pack_coins:pack.coins,amount_tnd:Number(pack.price.replace(" د.ت","")),reference,status:"pending"});
    if(error)return showNotice("d17Notice",error.message,"error");showNotice("d17Notice","✅ تبعث طلب التحقق. بعد ما تتأكد الإدارة من التحويل، تتضاف الـCoins للحساب.","ok");
  }
  function openOrder(id){if(!session){openAuth();showNotice("authNotice","سجّل الدخول أولاً.","warn");return;}selectedOffer=offers.find(o=>o.id===id);if(!selectedOffer)return;if($("orderTitle"))$("orderTitle").textContent=selectedOffer.name;if($("orderDesc"))$("orderDesc").textContent=selectedOffer.desc;if($("orderCoins"))$("orderCoins").textContent=`${moneyCoins(selectedOffer.coins)} Coins`;if($("contentUrl"))$("contentUrl").value="";if($("notes"))$("notes").value="";hideNotice("orderNotice");$("orderModal")?.classList.remove("hidden");}
  async function confirmOrder(){
    if(!selectedOffer||!session)return;if(!supabase)return showNotice("orderNotice","الاتصال بـSupabase غير جاهز.","error");
    const url=$("contentUrl")?.value.trim()||"",notes=$("notes")?.value.trim()||"";if(!url)return showNotice("orderNotice","حط رابط المحتوى.","warn");if(!/^https?:\/\//i.test(url))return showNotice("orderNotice","الرابط لازم يبدأ بـ https:// أو http://","warn");
    const {data,error}=await supabase.rpc("place_order",{p_offer_id:selectedOffer.id,p_offer_name:selectedOffer.name,p_platform:selectedOffer.platform,p_coins:selectedOffer.coins,p_url:url,p_notes:notes});if(error)return showNotice("orderNotice",error.message,"error");if(data?.new_balance!==undefined)profile.coins=data.new_balance;renderProfile();await refreshOrders();closeModal("orderModal");showNotice("offerNotice",`✅ تسجّل الطلب وتم خصم ${moneyCoins(selectedOffer.coins)} Coins. الرصيد الجديد: ${moneyCoins(profile?.coins)} Coins.` ,"ok");scrollToId("orders");
  }
  function filterOffers(platform){activePlatform=platform||"all";renderOffers();scrollToId("services");}
  function bind(){
    $("getStartedBtn")?.addEventListener("click",()=>scrollToId("services"));$("exploreServicesBtn")?.addEventListener("click",()=>scrollToId("services"));$("buyCoinsBtn")?.addEventListener("click",openWallet);$("walletNavBtn")?.addEventListener("click",openWallet);$("ordersNavBtn")?.addEventListener("click",()=>scrollToId("orders"));$("adminNavBtn")?.addEventListener("click",()=>scrollToId("adminPanel"));$("loginBtn")?.addEventListener("click",openAuth);$("showLoginTab")?.addEventListener("click",()=>setAuthMode("login"));$("showSignupTab")?.addEventListener("click",()=>setAuthMode("signup"));$("authSubmitBtn")?.addEventListener("click",authSubmit);$("logoutBtn")?.addEventListener("click",logout);$("confirmOrderBtn")?.addEventListener("click",confirmOrder);$("closeAuthBtn")?.addEventListener("click",()=>closeModal("auth"));$("closeWalletBtn")?.addEventListener("click",()=>closeModal("wallet"));$("closeD17Btn")?.addEventListener("click",()=>closeModal("d17Modal"));$("closeOrderBtn")?.addEventListener("click",()=>closeModal("orderModal"));$("submitD17Btn")?.addEventListener("click",submitD17Request);$("copyD17Btn")?.addEventListener("click",copyD17);$("refreshAdminBtn")?.addEventListener("click",refreshAdmin);$("notificationsBtn")?.addEventListener("click",()=>{scrollToId("history");refreshHistory();});$("refreshHistoryBtn")?.addEventListener("click",refreshHistory);$("tiktokServiceBtn")?.addEventListener("click",()=>filterOffers("TikTok"));$("instagramServiceBtn")?.addEventListener("click",()=>filterOffers("Instagram"));$("youtubeServiceBtn")?.addEventListener("click",()=>filterOffers("YouTube"));
    ["auth","wallet","d17Modal","orderModal"].forEach(id=>$(id)?.addEventListener("click",e=>{if(e.target===$(id))closeModal(id);}));
    document.addEventListener("keydown",e=>{if(e.key==="Escape")["auth","wallet","d17Modal","orderModal"].forEach(closeModal);});
  }
  async function init(){
    if(initialized)return;initialized=true;renderOffers();bind();renderProfile();
    if(!window.supabase||typeof window.supabase.createClient!=="function"){showAppError("⚠️ مكتبة Supabase ما تحمّلتش. تأكد من الإنترنت ثم أعد فتح الموقع.");return;}
    if(!CONFIG.SUPABASE_URL||CONFIG.SUPABASE_URL.includes("YOUR-PROJECT")||!CONFIG.SUPABASE_KEY||CONFIG.SUPABASE_KEY.includes("YOUR-PUBLISHABLE")){showAppError("⚠️ إعدادات Supabase ناقصة في config.js.");return;}
    try{
      supabase=window.supabase.createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_KEY);const {data,error}=await supabase.auth.getSession();if(error)console.warn("getSession:",error.message);session=data?.session||null;await refreshProfile();await refreshOrders();await refreshHistory();if(profile?.role==="admin")await refreshAdmin();
      supabase.auth.onAuthStateChange((_event,newSession)=>{session=newSession;setTimeout(async()=>{await refreshProfile();await refreshOrders();await refreshHistory();if(profile?.role==="admin")await refreshAdmin();},0);});
    }catch(err){console.error(err);showAppError("⚠️ صار خطأ في الاتصال بـSupabase. جرّب إعادة تحميل الصفحة.");}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
