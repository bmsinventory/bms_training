/* ══════════════════════════════════════════════
   DATA STORE
══════════════════════════════════════════════ */
const CM={
  blue:{bg:'#e8f0fb',c:'#1a56a0'},teal:{bg:'#d1fae5',c:'#065f46'},
  amber:{bg:'#fef3c7',c:'#92400e'},red:{bg:'#fee2e2',c:'#991b1b'},
  purple:{bg:'#ede9fe',c:'#5b21b6'},green:{bg:'#dcfce7',c:'#166534'}
};

let categories=[
  {id:1,name:'การรับสินค้า (Receiving)',desc:'ขั้นตอนรับสินค้าเข้าคลัง, ตรวจนับ, GR',icon:'package-import',color:'blue'},
  {id:2,name:'การจัดเก็บสินค้า (Putaway)',desc:'การจัดวาง, Bin Location, FEFO/FIFO',icon:'archive',color:'teal'},
  {id:3,name:'การเบิกจ่าย (Picking)',desc:'การหยิบสินค้า, Wave Picking, Packing',icon:'truck-delivery',color:'amber'},
  {id:4,name:'การนับสต๊อก (Inventory)',desc:'Cycle Count, Annual Count, Stock Adj.',icon:'clipboard-check',color:'green'},
];

let trainers=['ทีม WMS Support','คุณสมชาย ใจดี','คุณวิไล รักษา','คุณรัตนา เก่งกว่า'];
let venues=['ห้องอบรม A','ห้องอบรม B','ห้องประชุมใหญ่','ห้อง Training 1','ออนไลน์ (Zoom)'];
let departments=['คลังสินค้า','จัดซื้อ','ขนส่ง / โลจิสติกส์','บัญชี / การเงิน','ไอที','ฝ่ายผลิต','ทรัพยากรบุคคล'];
let prefixes=['นาย','นาง','นางสาว','ดร.','ผศ.ดร.','รศ.ดร.'];

let sessions=[
  {id:1,catId:1,name:'รอบที่ 1 – กลุ่ม A',date:'2025-06-10',timeStart:'09:00',timeEnd:'12:00',venue:'ห้องอบรม A',trainer:'ทีม WMS Support',capacity:20},
  {id:2,catId:1,name:'รอบที่ 2 – กลุ่ม B',date:'2025-06-11',timeStart:'13:00',timeEnd:'16:00',venue:'ห้องอบรม A',trainer:'คุณสมชาย ใจดี',capacity:15},
  {id:3,catId:2,name:'รอบที่ 1',date:'2025-06-12',timeStart:'09:00',timeEnd:'16:00',venue:'ห้องอบรม B',trainer:'คุณวิไล รักษา',capacity:18},
  {id:4,catId:3,name:'รอบที่ 1 – เช้า',date:'2025-06-13',timeStart:'09:00',timeEnd:'12:00',venue:'ห้องประชุมใหญ่',trainer:'ทีม WMS Support',capacity:25},
  {id:5,catId:4,name:'รอบที่ 1',date:'2025-06-20',timeStart:'09:00',timeEnd:'12:00',venue:'ห้องอบรม A',trainer:'คุณรัตนา เก่งกว่า',capacity:12},
];

let registrations=[
  {id:1,sessionId:1,prefix:'นาย',fname:'สมศักดิ์',lname:'มั่นใจ',position:'พนักงานคลัง',dept:'คลังสินค้า',regDate:'2025-05-20',attended:false,attendedTime:null},
  {id:2,sessionId:1,prefix:'นางสาว',fname:'วิภา',lname:'สุขใจ',position:'หัวหน้าแผนก',dept:'คลังสินค้า',regDate:'2025-05-21',attended:true,attendedTime:'09:05'},
  {id:3,sessionId:1,prefix:'นาย',fname:'ชาญชัย',lname:'หาญกล้า',position:'ผู้ช่วยผู้จัดการ',dept:'คลังสินค้า',regDate:'2025-05-22',attended:true,attendedTime:'09:12'},
  {id:4,sessionId:2,prefix:'นาย',fname:'ปิติ',lname:'ดีมาก',position:'เจ้าหน้าที่จัดซื้อ',dept:'จัดซื้อ',regDate:'2025-05-22',attended:false,attendedTime:null},
  {id:5,sessionId:3,prefix:'นางสาว',fname:'รัตนา',lname:'เก่งกว่า',position:'พนักงานขนส่ง',dept:'ขนส่ง / โลจิสติกส์',regDate:'2025-05-22',attended:false,attendedTime:null},
  {id:6,sessionId:4,prefix:'นาง',fname:'สุดา',lname:'ใจงาม',position:'เจ้าหน้าที่คลัง',dept:'คลังสินค้า',regDate:'2025-05-23',attended:false,attendedTime:null},
];

let nextId=7,nextSessId=6,nextCatId=5;
let selectedCatId=null,selectedSessId=null,sessFilt='all';
let scanStream=null,scanInterval=null,scanLog=[];

/* ══════════════════ HELPERS ══════════════════ */
const getCount=sid=>registrations.filter(r=>r.sessionId===sid).length;
const getAttCount=sid=>registrations.filter(r=>r.sessionId===sid&&r.attended).length;
const getCat=id=>categories.find(c=>c.id===id);
const getSess=id=>sessions.find(s=>s.id===id);
const getReg=id=>registrations.find(r=>r.id===id);
const fmtDate=d=>{if(!d)return'-';return new Date(d).toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric'})};
const fmtDateShort=d=>{if(!d)return'-';return new Date(d).toLocaleDateString('th-TH',{year:'2-digit',month:'short',day:'numeric'})};
const getDay=d=>new Date(d).getDate();
const getMon=d=>new Date(d).toLocaleDateString('th-TH',{month:'short'});
const capCls=p=>p>=100?'cap-full':p>=75?'cap-high':p>=50?'cap-mid':'cap-low';
const capBadge=p=>{
  if(p>=100)return'<span class="badge badge-danger"><i class="ti ti-lock"></i>เต็มแล้ว</span>';
  if(p>=75)return'<span class="badge badge-warn"><i class="ti ti-alert-triangle"></i>ใกล้เต็ม</span>';
  return'<span class="badge badge-success"><i class="ti ti-circle-check"></i>มีที่ว่าง</span>';
};
const nowTime=()=>new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});
const sessTxt=s=>s?`${s.timeStart||''} – ${s.timeEnd||''} น.`:'';

