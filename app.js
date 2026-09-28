const { createClient } = window.supabase;
const CONFIG = window.POSTIK_CONFIG || {};
const D17_NUMBER = CONFIG.D17_NUMBER || "25723544";

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

const offers = [
  {id:"tt-promo-1",platform:"TikTok",name:"TikTok Promotion Starter",desc:"حملة ترويج للمحتوى عبر القنوات الرسمية المتاحة.",coins:500,label:"حزمة بداية"},
  {id:"tt-promo-2",platform:"TikTok",name:"TikTok Promotion Growth",desc:"حملة ترويج أكبر بميزانية ونطاق أعلى.",coins:1200,label:"حزمة نمو",featured:true},
  {id:"ig-promo-1",platform:"Instagram",name:"Instagram Promotion",desc:"ترويج رسمي لمنشور أو محتوى حسب الأدوات المتاحة.",coins:700,label:"حزمة أساسية"},
  {id:"yt-promo-1",platform:"YouTube",name:"YouTube Promotion",desc:"حملة ترويج للفيديو عبر الإعلانات الرسمية.",coins:1000,label:"حزمة فيديو"},
  {id:"tt-profile-1",platform:"TikTok",name:"TikTok Profile Promotion",desc:"حملة ترويج للملف الشخصي عبر القنوات الرسمية المتاحة.",coins:900,label:"حزمة بروفايل"},
  {id:"ig-content-1",platform:"Instagram",name:"Instagram Content Promotion",desc:"حملة ترويج للمحتوى مع متابعة حالة الطلب.",coins:900,label:"حزمة محتوى"}
];

const packs = [
  {coins:500,price:"5 د.ت"},
  {coins:1000,price:"10 د.ت"},
  {coins:2500,price:"25 د.ت"},
  {coins:5000,price:"50 د.ت"}
];

let session = null;
let profile = null;
let selectedOffer = null;
let activePlatform = "all";
let authMode = "login";
let adminChannel = null;

const $ = id => document.getElementById(id);

