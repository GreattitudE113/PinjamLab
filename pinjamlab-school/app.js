// Isi dua nilai ini setelah membuat project Supabase. Jangan pernah memasukkan service_role key di sini.
const SUPABASE_URL = "ISI_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "ISI_SUPABASE_PUBLISHABLE_OR_ANON_KEY";
const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("ISI_") && !SUPABASE_ANON_KEY.includes("ISI_");
const db = configured && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const CLASSES = ["10 TKJ 1","10 TKJ 2","10 ACP","10 AKL","10 TSM 1","10 TSM 2","11 ACP","11 TKJ","11 TSM","12 ACP","12 TKJ 1","12 TKJ 2","12 TSM","12 AKL"];
const CLASS_CATEGORY = Object.fromEntries(CLASSES.map(c => [c, c.includes("TKJ") || c.includes("ACP") ? "TKJ" : c.includes("TSM") ? "TSM" : "AKL"]));
const $ = id => document.getElementById(id);
let equipmentRows = [];
let cart = [];
let currentSession = null;
let toastTimer;

function toast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 3600);
}
function localDate(d = new Date()) {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0,10);
}
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function fillClasses() {
  $("studentClass").innerHTML = '<option value="">Pilih kelas</option>' + CLASSES.map(c => `<option>${c}</option>`).join("");
}
function setEquipmentOptions() {
  const cls = $("studentClass").value;
  const category = CLASS_CATEGORY[cls];
  cart = []; renderCart();
  if (!category) { $("equipment").innerHTML = '<option value="">Pilih kelas terlebih dahulu</option>'; $("equipment").disabled = true; $("addItem").disabled = true; $("stockValue").textContent = "Pilih alat dahulu"; return; }
  const rows = equipmentRows.filter(x => x.category === category && x.is_active);
  $("equipment").innerHTML = '<option value="">Pilih alat</option>' + rows.map(x => `<option value="${x.id}">${escapeHTML(x.name)}</option>`).join("");
  $("equipment").disabled = false; $("addItem").disabled = rows.length === 0;
  if (!rows.length) $("equipment").innerHTML = '<option value="">Belum ada inventaris aktif untuk jurusan ini</option>';
  updateStock();
}
function selectedEquipment() { return equipmentRows.find(x => x.id === $("equipment").value); }
function updateStock() {
  const row = selectedEquipment();
  $("stockValue").textContent = row ? `${row.available_stock} unit tersedia` : "Pilih alat dahulu";
}
function renderCart() {
  $("cartWrap").classList.toggle("hidden", cart.length === 0);
  $("cartCount").textContent = `${cart.length} jenis`;
  $("cartItems").innerHTML = cart.map((x,i)=>`<div class="cart-item"><span>${escapeHTML(x.name)} <b>× ${x.quantity}</b></span><button type="button" data-remove="${i}">Hapus</button></div>`).join("");
  $("cartItems").querySelectorAll("[data-remove]").forEach(b => b.addEventListener("click", () => { cart.splice(Number(b.dataset.remove),1); renderCart(); }));
}
async function loadEquipment() {
  if (!db) {
    $("stockValue").textContent = "Konfigurasi backend belum diisi";
    return;
  }
  const { data, error } = await db.from("equipment").select("id,name,category,total_stock,available_stock,is_active").eq("is_active",true).order("name");
  if (error) { toast("Gagal memuat inventaris: " + error.message); return; }
  equipmentRows = data || []; setEquipmentOptions();
}
function validateDates() {
  const borrow = $("borrowDate").value, ret = $("returnDate").value;
  $("returnDate").min = borrow || localDate();
  return borrow && ret && borrow >= localDate() && ret >= borrow;
}
async function submitBorrow(e) {
  e.preventDefault();
  if (!db) return toast("Website belum dikonfigurasi. Ikuti README untuk menghubungkan Supabase.");
  if (!cart.length) return toast("Tambahkan minimal satu alat ke daftar.");
  if (!validateDates()) return toast("Periksa tanggal peminjaman dan pengembalian.");
  const payload = {
    p_student_name: $("studentName").value.trim(),
    p_class_name: $("studentClass").value,
    p_purpose: $("purpose").value.trim() || null,
    p_borrow_date: $("borrowDate").value,
    p_expected_return_date: $("returnDate").value,
    p_items: cart.map(x => ({equipment_id:x.id, quantity:x.quantity}))
  };
  $("submitBtn").disabled = true; $("submitBtn").textContent = "Mengirim...";
  const { data, error } = await db.rpc("submit_borrow_request", payload);
  $("submitBtn").disabled = false; $("submitBtn").innerHTML = 'Kirim permohonan <span>↗</span>';
  if (error) return toast("Permohonan gagal: " + error.message);
  toast(`Permohonan berhasil dikirim. Kode: ${data}`);
  $("borrowForm").reset(); $("quantity").value = 1; cart = []; renderCart(); setEquipmentOptions();
}
async function openAdmin() {
  if (!db) return toast("Supabase belum dikonfigurasi. Lihat README.");
  $("adminDialog").showModal();
}
async function loginAdmin(e) {
  e.preventDefault();
  const {data,error} = await db.auth.signInWithPassword({email:$("adminEmail").value.trim(),password:$("adminPassword").value});
  if (error) return toast("Login gagal: " + error.message);
  currentSession = data.session; $("adminDialog").close(); $("adminIdentity").textContent = data.user.email;
  await loadAdminRequests(); $("adminPanel").showModal();
}
async function loadAdminRequests() {
  $("adminRequests").innerHTML = '<p class="muted">Memuat data...</p>';
  const {data,error} = await db.from("borrow_requests").select("id,request_code,student_name,class_name,purpose,borrow_date,expected_return_date,status,created_at,borrow_request_items(quantity,equipment(name))").order("created_at",{ascending:false}).limit(100);
  if (error) { $("adminRequests").innerHTML = `<p class="muted">${escapeHTML(error.message)}</p>`; return; }
  if (!data.length) { $("adminRequests").innerHTML = '<p class="muted">Belum ada permohonan.</p>'; return; }
  $("adminRequests").innerHTML = data.map(r => {
    const items = (r.borrow_request_items||[]).map(i=>`${escapeHTML(i.equipment?.name||"Alat")} × ${i.quantity}`).join("<br>");
    const actions = r.status==="pending" ? `<button data-action="approve" data-id="${r.id}">Setujui</button><button data-action="reject" data-id="${r.id}">Tolak</button>` :
      r.status==="approved" ? `<button data-action="taken" data-id="${r.id}">Catat sudah diambil</button>` :
      r.status==="borrowed" ? `<button data-action="returned" data-id="${r.id}">Konfirmasi dikembalikan</button>` : "";
    return `<article class="request-card"><div class="request-top"><b>${escapeHTML(r.student_name)} · ${escapeHTML(r.class_name)}</b><span class="secure-pill">${escapeHTML(statusLabel(r.status))}</span></div><div class="request-meta">Kode ${escapeHTML(r.request_code)} · Pinjam ${r.borrow_date} · Rencana kembali ${r.expected_return_date}<br>${escapeHTML(r.purpose||"Tanpa keterangan keperluan")}</div><div class="request-items">${items}</div><div class="request-actions">${actions}</div></article>`;
  }).join("");
  $("adminRequests").querySelectorAll("[data-action]").forEach(b=>b.addEventListener("click",()=>handleRequestAction(b.dataset.id,b.dataset.action)));
}
function statusLabel(s){return ({pending:"Menunggu",approved:"Disetujui",rejected:"Ditolak",borrowed:"Sudah diambil",returned:"Dikembalikan"})[s]||s}
async function handleRequestAction(id,action) {
  const map = {approve:"approve_borrow_request",reject:"reject_borrow_request",taken:"mark_borrowed",returned:"confirm_return"};
  const {error} = await db.rpc(map[action],{p_request_id:id});
  if(error) return toast("Aksi gagal: "+error.message);
  toast("Status permohonan berhasil diperbarui."); await loadAdminRequests(); await loadEquipment();
}
async function logoutAdmin(){await db.auth.signOut(); currentSession=null; $("adminPanel").close(); toast("Berhasil keluar.");}