/* ══════════════════ PAGE NAV ══════════════════ */
function showPage(p){
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(x=>x.classList.remove('active'));
  document.getElementById('page-'+p).classList.add('active');
  document.getElementById('tab-'+p).classList.add('active');
  if(p==='register')goBackToCategories();
  if(p==='checkin'){initCheckinPage();}
  if(p==='track'){populateTrackFilters();trackSearch();}
  if(p==='admin')renderAdmin();
}
function switchCheckinTab(tab, el){
  document.querySelectorAll('.checkin-subtab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.checkin-sub').forEach(s=>s.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('csub-'+tab).classList.add('active');
  if(tab==='list')initAttendancePage();
}
function initCheckinPage(){
  updateCheckinHeroStats();
  // default sub tab = scan
  document.querySelectorAll('.checkin-subtab').forEach((t,i)=>t.classList.toggle('active',i===0));
  document.querySelectorAll('.checkin-sub').forEach((s,i)=>s.classList.toggle('active',i===0));
}
function updateCheckinHeroStats(){
  const total=registrations.length;
  const present=registrations.filter(r=>r.attended).length;
  const absent=total-present;
  const pct=total?Math.round(present/total*100):0;
  const el=document.getElementById('checkin-live-stats');
  if(!el)return;
  el.innerHTML=`
    <div class="hero-stat"><div class="hero-stat-num">${total}</div><div class="hero-stat-lbl">ลงทะเบียน</div></div>
    <div class="hero-stat" style="background:rgba(16,185,129,.2);border-color:rgba(16,185,129,.3);"><div class="hero-stat-num" style="color:#6ee7b7;">${present}</div><div class="hero-stat-lbl">เข้าอบรม</div></div>
    <div class="hero-stat" style="background:rgba(239,68,68,.15);border-color:rgba(239,68,68,.25);"><div class="hero-stat-num" style="color:#fca5a5;">${absent}</div><div class="hero-stat-lbl">ขาด</div></div>
    <div class="hero-stat" style="background:rgba(245,158,11,.15);border-color:rgba(245,158,11,.25);"><div class="hero-stat-num" style="color:var(--accent);">${pct}%</div><div class="hero-stat-lbl">เข้าร่วม</div></div>`;
}

/* ══════════════════ ADMIN TABS ══════════════════ */
function switchAdminTab(name){
  document.querySelectorAll('.admin-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.admin-section').forEach(s=>s.classList.remove('active'));
  event.currentTarget.classList.add('active');
  document.getElementById('asec-'+name).classList.add('active');
}

/* ══════════════════ STEP ══════════════════ */
function setStep(n){
  for(let i=1;i<=3;i++)document.getElementById('step'+i).className='step'+(i<n?' done':i===n?' active':'');
  document.getElementById('line1').className='step-line'+(n>1?' done':'');
  document.getElementById('line2').className='step-line'+(n>2?' done':'');
}

/* ══════════════════ REGISTER ══════════════════ */
function renderCategories(){
  document.getElementById('cat-grid').innerHTML=categories.map(c=>{
    const cm=CM[c.color]||CM.blue;
    const cs=sessions.filter(s=>s.catId===c.id);
    const totalCap=cs.reduce((a,s)=>a+s.capacity,0);
    const totalReg=cs.reduce((a,s)=>a+getCount(s.id),0);
    const avSess=cs.filter(s=>getCount(s.id)<s.capacity).length;
    const fillPct=totalCap?Math.round(totalReg/totalCap*100):0;
    const fillColor=fillPct>=100?'#ef4444':fillPct>=75?'#f97316':fillPct>=40?'#f59e0b':'#10b981';
    const avBadge=avSess>0
      ?`<span style="background:var(--success-light);color:#065f46;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;"><i class="ti ti-calendar-check" style="vertical-align:-1px;font-size:11px;"></i> ${avSess} รอบว่าง</span>`
      :`<span style="background:var(--danger-light);color:#991b1b;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;"><i class="ti ti-lock" style="vertical-align:-1px;font-size:11px;"></i> เต็มทุกรอบ</span>`;
    return`<div class="cat-card" onclick="selectCategory(${c.id})">
      <div class="cat-card-top">
        <div class="cat-icon-wrap" style="background:${cm.bg};color:${cm.c};"><i class="ti ti-${c.icon}"></i></div>
        <div class="cat-name">${c.name}</div>
        <div class="cat-desc">${c.desc}</div>
      </div>
      <div class="cat-cap-wrap">
        <div class="cat-cap-bar"><div class="cat-cap-fill" style="width:${Math.min(fillPct,100)}%;background:${fillColor};"></div></div>
        <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:11px;color:var(--text-muted);">
          <span>ลงทะเบียน ${totalReg}/${totalCap} คน</span>
          <span>${fillPct}%</span>
        </div>
      </div>
      <div class="cat-card-bottom">
        <div class="cat-stat"><i class="ti ti-calendar-event"></i><strong>${cs.length}</strong> รอบ</div>
        ${avBadge}
      </div>
    </div>`;
  }).join('');
}
function selectCategory(catId){
  selectedCatId=catId;setStep(2);
  document.getElementById('view-categories').style.display='none';
  document.getElementById('view-sessions').style.display='block';
  const cat=getCat(catId);
  document.getElementById('sessions-heading').innerHTML=`<i class="ti ti-calendar-event"></i>${cat.name}`;
  document.getElementById('breadcrumb').innerHTML=`<span class="breadcrumb-item" onclick="goBackToCategories()">ประเภทอบรม</span><span style="color:var(--border);">›</span><span>${cat.name}</span>`;
  sessFilt='all';
  document.querySelectorAll('#sess-filters .filter-tab').forEach((t,i)=>t.classList.toggle('active',i===0));
  renderSessionList();
}
function goBackToCategories(){
  selectedCatId=null;selectedSessId=null;setStep(1);
  document.getElementById('view-categories').style.display='block';
  document.getElementById('view-sessions').style.display='none';
  renderCategories();
}
function filterSess(type,el){
  sessFilt=type;
  document.querySelectorAll('#sess-filters .filter-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');renderSessionList();
}
function renderSessionList(){
  let list=sessions.filter(s=>s.catId===selectedCatId);
  if(sessFilt==='avail')list=list.filter(s=>getCount(s.id)<s.capacity);
  if(sessFilt==='full')list=list.filter(s=>getCount(s.id)>=s.capacity);
  const c=document.getElementById('session-list');
  if(!list.length){c.innerHTML='<div class="empty"><i class="ti ti-calendar-off"></i><p>ไม่มีรอบอบรม</p></div>';return;}
  c.innerHTML=list.map(s=>{
    const cnt=getCount(s.id),pct=Math.round(cnt/s.capacity*100),full=cnt>=s.capacity;
    return`<div class="sess-row ${full?'full':''}" onclick="${full?'':`openRegister(${s.id})`}">
      <div class="sess-date-box"><div class="sess-day">${getDay(s.date)}</div><div class="sess-month">${getMon(s.date)}</div></div>
      <div class="sess-info">
        <div class="sess-title">${s.name}</div>
        <div class="sess-detail">
          <span><i class="ti ti-clock"></i>${sessTxt(s)}</span>
          <span><i class="ti ti-map-pin"></i>${s.venue}</span>
          <span><i class="ti ti-user-check"></i>${s.trainer}</span>
        </div>
        <div class="cap-track"><div class="cap-fill ${capCls(pct)}" style="width:${Math.min(pct,100)}%;"></div></div>
        <div class="cap-text"><span>${cnt}/${s.capacity} คน</span><span>ว่าง ${Math.max(0,s.capacity-cnt)} ที่</span></div>
      </div>
      <div class="sess-right">
        ${capBadge(pct)}
        ${!full?`<div style="margin-top:8px;"><button class="btn btn-primary btn-sm" onclick="event.stopPropagation();openRegister(${s.id})"><i class="ti ti-edit"></i>ลงทะเบียน</button></div>`:''}
      </div>
    </div>`;
  }).join('');
}

function populateSelect(id,arr,placeholder='เลือก...'){
  const el=document.getElementById(id);if(!el)return;
  el.innerHTML=`<option value="">${placeholder}</option>`+arr.map(v=>`<option value="${v}">${v}</option>`).join('');
}
function openRegister(sessId){
  selectedSessId=sessId;setStep(3);
  const s=getSess(sessId),cat=getCat(s.catId),cnt=getCount(sessId);
  const left=s.capacity-cnt;
  document.getElementById('reg-sess-title').textContent=s.name;
  document.getElementById('reg-sess-meta').innerHTML=`
    <span><i class="ti ti-calendar" style="vertical-align:-2px;"></i> ${fmtDate(s.date)}</span>
    <span><i class="ti ti-clock" style="vertical-align:-2px;"></i> ${sessTxt(s)}</span>
    <span><i class="ti ti-map-pin" style="vertical-align:-2px;"></i> ${s.venue}</span>`;
  const barPct=Math.round(cnt/s.capacity*100);
  document.getElementById('reg-seat-info').innerHTML=`
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="flex:1;height:5px;background:rgba(255,255,255,.2);border-radius:3px;overflow:hidden;">
        <div style="width:${barPct}%;height:100%;background:${left<=3?'#fca5a5':'#6ee7b7'};border-radius:3px;"></div>
      </div>
      <span style="font-size:12px;font-weight:600;color:${left<=3?'#fca5a5':'#6ee7b7'};">ว่าง ${left} ที่นั่ง</span>
    </div>`;
  ['reg-fname','reg-lname','reg-pos'].forEach(id=>document.getElementById(id).value='');
  const prev=document.getElementById('reg-name-preview');
  if(prev)prev.style.display='none';
  populateSelect('reg-prefix',prefixes,'คำนำหน้า...');
  populateSelect('reg-dept',departments,'เลือกแผนก...');
  document.getElementById('modal-register').classList.add('open');
  setTimeout(()=>document.getElementById('reg-prefix').focus(),200);
}
function previewRegName(){
  const pre=document.getElementById('reg-prefix').value;
  const fn=document.getElementById('reg-fname').value.trim();
  const ln=document.getElementById('reg-lname').value.trim();
  const prev=document.getElementById('reg-name-preview');
  const txt=document.getElementById('reg-name-preview-txt');
  if(!prev)return;
  if(fn||ln){prev.style.display='flex';txt.textContent=`${pre} ${fn} ${ln}`.trim();}
  else{prev.style.display='none';}
}
function submitReg(){
  const prefix=document.getElementById('reg-prefix').value;
  const fname=document.getElementById('reg-fname').value.trim();
  const lname=document.getElementById('reg-lname').value.trim();
  const pos=document.getElementById('reg-pos').value.trim();
  const dept=document.getElementById('reg-dept').value;
  if(!prefix||!fname||!lname||!pos||!dept){showToast('กรุณากรอกข้อมูลให้ครบถ้วน','danger');return;}
  const s=getSess(selectedSessId);
  if(getCount(selectedSessId)>=s.capacity){showToast('ที่นั่งเต็มแล้ว','danger');return;}
  if(registrations.find(r=>r.sessionId===selectedSessId&&r.fname===fname&&r.lname===lname)){
    showToast(`${fname} ${lname} ลงทะเบียนรอบนี้แล้ว`,'danger');return;
  }
  const nr={id:nextId++,sessionId:selectedSessId,prefix,fname,lname,position:pos,dept,regDate:new Date().toISOString().split('T')[0],attended:false,attendedTime:null};
  registrations.push(nr);
  closeModal('modal-register');renderSessionList();renderCategories();
  showToast(`ลงทะเบียนสำเร็จ! ${prefix}${fname} ${lname}`,'success');
  setTimeout(()=>showQR(nr.id),600);
}

/* ══════════════════ QR CODE ══════════════════ */
function buildQRPayload(reg){
  const s=getSess(reg.sessionId);
  const cat=s?getCat(s.catId):null;
  return JSON.stringify({
    v:2,
    regId:reg.id,
    sessionId:reg.sessionId,
    name:`${reg.prefix||''}${reg.fname} ${reg.lname}`,
    sessName:s?s.name:'',
    catName:cat?cat.name:'',
    date:s?s.date:'',
    timeStart:s?s.timeStart:'',
    timeEnd:s?s.timeEnd:'',
    venue:s?s.venue:'',
    trainer:s?s.trainer:''
  });
}

/* ─── Pure-canvas QR renderer using qrcode-generator ─── */
function makeQRCanvas(text, size, darkColor){
  darkColor = darkColor || '#1a56a0';
  var qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  var modules = qr.getModuleCount();
  var cell = size / modules;
  var cvs = document.createElement('canvas');
  cvs.width = size; cvs.height = size;
  var ctx = cvs.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = darkColor;
  for(var row = 0; row < modules; row++){
    for(var col = 0; col < modules; col++){
      if(qr.isDark(row, col)){
        ctx.fillRect(
          Math.floor(col * cell), Math.floor(row * cell),
          Math.ceil(cell), Math.ceil(cell)
        );
      }
    }
  }
  return cvs;
}

function showQR(regId){
  var reg = getReg(regId); if(!reg) return;
  window._currentQRReg = reg;
  var s = getSess(reg.sessionId);
  var cat = s ? getCat(s.catId) : null;
  var inner = document.getElementById('qr-modal-inner');
  inner.innerHTML =
    '<div class="qr-card">' +
    '<div class="qr-box" id="qr-canvas-wrap" style="min-width:180px;min-height:180px;display:flex;align-items:center;justify-content:center;"></div>' +
    '<div class="qr-name">' + (reg.prefix||'') + reg.fname + ' ' + reg.lname + '</div>' +
    '<div style="font-size:12px;color:var(--text-muted);margin-top:2px;">' + (reg.position||'') + ' — ' + reg.dept + '</div>' +
    (s ? '<div class="qr-sess-box">' +
      (cat ? '<div class="qr-sess-row"><i class="ti ti-category"></i><span><strong>' + cat.name + '</strong></span></div>' : '') +
      '<div class="qr-sess-row"><i class="ti ti-calendar-event"></i><span><strong>' + s.name + '</strong></span></div>' +
      '<div class="qr-sess-row"><i class="ti ti-calendar"></i><span>' + fmtDate(s.date) + '</span></div>' +
      '<div class="qr-sess-row"><i class="ti ti-clock"></i><span>' + sessTxt(s) + '</span></div>' +
      '<div class="qr-sess-row"><i class="ti ti-map-pin"></i><span>' + s.venue + '</span></div>' +
      '<div class="qr-sess-row"><i class="ti ti-user-check"></i><span>' + s.trainer + '</span></div>' +
      '</div>' : '') +
    '<div class="qr-status-badge ' + (reg.attended?'present':'absent') + '">' +
    '<i class="ti ti-' + (reg.attended?'circle-check':'clock') + '"></i> ' +
    (reg.attended ? 'เช็คชื่อแล้ว — ' + reg.attendedTime : 'ยังไม่ได้เช็คชื่อ') +
    '</div>' +
    '<div class="qr-id">REG-' + String(reg.id).padStart(5,'0') + '</div>' +
    '</div>';

  document.getElementById('modal-qr').classList.add('open');

  requestAnimationFrame(function(){
    var wrap = document.getElementById('qr-canvas-wrap');
    if(!wrap) return;
    try {
      var qrCvs = makeQRCanvas(buildQRPayload(reg), 180, '#1a56a0');
      qrCvs.style.borderRadius = '6px';
      qrCvs.style.display = 'block';
      wrap.innerHTML = '';
      wrap.appendChild(qrCvs);
    } catch(e) {
      wrap.innerHTML = '<div style="width:180px;height:180px;background:#f1f5f9;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:11px;padding:8px;text-align:center;">QR Error: ' + e.message + '</div>';
    }
  });
}

function saveQRasImage(){
  var reg = window._currentQRReg;
  if(!reg){ showToast('ไม่พบข้อมูล QR','danger'); return; }
  var s = getSess(reg.sessionId);
  var btn = event.currentTarget;
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader"></i> กำลังสร้างรูป...';

  try {
    var W = 360, H = 580, dpr = 2;
    var card = document.createElement('canvas');
    card.width = W * dpr; card.height = H * dpr;
    var ctx = card.getContext('2d');
    ctx.scale(dpr, dpr);

    // Background
    var bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#eef4ff'); bg.addColorStop(1, '#dbeafe');
    drawRR(ctx, 0, 0, W, H, 18, bg);

    // Header
    var hg = ctx.createLinearGradient(0, 0, W, 0);
    hg.addColorStop(0, '#1a3a6b'); hg.addColorStop(1, '#1e65c0');
    drawRR(ctx, 0, 0, W, 62, {tl:18,tr:18,bl:0,br:0}, hg);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px Arial,sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('WMS Training', W/2, 26);
    ctx.font = '11px Arial,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('บัตรยืนยันเข้าอบรม', W/2, 44);

    // QR — pure canvas, synchronous
    var qrSize = 190, qrX = (W-qrSize)/2, qrY = 74;
    drawRR(ctx, qrX-10, qrY-8, qrSize+20, qrSize+20, 12, '#fff');
    var qrCvs = makeQRCanvas(buildQRPayload(reg), qrSize, '#1a56a0');
    ctx.drawImage(qrCvs, qrX, qrY, qrSize, qrSize);

    // REG ID
    var idY = qrY + qrSize + 22;
    ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center';
    ctx.fillText('REG-' + String(reg.id).padStart(5,'0'), W/2, idY);

    // Divider
    ctx.strokeStyle = '#bfdbfe'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(24, idY+10); ctx.lineTo(W-24, idY+10); ctx.stroke();

    // Name
    var nameY = idY + 32;
    ctx.font = 'bold 19px Arial,sans-serif'; ctx.fillStyle = '#1e293b'; ctx.textAlign = 'center';
    ctx.fillText((reg.prefix||'') + reg.fname + ' ' + reg.lname, W/2, nameY);
    ctx.font = '12px Arial,sans-serif'; ctx.fillStyle = '#64748b';
    ctx.fillText((reg.position||'') + ' — ' + reg.dept, W/2, nameY+19);

    // Info box
    var infoY = nameY + 36;
    var cat = s ? getCat(s.catId) : null;
    var rows = s ? [
      'ประเภท: ' + (cat ? cat.name : '-'),
      'รอบ: ' + s.name,
      'วันที่: ' + fmtDate(s.date),
      'เวลา: ' + sessTxt(s),
      'สถานที่: ' + s.venue,
      'วิทยากร: ' + s.trainer
    ] : [];
    var infoH = rows.length * 22 + 16;
    drawRR(ctx, 16, infoY, W-32, infoH, 10, 'rgba(255,255,255,0.88)');
    ctx.font = '12px Arial,sans-serif'; ctx.fillStyle = '#374151'; ctx.textAlign = 'left';
    rows.forEach(function(row, i){ ctx.fillText(row, 28, infoY + 22 + i*22); });

    // Status badge
    var badgeY = infoY + infoH + 14;
    var ok = reg.attended;
    drawRR(ctx, (W-210)/2, badgeY, 210, 30, 15, ok ? '#d1fae5' : '#f1f5f9');
    ctx.font = 'bold 12px Arial,sans-serif';
    ctx.fillStyle = ok ? '#065f46' : '#64748b'; ctx.textAlign = 'center';
    ctx.fillText(ok ? '✓ เช็คชื่อแล้ว — ' + reg.attendedTime : 'ยังไม่ได้เช็คชื่อ', W/2, badgeY+20);

    // Download
    var link = document.createElement('a');
    link.download = 'QR_' + reg.fname + reg.lname + '_REG' + String(reg.id).padStart(5,'0') + '.png';
    link.href = card.toDataURL('image/png');
    link.click();
    showToast('บันทึก QR สำเร็จ! 📥', 'success');
  } catch(e) {
    showToast('เกิดข้อผิดพลาด: ' + e.message, 'danger');
    console.error(e);
  }
  btn.disabled = false;
  btn.innerHTML = '<i class="ti ti-download"></i>บันทึกรูปลงเครื่อง';
}

function drawRR(ctx,x,y,w,h,r,fill){
  var tl=r,tr=r,br=r,bl=r;
  if(typeof r==='object'){tl=r.tl||0;tr=r.tr||0;br=r.br||0;bl=r.bl||0;}
  ctx.beginPath();
  ctx.moveTo(x+tl,y);
  ctx.lineTo(x+w-tr,y); ctx.quadraticCurveTo(x+w,y,x+w,y+tr);
  ctx.lineTo(x+w,y+h-br); ctx.quadraticCurveTo(x+w,y+h,x+w-br,y+h);
  ctx.lineTo(x+bl,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-bl);
  ctx.lineTo(x,y+tl); ctx.quadraticCurveTo(x,y,x+tl,y);
  ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill();}
}


