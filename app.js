const KEY="postik_local_v1";
const state=JSON.parse(localStorage.getItem(KEY)||'{"coins":0,"user":null,"orders":[]}');
let selectedOffer=null, activePlatform="all";
const offers=[
 {id:"tt-promo-1",platform:"TikTok",name:"TikTok Promotion Starter",desc:"حملة ترويج رسمية للمحتوى عبر القنوات المتاحة.",coins:500,price:"حزمة بداية"},
 {id:"tt-promo-2",platform:"TikTok",name:"TikTok Promotion Growth",desc:"حملة ترويج أكبر بميزانية/نطاق أعلى.",coins:1200,price:"حزمة نمو",featured:true},
 {id:"ig-promo-1",platform:"Instagram",name:"Instagram Promotion",desc:"ترويج رسمي لمنشور أو محتوى حسب الأدوات المتاحة.",coins:700,price:"حزمة أساسية"},
 {id:"yt-promo-1",platform:"YouTube",name:"YouTube Promotion",desc:"حملة ترويج للفيديو عبر الإعلانات الرسمية.",coins:1000,price:"حزمة فيديو"},
 {id:"tt-profile-1",platform:"TikTok",name:"TikTok Profile Promotion",desc:"حملة ترويج للملف الشخصي عبر القنوات الرسمية المتاحة.",coins:900,price:"حزمة بروفايل"},
 {id:"ig-content-1",platform:"Instagram",name:"Instagram Content Promotion",desc:"حملة ترويج للمحتوى مع متابعة حالة الطلب.",coins:900,price:"حزمة محتوى"}
];
const packs=[{coins:500,price:"5 د.ت"},{coins:1000,price:"10 د.ت"},{coins:2500,price:"25 د.ت"},{coins:5000,price:"50 د.ت"}];
const $=id=>document.getElementById(id);
function save(){localStorage.setItem(KEY,JSON.stringify(state));render()}
function render(){
 $("coinBadge").textContent=`${state.coins.toLocaleString()} Coins`;
 $("dashCoins").textContent=state.coins.toLocaleString();
 $("dashOrders").textContent=state.orders.length;
 renderOffers();renderOrders();
}
function renderOffers(){
 const list=activePlatform==="all"?offers:offers.filter(x=>x.platform===activePlatform);
 $("offerGrid").innerHTML=list.map(o=>`<article class="offer ${o.featured?'featured':''}">
 <small>${o.platform}</small><h3>${o.name}</h3><p>${o.desc}</p><div class="coin-price">${o.coins.toLocaleString()} Coins</div><div class="meta">${o.price}</div>
 <button class="btn" onclick="openOrder('${o.id}')">اختار العرض</button></article>`).join('');
}
function renderOrders(){
 if(!state.orders.length){$("ordersList").innerHTML='<div class="empty">ما عندك حتى طلب توّا.</div>';return}
 $("ordersList").innerHTML=state.orders.map(o=>`<div class="order-row"><div><b>#${o.id}</b><div class="muted">${o.offer} — ${o.platform}</div><small>${o.url}</small></div><div><span class="status ${o.status==='مكتمل'?'done':''}">${o.status}</span><div class="muted">${o.coins} Coins</div></div></div>`).join('');
}
function filterOffers(p){activePlatform=p;document.getElementById("offers").scrollIntoView({behavior:"smooth"});renderOffers()}
function openAuth(){ $("auth").classList.remove("hidden"); $("username").value=state.user||""}
function saveUser(){const u=$("username").value.trim();if(!u){alert("اكتب اسم المستخدم.");return}state.user=u;save();closeModal("auth")}
function openWallet(){
 $("coinPacks").innerHTML=packs.map(p=>`<div class="coin-pack"><b>${p.coins.toLocaleString()} Coins</b><span>${p.price}</span><button class="btn small" onclick="demoTopup(${p.coins})">اختار</button></div>`).join('');
 $("walletNotice").className="notice";$("walletNotice").textContent="تنبيه: هذه شحنة تجريبية محلية. الدفع الحقيقي يتربط بالـBackend ومزود الدفع.";
 $("wallet").classList.remove("hidden");
}
function demoTopup(coins){state.coins+=coins;save();$("walletNotice").className="notice ok";$("walletNotice").textContent=`✅ تمت إضافة ${coins.toLocaleString()} Coins للتجربة على هذا الجهاز.`}
function openOrder(id){
 if(!state.user){openAuth();return}
 selectedOffer=offers.find(x=>x.id===id);
 $("orderTitle").textContent=selectedOffer.name;
 $("orderDesc").textContent=selectedOffer.desc;
 $("orderCoins").textContent=`${selectedOffer.coins.toLocaleString()} Coins`;
 $("contentUrl").value="";$("notes").value="";$("orderNotice").className="notice hidden";
 $("orderModal").classList.remove("hidden");
}
function confirmOrder(){
 const url=$("contentUrl").value.trim();
 if(!url){$("orderNotice").className="notice warn";$("orderNotice").textContent="حط رابط المحتوى.";return}
 if(state.coins<selectedOffer.coins){$("orderNotice").className="notice warn";$("orderNotice").textContent="الرصيد ما يكفيش. اشحن Coins أولاً.";return}
 state.coins-=selectedOffer.coins;
 const id="PK-"+Date.now().toString(36).toUpperCase();
 state.orders.unshift({id,offer:selectedOffer.name,platform:selectedOffer.platform,coins:selectedOffer.coins,url,status:"قيد المعالجة"});
 save();closeModal("orderModal");
 alert(`✅ تسجّل الطلب ${id}. الرصيد تقصّ منه ${selectedOffer.coins} Coins.`);
 document.getElementById("orders").scrollIntoView({behavior:"smooth"});
}
function closeModal(id){$(id).classList.add("hidden")}
window.addEventListener("DOMContentLoaded",render);
