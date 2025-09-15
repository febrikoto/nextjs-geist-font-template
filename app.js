// App State and Utilities
const APP_VERSION = '1.0.0';
const STORAGE_KEYS = {
  theme: 'app.theme',
  presensi: 'data.presensi.v1',
  bukuTamu: 'data.bukutamu.v1',
  version: 'data.version'
};

function getStoredJson(key, fallback){
  try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback }catch{ return fallback }
}
function setStoredJson(key, value){ localStorage.setItem(key, JSON.stringify(value)) }

function downloadCsv(filename, rows){
  const escapeCsv = (v)=>{
    if(v == null) return '';
    const s = String(v).replaceAll('"', '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const csv = rows.map(r=>r.map(escapeCsv).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// Theme
const themeToggle = document.getElementById('themeToggle');
const htmlEl = document.documentElement;
const storedTheme = localStorage.getItem(STORAGE_KEYS.theme);
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
if(storedTheme){ htmlEl.setAttribute('data-theme', storedTheme); themeToggle.checked = storedTheme === 'dark' }
else { const t = prefersDark ? 'dark' : 'light'; htmlEl.setAttribute('data-theme', t); themeToggle.checked = t==='dark' }
themeToggle.addEventListener('change', ()=>{
  const t = themeToggle.checked ? 'dark' : 'light';
  htmlEl.setAttribute('data-theme', t);
  localStorage.setItem(STORAGE_KEYS.theme, t);
});

// Tabs
document.querySelectorAll('.tab').forEach(tab=>{
  tab.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.getAttribute('data-target');
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.querySelector(target).classList.add('active');
  });
});

// Data
let presensiList = getStoredJson(STORAGE_KEYS.presensi, []);
let bukuTamuList = getStoredJson(STORAGE_KEYS.bukuTamu, []);
localStorage.setItem(STORAGE_KEYS.version, APP_VERSION);

function saveAll(){
  setStoredJson(STORAGE_KEYS.presensi, presensiList);
  setStoredJson(STORAGE_KEYS.bukuTamu, bukuTamuList);
}

// Components
// Minimal SignaturePad fallback (offline-safe) if CDN is unavailable
if(typeof window.SignaturePad === 'undefined'){
  class SignaturePadFallback{
    constructor(canvas){
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ctx.lineWidth = 2;
      this.ctx.lineCap = 'round';
      this.drawing = false;
      this.hasStroke = false;
      this._bind();
    }
    _bind(){
      const c = this.canvas;
      const start = (x,y)=>{ this.drawing = true; this.hasStroke = true; this.ctx.beginPath(); this.ctx.moveTo(x,y) };
      const move = (x,y)=>{ if(!this.drawing) return; this.ctx.lineTo(x,y); this.ctx.stroke() };
      const end = ()=>{ this.drawing = false };
      const getPos = (e)=>{
        const r = c.getBoundingClientRect();
        if(e.touches && e.touches[0]){
          return { x: (e.touches[0].clientX - r.left) * (c.width / r.width), y: (e.touches[0].clientY - r.top) * (c.height / r.height) };
        }
        return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
      };
      c.addEventListener('pointerdown', (e)=>{ c.setPointerCapture(e.pointerId); const p = getPos(e); start(p.x, p.y) });
      c.addEventListener('pointermove', (e)=>{ const p = getPos(e); move(p.x, p.y) });
      c.addEventListener('pointerup', end);
      c.addEventListener('pointercancel', end);
      c.addEventListener('touchstart', (e)=>{ const p = getPos(e); start(p.x, p.y) }, {passive:true});
      c.addEventListener('touchmove', (e)=>{ const p = getPos(e); move(p.x, p.y) }, {passive:true});
      c.addEventListener('touchend', end);
      c.addEventListener('mousedown', (e)=>{ const p = getPos(e); start(p.x, p.y) });
      c.addEventListener('mousemove', (e)=>{ const p = getPos(e); move(p.x, p.y) });
      c.addEventListener('mouseup', end);
      c.addEventListener('mouseleave', end);
    }
    clear(){
      this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
      this.hasStroke = false;
    }
    isEmpty(){ return !this.hasStroke }
    toDataURL(type='image/png'){ return this.canvas.toDataURL(type) }
  }
  window.SignaturePad = SignaturePadFallback;
}

function renderPresensi(){
  const root = document.getElementById('view-presensi');
  root.innerHTML = ''+
  `<div class="card grid" style="gap:1rem">
     <div class="toolbar">
       <div class="filters">
         <label class="field" style="min-width:220px">
           <span>Cari nama</span>
           <input id="presensiSearch" type="text" placeholder="Ketik nama..." />
         </label>
         <label class="field">
           <span>Tipe</span>
           <select id="presensiRole">
             <option value="">Semua</option>
             <option value="guru">Guru</option>
             <option value="pegawai">Pegawai</option>
           </select>
         </label>
         <label class="field">
           <span>Tanggal</span>
           <input id="presensiDate" type="date" />
         </label>
       </div>
       <div class="row">
         <button id="btnPresensiAdd" class="btn primary">Tambah</button>
         <button id="btnPresensiCsv" class="btn">Ekspor CSV</button>
       </div>
     </div>

     <div class="card" style="padding:0">
       <div style="overflow:auto; max-height: 60vh">
         <table>
           <thead>
             <tr>
               <th>Waktu</th>
               <th>Nama</th>
               <th>Tipe</th>
               <th>Status</th>
               <th>Keterangan</th>
             </tr>
           </thead>
           <tbody id="presensiTable"></tbody>
         </table>
       </div>
     </div>
   </div>`;

  const searchEl = document.getElementById('presensiSearch');
  const roleEl = document.getElementById('presensiRole');
  const dateEl = document.getElementById('presensiDate');
  const tbody = document.getElementById('presensiTable');
  const btnAdd = document.getElementById('btnPresensiAdd');
  const btnCsv = document.getElementById('btnPresensiCsv');

  function applyFilters(){
    const q = (searchEl.value||'').toLowerCase();
    const r = roleEl.value;
    const d = dateEl.value;
    const rows = presensiList.filter(it=>{
      const matchName = it.nama.toLowerCase().includes(q);
      const matchRole = !r || it.tipe === r;
      const matchDate = !d || it.tanggal === d;
      return matchName && matchRole && matchDate;
    });
    tbody.innerHTML = rows.map(it=>{
      return `<tr>
        <td data-label="Waktu">${it.waktu}</td>
        <td data-label="Nama">${it.nama}</td>
        <td data-label="Tipe">${it.tipe}</td>
        <td data-label="Status">${it.status}</td>
        <td data-label="Keterangan">${it.keterangan||''}</td>
      </tr>`
    }).join('');
  }

  searchEl.addEventListener('input', applyFilters);
  roleEl.addEventListener('change', applyFilters);
  dateEl.addEventListener('change', applyFilters);
  btnCsv.addEventListener('click', ()=>{
    const rows = [["Tanggal","Waktu","Nama","Tipe","Status","Keterangan"], ...presensiList.map(it=>[it.tanggal,it.waktu,it.nama,it.tipe,it.status,it.keterangan||''])];
    downloadCsv('presensi.csv', rows);
  });
  btnAdd.addEventListener('click', ()=> openPresensiDialog());

  applyFilters();
}

function openPresensiDialog(){
  const dialog = document.createElement('dialog');
  dialog.innerHTML = `
    <form method="dialog" class="card grid" style="min-width: min(560px, 96vw); gap:.75rem">
      <h3 style="margin:0">Tambah Presensi</h3>
      <div class="row" style="gap:.75rem">
        <label class="field" style="flex:1">
          <span>Nama</span>
          <input required id="fNama" type="text" placeholder="Nama lengkap" />
        </label>
        <label class="field">
          <span>Tipe</span>
          <select id="fTipe" required>
            <option value="guru">Guru</option>
            <option value="pegawai">Pegawai</option>
          </select>
        </label>
      </div>
      <div class="row" style="gap:.75rem">
        <label class="field">
          <span>Status</span>
          <select id="fStatus" required>
            <option value="hadir">Hadir</option>
            <option value="izin">Izin</option>
            <option value="sakit">Sakit</option>
            <option value="alpha">Alpha</option>
          </select>
        </label>
        <label class="field">
          <span>Tanggal</span>
          <input id="fTanggal" type="date" required />
        </label>
        <label class="field" style="flex:1">
          <span>Keterangan</span>
          <input id="fKet" type="text" placeholder="Opsional" />
        </label>
      </div>
      <div class="row" style="justify-content:flex-end; gap:.5rem">
        <button class="btn" value="cancel">Batal</button>
        <button class="btn primary" id="btnSimpan" value="default">Simpan</button>
      </div>
    </form>`;
  document.body.appendChild(dialog);
  dialog.addEventListener('close', ()=> dialog.remove());
  dialog.showModal();
  const fNama = dialog.querySelector('#fNama');
  const fTipe = dialog.querySelector('#fTipe');
  const fStatus = dialog.querySelector('#fStatus');
  const fTanggal = dialog.querySelector('#fTanggal');
  const fKet = dialog.querySelector('#fKet');
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth()+1).padStart(2,'0');
  const dd = String(today.getDate()).padStart(2,'0');
  const HH = String(today.getHours()).padStart(2,'0');
  const MM = String(today.getMinutes()).padStart(2,'0');
  fTanggal.value = `${yyyy}-${mm}-${dd}`;
  fNama.focus();

  dialog.querySelector('#btnSimpan').addEventListener('click', (e)=>{
    e.preventDefault();
    if(!fNama.value || !fTanggal.value) return;
    const item = {
      id: crypto.randomUUID(),
      tanggal: fTanggal.value,
      waktu: `${HH}:${MM}`,
      nama: fNama.value.trim(),
      tipe: fTipe.value,
      status: fStatus.value,
      keterangan: fKet.value.trim()
    };
    presensiList.unshift(item);
    saveAll();
    renderPresensi();
    dialog.close();
  });
}