/* ══════════════════ SCAN QR ══════════════════ */
async function startScan(){
  if(!navigator.mediaDevices){showToast('Browser ไม่รองรับกล้อง','danger');showDemoScan();return;}
  try{
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    scanStream=stream;
    const v=document.getElementById('scanner-video');
    v.srcObject=stream;await v.play();
    document.getElementById('scan-idle').style.display='none';
    document.getElementById('scan-overlay').style.display='flex';
    document.getElementById('btn-start-scan').style.display='none';
    document.getElementById('btn-stop-scan').style.display='flex';
    const dot=document.getElementById('scan-status-dot');
    const txt=document.getElementById('scan-status-txt');
    if(dot){dot.className='status-dot online';}
    if(txt){txt.textContent='กล้องทำงาน — พร้อมสแกน';}
    scanInterval=setInterval(()=>processFrame(v),300);
    showToast('เปิดกล้องสำเร็จ พร้อมสแกน','success');
  }catch(e){showToast('ไม่สามารถเข้าถึงกล้อง — ลองโหมดสาธิต','warn');showDemoScan();}
}
function stopScan(){
  if(scanStream)scanStream.getTracks().forEach(t=>t.stop());
  if(scanInterval)clearInterval(scanInterval);
  scanStream=null;scanInterval=null;
  const v=document.getElementById('scanner-video');v.srcObject=null;
  document.getElementById('scan-idle').style.display='flex';
  document.getElementById('scan-overlay').style.display='none';
  document.getElementById('btn-start-scan').style.display='flex';
  document.getElementById('btn-stop-scan').style.display='none';
  const dot=document.getElementById('scan-status-dot');
  const txt=document.getElementById('scan-status-txt');
  if(dot){dot.className='status-dot offline';}
  if(txt){txt.textContent='กล้องปิดอยู่';}
}
function processFrame(video){
  try{
    const canvas=document.createElement('canvas');
    canvas.width=video.videoWidth;canvas.height=video.videoHeight;
    const ctx=canvas.getContext('2d');ctx.drawImage(video,0,0);
    const id=ctx.getImageData(0,0,canvas.width,canvas.height);
    const code=jsQR(id.data,id.width,id.height);
    if(code){handleQRData(code.data);stopScan();}
  }catch(e){}
}
function handleQRData(raw){
  try{
    const data=JSON.parse(raw);
    if(data.v===2||data.regId){
      processSmartCheckIn(data);
    } else {
      showScanResult('error','QR รุ่นเก่า','กรุณาพิมพ์ QR ใหม่จากระบบ',null);
    }
  }catch(e){showScanResult('error','QR ไม่ถูกต้อง','ไม่สามารถอ่านข้อมูล QR ได้',null);}
}
function processSmartCheckIn(data){
  const reg=getReg(data.regId);
  if(!reg){
    showScanResult('error','ไม่พบข้อมูล',`ไม่พบ REG-${data.regId} ในระบบ`,null,data);
    return;
  }
  if(reg.attended){
    showScanResult('already',`เช็คชื่อไปแล้ว เวลา ${reg.attendedTime}`,'',reg,data);
    return;
  }
  reg.attended=true;reg.attendedTime=nowTime();
  addScanLog(reg,'ok');
  showScanResult('ok','เช็คชื่อสำเร็จ! ✓','',reg,data);
  updateCheckinHeroStats();
  const sid=parseInt(document.getElementById('att-sess-sel').value||0);
  if(sid===reg.sessionId)loadAttendance();
}
function showScanResult(type,title,sub,reg,qrData=null){
  const icons={ok:'circle-check',already:'clock',error:'circle-x'};
  const s=reg?getSess(reg.sessionId):null;
  const cat=s?getCat(s.catId):null;
  const dSess=qrData||{};
  document.getElementById('scan-result-area').innerHTML=`
    <div class="scan-result ${type}">
      <div class="scan-result-header ${type}">
        <div class="scan-result-icon ${type}"><i class="ti ti-${icons[type]}"></i></div>
        <div><div class="scan-result-title">${title}</div>${sub?`<div style="font-size:12px;margin-top:2px;">${sub}</div>`:''}</div>
      </div>
      <div class="scan-result-body">
        ${reg?`
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
            <div style="width:44px;height:44px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;"><i class="ti ti-user"></i></div>
            <div>
              <div style="font-weight:700;font-size:15px;">${reg.prefix||''}${reg.fname} ${reg.lname}</div>
              <div style="font-size:12px;color:var(--text-muted);">${reg.position||''} — ${reg.dept}</div>
            </div>
          </div>
          <div style="background:var(--bg);border-radius:8px;padding:10px 12px;font-size:12px;display:flex;flex-direction:column;gap:5px;">
            ${cat||dSess.catName?`<div style="display:flex;gap:8px;align-items:center;"><i class="ti ti-category" style="color:var(--primary);font-size:13px;"></i><span><strong>${cat?cat.name:dSess.catName||''}</strong></span></div>`:''}
            ${s||dSess.sessName?`<div style="display:flex;gap:8px;align-items:center;"><i class="ti ti-calendar-event" style="color:var(--primary);font-size:13px;"></i><span>${s?s.name:dSess.sessName||''}</span></div>`:''}
            ${s||dSess.date?`<div style="display:flex;gap:8px;align-items:center;"><i class="ti ti-calendar" style="color:var(--primary);font-size:13px;"></i><span>${fmtDate(s?s.date:dSess.date)}</span></div>`:''}
            ${s||dSess.timeStart?`<div style="display:flex;gap:8px;align-items:center;"><i class="ti ti-clock" style="color:var(--primary);font-size:13px;"></i><span>${s?sessTxt(s):(dSess.timeStart||'')+' – '+(dSess.timeEnd||'')+' น.'}</span></div>`:''}
            ${s||dSess.venue?`<div style="display:flex;gap:8px;align-items:center;"><i class="ti ti-map-pin" style="color:var(--primary);font-size:13px;"></i><span>${s?s.venue:dSess.venue||''}</span></div>`:''}
            ${type==='ok'?`<div style="display:flex;gap:8px;align-items:center;"><i class="ti ti-clock-check" style="color:var(--success);font-size:13px;"></i><span style="color:var(--success);font-weight:600;">เวลาเข้า: ${reg.attendedTime}</span></div>`:''}
          </div>`
        :''}
        <div style="margin-top:12px;display:flex;gap:8px;">
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('scan-result-area').innerHTML=''"><i class="ti ti-x"></i>ปิด</button>
          <button class="btn btn-primary btn-sm" onclick="startScan()"><i class="ti ti-camera"></i>สแกนต่อ</button>
          ${reg?`<button class="btn btn-ghost btn-sm" onclick="showQR(${reg.id})"><i class="ti ti-qrcode"></i>ดู QR</button>`:''}
        </div>
      </div>
    </div>`;
  setTimeout(()=>document.getElementById('scan-result-area').scrollIntoView({behavior:'smooth',block:'nearest'}),100);
}
function showDemoScan(){
  const reg=registrations.find(r=>!r.attended);
  if(reg){processSmartCheckIn({v:2,regId:reg.id});showToast('โหมดสาธิต: จำลองการสแกน QR','warn');}
  else showToast('ไม่มีผู้รอเช็คชื่อสำหรับสาธิต','warn');
}
function addScanLog(reg,type){
  const s=getSess(reg.sessionId);
  scanLog.unshift({name:`${reg.prefix||''}${reg.fname} ${reg.lname}`,sess:s?s.name:'-',date:s?fmtDateShort(s.date):'',time:nowTime(),type});
  renderScanLog();
}
function renderScanLog(){
  const c=document.getElementById('scan-log-list');
  if(!scanLog.length){c.innerHTML='<div class="empty" style="padding:20px;"><i class="ti ti-clock"></i><p>ยังไม่มีการสแกน</p></div>';return;}
  c.innerHTML=scanLog.slice(0,12).map(l=>`
    <div style="display:flex;align-items:center;gap:10px;padding:8px 14px;border-bottom:1px solid var(--border);">
      <div style="width:30px;height:30px;border-radius:50%;background:${l.type==='ok'?'var(--success-light)':'var(--warn-light)'};color:${l.type==='ok'?'#065f46':'#9a3412'};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">
        <i class="ti ti-${l.type==='ok'?'circle-check':'clock'}"></i>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${l.name}</div>
        <div style="font-size:11px;color:var(--text-muted);">${l.sess} &nbsp;|&nbsp; ${l.date}</div>
      </div>
      <div style="font-size:12px;color:var(--text-muted);flex-shrink:0;">${l.time}</div>
    </div>`).join('');
}
function clearScanLog(){scanLog=[];renderScanLog();}
function manualCheckIn(){
  document.getElementById('manual-search').value='';
  document.getElementById('manual-results').innerHTML='';
  document.getElementById('modal-manual').classList.add('open');
}
function manualSearchResult(){
  const q=document.getElementById('manual-search').value.trim().toLowerCase();
  const c=document.getElementById('manual-results');
  if(!q){c.innerHTML='';return;}
  const regs=registrations.filter(r=>(r.fname+r.lname).toLowerCase().includes(q));
  if(!regs.length){c.innerHTML='<div class="empty" style="padding:16px;"><i class="ti ti-user-x"></i><p>ไม่พบรายชื่อ</p></div>';return;}
  c.innerHTML=regs.map(r=>{
    const s=getSess(r.sessionId);
    return`<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:6px;background:${r.attended?'#f0fdf4':'#fff'};">
      <div style="flex:1;">
        <div style="font-weight:600;font-size:13px;">${r.prefix||''}${r.fname} ${r.lname}</div>
        <div style="font-size:12px;color:var(--text-muted);">${r.position||''} — ${r.dept}</div>
        ${s?`<div style="font-size:11px;color:var(--text-muted);margin-top:2px;"><i class="ti ti-calendar" style="vertical-align:-1px;"></i> ${s.name} — ${fmtDate(s.date)}</div>`:''}
      </div>
      ${r.attended
        ?`<span class="badge badge-success"><i class="ti ti-check"></i>เช็คแล้ว ${r.attendedTime}</span>`
        :`<button class="btn btn-success btn-sm" onclick="manualMark(${r.id})"><i class="ti ti-check"></i>เช็คชื่อ</button>`}
    </div>`;
  }).join('');
}
function manualMark(regId){
  const reg=getReg(regId);if(!reg)return;
  reg.attended=true;reg.attendedTime=nowTime();
  addScanLog(reg,'ok');manualSearchResult();
  showToast(`เช็คชื่อ ${reg.prefix||''}${reg.fname} สำเร็จ`,'success');
}