function escapeHtml(v){
  return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function moneyCoins(n){return Number(n||0).toLocaleString();}
function showNotice(id,msg,type="info"){const e=$(id);if(!e)return;e.className=`notice ${type}`;e.textContent=msg;}
function hideNotice(id){const e=$(id);if(e){e.className="notice hidden";e.textContent="";}}
function closeModal(id){$(id)?.classList.add("hidden");}
function scrollToId(id){$(id)?.scrollIntoView({behavior:"smooth",block:"start"});}

function renderOffers(){
  const grid=$("offerGrid"); if(!grid)return;
  const list=activePlatform==="all"?offers:offers.filter(o=>o.platform===activePlatform);
  grid.innerHTML=list.map(o=>`
    <article class="offer ${o.featured?"featured":""}">
      <small>${escapeHtml(o.platform)}</small>
      <h3>${escapeHtml(o.name)}</h3>
      <p>${escapeHtml(o.desc)}</p>
      <div class="coin-price">${moneyCoins(o.coins)} Coins</div>
      <div class="meta">${escapeHtml(o.label)}</div>
      <button class="btn offer-order-btn" data-id="${escapeHtml(o.id)}" type="button">اختار العرض</button>
    </article>`).join("");
  grid.querySelectorAll(".offer-order-btn").forEach(b=>b.addEventListener("click",()=>openOrder(b.dataset.id)));
}

function renderProfile(){
  const coins=Number(profile?.coins||0);
  $("coinBadge").textContent=`${moneyCoins(coins)} Coins`;
  $("dashCoins").textContent=moneyCoins(coins);
  $("loginBtn").textContent=session ? (profile?.username || "حسابي") : "دخول";
  document.querySelectorAll(".admin-only").forEach(e=>e.classList.toggle("hidden",profile?.role!=="admin"));
  $("dashStatus").textContent=session ? "متصل" : "جاهز";
}

async function refreshProfile(){
  if(!session){profile=null;renderProfile();return;}
  const {data,error}=await supabase.from("profiles").select("id,username,coins,role").eq("id",session.user.id).single();
  if(error){console.error(error);return showNotice("authNotice","تعذر تحميل الحساب.","error");}
  profile=data; renderProfile();
}

async function refreshOrders(){
  const list=$("ordersList");
  if(!list)return;
  if(!session){list.innerHTML='<div class="empty">سجّل الدخول باش تشوف طلباتك.</div>';$("dashOrders").textContent="0";return;}
  const {data,error}=await supabase.from("orders").select("id,offer_name,platform,coins,url,notes,status,created_at").order("created_at",{ascending:false});
  if(error){list.innerHTML='<div class="empty">تعذر تحميل الطلبات.</div>';return;}
  $("dashOrders").textContent=data.length;
  if(!data.length){list.innerHTML='<div class="empty">ما عندك حتى طلب توّا.</div>';return;}
  list.innerHTML=data.map(o=>`
    <div class="order-row">
      <div><b>#${escapeHtml(o.id.slice(0,8))}</b><div class="muted">${escapeHtml(o.offer_name)} — ${escapeHtml(o.platform)}</div><small>${escapeHtml(o.url)}</small>${o.notes?`<div class="muted">${escapeHtml(o.notes)}</div>`:""}</div>
      <div><span class="status">${escapeHtml(o.status)}</span><div class="muted">${moneyCoins(o.coins)} Coins</div></div>
    </div>`).join("");
}

async function refreshAdmin(){
  if(profile?.role!=="admin")return;
  const [p,o]=await Promise.all([
    supabase.from("payment_requests").select("id,user_id,username,pack_coins,amount_tnd,reference,status,created_at").order("created_at",{ascending:false}),
    supabase.from("orders").select("id,user_id,username,offer_name,platform,coins,url,status,created_at").order("created_at",{ascending:false}).limit(50)
  ]);
  if(p.error){showNotice("adminNotice","تعذر تحميل طلبات الدفع.","error");return;}
  $("adminPayments").innerHTML=p.data.length?p.data.map(x=>`
    <div class="order-row">
      <div><b>💳 ${escapeHtml(x.id.slice(0,8))}</b><div class="muted">${escapeHtml(x.username||"")} — ${moneyCoins(x.pack_coins)} Coins / ${escapeHtml(x.amount_tnd)} د.ت</div><div class="muted">مرجع: ${escapeHtml(x.reference)}</div></div>
      <div>
        <span class="status">${escapeHtml(x.status)}</span>
        ${x.status==="pending"?`<button class="btn small approve-payment" data-id="${escapeHtml(x.id)}" type="button">تأكيد الدفع</button>`:""}
      </div>
    </div>`).join(""):'<div class="empty">ما فماش طلبات دفع.</div>';
  $("adminPayments").querySelectorAll(".approve-payment").forEach(b=>b.addEventListener("click",()=>approvePayment(b.dataset.id)));
  if(o.error){$("adminOrders").innerHTML='<div class="empty">تعذر تحميل الطلبات.</div>';return;}
  $("adminOrders").innerHTML=o.data.length?o.data.map(x=>`
    <div class="order-row"><div><b>#${escapeHtml(x.id.slice(0,8))}</b><div class="muted">${escapeHtml(x.username||"")} — ${escapeHtml(x.offer_name)}</div></div><span class="status">${escapeHtml(x.status)}</span></div>`).join(""):'<div class="empty">ما فماش طلبات.</div>';
}

async function approvePayment(id){
  if(!confirm("تأكيد أنك تحققت من تحويل D17؟"))return;
  const {error}=await supabase.rpc("approve_payment",{p_payment_id:id});
  if(error){showNotice("adminNotice",error.message,"error");return;}
  showNotice("adminNotice","✅ تم تأكيد الدفع وإضافة الـCoins للحساب.","ok");
  await refreshAdmin();
}

function openAuth(){
  $("auth").classList.remove("hidden");
  $("authEmail").value="";
  $("authPassword").value="";
  $("authUsername").value=profile?.username||"";
  setAuthMode(session?"login":authMode);
}

function setAuthMode(mode){
  authMode=mode;
  $("showLoginTab").classList.toggle("active",mode==="login");
  $("showSignupTab").classList.toggle("active",mode==="signup");
  $("authUsernameWrap").classList.toggle("hidden",mode!=="signup");
  $("authSubmitBtn").classList.remove("hidden");
  $("logoutBtn").classList.toggle("hidden",!session);
  $("authSubmitBtn").textContent=mode==="signup"?"إنشاء الحساب":"دخول";
  if(session){$("authSubmitBtn").classList.add("hidden");$("authUsernameWrap").classList.add("hidden");}
}

async function authSubmit(){
  const email=$("authEmail").value.trim();
  const password=$("authPassword").value;
  if(!email||!password)return showNotice("authNotice","اكتب البريد وكلمة السر.","warn");
  if(authMode==="signup"){
    const username=$("authUsername").value.trim();
    if(!username)return showNotice("authNotice","اكتب اسم المستخدم.","warn");
    const {data,error}=await supabase.auth.signUp({email,password,options:{data:{username}}});
    if(error)return showNotice("authNotice",error.message,"error");
    showNotice("authNotice",data.session?"✅ الحساب تخلق وتعمل دخول.":"✅ الحساب تخلق. إذا طلب التأكيد، أكّد البريد ثم ادخل.","ok");
    if(data.session){session=data.session;await refreshProfile();await refreshOrders();closeModal("auth");}
    return;
  }
  const {data,error}=await supabase.auth.signInWithPassword({email,password});
  if(error)return showNotice("authNotice",error.message,"error");
  session=data.session;await refreshProfile();await refreshOrders();closeModal("auth");
}

async function logout(){
  await supabase.auth.signOut();
  session=null;profile=null;renderProfile();refreshOrders();closeModal("auth");
}

function openWallet(){
  $("coinPacks").innerHTML=packs.map(p=>`
    <div class="coin-pack"><b>${moneyCoins(p.coins)} Coins</b><span>${p.price}</span><button class="btn small topup-btn" data-coins="${p.coins}" type="button">اختار</button></div>`).join("");
  $("wallet").classList.remove("hidden");
  $("coinPacks").querySelectorAll(".topup-btn").forEach(b=>b.addEventListener("click",()=>openD17Payment(Number(b.dataset.coins))));
}

function openD17Payment(coins){
  if(!session)return openAuth(),showNotice("authNotice","سجّل الدخول أولاً.","warn");
  const pack=packs.find(p=>p.coins===coins);if(!pack)return;
  $("d17Number").textContent=D17_NUMBER;
  $("d17Pack").textContent=`${moneyCoins(pack.coins)} Coins — ${pack.price}`;
  $("d17Reference").value="";
  hideNotice("d17Notice");
  closeModal("wallet");$("d17Modal").classList.remove("hidden");
}

async function copyD17(){
  try{await navigator.clipboard.writeText(D17_NUMBER);showNotice("d17Notice","✅ تم نسخ رقم D17.","ok");}
  catch(e){showNotice("d17Notice",`رقم D17: ${D17_NUMBER}`,"info");}
}

async function submitD17Request(){
  if(!session)return showNotice("d17Notice","سجّل الدخول أولاً.","warn");
  const reference=$("d17Reference").value.trim();
  const packText=$("d17Pack").textContent;
  const pack=packs.find(p=>packText.includes(moneyCoins(p.coins)));
  if(!reference)return showNotice("d17Notice","اكتب رقم أو مرجع عملية D17.","warn");
  if(!pack)return showNotice("d17Notice","تعذر تحديد الباقة.","error");
  const {error}=await supabase.from("payment_requests").insert({
    user_id:session.user.id,username:profile?.username||session.user.email,
    pack_coins:pack.coins,amount_tnd:Number(pack.price.replace(" د.ت","")),
    reference,status:"pending"
  });
  if(error)return showNotice("d17Notice",error.message,"error");
  showNotice("d17Notice","✅ تبعث طلب التحقق. بعد ما تتأكد الإدارة من التحويل، تتضاف الـCoins تلقائيًا.","ok");
}

function openOrder(id){
  if(!session)return openAuth(),showNotice("authNotice","سجّل الدخول أولاً.","warn");
  selectedOffer=offers.find(o=>o.id===id);if(!selectedOffer)return;
  $("orderTitle").textContent=selectedOffer.name;
  $("orderDesc").textContent=selectedOffer.desc;
  $("orderCoins").textContent=`${moneyCoins(selectedOffer.coins)} Coins`;
  $("contentUrl").value="";$("notes").value="";hideNotice("orderNotice");
  $("orderModal").classList.remove("hidden");
}

async function confirmOrder(){
  if(!selectedOffer||!session)return;
  const url=$("contentUrl").value.trim(),notes=$("notes").value.trim();
  if(!url)return showNotice("orderNotice","حط رابط المحتوى.","warn");
  if(!/^https?:\/\//i.test(url))return showNotice("orderNotice","الرابط لازم يبدأ بـ https:// أو http://","warn");
  const {data,error}=await supabase.rpc("place_order",{
    p_offer_id:selectedOffer.id,p_offer_name:selectedOffer.name,p_platform:selectedOffer.platform,
    p_coins:selectedOffer.coins,p_url:url,p_notes:notes
  });
  if(error)return showNotice("orderNotice",error.message,"error");
  profile.coins=data.new_balance;
  renderProfile();await refreshOrders();closeModal("orderModal");
  showNotice("offerNotice",`✅ تسجّل الطلب وتم خصم ${moneyCoins(selectedOffer.coins)} Coins. الرصيد الجديد: ${moneyCoins(profile.coins)} Coins.`,"ok");
  scrollToId("orders");
}

function filterOffers(platform){activePlatform=platform||"all";renderOffers();scrollToId("offers");}

function bind(){
  $("getStartedBtn").onclick=()=>scrollToId("services");
  $("exploreServicesBtn").onclick=()=>scrollToId("services");
  $("buyCoinsBtn").onclick=openWallet;
  $("walletNavBtn").onclick=openWallet;
  $("ordersNavBtn").onclick=()=>scrollToId("orders");
  $("adminNavBtn").onclick=()=>scrollToId("adminPanel");
  $("loginBtn").onclick=openAuth;
  $("showLoginTab").onclick=()=>setAuthMode("login");
  $("showSignupTab").onclick=()=>setAuthMode("signup");
  $("authSubmitBtn").onclick=authSubmit;
  $("logoutBtn").onclick=logout;
  $("confirmOrderBtn").onclick=confirmOrder;
  $("closeAuthBtn").onclick=()=>closeModal("auth");
  $("closeWalletBtn").onclick=()=>closeModal("wallet");
  $("closeD17Btn").onclick=()=>closeModal("d17Modal");
  $("closeOrderBtn").onclick=()=>closeModal("orderModal");
  $("submitD17Btn").onclick=submitD17Request;
  $("copyD17Btn").onclick=copyD17;
  $("refreshAdminBtn").onclick=refreshAdmin;
  $("tiktokServiceBtn").onclick=()=>filterOffers("TikTok");
  $("instagramServiceBtn").onclick=()=>filterOffers("Instagram");
  $("youtubeServiceBtn").onclick=()=>filterOffers("YouTube");
  ["auth","wallet","d17Modal","orderModal"].forEach(id=>$(id)?.addEventListener("click",e=>{if(e.target===$(id))closeModal(id);}));
  document.addEventListener("keydown",e=>{if(e.key==="Escape")["auth","wallet","d17Modal","orderModal"].forEach(closeModal);});
}

async function init(){
  renderOffers();bind();renderProfile();renderProfile();
  const {data}=await supabase.auth.getSession();
  session=data.session;
  await refreshProfile();
  await refreshOrders();
  if(profile?.role==="admin")await refreshAdmin();

  supabase.auth.onAuthStateChange(async (_event,newSession)=>{
    session=newSession;
    await refreshProfile();await refreshOrders();
    if(profile?.role==="admin")await refreshAdmin();
  });

  // Realtime refresh for admin/user changes.
  adminChannel=supabase.channel("postik-live")
    .on("postgres_changes",{event:"*",schema:"public",table:"payment_requests"},()=>{refreshOrders();if(profile?.role==="admin")refreshAdmin();})
    .on("postgres_changes",{event:"*",schema:"public",table:"orders"},()=>{refreshOrders();if(profile?.role==="admin")refreshAdmin();})
    .on("postgres_changes",{event:"UPDATE",schema:"public",table:"profiles"},()=>refreshProfile())
    .subscribe();
}
document.addEventListener("DOMContentLoaded",init);