function renderBukuTamu(){
  const root = document.getElementById('view-bukutamu');
  root.innerHTML = ''+
  `<div class="grid" style="gap:1rem">
     <div class="card grid">
       <h3 style="margin:0">Form Buku Tamu</h3>
       <div class="row">
         <label class="field" style="flex:1">
           <span>Nama</span>
           <input id="tamuNama" type="text" placeholder="Nama lengkap" />
         </label>
         <label class="field" style="flex:1">
           <span>Instansi</span>
           <input id="tamuInstansi" type="text" placeholder="Asal/Instansi" />
         </label>
       </div>
       <label class="field">
         <span>Keperluan</span>
         <input id="tamuKeperluan" type="text" placeholder="Tujuan kedatangan" />
       </label>
       <div class="grid">
         <span>Tanda Tangan</span>
         <div class="card" style="padding:.5rem">
           <canvas id="pad" style="width:100%; height:220px; background:var(--bg); border:1px dashed var(--border); border-radius:.5rem"></canvas>
           <div class="row" style="justify-content:space-between; margin-top:.5rem">
             <button id="btnPadClear" class="btn">Bersihkan</button>
             <button id="btnTamuSubmit" class="btn primary">Simpan Tamu</button>
           </div>
         </div>
       </div>
     </div>

     <div class="card grid">
       <div class="toolbar">
         <div class="filters">
           <label class="field" style="min-width:220px">
             <span>Cari nama/instansi</span>
             <input id="tamuSearch" type="text" placeholder="Ketik..." />
           </label>
           <label class="field">
             <span>Tanggal</span>
             <input id="tamuDate" type="date" />
           </label>
         </div>
         <div class="row">
           <button id="btnTamuCsv" class="btn">Ekspor CSV</button>
         </div>
       </div>
       <div style="overflow:auto; max-height: 60vh">
         <table>
           <thead>
             <tr>
               <th>Waktu</th>
               <th>Nama</th>
               <th>Instansi</th>
               <th>Keperluan</th>
             </tr>
           </thead>
           <tbody id="tamuTable"></tbody>
         </table>
       </div>
     </div>
   </div>`;

  const canvas = document.getElementById('pad');
  // Fit canvas to container width/height
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * devicePixelRatio);
  canvas.height = Math.floor(220 * devicePixelRatio);
  const ctx = canvas.getContext('2d');
  ctx.scale(devicePixelRatio, devicePixelRatio);
  const signaturePad = new SignaturePad(canvas, { backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() });

  const namaEl = document.getElementById('tamuNama');
  const instansiEl = document.getElementById('tamuInstansi');
  const kepEl = document.getElementById('tamuKeperluan');
  const btnClear = document.getElementById('btnPadClear');
  const btnSubmit = document.getElementById('btnTamuSubmit');

  btnClear.addEventListener('click', ()=> signaturePad.clear());
  btnSubmit.addEventListener('click', ()=>{
    if(!namaEl.value.trim()) { namaEl.focus(); return }
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth()+1).padStart(2,'0');
    const dd = String(now.getDate()).padStart(2,'0');
    const HH = String(now.getHours()).padStart(2,'0');
    const MM = String(now.getMinutes()).padStart(2,'0');
    const dataUrl = signaturePad.isEmpty() ? '' : signaturePad.toDataURL('image/png');
    bukuTamuList.unshift({
      id: crypto.randomUUID(),
      tanggal: `${yyyy}-${mm}-${dd}`,
      waktu: `${HH}:${MM}`,
      nama: namaEl.value.trim(),
      instansi: instansiEl.value.trim(),
      keperluan: kepEl.value.trim(),
      ttd: dataUrl
    });
    saveAll();
    renderBukuTamu();
  });

  const searchEl = document.getElementById('tamuSearch');
  const dateEl = document.getElementById('tamuDate');
  const tbody = document.getElementById('tamuTable');
  const btnCsv = document.getElementById('btnTamuCsv');

  function applyFilters(){
    const q = (searchEl.value||'').toLowerCase();
    const d = dateEl.value;
    const rows = bukuTamuList.filter(it=>{
      const matchQ = `${it.nama} ${it.instansi}`.toLowerCase().includes(q);
      const matchDate = !d || it.tanggal === d;
      return matchQ && matchDate;
    });
    tbody.innerHTML = rows.map(it=>{
      return `<tr>
        <td data-label="Waktu">${it.tanggal} ${it.waktu}</td>
        <td data-label="Nama">${it.nama}</td>
        <td data-label="Instansi">${it.instansi}</td>
        <td data-label="Keperluan">${it.keperluan}</td>
      </tr>`
    }).join('');
  }

  btnCsv.addEventListener('click', ()=>{
    const rows = [["Tanggal","Waktu","Nama","Instansi","Keperluan"], ...bukuTamuList.map(it=>[it.tanggal,it.waktu,it.nama,it.instansi,it.keperluan])];
    downloadCsv('buku_tamu.csv', rows);
  });
  searchEl.addEventListener('input', applyFilters);
  dateEl.addEventListener('change', applyFilters);
  applyFilters();
}

renderPresensi();
renderBukuTamu();

// PWA
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  });
}

// Install prompt
let deferredPrompt = null;
const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});
installBtn.addEventListener('click', async ()=>{
  if(!deferredPrompt) return;
  installBtn.disabled = true;
  await deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
});