/* ══════════════════ ATTENDANCE ══════════════════ */
function initAttendancePage(){
  document.getElementById('att-cat-sel').innerHTML='<option value="">ทุกประเภท</option>'+categories.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  attFilterCat();
}
function attFilterCat(){
  const cid=document.getElementById('att-cat-sel').value;
  const list=cid?sessions.filter(s=>s.catId==cid):sessions;
  document.getElementById('att-sess-sel').innerHTML='<option value="">เลือกรอบ...</option>'+list.map(s=>`<option value="${s.id}">${s.name} — ${fmtDateShort(s.date)}</option>`).join('');
  loadAttendance();
}
function loadAttendance(){
  const sid=parseInt(document.getElementById('att-sess-sel').value);
  const c=document.getElementById('att-content');
  if(!sid){c.innerHTML='<div class="empty"><i class="ti ti-calendar-event"></i><p>เลือกรอบอบรมเพื่อดูรายชื่อ</p></div>';return;}
  const s=getSess(sid),cat=getCat(s.catId);
  const regs=registrations.filter(r=>r.sessionId===sid);
  const present=regs.filter(r=>r.attended).length,absent=regs.length-present;
  const pct=regs.length?Math.round(present/regs.length*100):0;
  c.innerHTML=`
    <div class="card">
      <div style="margin-bottom:10px;">
        <div style="font-family:var(--heading);font-size:15px;font-weight:600;color:var(--primary);">${cat.name} — ${s.name}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:3px;display:flex;flex-wrap:wrap;gap:12px;">
          <span><i class="ti ti-calendar"></i> ${fmtDate(s.date)}</span>
          <span><i class="ti ti-clock"></i> ${sessTxt(s)}</span>
          <span><i class="ti ti-map-pin"></i> ${s.venue}</span>
          <span><i class="ti ti-user-check"></i> ${s.trainer}</span>
        </div>
      </div>
      <div class="att-summary">
        <div class="att-sum-card total"><div class="att-sum-num">${regs.length}</div><div class="att-sum-lbl">ลงทะเบียน</div></div>
        <div class="att-sum-card present"><div class="att-sum-num">${present}</div><div class="att-sum-lbl">เข้าอบรม</div></div>
        <div class="att-sum-card absent"><div class="att-sum-num">${absent}</div><div class="att-sum-lbl">ขาด</div></div>
        <div class="att-sum-card pct"><div class="att-sum-num">${pct}%</div><div class="att-sum-lbl">อัตราเข้าร่วม</div></div>
      </div>
      <div class="att-progress-bar"><div class="att-progress-fill" style="width:${pct}%;"></div></div>
      <div style="font-size:11px;color:var(--text-muted);text-align:right;">${present}/${regs.length} คน</div>
    </div>
    <div class="card" style="padding:0;overflow:hidden;">
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
        <div style="font-family:var(--heading);font-size:14px;font-weight:600;color:var(--primary);display:flex;align-items:center;gap:8px;"><i class="ti ti-users"></i>รายชื่อ</div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-success btn-sm" onclick="markAllPresent(${sid})"><i class="ti ti-check-all"></i>เช็คทั้งหมด</button>
          <button class="btn btn-ghost btn-sm" onclick="clearAllAtt(${sid})"><i class="ti ti-x"></i>ล้าง</button>
        </div>
      </div>
      ${!regs.length?'<div class="empty"><i class="ti ti-users-minus"></i><p>ยังไม่มีผู้ลงทะเบียน</p></div>':
        '<div>'+regs.map(r=>{
          const ini=(r.fname[0]||'')+(r.lname[0]||'');
          return`<div class="att-row ${r.attended?'present':''}">
            <div class="att-avatar ${r.attended?'present':'absent'}">${ini}</div>
            <div class="att-info">
              <div class="att-name">${r.prefix||''}${r.fname} ${r.lname}</div>
              <div class="att-sub">${r.position||'-'} | ${r.dept}</div>
            </div>
            <div style="font-size:11px;color:var(--text-muted);text-align:right;min-width:80px;">
              ${r.attended?`<span class="badge badge-success"><i class="ti ti-clock"></i>${r.attendedTime}</span>`:'<span style="color:var(--text-muted);">ยังไม่เช็ค</span>'}
            </div>
            <button class="check-btn ${r.attended?'checked':''}" onclick="toggleAtt(${r.id})" title="${r.attended?'ยกเลิก':'เช็คชื่อ'}">
              <i class="ti ti-${r.attended?'check':''}"></i>
            </button>
          </div>`;
        }).join('')+'</div>'
      }
    </div>`;
}
function toggleAtt(regId){
  const reg=getReg(regId);if(!reg)return;
  reg.attended=!reg.attended;reg.attendedTime=reg.attended?nowTime():null;
  loadAttendance();updateCheckinHeroStats();
  showToast(reg.attended?`✓ เช็คชื่อ ${reg.prefix||''}${reg.fname}`:`ยกเลิกเช็คชื่อ ${reg.fname}`,reg.attended?'success':'warn');
}
function markAllPresent(sid){
  registrations.filter(r=>r.sessionId===sid&&!r.attended).forEach(r=>{r.attended=true;r.attendedTime=nowTime();});
  loadAttendance();showToast('เช็คชื่อทั้งหมดสำเร็จ','success');
}
function clearAllAtt(sid){
  if(!confirm('ล้างการเช็คชื่อทั้งหมดในรอบนี้?'))return;
  registrations.filter(r=>r.sessionId===sid).forEach(r=>{r.attended=false;r.attendedTime=null;});
  loadAttendance();showToast('ล้างการเช็คชื่อแล้ว','warn');
}
function exportAttendance(){
  const sid=parseInt(document.getElementById('att-sess-sel').value);
  if(!sid){showToast('กรุณาเลือกรอบอบรมก่อน','danger');return;}
  const s=getSess(sid),cat=getCat(s.catId);
  const regs=registrations.filter(r=>r.sessionId===sid);
  let csv=`ประเภทอบรม,${cat.name}\nรอบอบรม,${s.name}\nวันที่,${fmtDate(s.date)}\nสถานที่,${s.venue}\nวิทยากร,${s.trainer}\n\n`;
  csv+=`ลำดับ,คำนำหน้า,ชื่อ,นามสกุล,ตำแหน่ง,แผนก,สถานะ,เวลาเข้า\n`;
  regs.forEach((r,i)=>{csv+=`${i+1},${r.prefix||''},${r.fname},${r.lname},${r.position||''},${r.dept},${r.attended?'เข้าอบรม':'ขาด'},${r.attendedTime||'-'}\n`;});
  const blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`เช็คชื่อ_${s.name}_${s.date}.csv`;a.click();
  showToast('Export CSV สำเร็จ','success');
}