document.addEventListener("DOMContentLoaded", async () => {
  $("year").textContent = new Date().getFullYear(); fillClasses();
  $("borrowDate").min = localDate(); $("borrowDate").value = localDate(); $("returnDate").min = localDate();
  $("studentClass").addEventListener("change",setEquipmentOptions);
  $("equipment").addEventListener("change",updateStock);
  $("borrowDate").addEventListener("change",()=>{$("returnDate").min=$("borrowDate").value; if($("returnDate").value < $("borrowDate").value) $("returnDate").value=$("borrowDate").value;});
  $("addItem").addEventListener("click",()=>{
    const row=selectedEquipment(), qty=Number($("quantity").value);
    if(!row) return toast("Pilih alat terlebih dahulu.");
    if(!Number.isInteger(qty)||qty<1) return toast("Jumlah harus berupa bilangan bulat minimal 1.");
    const existing=cart.find(x=>x.id===row.id);
    if(existing) existing.quantity+=qty; else cart.push({id:row.id,name:row.name,quantity:qty});
    renderCart(); toast("Alat ditambahkan ke daftar.");
  });
  $("borrowForm").addEventListener("submit",submitBorrow);
  $("adminOpen").addEventListener("click",openAdmin);
  $("adminLogin").addEventListener("submit",loginAdmin);
  $("closePanel").addEventListener("click",()=>$("adminPanel").close());
  $("logoutBtn").addEventListener("click",logoutAdmin);
  $("refreshBtn").addEventListener("click",loadAdminRequests);
  if(db) await loadEquipment();
});
