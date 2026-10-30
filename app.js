import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { collection, query, where, orderBy, getDocs, getDoc, doc, addDoc, serverTimestamp, onSnapshot } from "./rtdb-compat.js";
import { firebaseConfig, storeConfig } from "./firebase-config.js";

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = null;
const $ = (id) => document.getElementById(id);
if ($("storeUpiId")) $("storeUpiId").textContent = storeConfig.upiId || "Configure store UPI ID";
const dialogs = ["authDialog","cartDialog","checkoutDialog","ordersDialog","successDialog"];
const openDialog = (id) => $(id).showModal();
const closeDialog = (id) => $(id).close();
document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => closeDialog(b.dataset.close)));
$("year").textContent = new Date().getFullYear();

let currentUser = null, products = [], activeCategory = "All", searchTerm = "", cart = JSON.parse(localStorage.getItem("shopnest-cart") || "{}"), authMode = "login", stopProducts = null;
const money = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(n || 0);
const safeText = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const showNotice = (message, isError=false) => { $("notice").textContent=message; $("notice").classList.remove("hidden"); $("notice").style.background=isError?"#fff0ee":"#eef5e8"; $("notice").style.color=isError?"#9b261d":"#385a40"; };
function saveCart(){ localStorage.setItem("shopnest-cart",JSON.stringify(cart)); updateCartCount(); }
function updateCartCount(){ $("cartCount").textContent=Object.values(cart).reduce((s,n)=>s+n,0); }
function getCartLines(){ return Object.entries(cart).map(([id,qty])=>{const p=products.find(x=>x.id===id);return p?{...p,qty}:null}).filter(Boolean); }
function renderProducts(){
 const categories=["All",...new Set(products.map(p=>p.category).filter(Boolean))];
 $("categoryFilters").innerHTML=categories.map(c=>`<button class="chip ${activeCategory===c?"active":""}" data-category="${safeText(c)}">${safeText(c)}</button>`).join("");
 $("categoryFilters").querySelectorAll("button").forEach(b=>b.onclick=()=>{activeCategory=b.dataset.category;renderProducts()});
 const filtered=products.filter(p=>(activeCategory==="All"||p.category===activeCategory)&&(`${p.name} ${p.description||""} ${p.category||""}`.toLowerCase().includes(searchTerm)));
 $("productGrid").innerHTML=filtered.length?filtered.map(p=>`<article class="product-card"><div class="product-image">${p.imageUrl?`<img loading="lazy" src="${safeText(p.imageUrl)}" alt="${safeText(p.name)}">`:`<span class="image-placeholder">✳</span>`}</div><div class="product-info"><span class="product-category">${safeText(p.category||"Essentials")}</span><h3>${safeText(p.name)}</h3><p class="product-description">${safeText(p.description||"A thoughtful pick for your everyday.")}</p><div class="product-bottom"><div><div class="price">${money(p.price)}</div><div class="stock">${p.stock>0?`${p.stock} in stock`:"Out of stock"}</div></div><button class="add-btn" data-add="${p.id}" ${p.stock<=0?"disabled":""} aria-label="Add ${safeText(p.name)} to cart">+</button></div></div></article>`).join(""):`<div class="empty-state">No products found. Try another search or category.</div>`;
 $("productGrid").querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{const p=products.find(x=>x.id===b.dataset.add);if(!p||p.stock<=0)return;const now=cart[p.id]||0;if(now>=p.stock){showNotice("Maximum available stock is already in your cart.",true);return;}cart[p.id]=now+1;saveCart();showNotice(`${p.name} added to cart.`);});
}
function watchProducts(){
 const q=query(collection(db,"products"),where("active","==",true));
 stopProducts=onSnapshot(q,snap=>{products=snap.docs.map(d=>({id:d.id,...d.data()})).filter(p=>typeof p.price==="number"&&p.price>=0&&typeof p.stock==="number");renderProducts();},err=>{console.error(err);$("productGrid").innerHTML='<div class="empty-state">Could not load products. Check Firebase setup and Realtime Database rules.</div>';});
}
$("searchInput").addEventListener("input",e=>{searchTerm=e.target.value.trim().toLowerCase();renderProducts();});
$("cartBtn").onclick=()=>{renderCart();openDialog("cartDialog");};
$("ordersBtn").onclick=async()=>{if(!currentUser){openDialog("authDialog");return;}await renderOrders();openDialog("ordersDialog");};
$("authBtn").onclick=()=>{if(currentUser){signOut(auth);return;}setAuthMode("login");openDialog("authDialog");};
$("loginTab").onclick=()=>setAuthMode("login");$("signupTab").onclick=()=>setAuthMode("signup");
function setAuthMode(mode){authMode=mode;$("authTitle").textContent=mode==="login"?"Welcome back":"Create your account";$("loginTab").classList.toggle("active",mode==="login");$("signupTab").classList.toggle("active",mode==="signup");$("authSubmit").textContent=mode==="login"?"Sign in":"Create account";$("authPassword").autocomplete=mode==="login"?"current-password":"new-password";$("authError").textContent="";}
$("authForm").addEventListener("submit",async e=>{e.preventDefault();$("authSubmit").disabled=true;$("authError").textContent="";try{const email=$("authEmail").value.trim(),password=$("authPassword").value;if(authMode==="signup"){const cred=await createUserWithEmailAndPassword(auth,email,password);await updateProfile(cred.user,{displayName:email.split("@")[0]});}else await signInWithEmailAndPassword(auth,email,password);closeDialog("authDialog");}catch(err){$("authError").textContent=err.message.replace("Firebase: ","");}finally{$("authSubmit").disabled=false;}});
onAuthStateChanged(auth,user=>{currentUser=user;$("authBtn").textContent=user?"Sign out":"Sign in";});
function renderCart(){
 const lines=getCartLines();$("cartItems").innerHTML=lines.length?lines.map(p=>`<div class="cart-row"><img class="cart-thumb" src="${safeText(p.imageUrl||"")}" onerror="this.style.display='none'" alt=""><div class="cart-details"><strong>${safeText(p.name)}</strong><small>${money(p.price)} each</small><div class="qty"><button data-minus="${p.id}">−</button><span>${p.qty}</span><button data-plus="${p.id}">+</button></div></div><button class="remove-btn" data-remove="${p.id}">Remove</button></div>`).join(""):'<div class="empty-state">Your cart is empty. Add something you love.</div>';
 const total=lines.reduce((s,p)=>s+p.price*p.qty,0);$("cartSummary").innerHTML=`<span>Subtotal</span><span>${money(total)}</span>`;
 $("cartItems").querySelectorAll("[data-minus]").forEach(b=>b.onclick=()=>changeQty(b.dataset.minus,-1));$("cartItems").querySelectorAll("[data-plus]").forEach(b=>b.onclick=()=>changeQty(b.dataset.plus,1));$("cartItems").querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{delete cart[b.dataset.remove];saveCart();renderCart();});
 $("checkoutBtn").disabled=!lines.length;
}
function changeQty(id,delta){const p=products.find(x=>x.id===id);if(!p)return;const next=(cart[id]||0)+delta;if(next<=0)delete cart[id];else if(next<=p.stock)cart[id]=next;else showNotice("Not enough stock available.",true);saveCart();renderCart();}
$("checkoutBtn").onclick=()=>{if(!currentUser){closeDialog("cartDialog");setAuthMode("login");openDialog("authDialog");showNotice("Sign in or create an account to place an order.");return;}closeDialog("cartDialog");$("upiInstructions").classList.toggle("hidden",$("paymentMethod").value!=="upi");openDialog("checkoutDialog");};
$("paymentMethod").onchange=()=> $("upiInstructions").classList.toggle("hidden",$("paymentMethod").value!=="upi");
$("checkoutForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!currentUser){$("checkoutError").textContent="Please sign in first.";return;}const lines=getCartLines();if(!lines.length){$("checkoutError").textContent="Your cart is empty.";return;}
 $("placeOrderBtn").disabled=true;$("checkoutError").textContent="";
 try{
  // Re-read product docs and validate stock/prices. For high-volume stores, move checkout to a trusted Cloud Function transaction.
  const fresh=[];for(const line of lines){const snap=await getDoc(doc(db,"products",line.id));if(!snap.exists())throw new Error(`${line.name} is no longer available.`);const p=snap.data();if(!p.active||p.stock<line.qty)throw new Error(`Stock changed for ${line.name}. Update your cart and try again.`);fresh.push({productId:line.id,name:p.name,price:p.price,qty:line.qty,lineTotal:p.price*line.qty});}
  const total=fresh.reduce((s,p)=>s+p.lineTotal,0),method=$("paymentMethod").value;
  const order={userId:currentUser.uid,customerEmail:currentUser.email||"",customerName:$("shipName").value.trim(),phone:$("shipPhone").value.trim(),address:$("shipAddress").value.trim(),city:$("shipCity").value.trim(),pinCode:$("shipPin").value.trim(),items:fresh,total,paymentMethod:method,paymentStatus:method==="cod"?"cash_on_delivery":"pending_verification",upiReference:$("upiReference").value.trim(),status:"placed",createdAt:serverTimestamp()};
  const ref=await addDoc(collection(db,"orders"),order);cart={};saveCart();closeDialog("checkoutDialog");$("successText").textContent=`Order ${ref.id} has been placed for ${money(total)}. ${method==="upi"?"UPI payment is pending verification.":"Pay cash when your order is delivered."}`;openDialog("successDialog");$("checkoutForm").reset();$("upiInstructions").classList.add("hidden");
 }catch(err){$("checkoutError").textContent=err.message||"Could not place order. Please try again.";}finally{$("placeOrderBtn").disabled=false;}
});
async function renderOrders(){
 $("ordersList").innerHTML='<p class="muted">Loading your orders…</p>';
 try{const q=query(collection(db,"orders"),where("userId","==",currentUser.uid));const snap=await getDocs(q);const orders=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(Number(b.createdAt)||0)-(Number(a.createdAt)||0));
 $("ordersList").innerHTML=orders.length?orders.map(o=>`<div class="order-card"><div class="cart-details"><strong>Order ${safeText(o.id.slice(-8).toUpperCase())} · ${money(o.total)}</strong><div class="order-meta">${(o.items||[]).map(i=>`${safeText(i.name)} × ${i.qty}`).join(", ")}</div><div class="order-meta">Payment: ${safeText(o.paymentMethod==="upi"?"UPI":"Cash on Delivery")} · ${safeText(o.paymentStatus||"pending")}</div></div><span class="status-pill ${o.status==="cancelled"?"pending":""}">${safeText(o.status||"placed")}</span></div>`).join(""):'<div class="empty-state">You have no orders yet.</div>';
 }catch(err){$("ordersList").innerHTML='<p class="error">Could not load orders. Please try again.</p>';console.error(err);}
}
updateCartCount();watchProducts();