/* ══════════════════ TRACK ══════════════════ */
function populateTrackFilters(){
  document.getElementById('track-cat').innerHTML='<option value="">ทุกประเภท</option>'+categories.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  document.getElementById('track-sess').innerHTML='<option value="">ทุกรอบ</option>'+sessions.map(s=>`<option value="${s.id}">${s.name} – ${fmtDateShort(s.date)}</option>`).join('');
  trackSearch();
}
function trackSearch(){
  const nq=(document.getElementById('track-name').value||'').toLowerCase();
  const pq=(document.getElementById('track-pos').value||'').toLowerCase();
  const cid=document.getElementById('track-cat').value;
  const sid=document.getElementById('track-sess').value;
  let regs=registrations;
  if(nq)regs=regs.filter(r=>(r.fname+' '+r.lname).toLowerCase().includes(nq));
  if(pq)regs=regs.filter(r=>(r.position||'').toLowerCase().includes(pq));
  if(cid){const sids=sessions.filter(s=>s.catId==cid).map(s=>s.id);regs=regs.filter(r=>sids.includes(r.sessionId));}
  if(sid)regs=regs.filter(r=>r.sessionId==sid);
  const c=document.getElementById('track-results');
  if(!nq&&!pq&&!cid&&!sid){c.innerHTML='<div class="empty"><i class="ti ti-search"></i><p>เลือกตัวกรองเพื่อค้นหา</p></div>';return;}
  if(!regs.length){c.innerHTML='<div class="empty"><i class="ti ti-user-x"></i><p>ไม่พบข้อมูล</p></div>';return;}
  c.innerHTML=regs.map(r=>{
    const s=getSess(r.sessionId),cat=s?getCat(s.catId):null;
    const cnt=s?getCount(s.id):0,pct=s?Math.round(cnt/s.capacity*100):0;
    return`<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:14px;margin-bottom:10px;display:flex;align-items:center;gap:12px;${r.attended?'border-left:3px solid var(--success);':''}">
      <div style="width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;background:${r.attended?'var(--success-light)':'var(--primary-light)'};color:${r.attended?'#065f46':'var(--primary)'};">
        <i class="ti ti-${r.attended?'circle-check':'user'}"></i>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;font-size:14px;">${r.prefix||''}${r.fname} ${r.lname}
          ${r.attended?`<span class="badge badge-success" style="margin-left:6px;font-size:10px;"><i class="ti ti-check"></i>เข้าอบรมแล้ว</span>`:''}
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px;"><span class="badge badge-blue" style="margin-right:4px;">${r.position||'-'}</span>${r.dept}</div>
        ${cat?`<div style="font-size:12px;color:var(--text-muted);margin-top:3px;"><i class="ti ti-category" style="vertical-align:-1px;"></i> ${cat.name}</div>`:''}
        ${s?`<div style="font-size:12px;color:var(--text-muted);"><i class="ti ti-calendar" style="vertical-align:-1px;"></i> ${s.name} — ${fmtDate(s.date)} ${sessTxt(s)} | ${s.venue}</div>`:''}
      </div>
      <div style="text-align:right;flex-shrink:0;">
        ${capBadge(pct)}
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">ลง ${fmtDateShort(r.regDate)}</div>
        <button class="btn btn-ghost btn-sm" style="margin-top:6px;" onclick="showQR(${r.id})"><i class="ti ti-qrcode"></i>QR</button>
      </div>
    </div>`;
  }).join('');
}
function clearTrack(){
  ['track-name','track-pos'].forEach(id=>document.getElementById(id).value='');
  ['track-cat','track-sess'].forEach(id=>document.getElementById(id).value='');
  trackSearch();
}

/* ══════════════════ ADMIN ══════════════════ */
function renderAdmin(){
  const attTotal=registrations.filter(r=>r.attended).length;
  document.getElementById('admin-stats').innerHTML=`
    <div class="stat-card blue"><div class="stat-label">ประเภทอบรม</div><div class="stat-value">${categories.length}</div></div>
    <div class="stat-card amber"><div class="stat-label">รอบอบรม</div><div class="stat-value">${sessions.length}</div></div>
    <div class="stat-card green"><div class="stat-label">ผู้ลงทะเบียน</div><div class="stat-value">${registrations.length}</div></div>
    <div class="stat-card green"><div class="stat-label">เข้าอบรมแล้ว</div><div class="stat-value">${attTotal}</div></div>`;
  renderAdminCats();
  const catOpts='<option value="">ทุกประเภท</option>'+categories.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  ['admin-filter-cat'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=catOpts;});
  document.getElementById('admin-filter-sess').innerHTML='<option value="">ทุกรอบ</option>'+sessions.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
  renderAdminSessions();renderMasters();renderAdminRegs();
}
function renderAdminCats(){
  document.getElementById('admin-cat-tbody').innerHTML=categories.map(c=>{
    const cm=CM[c.color]||CM.blue;
    const cs=sessions.filter(s=>s.catId===c.id);
    const cr=cs.reduce((a,s)=>a+getCount(s.id),0);
    return`<tr>
      <td><div style="display:flex;align-items:center;gap:8px;">
        <div style="width:28px;height:28px;border-radius:6px;background:${cm.bg};color:${cm.c};display:flex;align-items:center;justify-content:center;font-size:14px;"><i class="ti ti-${c.icon}"></i></div>
        <span style="font-weight:600;">${c.name}</span>
      </div></td>
      <td style="font-size:12px;color:var(--text-muted);">${c.desc}</td>
      <td><span class="badge badge-blue">${cs.length} รอบ</span></td>
      <td><span class="badge badge-success">${cr} คน</span></td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteCat(${c.id})"><i class="ti ti-trash"></i></button></td>
    </tr>`;
  }).join('');
}
function renderAdminSessions(){
  const cf=document.getElementById('admin-filter-cat').value;
  const list=cf?sessions.filter(s=>s.catId==cf):sessions;
  document.getElementById('admin-sess-tbody').innerHTML=list.map(s=>{
    const cnt=getCount(s.id),att=getAttCount(s.id),pct=Math.round(cnt/s.capacity*100),cat=getCat(s.catId);
    return`<tr>
      <td><span class="badge badge-gray" style="font-size:11px;">${cat?cat.name:'-'}</span></td>
      <td style="font-weight:600;font-size:13px;">${s.name}</td>
      <td style="font-size:12px;">${fmtDateShort(s.date)}</td>
      <td style="font-size:12px;">${sessTxt(s)}</td>
      <td style="font-size:12px;">${s.venue}</td>
      <td style="font-size:12px;">${s.trainer}</td>
      <td style="font-weight:600;">${cnt}/${s.capacity}</td>
      <td><span class="badge badge-success">${att}</span></td>
      <td>${capBadge(pct)}</td>
      <td><div style="display:flex;gap:4px;">
        <button class="btn btn-ghost btn-sm" onclick="openEditSession(${s.id})" title="แก้ไข"><i class="ti ti-edit"></i></button>
        <button class="btn btn-ghost btn-sm" onclick="goToAttendance(${s.id})" title="เช็คชื่อ"><i class="ti ti-user-check"></i></button>
        <button class="btn btn-danger btn-sm" onclick="deleteSess(${s.id})"><i class="ti ti-trash"></i></button>
      </div></td>
    </tr>`;
  }).join('');
}

/* ══ MASTERS (Trainer / Venue / Dept / Prefix) ══ */
const MASTER_CFG={
  trainer:{list:()=>trainers,setList:v=>{trainers=v;},icon:'user-check',inputId:'new-trainer-input',listId:'trainer-list'},
  venue:  {list:()=>venues,  setList:v=>{venues=v;},  icon:'map-pin',   inputId:'new-venue-input',  listId:'venue-list'},
  dept:   {list:()=>departments,setList:v=>{departments=v;},icon:'building',inputId:'new-dept-input',listId:'dept-list'},
  prefix: {list:()=>prefixes,setList:v=>{prefixes=v;},icon:'id-badge',  inputId:'new-prefix-input', listId:'prefix-list'},
};
function renderMasters(){
  Object.entries(MASTER_CFG).forEach(([key,cfg])=>{
    const el=document.getElementById(cfg.listId);
    if(!el)return;
    const arr=cfg.list();
    if(!arr.length){el.innerHTML='<div style="text-align:center;padding:10px;font-size:12px;color:var(--text-muted);">ยังไม่มีข้อมูล</div>';return;}
    el.innerHTML=arr.map((v,i)=>`<div class="master-item">
      <span><i class="ti ti-${cfg.icon} item-icon"></i>${v}</span>
      <button class="btn btn-danger btn-sm" onclick="removeMaster('${key}',${i})"><i class="ti ti-trash"></i></button>
    </div>`).join('');
  });
}
function addMaster(key){
  const cfg=MASTER_CFG[key];
  const input=document.getElementById(cfg.inputId);
  const val=input.value.trim();
  if(!val){showToast('กรุณาระบุข้อมูล','danger');return;}
  const arr=cfg.list();
  if(arr.includes(val)){showToast('มีข้อมูลนี้อยู่แล้ว','danger');return;}
  cfg.setList([...arr,val]);input.value='';
  renderMasters();showToast(`เพิ่ม "${val}" สำเร็จ`,'success');
}
function removeMaster(key,idx){
  const cfg=MASTER_CFG[key];
  const arr=cfg.list();
  if(!confirm(`ลบ "${arr[idx]}" ?`))return;
  const name=arr[idx];
  cfg.setList(arr.filter((_,i)=>i!==idx));
  renderMasters();showToast(`ลบ "${name}" สำเร็จ`,'success');
}

/* ══ ADD/EDIT SESSION ══ */
function populateSessionDropdowns(){
  populateSelect('ns-cat',categories.map(c=>({v:c.id,l:c.name})),'เลือกประเภท...',true);
  populateSelect('ns-venue',venues,'เลือกสถานที่...');
  populateSelect('ns-trainer',trainers,'เลือกวิทยากร...');
}
function populateSelect(id,arr,placeholder='เลือก...',isObj=false){
  const el=document.getElementById(id);if(!el)return;
  if(isObj){
    el.innerHTML=`<option value="">${placeholder}</option>`+arr.map(a=>`<option value="${a.v}">${a.l}</option>`).join('');
  } else {
    el.innerHTML=`<option value="">${placeholder}</option>`+arr.map(v=>`<option value="${v}">${v}</option>`).join('');
  }
}
function openAddSession(){
  document.getElementById('sess-modal-title').innerHTML='<i class="ti ti-calendar-plus"></i>เพิ่มรอบอบรม';
  document.getElementById('sess-edit-id').value='';
  ['ns-name','ns-cap'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('ns-date').value='';
  document.getElementById('ns-time-start').value='09:00';
  document.getElementById('ns-time-end').value='16:00';
  populateSessionDropdowns();
  document.getElementById('modal-session').classList.add('open');
}
function openEditSession(id){
  const s=getSess(id);
  document.getElementById('sess-modal-title').innerHTML='<i class="ti ti-edit"></i>แก้ไขรอบอบรม';
  document.getElementById('sess-edit-id').value=s.id;
  document.getElementById('ns-name').value=s.name;
  document.getElementById('ns-date').value=s.date;
  document.getElementById('ns-time-start').value=s.timeStart||'09:00';
  document.getElementById('ns-time-end').value=s.timeEnd||'16:00';
  document.getElementById('ns-cap').value=s.capacity;
  populateSessionDropdowns();
  setTimeout(()=>{
    document.getElementById('ns-cat').value=s.catId;
    document.getElementById('ns-venue').value=s.venue;
    document.getElementById('ns-trainer').value=s.trainer;
  },50);
  document.getElementById('modal-session').classList.add('open');
}
function submitSession(){
  const editId=document.getElementById('sess-edit-id').value;
  const catId=parseInt(document.getElementById('ns-cat').value);
  const name=document.getElementById('ns-name').value.trim();
  const date=document.getElementById('ns-date').value;
  const timeStart=document.getElementById('ns-time-start').value;
  const timeEnd=document.getElementById('ns-time-end').value;
  const venue=document.getElementById('ns-venue').value;
  const trainer=document.getElementById('ns-trainer').value;
  const cap=parseInt(document.getElementById('ns-cap').value);
  if(!catId||!name||!date||!venue||!trainer||!cap){showToast('กรุณากรอกข้อมูลให้ครบ','danger');return;}
  if(editId){
    const s=getSess(parseInt(editId));
    const cnt=getCount(s.id);
    if(cap<cnt){showToast(`ที่นั่งต้องไม่น้อยกว่าผู้ลงทะเบียน (${cnt} คน)`,'danger');return;}
    Object.assign(s,{catId,name,date,timeStart,timeEnd,venue,trainer,capacity:cap});
    showToast('แก้ไขรอบสำเร็จ','success');
  } else {
    sessions.push({id:nextSessId++,catId,name,date,timeStart,timeEnd,venue,trainer,capacity:cap});
    showToast('เพิ่มรอบอบรมสำเร็จ','success');
  }
  closeModal('modal-session');renderAdmin();
}
function deleteSess(id){
  if(!confirm('ลบรอบนี้?'))return;
  sessions=sessions.filter(x=>x.id!==id);
  registrations=registrations.filter(r=>r.sessionId!==id);
  renderAdmin();showToast('ลบรอบสำเร็จ','success');
}

/* ══ ADD CATEGORY ══ */
function openAddCat(){['nc-name','nc-desc','nc-icon'].forEach(id=>document.getElementById(id).value='');document.getElementById('modal-add-cat').classList.add('open');}
function previewIcon(){const v=document.getElementById('nc-icon').value.trim();document.getElementById('icon-preview').innerHTML=`<i class="ti ti-${v||'box'}"></i>`;}
function submitAddCat(){
  const name=document.getElementById('nc-name').value.trim();
  if(!name){showToast('กรุณาระบุชื่อประเภท','danger');return;}
  categories.push({id:nextCatId++,name,desc:document.getElementById('nc-desc').value.trim(),icon:document.getElementById('nc-icon').value.trim()||'box',color:document.getElementById('nc-color').value});
  closeModal('modal-add-cat');renderAdmin();showToast(`เพิ่มประเภท "${name}" สำเร็จ`,'success');
}
function deleteCat(id){
  const c=getCat(id);
  const sc=sessions.filter(s=>s.catId===id).length;
  if(!confirm(`ลบประเภท "${c.name}" ? (มี ${sc} รอบ)`))return;
  const sids=sessions.filter(s=>s.catId===id).map(s=>s.id);
  sessions=sessions.filter(s=>s.catId!==id);
  registrations=registrations.filter(r=>!sids.includes(r.sessionId));
  categories=categories.filter(c=>c.id!==id);
  renderAdmin();showToast('ลบประเภทสำเร็จ','success');
}

/* ══ ADMIN REGS ══ */
function renderAdminRegs(){
  const q=(document.getElementById('admin-search').value||'').toLowerCase();
  const sid=document.getElementById('admin-filter-sess').value;
  let regs=registrations;
  if(q)regs=regs.filter(r=>(r.fname+r.lname+(r.position||'')).toLowerCase().includes(q));
  if(sid)regs=regs.filter(r=>r.sessionId==sid);
  const tbody=document.getElementById('admin-reg-tbody');
  if(!regs.length){tbody.innerHTML='<tr><td colspan="11"><div class="empty"><i class="ti ti-users-minus"></i><p>ไม่พบรายการ</p></div></td></tr>';return;}
  tbody.innerHTML=regs.map((r,i)=>{
    const s=getSess(r.sessionId),cat=s?getCat(s.catId):null;
    return`<tr>
      <td style="color:var(--text-muted);">${i+1}</td>
      <td style="font-size:12px;">${r.prefix||'-'}</td>
      <td style="font-weight:600;">${r.fname} ${r.lname}</td>
      <td><span class="badge badge-blue">${r.position||'-'}</span></td>
      <td style="font-size:12px;">${r.dept}</td>
      <td style="font-size:12px;">${cat?cat.name:'-'}</td>
      <td style="font-size:12px;">${s?s.name:'-'}</td>
      <td style="font-size:12px;color:var(--text-muted);">${fmtDateShort(r.regDate)}</td>
      <td>${r.attended?`<span class="badge badge-success"><i class="ti ti-check"></i>${r.attendedTime}</span>`:'<span class="badge badge-gray">ยังไม่เช็ค</span>'}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="showQR(${r.id})"><i class="ti ti-qrcode"></i></button></td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteReg(${r.id})"><i class="ti ti-trash"></i></button></td>
    </tr>`;
  }).join('');
}
function deleteReg(id){
  if(!confirm('ยืนยันลบ?'))return;
  registrations=registrations.filter(r=>r.id!==id);renderAdminRegs();showToast('ลบสำเร็จ','success');
}

function goToAttendance(sessId){
  showPage('checkin');
  document.querySelectorAll('.checkin-subtab').forEach((t,i)=>t.classList.toggle('active',i===1));
  document.querySelectorAll('.checkin-sub').forEach((s,i)=>s.classList.toggle('active',i===1));
  setTimeout(()=>{
    initAttendancePage();
    const s=getSess(sessId);
    document.getElementById('att-cat-sel').value=s.catId;
    attFilterCat();
    setTimeout(()=>{document.getElementById('att-sess-sel').value=sessId;loadAttendance();},80);
  },80);
}

/* ══ UTILS ══ */
function closeModal(id){document.getElementById(id).classList.remove('open');}
function showToast(msg,type='success'){
  const t=document.getElementById('toast');
  t.querySelector('#toast-msg').textContent=msg;
  t.querySelector('i').className=type==='success'?'ti ti-circle-check':type==='warn'?'ti ti-alert-triangle':'ti ti-alert-circle';
  t.className=`toast ${type} show`;
  setTimeout(()=>t.classList.remove('show'),3500);
}
document.querySelectorAll('.modal-overlay').forEach(o=>{
  o.addEventListener('click',function(e){if(e.target===this)this.classList.remove('open');});
});

// INIT
renderCategories();
