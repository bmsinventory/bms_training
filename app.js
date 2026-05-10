/* ══════════════════════════════════════════════
   DATA STORE
══════════════════════════════════════════════ */
const CM={
  blue:  {bg:'#e8f0fb',c:'#1a56a0',g1:'#1e3a8a',g2:'#2563eb'},
  teal:  {bg:'#d1fae5',c:'#065f46',g1:'#0f766e',g2:'#0d9488'},
  amber: {bg:'#fef3c7',c:'#92400e',g1:'#b45309',g2:'#d97706'},
  red:   {bg:'#fee2e2',c:'#991b1b',g1:'#9f1239',g2:'#e11d48'},
  purple:{bg:'#ede9fe',c:'#5b21b6',g1:'#4c1d95',g2:'#7c3aed'},
  green: {bg:'#dcfce7',c:'#166534',g1:'#14532d',g2:'#16a34a'}
};

let categories=[];
let trainers=[],venues=[],departments=[],prefixes=[];
let sessions=[];
let registrations=[];
let locations=[];
let allSessionsFull=[];
let loginVerifyData=[];
let _lvEdits={};
let nextId=1,nextSessId=1,nextCatId=1;
let selectedCatId=null,selectedSessId=null,sessFilt='all';
let scanStream=null,scanReq=null,scanLog=[],scanInterval=null,currentFacingMode='environment',_scanLogIds=new Set();
let isAdminLoggedIn=false;
let adminUsers=[];
let currentAdminUser=null;
let pendingPage='admin';
const NOTIFY_API_KEY='54f4fa05-bfb9-4ac5-930d-93e942e36786';
const currentSite=new URLSearchParams(location.search).get('site')||'theme_1';

/* ══════════════════════════════════════════════
   SUPABASE
══════════════════════════════════════════════ */
const SUPABASE_URL='https://aukxjxtuknucflaafwlo.supabase.co';
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1a3hqeHR1a251Y2ZsYWFmd2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5ODM3ODksImV4cCI6MjA5MzU1OTc4OX0.WJbGeWu6mjU9BvES8cX9972RvYteUAZyMve8DcKy2mk';
const _sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
// parallel id arrays for master_items (index matches the string arrays)
let masterIds={trainer:[],venue:[],dept:[],prefix:[]};
// row mappers: DB → app format
const _mCat=r=>({id:r.id,name:r.name,desc:r.description||'',icon:r.icon||'box',color:r.color||'blue',bannerUrl:r.banner_url||null});
const _mSess=r=>({id:r.id,catId:r.cat_id,name:r.name,date:r.date,timeStart:r.time_start,timeEnd:r.time_end,venue:r.venue||'',trainer:r.trainer||'',capacity:r.capacity});
const _mReg=r=>({id:r.id,sessionId:r.session_id,prefix:r.prefix||'',fname:r.fname,lname:r.lname,position:r.position||'',dept:r.dept||'',regDate:r.reg_date,attended:r.attended||false,attendedTime:r.attended_time||null});

async function pushNotify(reg){
  if(!NOTIFY_API_KEY)return;
  const s=getSess(reg.sessionId);
  const dateStr=s?fmtDate(s.date):'-';
  const timeStr=s?`${s.timeStart} - ${s.timeEnd} น.`:'-';
  const lines=[
    '📢 มีผู้ลงทะเบียนใหม่',
    `👤 ชื่อ-สกุล: ${reg.prefix}${reg.fname} ${reg.lname}`,
    `💼 ตำแหน่ง: ${reg.position||'-'}`,
    `🏢 หน่วยงาน: ${reg.dept||'-'}`,
    `📚 หัวข้อ: ${s?`${getCat(s.catId)?.name||'-'} : ${s.name}`:'-'}`,
    `📅 เวลา: ${dateStr} เวลา ${timeStr}`,
  ];
  try{
    await fetch('https://api-notify.bmscloud.in.th/api/v1/push-notify',{
      method:'POST',
      headers:{'Token':NOTIFY_API_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({content:lines.join('\n'),receiver:null})
    });
  }catch(e){}
}

const ICON_LIST=[
  'box','boxes','package','package-import','package-export','packages',
  'truck','truck-delivery','truck-loading','truck-return',
  'building-warehouse','building-factory','building','building-store',
  'archive','stack','stack-2','layers-subtract',
  'clipboard','clipboard-check','clipboard-list','clipboard-text','clipboard-data',
  'chart-bar','chart-line','chart-pie','trending-up','trending-down',
  'users','user','user-check','user-plus','user-group','user-star',
  'certificate','award','medal','trophy',
  'book','book-2','book-open','books','school',
  'pencil','pencil-plus','edit','notes','presentation',
  'settings','adjustments','adjustments-horizontal','tool','tools',
  'barcode','scan','qrcode',
  'calculator','coin','currency-baht','receipt',
  'list','list-check','list-details','table','database',
  'calendar','calendar-event','clock','alarm',
  'star','heart','flag','tag','tags','bookmark',
  'check-circle','circle-check','alert-circle','info',
  'refresh','arrows-exchange',
  'map-pin','location','compass',
  'forklift','crane',
  'category','category-2','layout-grid','layout-list',
  'recycle','leaf','plant-2',
  'shield','lock','key','eye',
];

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
/* ── Category card helpers ── */
const BMS_TAGS=['PR','PO','Stock','Lot','Exp','BMS','QR','Card','Manual','Real time','LAB','ERP','HR'];
function extractTags(text){return BMS_TAGS.filter(t=>(text||'').includes(t)).slice(0,5);}
function calcDuration(ts,te){
  if(!ts||!te)return'';
  const[sh,sm]=(ts||'09:00').split(':').map(Number);
  const[eh,em]=(te||'16:00').split(':').map(Number);
  const h=Math.floor(((eh*60+em)-(sh*60+sm))/60);
  const rm=((eh*60+em)-(sh*60+sm))%60;
  return h+(rm?'.5':'')+' ชม.';
}
let catSearchTxt='',catStatusFilter='all';
function filterCats(){
  catSearchTxt=document.getElementById('cat-search').value.toLowerCase();
  renderCategories();
}
function setCatFilter(val,el){
  catStatusFilter=val;
  document.querySelectorAll('.cat-filter-pill').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  renderCategories();
}
const nowTime=()=>new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});
const sessTxt=s=>s?`${s.timeStart||''} – ${s.timeEnd||''} น.`:'';
function findDupReg(fname,lname,catId,excludeRegId=null){
  return registrations.find(r=>{
    if(excludeRegId!=null&&r.id===excludeRegId)return false;
    if(r.fname!==fname||r.lname!==lname)return false;
    const s=getSess(r.sessionId);
    return s&&s.catId===catId;
  });
}
function canEditReg(reg){
  const s=getSess(reg.sessionId);
  if(!s||reg.attended)return false;
  const today=new Date();today.setHours(0,0,0,0);
  const sessDay=new Date(s.date);sessDay.setHours(0,0,0,0);
  return today<sessDay;
}

/* ══════════════════ DB INIT ══════════════════ */
function setLoading(on){document.getElementById('app-loading').classList.toggle('hidden',!on);}
async function loadAllData(){
  const [cR,sR,rR,mR,lR,auR,lvR,asR]=await Promise.all([
    _sb.from('categories').select('*').eq('site',currentSite).order('id'),
    _sb.from('sessions').select('*').eq('site',currentSite).order('id'),
    _sb.from('registrations').select('*').order('id'),
    _sb.from('master_items').select('*').eq('site',currentSite).order('type,sort_order,id'),
    _sb.from('locations').select('*').order('id'),
    _sb.from('admin_users').select('id,username,created_at').order('id'),
    _sb.from('login_verify').select('*').eq('site',currentSite),
    _sb.from('sessions').select('id,site,capacity').order('id'),
  ]);
  if(cR.error||sR.error||rR.error||mR.error||lR.error||auR.error)throw new Error('โหลดข้อมูลล้มเหลว');
  categories=(cR.data||[]).map(_mCat);
  sessions=(sR.data||[]).map(_mSess);
  registrations=(rR.data||[]).map(_mReg);
  locations=(lR.data||[]);
  allSessionsFull=(asR.data||[]);
  adminUsers=(auR.data||[]);
  loginVerifyData=(lvR.data||[]);
  const ms=mR.data||[];
  trainers=ms.filter(m=>m.type==='trainer').map(m=>m.value);
  venues=ms.filter(m=>m.type==='venue').map(m=>m.value);
  departments=ms.filter(m=>m.type==='dept').map(m=>m.value);
  prefixes=ms.filter(m=>m.type==='prefix').map(m=>m.value);
  masterIds.trainer=ms.filter(m=>m.type==='trainer').map(m=>m.id);
  masterIds.venue=ms.filter(m=>m.type==='venue').map(m=>m.id);
  masterIds.dept=ms.filter(m=>m.type==='dept').map(m=>m.id);
  masterIds.prefix=ms.filter(m=>m.type==='prefix').map(m=>m.id);
}
async function initApp(){
  setLoading(true);
  try{await loadAllData();}
  catch(e){console.error(e);showToast('โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ','danger');}
  setLoading(false);
  const badge=document.getElementById('nav-site-badge');
  if(badge){const loc=locations.find(l=>l.code===currentSite);badge.textContent=loc?loc.name:currentSite;}
  renderCategories();
  initRealtime();
}

/* ══════════════════ REALTIME SYNC ══════════════════ */
let _rtChannel = null;
let _rtDebounceTimer = null;

function initRealtime() {
  if (_rtChannel) return;
  _rtChannel = _sb.channel('public-db-changes')
    .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
      if (_rtDebounceTimer) clearTimeout(_rtDebounceTimer);
      _rtDebounceTimer = setTimeout(async () => {
        try {
          await loadAllData();
          refreshCurrentView();
        } catch (e) {
          console.error('Realtime sync error:', e);
        }
      }, 800); // หน่วงเวลา 800ms ป้องกันการโหลดซ้ำถี่เกินไปหากบันทึกพร้อมกันหลายรายการ
    })
    .subscribe();
}

function refreshCurrentView() {
  const activePage = document.querySelector('.page.active');
  if (!activePage) return;
  const pid = activePage.id;
  
  if (pid === 'page-register') {
    renderCategories();
    if (selectedCatId) renderSessionList();
    
    // หากผู้ใช้กำลังเปิดหน้าต่างลงทะเบียนอยู่ ให้อัปเดตที่นั่งที่เหลือแบบเรียลไทม์
    const modalReg = document.getElementById('modal-register');
    if (modalReg && modalReg.classList.contains('open') && selectedSessId) {
      const s = getSess(selectedSessId);
      if (s) {
        const cnt = getCount(selectedSessId);
        const left = Math.max(0, s.capacity - cnt);
        const barPct = Math.min(100, Math.round(cnt / s.capacity * 100));
        const seatInfo = document.getElementById('reg-seat-info');
        if (seatInfo) {
          seatInfo.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="flex:1;height:5px;background:rgba(255,255,255,.2);border-radius:3px;overflow:hidden;">
                <div style="width:${barPct}%;height:100%;background:${left<=3?'#fca5a5':'#6ee7b7'};border-radius:3px;"></div>
              </div>
              <span style="font-size:12px;font-weight:600;color:${left<=3?'#fca5a5':'#6ee7b7'};">ว่าง ${left} ที่นั่ง</span>
            </div>`;
        }
      }
    }
  } else if (pid === 'page-checkin') {
    updateCheckinHeroStats();
    _mergeRealtimeScanLog();
    const activeSub = document.querySelector('.checkin-sub.active');
    if (activeSub && activeSub.id === 'csub-list') {
      loadAttendance();
    }
  } else if (pid === 'page-track') {
    trackSearch();
  } else if (pid === 'page-admin') {
    renderAdmin();
  }
}

/* ══════════════════ PAGE NAV ══════════════════ */
function showPage(p){
  if((p==='admin'||p==='checkin')&&!isAdminLoggedIn){pendingPage=p;openAdminLogin();return;}
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(x=>x.classList.remove('active'));
  document.getElementById('page-'+p).classList.add('active');
  document.getElementById('tab-'+p).classList.add('active');
  if(p==='register')goBackToCategories();
  if(p==='checkin'){initCheckinPage();}
  if(p==='track'){populateTrackFilters();trackSearch();}
  if(p==='admin')renderAdmin();
}
/* ══════════════════ ADMIN LOGIN ══════════════════ */
function openAdminLogin(){
  document.getElementById('login-user').value='';
  document.getElementById('login-pass').value='';
  document.getElementById('login-pass').style.webkitTextSecurity='disc';
  document.getElementById('login-eye-icon').className='ti ti-eye';
  document.getElementById('login-error').style.display='none';
  document.getElementById('modal-admin-login').classList.add('open');
  setTimeout(()=>document.getElementById('login-user').focus(),100);
}
function toggleLoginPass(){
  const inp=document.getElementById('login-pass');
  const icon=document.getElementById('login-eye-icon');
  const hidden=inp.style.webkitTextSecurity!=='none';
  inp.style.webkitTextSecurity=hidden?'none':'disc';
  icon.className=hidden?'ti ti-eye-off':'ti ti-eye';
}
async function adminLogin(){
  const u=document.getElementById('login-user').value.trim();
  const p=document.getElementById('login-pass').value;
  const btn=document.querySelector('#modal-admin-login .btn-primary');
  if(btn){btn.disabled=true;btn.innerHTML='<i class="ti ti-loader-2" style="animation:spin .8s linear infinite"></i>กำลังตรวจสอบ...';}
  const {data,error}=await _sb.from('admin_users').select('id,username').eq('username',u).eq('password',p).maybeSingle();
  if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-login"></i>เข้าสู่ระบบ';}
  if(data&&!error){
    isAdminLoggedIn=true;
    currentAdminUser=data;
    closeModal('modal-admin-login');
    document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(x=>x.classList.remove('active'));
    document.getElementById('page-'+pendingPage).classList.add('active');
    document.getElementById('tab-'+pendingPage).classList.add('active');
    if(pendingPage==='admin')renderAdmin();
    if(pendingPage==='checkin')initCheckinPage();
    showToast(`ยินดีต้อนรับ ${data.username}`,'success');
  } else {
    const errEl=document.getElementById('login-error');
    document.getElementById('login-error-msg').textContent='ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
    errEl.style.cssText='display:flex;color:var(--danger);font-size:13px;margin-top:4px;padding:8px 12px;background:#fee2e2;border-radius:8px;align-items:center;gap:6px;';
    document.getElementById('login-pass').value='';
    document.getElementById('login-pass').focus();
  }
}
function adminLogout(){
  isAdminLoggedIn=false;
  currentAdminUser=null;
  pendingPage='admin';
  showPage('register');
  showToast('ออกจากระบบแล้ว','info');
}
/* ══════════════════ DATA IMPORT ══════════════════ */
const IMPORT_CFG={
  trainer:{label:'วิทยากร',   cols:['วิทยากร'],
    sample:[]},
  venue:  {label:'สถานที่',   cols:['สถานที่'],
    sample:[]},
  dept:   {label:'แผนก',      cols:['แผนก'],
    sample:[]},
  prefix: {label:'คำนำหน้า', cols:['คำนำหน้า'],
    sample:[]},
  category:{label:'ประเภทการอบรม',
    cols:['ชื่อประเภท *','คำอธิบาย','ไอคอน','สี (blue/teal/amber/red/purple/green)'],
    sample:[]},
  session:{label:'รอบอบรม',
    cols:['ประเภท (ชื่อ) *','ชื่อรอบ *','วันที่ (YYYY-MM-DD) *','เวลาเริ่ม','เวลาจบ','สถานที่','วิทยากร','จำนวนที่นั่ง'],
    sample:[]},
};
let _importRows=[];
function openImportModal(){
  document.getElementById('import-type').value='trainer';
  document.getElementById('import-file-input').value='';
  document.getElementById('import-preview-area').style.display='none';
  document.getElementById('import-submit-btn').style.display='none';
  document.getElementById('import-clear').checked=false;
  _importRows=[];
  _resetDropzone();
  document.getElementById('modal-import').classList.add('open');
}
function _resetDropzone(){
  document.getElementById('import-dropzone').innerHTML=`
    <input type="file" id="import-file-input" accept=".csv" style="display:none;" onchange="onImportFileChange(event)">
    <i class="ti ti-file-spreadsheet" style="font-size:32px;"></i>
    <div style="font-weight:600;font-size:14px;">คลิกหรือลากไฟล์ CSV มาวางที่นี่</div>
    <div style="font-size:12px;opacity:.7;">รองรับเฉพาะไฟล์ .csv (UTF-8 หรือ UTF-8 BOM)</div>`;
}
function onImportTypeChange(){
  document.getElementById('import-preview-area').style.display='none';
  document.getElementById('import-submit-btn').style.display='none';
  _importRows=[];
  _resetDropzone();
}
function downloadImportTemplate(){
  const type=document.getElementById('import-type').value;
  const cfg=IMPORT_CFG[type];
  const escape=v=>v.includes(',')||v.includes('"')?`"${v.replace(/"/g,'""')}"`:v;
  let csv='﻿'+cfg.cols.map(escape).join(',')+'\n';
  cfg.sample.forEach(row=>{csv+=row.map(escape).join(',')+'\n';});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  a.download=`template_${type}.csv`;a.click();
  showToast(`ดาวน์โหลด template_${type}.csv สำเร็จ`,'success');
}
function onImportFileChange(e){const f=e.target.files[0];if(f)_readImportFile(f);}
function onImportFileDrop(e){
  const f=e.dataTransfer.files[0];
  if(f&&f.name.toLowerCase().endsWith('.csv'))_readImportFile(f);
  else showToast('กรุณาเลือกไฟล์ .csv','danger');
}
function _readImportFile(file){
  const r=new FileReader();
  r.onload=e=>_processImportCSV(e.target.result,file.name);
  r.readAsText(file,'UTF-8');
}
function _parseCSV(text){
  text=text.replace(/^﻿/,'');
  return text.split(/\r?\n/).filter(l=>l.trim()).map(line=>{
    const cols=[];let cur='',inQ=false;
    for(const c of line){
      if(c==='"')inQ=!inQ;
      else if(c===','&&!inQ){cols.push(cur.trim());cur='';}
      else cur+=c;
    }
    cols.push(cur.trim());return cols;
  });
}
function _processImportCSV(text,filename){
  const type=document.getElementById('import-type').value;
  const all=_parseCSV(text);
  if(all.length<2){showToast('ไฟล์ไม่มีข้อมูล หรือมีแค่ header','warn');return;}
  _importRows=_validateRows(all.slice(1),type);
  _renderImportPreview();
  document.getElementById('import-preview-area').style.display='block';
  document.getElementById('import-submit-btn').style.display='flex';
  refreshImportStats();
  const ok=_importRows.filter(r=>r.status==='ok').length;
  const dz=document.getElementById('import-dropzone');
  dz.innerHTML=`<input type="file" id="import-file-input" accept=".csv" style="display:none;" onchange="onImportFileChange(event)">
    <i class="ti ti-circle-check" style="font-size:28px;color:var(--success);"></i>
    <div style="font-weight:600;font-size:14px;color:var(--success);">${filename} — ${_importRows.length} แถว</div>
    <div style="font-size:12px;color:var(--text-muted);">คลิกเพื่อเลือกไฟล์ใหม่</div>`;
}
function _validateRows(rows,type){
  const MASTER_TYPES=['trainer','venue','dept','prefix'];
  return rows.map((row,i)=>{
    const r={row:i+2,raw:row,status:'ok',note:'',value:null};
    if(MASTER_TYPES.includes(type)){
      const val=(row[0]||'').trim();
      if(!val){r.status='error';r.note='ค่าว่าง';return r;}
      if(MASTER_CFG[type].list().includes(val)){r.status='dup';r.note='มีอยู่แล้ว';}
      r.value=val;
    } else if(type==='category'){
      const name=(row[0]||'').trim();
      if(!name){r.status='error';r.note='ชื่อว่าง';return r;}
      if(categories.find(c=>c.name.toLowerCase()===name.toLowerCase())){r.status='dup';r.note='ชื่อซ้ำ';}
      r.value={name,desc:(row[1]||'').trim(),icon:(row[2]||'box').trim()||'box',color:(row[3]||'blue').trim()||'blue'};
    } else if(type==='session'){
      const catName=(row[0]||'').trim(),sessName=(row[1]||'').trim(),date=(row[2]||'').trim();
      if(!catName||!sessName||!date){r.status='error';r.note='ข้อมูลจำเป็นไม่ครบ';return r;}
      const cat=categories.find(c=>c.name===catName);
      if(!cat){r.status='error';r.note=`ไม่พบประเภท "${catName}"`;return r;}
      if(sessions.find(s=>s.catId===cat.id&&s.name===sessName)){r.status='dup';r.note='รอบนี้มีอยู่แล้ว';}
      r.value={catId:cat.id,name:sessName,date,
        timeStart:(row[3]||'09:00').trim()||'09:00',timeEnd:(row[4]||'16:00').trim()||'16:00',
        venue:(row[5]||'').trim(),trainer:(row[6]||'').trim(),capacity:parseInt(row[7])||20};
    }
    return r;
  });
}
function refreshImportStats(){
  const clear=document.getElementById('import-clear').checked;
  const ok=_importRows.filter(r=>r.status==='ok').length;
  const dup=_importRows.filter(r=>r.status==='dup').length;
  const err=_importRows.filter(r=>r.status==='error').length;
  const toImport=clear?ok+dup:ok;
  document.getElementById('import-stats').innerHTML=`
    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      <span style="background:var(--bg);padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;">รวม ${_importRows.length} แถว</span>
      <span style="background:#dcfce7;color:#166534;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;"><i class="ti ti-circle-plus"></i> ใหม่ ${ok}</span>
      <span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;"><i class="ti ti-copy"></i> ซ้ำ ${dup}</span>
      ${err?`<span style="background:#fee2e2;color:#991b1b;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;"><i class="ti ti-alert-circle"></i> Error ${err}</span>`:''}
    </div>`;
  document.getElementById('import-mode-info').innerHTML=clear
    ?`<i class="ti ti-trash" style="color:var(--danger);"></i> จะ<strong>ลบข้อมูลเดิมทั้งหมด</strong>แล้วนำเข้า <strong>${toImport} รายการ</strong> (รวมรายการซ้ำ)`
    :`<i class="ti ti-git-merge" style="color:var(--primary);"></i> จะเพิ่ม <strong>${toImport} รายการใหม่</strong> — ข้ามรายการซ้ำ ${dup} รายการ`;
  const btn=document.getElementById('import-submit-btn');
  btn.innerHTML=`<i class="ti ti-table-import"></i>นำเข้า ${toImport} รายการ`;
  btn.disabled=toImport===0;
}
function _renderImportPreview(){
  const type=document.getElementById('import-type').value;
  const cfg=IMPORT_CFG[type];
  const SC={ok:'#f0fdf4',dup:'#fefce8',error:'#fff1f2'};
  const SL={ok:'#166534',dup:'#92400e',error:'#991b1b'};
  const SN={ok:'ใหม่',dup:'ซ้ำ',error:'Error'};
  const show=_importRows.slice(0,15);
  let html=`<table style="width:100%;border-collapse:collapse;min-width:400px;">
    <thead><tr style="background:var(--bg);position:sticky;top:0;">
      <th style="padding:7px 10px;text-align:center;font-size:11px;color:var(--text-muted);white-space:nowrap;">#</th>
      ${cfg.cols.map(c=>`<th style="padding:7px 10px;text-align:left;font-size:11px;color:var(--text-muted);white-space:nowrap;">${c.replace(' *','')}</th>`).join('')}
      <th style="padding:7px 10px;text-align:center;font-size:11px;color:var(--text-muted);">สถานะ</th>
    </tr></thead><tbody>`;
  show.forEach(r=>{
    html+=`<tr style="background:${SC[r.status]};">
      <td style="padding:5px 10px;text-align:center;color:var(--text-muted);font-size:11px;">${r.row}</td>
      ${cfg.cols.map((_,i)=>`<td style="padding:5px 10px;font-size:12px;">${r.raw[i]||''}</td>`).join('')}
      <td style="padding:5px 10px;text-align:center;"><span style="background:${SC[r.status]};color:${SL[r.status]};border:1px solid ${SL[r.status]}33;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">${r.note||SN[r.status]}</span></td>
    </tr>`;
  });
  if(_importRows.length>15)html+=`<tr><td colspan="${cfg.cols.length+2}" style="padding:8px;text-align:center;color:var(--text-muted);font-size:11px;">... และอีก ${_importRows.length-15} แถว</td></tr>`;
  html+='</tbody></table>';
  document.getElementById('import-preview-table').innerHTML=html;
}
async function executeImport(){
  const type=document.getElementById('import-type').value;
  const clear=document.getElementById('import-clear').checked;
  const toImport=clear?_importRows.filter(r=>r.status!=='error'):_importRows.filter(r=>r.status==='ok');
  if(!toImport.length){showToast('ไม่มีรายการที่จะนำเข้า','warn');return;}
  const btn=document.getElementById('import-submit-btn');
  btn.disabled=true;
  btn.innerHTML='<i class="ti ti-loader-2" style="animation:spin .8s linear infinite;"></i>กำลังนำเข้า...';
  try{
    if(clear)await _clearImportType(type);
    await _insertImportRows(type,toImport);
    await loadAllData();
    closeModal('modal-import');
    renderAdmin();
    showToast(`นำเข้า ${toImport.length} รายการสำเร็จ`,'success');
  }catch(e){
    showToast('นำเข้าไม่สำเร็จ: '+e.message,'danger');
    btn.disabled=false;refreshImportStats();
  }
}
async function _clearImportType(type){
  const MASTER=['trainer','venue','dept','prefix'];
  let err;
  if(MASTER.includes(type)){
    ({error:err}=await _sb.from('master_items').delete().eq('type',type));
  } else if(type==='category'){
    ({error:err}=await _sb.from('categories').delete().gte('id',1));
  } else if(type==='session'){
    ({error:err}=await _sb.from('sessions').delete().gte('id',1));
  }
  if(err)throw new Error(err.message);
}
async function _insertImportRows(type,rows){
  const MASTER=['trainer','venue','dept','prefix'];
  let error;
  if(MASTER.includes(type)){
    const cur=MASTER_CFG[type].list();
    ({error}=await _sb.from('master_items').upsert(
      rows.map((r,i)=>({type,value:r.value,sort_order:cur.length+i,site:currentSite})),
      {onConflict:'type,value,site',ignoreDuplicates:true}
    ));
  } else if(type==='category'){
    ({error}=await _sb.from('categories').insert(rows.map(r=>({name:r.value.name,description:r.value.desc,icon:r.value.icon,color:r.value.color,site:currentSite}))));
  } else if(type==='session'){
    ({error}=await _sb.from('sessions').insert(rows.map(r=>({cat_id:r.value.catId,name:r.value.name,date:r.value.date,time_start:r.value.timeStart,time_end:r.value.timeEnd,venue:r.value.venue,trainer:r.value.trainer,capacity:r.value.capacity,site:currentSite}))));
  }
  if(error)throw new Error(error.message);
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
  const today=new Date().toISOString().split('T')[0];
  // filter by search + status
  let list=categories.filter(c=>{
    if(catSearchTxt){
      const hay=(c.name+' '+(c.desc||'')).toLowerCase();
      if(!hay.includes(catSearchTxt))return false;
    }
    if(catStatusFilter==='all')return true;
    const cs=sessions.filter(s=>s.catId===c.id);
    const totalCap=cs.reduce((a,s)=>a+s.capacity,0);
    const totalReg=cs.reduce((a,s)=>a+getCount(s.id),0);
    const pct=totalCap?totalReg/totalCap*100:0;
    if(catStatusFilter==='full')return pct>=100;
    if(catStatusFilter==='near')return pct>=60&&pct<100;
    if(catStatusFilter==='avail')return pct<60;
    return true;
  });
  const grid=document.getElementById('cat-grid');
  const empty=document.getElementById('cat-empty');
  if(!list.length){grid.innerHTML='';if(empty)empty.classList.add('show');return;}
  if(empty)empty.classList.remove('show');
  grid.innerHTML=list.map(c=>{
    const cm=CM[c.color]||CM.blue;
    const cs=sessions.filter(s=>s.catId===c.id);
    const totalCap=cs.reduce((a,s)=>a+s.capacity,0);
    const totalReg=cs.reduce((a,s)=>a+getCount(s.id),0);
    const avSess=cs.filter(s=>getCount(s.id)<s.capacity).length;
    const avSeats=cs.reduce((a,s)=>a+Math.max(0,s.capacity-getCount(s.id)),0);
    const fillPct=totalCap?Math.round(totalReg/totalCap*100):0;
    const fillColor=fillPct>=100?'#DC2626':fillPct>=75?'#D97706':fillPct>=40?'#F59E0B':'#059669';
    // next available session
    const nextSess=cs.filter(s=>s.date>=today&&getCount(s.id)<s.capacity)
      .sort((a,b)=>a.date.localeCompare(b.date))[0];
    // duration from first session
    const durSet=[...new Set(cs.map(s=>calcDuration(s.timeStart,s.timeEnd)).filter(Boolean))];
    const durTxt=durSet.length===1?durSet[0]:durSet.length?durSet[0]+'+':'';
    // unique trainers
    const utrain=[...new Set(cs.map(s=>s.trainer).filter(Boolean))];
    // tags from description
    const tags=extractTags(c.name+' '+(c.desc||''));
    const tagsHtml=tags.map(t=>`<span class="cat-tag">${t}</span>`).join('');
    // status badge
    const avBadge=fillPct>=100
      ?`<span class="cat-avbadge full"><i class="ti ti-lock"></i>เต็มแล้ว</span>`
      :fillPct>=75
        ?`<span class="cat-avbadge near"><i class="ti ti-alert-circle"></i>ใกล้เต็ม</span>`
        :`<span class="cat-avbadge avail"><i class="ti ti-circle-check"></i>${avSess} รอบว่าง</span>`;
    const canReg=avSess>0;
    const bannerInner=c.bannerUrl
      ?`<div class="cat-banner-img-overlay"></div>`
      :`<i class="ti ti-${c.icon} cat-banner-deco"></i><div class="cat-banner-icon"><i class="ti ti-${c.icon}"></i></div>`;
    const bannerStyle=c.bannerUrl
      ?`background-image:url(${c.bannerUrl});background-size:cover;background-position:center;`
      :`background:linear-gradient(135deg,${cm.g1} 0%,${cm.g2} 100%);`;
    return`<div class="cat-card" onclick="${canReg?`selectCategory(${c.id})`:''}">
      <div class="cat-banner" style="${bannerStyle}">
        ${bannerInner}
        <div class="cat-banner-badge">${avBadge}</div>
      </div>
      <div class="cat-card-header">
        <div class="cat-name">${c.name}</div>
        <div class="cat-desc">${c.desc||'—'}</div>
        ${tagsHtml?`<div class="cat-tags">${tagsHtml}</div>`:''}
      </div>
      <div class="cat-cap-wrap">
        <div class="cat-progress-meta">
          <span style="font-size:12px;color:var(--text-muted);">ลงทะเบียน <strong style="color:var(--text);">${totalReg}</strong>/${totalCap} คน</span>
          <span style="font-size:12px;font-weight:700;color:${fillColor};">${fillPct}%</span>
        </div>
        <div class="cat-cap-bar"><div class="cat-cap-fill" style="width:${Math.min(fillPct,100)}%;background:${fillColor};"></div></div>
        ${avSeats>0?`<div class="cat-seats-left">เหลือ <strong>${avSeats}</strong> ที่นั่งว่าง${nextSess?` · ถัดไป ${fmtDateShort(nextSess.date)}`:''}</div>`:''}
      </div>
      <div class="cat-stats">
        <div class="cat-stat-item"><i class="ti ti-calendar-event"></i><strong>${cs.length}</strong>&nbsp;รอบ</div>
        <div class="cat-stat-item"><i class="ti ti-users"></i><strong>${totalCap}</strong>&nbsp;ที่นั่ง</div>
        ${durTxt?`<div class="cat-stat-item"><i class="ti ti-clock"></i><strong>${durTxt}</strong></div>`:''}
      </div>
      <div class="cat-cta">
        ${canReg
          ?`<button class="cat-cta-btn" onclick="selectCategory(${c.id});event.stopPropagation()">เลือกรอบอบรม <i class="ti ti-arrow-right"></i></button>`
          :`<button class="cat-cta-btn disabled" disabled><i class="ti ti-lock"></i> เต็มทุกรอบแล้ว</button>`
        }
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
async function submitReg(){
  const prefix=document.getElementById('reg-prefix').value;
  const fname=document.getElementById('reg-fname').value.trim();
  const lname=document.getElementById('reg-lname').value.trim();
  const pos=document.getElementById('reg-pos').value.trim();
  const dept=document.getElementById('reg-dept').value;
  if(!prefix||!fname||!lname||!pos||!dept){showToast('กรุณากรอกข้อมูลให้ครบถ้วน','danger');return;}
  const s=getSess(selectedSessId);
  if(getCount(selectedSessId)>=s.capacity){showToast('ที่นั่งเต็มแล้ว','danger');return;}
  const dup=findDupReg(fname,lname,s.catId);
  if(dup){
    const dupSess=getSess(dup.sessionId);
    const msg=dup.sessionId===selectedSessId
      ?`${fname} ${lname} ลงทะเบียนรอบนี้ไว้แล้ว`
      :`${fname} ${lname} ลงทะเบียน "${dupSess?dupSess.name:'รอบอื่น'}" ในประเภทนี้ไว้แล้ว`;
    showToast(msg,'danger');return;
  }
  const {data,error}=await _sb.from('registrations').insert({
    session_id:selectedSessId,prefix,fname,lname,position:pos,dept,
    reg_date:new Date().toISOString().split('T')[0],attended:false
  }).select().single();
  if(error){showToast('บันทึกไม่สำเร็จ','danger');return;}
  const nr=_mReg(data);
  registrations.push(nr);
  closeModal('modal-register');renderSessionList();renderCategories();
  showToast(`ลงทะเบียนสำเร็จ! ${prefix}${fname} ${lname}`,'success');
  pushNotify(nr);
  setTimeout(()=>showQR(nr.id),600);
}

/* ══════════════════ QR CODE ══════════════════ */
function buildQRPayload(reg){
  return JSON.stringify({v:2,regId:reg.id});
}

/* ─── Pure-canvas QR renderer using qrcode-generator ─── */
function makeQRCanvas(text, size, darkColor){
  darkColor = darkColor || '#1a56a0';
  var qr = qrcode(0, 'H');
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
    ctx.fillText('BMS Training', W/2, 26);
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
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:currentFacingMode,width:{ideal:1280},height:{ideal:720}}});
    scanStream=stream;
    const v=document.getElementById('scanner-video');
    v.srcObject=stream;await v.play();
    if('BarcodeDetector' in window&&!_barcodeDetector){
      try{_barcodeDetector=new BarcodeDetector({formats:['qr_code']});}catch(e){_barcodeDetector=null;}
    }
    document.getElementById('scan-idle').style.display='none';
    document.getElementById('scan-overlay').style.display='flex';
    document.getElementById('btn-start-scan').style.display='none';
    document.getElementById('btn-stop-scan').style.display='flex';
    document.getElementById('btn-switch-cam').style.display='flex';
    const dot=document.getElementById('scan-status-dot');
    const txt=document.getElementById('scan-status-txt');
    if(dot){dot.className='status-dot online';}
    if(txt){txt.textContent=_barcodeDetector?'กล้องทำงาน — พร้อมสแกน (Native)':'กล้องทำงาน — พร้อมสแกน';}
    scanInterval=setInterval(()=>processFrame(v),250);
    showToast('เปิดกล้องสำเร็จ พร้อมสแกน','success');
  }catch(e){showToast('ไม่สามารถเข้าถึงกล้อง — ลองโหมดสาธิต','warn');showDemoScan();}
}
function stopScan(){
  _scanBusy=false;
  if(scanStream)scanStream.getTracks().forEach(t=>t.stop());
  if(scanInterval)clearInterval(scanInterval);
  scanStream=null;scanInterval=null;
  const v=document.getElementById('scanner-video');v.srcObject=null;
  document.getElementById('scan-idle').style.display='flex';
  document.getElementById('scan-overlay').style.display='none';
  document.getElementById('btn-start-scan').style.display='flex';
  document.getElementById('btn-stop-scan').style.display='none';
  document.getElementById('btn-switch-cam').style.display='none';
  const dot=document.getElementById('scan-status-dot');
  const txt=document.getElementById('scan-status-txt');
  if(dot){dot.className='status-dot offline';}
  if(txt){txt.textContent='กล้องปิดอยู่';}
}
function toggleCamera(){
  currentFacingMode=currentFacingMode==='environment'?'user':'environment';
  if(scanStream){
    stopScan();
    setTimeout(()=>startScan(), 300); // หน่วงเวลาเล็กน้อยเพื่อให้กล้องตัวเก่าปิดสนิทก่อนเปิดกล้องใหม่
  }
}
let _scanCanvas=null,_scanCtx=null,_barcodeDetector=null,_scanBusy=false;
function processFrame(video){
  if(!video.videoWidth||!video.videoHeight)return;
  if(_scanBusy)return;

  // ── Native BarcodeDetector (Chrome Android / Safari iOS 17+) ──
  if(_barcodeDetector){
    _scanBusy=true;
    _barcodeDetector.detect(video)
      .then(barcodes=>{
        if(barcodes.length&&barcodes[0].rawValue){
          if(navigator.vibrate)navigator.vibrate(100);
          handleQRData(barcodes[0].rawValue);
          stopScan();
        }
      })
      .catch(e=>console.warn('BarcodeDetector:',e))
      .finally(()=>{_scanBusy=false;});
    return;
  }

  // ── Fallback: jsQR ──
  try{
    if(!_scanCanvas){_scanCanvas=document.createElement('canvas');_scanCtx=_scanCanvas.getContext('2d',{willReadFrequently:true});}
    const scale=Math.min(1,1280/video.videoWidth);
    _scanCanvas.width=Math.round(video.videoWidth*scale);
    _scanCanvas.height=Math.round(video.videoHeight*scale);
    _scanCtx.drawImage(video,0,0,_scanCanvas.width,_scanCanvas.height);
    const id=_scanCtx.getImageData(0,0,_scanCanvas.width,_scanCanvas.height);
    const d=id.data;
    for(let i=0;i<d.length;i+=4){
      const g=d[i]*0.299+d[i+1]*0.587+d[i+2]*0.114;
      const c=Math.min(255,Math.max(0,Math.round((g-90)*2.5)));
      d[i]=d[i+1]=d[i+2]=c;
    }
    const code=jsQR(d,id.width,id.height,{inversionAttempts:'attemptBoth'});
    if(code&&code.data){
      if(navigator.vibrate)navigator.vibrate(100);
      handleQRData(code.data);
      stopScan();
    }
  }catch(e){console.error('QR scan error:',e);}
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
async function processSmartCheckIn(data){
  const reg=getReg(data.regId);
  if(!reg){showScanResult('error','ไม่พบข้อมูล',`ไม่พบ REG-${data.regId} ในระบบ`,null,data);return;}
  if(reg.attended){showScanResult('already',`เช็คชื่อไปแล้ว เวลา ${reg.attendedTime}`,'',reg,data);return;}
  showConfirmCheckIn(reg,data);
}
function showConfirmCheckIn(reg,qrData){
  const s=getSess(reg.sessionId);
  const cat=s?getCat(s.catId):null;
  const dSess=qrData||{};
  document.getElementById('scan-result-area').innerHTML=`
    <div class="scan-result confirm">
      <div class="scan-result-header confirm">
        <div class="scan-result-icon confirm"><i class="ti ti-user-question"></i></div>
        <div>
          <div class="scan-result-title">ยืนยันการเข้าอบรม?</div>
          <div style="font-size:12px;margin-top:2px;">กรุณาตรวจสอบข้อมูลก่อนกดยืนยัน</div>
        </div>
      </div>
      <div class="scan-result-body">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <div style="width:44px;height:44px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;"><i class="ti ti-user"></i></div>
          <div>
            <div style="font-weight:700;font-size:16px;">${reg.prefix||''}${reg.fname} ${reg.lname}</div>
            <div style="font-size:12px;color:var(--text-muted);">${reg.position||''} — ${reg.dept}</div>
          </div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:10px 12px;font-size:12px;display:flex;flex-direction:column;gap:5px;margin-bottom:14px;">
          ${cat||dSess.catName?`<div style="display:flex;gap:8px;align-items:center;"><i class="ti ti-category" style="color:var(--primary);font-size:13px;"></i><span><strong>${cat?cat.name:dSess.catName||''}</strong></span></div>`:''}
          ${s||dSess.sessName?`<div style="display:flex;gap:8px;align-items:center;"><i class="ti ti-calendar-event" style="color:var(--primary);font-size:13px;"></i><span>${s?s.name:dSess.sessName||''}</span></div>`:''}
          ${s||dSess.date?`<div style="display:flex;gap:8px;align-items:center;"><i class="ti ti-calendar" style="color:var(--primary);font-size:13px;"></i><span>${fmtDate(s?s.date:dSess.date)}</span></div>`:''}
          ${s||dSess.timeStart?`<div style="display:flex;gap:8px;align-items:center;"><i class="ti ti-clock" style="color:var(--primary);font-size:13px;"></i><span>${s?sessTxt(s):(dSess.timeStart||'')+' – '+(dSess.timeEnd||'')+' น.'}</span></div>`:''}
          ${s||dSess.venue?`<div style="display:flex;gap:8px;align-items:center;"><i class="ti ti-map-pin" style="color:var(--primary);font-size:13px;"></i><span>${s?s.venue:dSess.venue||''}</span></div>`:''}
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-ghost btn-sm" onclick="document.getElementById('scan-result-area').innerHTML='';startScan()"><i class="ti ti-x"></i>ยกเลิก</button>
          <button class="btn btn-success" id="confirm-checkin-btn" onclick="confirmCheckIn(${reg.id})" style="flex:1;justify-content:center;font-size:15px;padding:11px;"><i class="ti ti-circle-check"></i>ยืนยันเข้าอบรม</button>
        </div>
      </div>
    </div>`;
  setTimeout(()=>document.getElementById('scan-result-area').scrollIntoView({behavior:'smooth',block:'nearest'}),100);
}
async function confirmCheckIn(regId){
  const btn=document.getElementById('confirm-checkin-btn');
  if(btn){btn.disabled=true;btn.innerHTML='<i class="ti ti-loader-2" style="animation:spin 1s linear infinite"></i>กำลังบันทึก...';}
  const reg=getReg(regId);
  if(!reg)return;
  const time=nowTime();
  const {error}=await _sb.from('registrations').update({attended:true,attended_time:time}).eq('id',reg.id);
  if(error){showScanResult('error','บันทึกไม่สำเร็จ','กรุณาลองใหม่',null,null);return;}
  reg.attended=true;reg.attendedTime=time;
  if(navigator.vibrate)navigator.vibrate([100,50,200]);
  addScanLog(reg,'ok');
  showScanResult('ok','เช็คชื่อสำเร็จ! ✓','',reg,null);
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
  _scanLogIds.add(reg.id);
  scanLog.unshift({regId:reg.id,name:`${reg.prefix||''}${reg.fname} ${reg.lname}`,sess:s?s.name:'-',date:s?fmtDateShort(s.date):'',time:nowTime(),type});
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
function clearScanLog(){scanLog=[];_scanLogIds.clear();renderScanLog();}
function _mergeRealtimeScanLog(){
  const toAdd=registrations.filter(r=>r.attended&&!!getSess(r.sessionId)&&!_scanLogIds.has(r.id));
  if(!toAdd.length)return;
  toAdd.forEach(r=>{
    const s=getSess(r.sessionId);
    _scanLogIds.add(r.id);
    scanLog.push({regId:r.id,name:`${r.prefix||''}${r.fname} ${r.lname}`,sess:s?s.name:'-',date:s?fmtDateShort(s.date):'',time:r.attendedTime||'',type:'ok'});
  });
  scanLog.sort((a,b)=>b.time.localeCompare(a.time));
  renderScanLog();
}
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
async function manualMark(regId){
  const reg=getReg(regId);if(!reg)return;
  const time=nowTime();
  const {error}=await _sb.from('registrations').update({attended:true,attended_time:time}).eq('id',regId);
  if(error){showToast('บันทึกไม่สำเร็จ','danger');return;}
  reg.attended=true;reg.attendedTime=time;
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
async function toggleAtt(regId){
  const reg=getReg(regId);if(!reg)return;
  const newAtt=!reg.attended,newTime=newAtt?nowTime():null;
  const {error}=await _sb.from('registrations').update({attended:newAtt,attended_time:newTime}).eq('id',regId);
  if(error){showToast('บันทึกไม่สำเร็จ','danger');return;}
  reg.attended=newAtt;reg.attendedTime=newTime;
  loadAttendance();updateCheckinHeroStats();
  showToast(reg.attended?`✓ เช็คชื่อ ${reg.prefix||''}${reg.fname}`:`ยกเลิกเช็คชื่อ ${reg.fname}`,reg.attended?'success':'warn');
}
async function markAllPresent(sid){
  const toMark=registrations.filter(r=>r.sessionId===sid&&!r.attended);
  if(!toMark.length)return;
  const time=nowTime();
  const {error}=await _sb.from('registrations').update({attended:true,attended_time:time}).in('id',toMark.map(r=>r.id));
  if(error){showToast('บันทึกไม่สำเร็จ','danger');return;}
  toMark.forEach(r=>{r.attended=true;r.attendedTime=time;});
  loadAttendance();showToast('เช็คชื่อทั้งหมดสำเร็จ','success');
}
async function clearAllAtt(sid){
  if(!await showConfirm('ล้างการเช็คชื่อทั้งหมดในรอบนี้?','',{okLabel:'ล้างข้อมูล',danger:true}))return;
  const toClr=registrations.filter(r=>r.sessionId===sid&&r.attended);
  if(!toClr.length){showToast('ไม่มีรายการที่เช็คชื่อ','warn');return;}
  const {error}=await _sb.from('registrations').update({attended:false,attended_time:null}).in('id',toClr.map(r=>r.id));
  if(error){showToast('บันทึกไม่สำเร็จ','danger');return;}
  toClr.forEach(r=>{r.attended=false;r.attendedTime=null;});
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
        ${!r.attended?`<div style="font-size:10px;margin-top:3px;color:${canEditReg(r)?'var(--success)':'var(--danger)'};">
          <i class="ti ti-${canEditReg(r)?'pencil':'lock'}"></i>${canEditReg(r)?'แก้ไขได้':'เลยกำหนดแก้ไข'}
        </div>`:''}
        <div style="display:flex;gap:4px;margin-top:6px;justify-content:flex-end;">
          <button class="btn btn-ghost btn-sm" onclick="showQR(${r.id})"><i class="ti ti-qrcode"></i>QR</button>
          ${canEditReg(r)
            ?`<button class="btn btn-primary btn-sm" onclick="openEditReg(${r.id})"><i class="ti ti-edit"></i>แก้ไข</button>`
            :`<button class="btn btn-ghost btn-sm" disabled style="opacity:.4;cursor:not-allowed;" title="ต้องแก้ไขก่อนวันอบรม 1 วัน"><i class="ti ti-edit-off"></i>แก้ไข</button>`}
        </div>
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
  renderAdminSessions();renderMasters();renderAdminRegs();renderAdminLocations();renderAdminUsers();renderLoginVerify();
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
      <td><div style="display:flex;gap:4px;">
        <button class="btn btn-ghost btn-sm" onclick="openEditCat(${c.id})" title="แก้ไข"><i class="ti ti-edit"></i></button>
        <button class="btn btn-danger btn-sm" onclick="deleteCat(${c.id})" title="ลบ"><i class="ti ti-trash"></i></button>
      </div></td>
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
    el.innerHTML=arr.map((v,i)=>`<div class="master-item" id="mi-${key}-${i}">
      <span><i class="ti ti-${cfg.icon} item-icon"></i>${v}</span>
      <div style="display:flex;gap:4px;">
        <button class="btn btn-ghost btn-sm" onclick="editMasterInline('${key}',${i})"><i class="ti ti-edit"></i></button>
        <button class="btn btn-danger btn-sm" onclick="removeMaster('${key}',${i})"><i class="ti ti-trash"></i></button>
      </div>
    </div>`).join('');
  });
}
async function addMaster(key){
  const cfg=MASTER_CFG[key];
  const input=document.getElementById(cfg.inputId);
  const val=input.value.trim();
  if(!val){showToast('กรุณาระบุข้อมูล','danger');return;}
  const arr=cfg.list();
  if(arr.includes(val)){showToast('มีข้อมูลนี้อยู่แล้ว','danger');return;}
  const {data,error}=await _sb.from('master_items').insert({type:key,value:val,sort_order:arr.length,site:currentSite}).select().single();
  if(error){showToast('บันทึกไม่สำเร็จ','danger');return;}
  cfg.setList([...arr,val]);
  masterIds[key]=[...(masterIds[key]||[]),data.id];
  input.value='';renderMasters();showToast(`เพิ่ม "${val}" สำเร็จ`,'success');
}
async function removeMaster(key,idx){
  const cfg=MASTER_CFG[key];
  const arr=cfg.list();
  if(!await showConfirm(`ลบ "${arr[idx]}"?`,'',{okLabel:'ลบ'}))return;
  const id=(masterIds[key]||[])[idx];
  if(id){
    const {error}=await _sb.from('master_items').delete().eq('id',id);
    if(error){showToast('ลบไม่สำเร็จ','danger');return;}
  }
  const name=arr[idx];
  cfg.setList(arr.filter((_,i)=>i!==idx));
  if(masterIds[key])masterIds[key]=masterIds[key].filter((_,i)=>i!==idx);
  renderMasters();showToast(`ลบ "${name}" สำเร็จ`,'success');
}
function editMasterInline(key,idx){
  const cfg=MASTER_CFG[key];
  const arr=cfg.list();
  const el=document.getElementById(`mi-${key}-${idx}`);if(!el)return;
  el.innerHTML=`<input class="form-control" id="mi-inp-${key}-${idx}" value="${arr[idx]}" style="flex:1;height:32px;font-size:13px;"
    onkeydown="if(event.key==='Enter')saveMasterInline('${key}',${idx});if(event.key==='Escape')renderMasters();">
    <div style="display:flex;gap:4px;">
      <button class="btn btn-success btn-sm" onclick="saveMasterInline('${key}',${idx})"><i class="ti ti-check"></i></button>
      <button class="btn btn-ghost btn-sm" onclick="renderMasters()"><i class="ti ti-x"></i></button>
    </div>`;
  el.style.cssText='display:flex;align-items:center;gap:8px;padding:6px 14px;border-bottom:1px solid var(--border);';
  setTimeout(()=>document.getElementById(`mi-inp-${key}-${idx}`)?.focus(),30);
}
async function saveMasterInline(key,idx){
  const cfg=MASTER_CFG[key];
  const arr=cfg.list();
  const input=document.getElementById(`mi-inp-${key}-${idx}`);if(!input)return;
  const val=input.value.trim();
  if(!val){showToast('กรุณาระบุข้อมูล','danger');return;}
  if(arr.find((v,i)=>i!==idx&&v===val)){showToast('มีข้อมูลนี้อยู่แล้ว','danger');return;}
  const id=(masterIds[key]||[])[idx];
  if(id){
    const {error}=await _sb.from('master_items').update({value:val}).eq('id',id);
    if(error){showToast('บันทึกไม่สำเร็จ','danger');return;}
  }
  const old=arr[idx];arr[idx]=val;cfg.setList([...arr]);
  renderMasters();showToast(`แก้ไข "${old}" → "${val}" สำเร็จ`,'success');
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
async function submitSession(){
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
    const {error}=await _sb.from('sessions').update({cat_id:catId,name,date,time_start:timeStart,time_end:timeEnd,venue,trainer,capacity:cap}).eq('id',s.id);
    if(error){showToast('บันทึกไม่สำเร็จ','danger');return;}
    Object.assign(s,{catId,name,date,timeStart,timeEnd,venue,trainer,capacity:cap});
    showToast('แก้ไขรอบสำเร็จ','success');
  } else {
    const {data,error}=await _sb.from('sessions').insert({cat_id:catId,name,date,time_start:timeStart,time_end:timeEnd,venue,trainer,capacity:cap,site:currentSite}).select().single();
    if(error){showToast('บันทึกไม่สำเร็จ','danger');return;}
    sessions.push(_mSess(data));
    showToast('เพิ่มรอบอบรมสำเร็จ','success');
  }
  closeModal('modal-session');renderAdmin();
}
async function deleteSess(id){
  if(!await showConfirm('ลบรอบอบรมนี้?','',{okLabel:'ลบ'}))return;
  const {error}=await _sb.from('sessions').delete().eq('id',id);
  if(error){showToast('ลบไม่สำเร็จ','danger');return;}
  sessions=sessions.filter(x=>x.id!==id);
  registrations=registrations.filter(r=>r.sessionId!==id);
  renderAdmin();showToast('ลบรอบสำเร็จ','success');
}

/* ══ ADD / EDIT CATEGORY ══ */
function _setBannerPreview(url,label=''){
  const wrap=document.getElementById('nc-banner-wrap');
  wrap.style.backgroundImage=`url("${url}")`;
  wrap.style.backgroundSize='cover';
  wrap.style.backgroundPosition='center';
  document.getElementById('nc-banner-placeholder').style.display='none';
  document.getElementById('nc-banner-clear-btn').style.display='flex';
  if(label)document.getElementById('nc-banner-filename').textContent=label;
}
function clearCatBanner(){
  const wrap=document.getElementById('nc-banner-wrap');
  wrap.style.backgroundImage='';
  document.getElementById('nc-banner-placeholder').style.display='flex';
  document.getElementById('nc-banner-file').value='';
  document.getElementById('nc-banner-filename').textContent='';
  document.getElementById('nc-banner-clear-btn').style.display='none';
  document.getElementById('nc-banner-url').value='';
  croppedBlob=null;
}

let cropper = null;
let croppedBlob = null;

function previewCatBanner(event){
  const file=event.target.files[0];
  if(!file)return;
  
  croppedBlob = null;
  const reader=new FileReader();
  reader.onload=e=>{
    const imgTarget = document.getElementById('crop-image-target');
    imgTarget.src = e.target.result;
    document.getElementById('modal-crop').classList.add('open');
    
    if(cropper) {
      cropper.destroy();
    }
    
    setTimeout(() => {
      cropper = new Cropper(imgTarget, {
        aspectRatio: 800 / 300,
        viewMode: 1,
        autoCropArea: 1,
      });
    }, 50);
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}
function cancelCrop() {
  closeModal('modal-crop');
  if(cropper) cropper.destroy();
  cropper = null;
}
function applyCrop() {
  if(!cropper) return;
  const canvas = cropper.getCroppedCanvas({
    width: 800,
    height: 300,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high',
  });
  if(!canvas) { showToast('เกิดข้อผิดพลาดในการตัดรูป', 'danger'); return; }
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  _setBannerPreview(dataUrl, 'Cropped_Image.jpg');
  document.getElementById('nc-banner-url').value='__new__';
  canvas.toBlob(blob => { croppedBlob = blob; }, 'image/jpeg', 0.9);
  closeModal('modal-crop');
  cropper.destroy();
  cropper = null;
}
function openAddCat(){
  document.getElementById('nc-edit-id').value='';
  document.getElementById('modal-add-cat-title').innerHTML='<i class="ti ti-category-plus"></i>เพิ่มประเภทการอบรม';
  ['nc-name','nc-desc'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('nc-color').value='blue';
  selectIcon('box');
  clearCatBanner();
  document.getElementById('modal-add-cat').classList.add('open');
}
function openEditCat(id){
  const c=getCat(id);
  document.getElementById('nc-edit-id').value=id;
  document.getElementById('modal-add-cat-title').innerHTML='<i class="ti ti-edit"></i>แก้ไขประเภทการอบรม';
  document.getElementById('nc-name').value=c.name;
  document.getElementById('nc-desc').value=c.desc||'';
  document.getElementById('nc-color').value=c.color||'blue';
  selectIcon(c.icon||'box');
  clearCatBanner();
  if(c.bannerUrl){
    _setBannerPreview(c.bannerUrl);
    document.getElementById('nc-banner-url').value=c.bannerUrl;
  }
  document.getElementById('modal-add-cat').classList.add('open');
}
function toggleIconPicker(){
  const panel=document.getElementById('icon-picker-panel');
  const chev=document.getElementById('icon-picker-chevron');
  if(panel.style.display!=='none'){
    panel.style.display='none';chev.style.transform='rotate(0deg)';return;
  }
  renderIconGrid('');
  document.getElementById('icon-search').value='';
  panel.style.display='block';chev.style.transform='rotate(180deg)';
  setTimeout(()=>document.getElementById('icon-search').focus(),50);
}
function filterIcons(){renderIconGrid(document.getElementById('icon-search').value.trim().toLowerCase());}
function renderIconGrid(q){
  const cur=document.getElementById('nc-icon').value||'box';
  const list=q?ICON_LIST.filter(n=>n.includes(q)):ICON_LIST;
  if(!list.length){
    document.getElementById('icon-grid').innerHTML='<div style="grid-column:1/-1;text-align:center;padding:16px;color:var(--text-muted);font-size:12px;">ไม่พบไอคอน</div>';
    return;
  }
  document.getElementById('icon-grid').innerHTML=list.map(n=>`<div onclick="selectIcon('${n}')" title="${n}" class="icon-pick-item${n===cur?' selected':''}"><i class="ti ti-${n}"></i><span>${n}</span></div>`).join('');
}
function selectIcon(name){
  document.getElementById('nc-icon').value=name;
  document.getElementById('icon-picker-preview').innerHTML=`<i class="ti ti-${name}"></i>`;
  document.getElementById('icon-picker-name').textContent=name;
  document.getElementById('icon-picker-panel').style.display='none';
  document.getElementById('icon-picker-chevron').style.transform='rotate(0deg)';
}
async function submitAddCat(){
  const name=document.getElementById('nc-name').value.trim();
  if(!name){showToast('กรุณาระบุชื่อประเภท','danger');return;}
  const fileInput=document.getElementById('nc-banner-file');
  const bannerUrlField=document.getElementById('nc-banner-url').value||'';
  let bannerUrl=null;
  if(croppedBlob){
    const path=`cat_${Date.now()}.jpg`;
    showToast('กำลังอัปโหลดรูป...','info');
    const {data:upData,error:upErr}=await _sb.storage.from('category-banners').upload(path,croppedBlob,{upsert:true,contentType:'image/jpeg'});
    if(upErr){showToast('อัปโหลดรูปไม่สำเร็จ: '+upErr.message,'danger');return;}
    bannerUrl=_sb.storage.from('category-banners').getPublicUrl(upData.path).data.publicUrl;
  } else if(bannerUrlField&&bannerUrlField!=='__new__'){
    // AI-generated URL or existing URL → use as-is
    bannerUrl=bannerUrlField;
  }
  const payload={name,description:document.getElementById('nc-desc').value.trim(),icon:document.getElementById('nc-icon').value.trim()||'box',color:document.getElementById('nc-color').value,site:currentSite,banner_url:bannerUrl};
  const editId=document.getElementById('nc-edit-id').value;
  if(editId){
    const {error}=await _sb.from('categories').update(payload).eq('id',parseInt(editId));
    if(error){showToast('บันทึกไม่สำเร็จ','danger');return;}
    Object.assign(getCat(parseInt(editId)),{name,desc:payload.description,icon:payload.icon,color:payload.color,bannerUrl:payload.banner_url});
    showToast(`แก้ไข "${name}" สำเร็จ`,'success');
  } else {
    const {data,error}=await _sb.from('categories').insert(payload).select().single();
    if(error){showToast('บันทึกไม่สำเร็จ','danger');return;}
    categories.push(_mCat(data));
    showToast(`เพิ่มประเภท "${name}" สำเร็จ`,'success');
  }
  closeModal('modal-add-cat');renderAdmin();
}
async function deleteCat(id){
  const c=getCat(id);
  const sc=sessions.filter(s=>s.catId===id).length;
  if(!await showConfirm(`ลบประเภท "${c.name}"?`,sc?`มี ${sc} รอบที่จะถูกลบด้วย`:'',{okLabel:'ลบ'}))return;
  const {error}=await _sb.from('categories').delete().eq('id',id);
  if(error){showToast('ลบไม่สำเร็จ','danger');return;}
  const sids=sessions.filter(s=>s.catId===id).map(s=>s.id);
  sessions=sessions.filter(s=>s.catId!==id);
  registrations=registrations.filter(r=>!sids.includes(r.sessionId));
  categories=categories.filter(c=>c.id!==id);
  renderAdmin();showToast('ลบประเภทสำเร็จ','success');
}

/* ══ LOCATIONS ══ */
function _locCard(code, name, id, ghost){
  const locSess=allSessionsFull.filter(s=>s.site===code);
  const sessIds=new Set(locSess.map(s=>s.id));
  const locRegs=registrations.filter(r=>sessIds.has(r.sessionId));
  const sessCnt=locSess.length;
  const regCnt=locRegs.length;
  const attCnt=locRegs.filter(r=>r.attended).length;
  const baseUrl=window.location.href.replace(/\?.*$/,'');
  const openUrl=`${baseUrl}?site=${code}`;
  const rowId=ghost?`ghost-${code}`:`loc-row-${id}`;
  return `
  <div class="master-item" id="${rowId}" style="flex-direction:column;align-items:stretch;gap:8px;padding:12px 14px;${ghost?'border-style:dashed;opacity:.85;':''}">
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <code style="background:var(--bg);padding:2px 8px;border-radius:6px;font-size:12px;color:var(--primary);border:1px solid var(--border);white-space:nowrap;">${code}</code>
      <span style="font-weight:600;font-size:14px;">${name}</span>
      ${code===currentSite?'<span style="font-size:11px;background:var(--success-light);color:var(--success);padding:1px 7px;border-radius:20px;font-weight:600;">สาขาปัจจุบัน</span>':''}
      ${ghost?'<span style="font-size:11px;background:#fef3c7;color:#92400e;padding:1px 7px;border-radius:20px;font-weight:600;">ยังไม่ได้ลงทะเบียน</span>':''}
      <div style="margin-left:auto;display:flex;gap:4px;">
        <a href="${openUrl}" target="_blank" class="btn btn-ghost btn-sm" title="เปิดสาขา"><i class="ti ti-external-link"></i></a>
        ${!ghost?`<button class="btn btn-ghost btn-sm" onclick="editLocInline(${id})"><i class="ti ti-edit"></i></button>
        <button class="btn btn-danger btn-sm" onclick="deleteLoc(${id})"${code===currentSite?' disabled title="ไม่สามารถลบสาขาที่กำลังใช้งาน"':''}><i class="ti ti-trash"></i></button>`
        :`<button class="btn btn-ghost btn-sm" onclick="editGhostInline('${code}')"><i class="ti ti-edit"></i></button>`}
      </div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <span style="font-size:12px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:6px;padding:3px 10px;display:flex;align-items:center;gap:5px;color:var(--text-secondary);">
        <i class="ti ti-calendar" style="font-size:13px;color:var(--primary);"></i>${sessCnt} รอบอบรม
      </span>
      <span style="font-size:12px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:6px;padding:3px 10px;display:flex;align-items:center;gap:5px;color:var(--text-secondary);">
        <i class="ti ti-users" style="font-size:13px;color:var(--accent);"></i>${regCnt} ผู้ลงทะเบียน
      </span>
      <span style="font-size:12px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:6px;padding:3px 10px;display:flex;align-items:center;gap:5px;color:var(--text-secondary);">
        <i class="ti ti-circle-check" style="font-size:13px;color:var(--success);"></i>${attCnt} เช็คชื่อแล้ว
      </span>
      <span style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:3px;"><i class="ti ti-link" style="font-size:12px;"></i>?site=${code}</span>
    </div>
  </div>`;
}
function renderAdminLocations(){
  const el=document.getElementById('loc-list');
  if(!el)return;
  const registeredCodes=new Set(locations.map(l=>l.code));
  const ghostSites=[...new Set(allSessionsFull.map(s=>s.site))].filter(c=>!registeredCodes.has(c));
  const hasAny=locations.length||ghostSites.length;
  if(!hasAny){
    el.innerHTML='<div style="text-align:center;padding:20px;color:var(--text-muted);">ยังไม่มีสาขา</div>';
    return;
  }
  const regCards=locations.map(l=>_locCard(l.code,l.name,l.id,false)).join('');
  const ghostCards=ghostSites.map(code=>_locCard(code,code,null,true)).join('');
  el.innerHTML=regCards+ghostCards;
}
async function quickRegisterSite(code){
  const name=prompt(`ตั้งชื่อสาขา "${code}"`,code);
  if(!name)return;
  const {data,error}=await _sb.from('locations').insert({code,name}).select().single();
  if(error){showToast('บันทึกไม่สำเร็จ','danger');return;}
  locations.push(data);
  renderAdminLocations();showToast(`เพิ่มสาขา "${name}" สำเร็จ`,'success');
}
function editGhostInline(code){
  const el=document.getElementById(`ghost-${code}`);if(!el)return;
  el.style.flexDirection='row';
  el.style.alignItems='center';
  el.innerHTML=`
    <div style="display:flex;gap:6px;flex:1;align-items:center;flex-wrap:wrap;">
      <input class="form-control" id="ghost-inp-code-${code}" value="${code}" placeholder="รหัสสาขา" style="width:140px;height:32px;font-size:13px;">
      <input class="form-control" id="ghost-inp-name-${code}" placeholder="ชื่อสาขา" style="flex:1;min-width:120px;height:32px;font-size:13px;"
        onkeydown="if(event.key==='Enter')saveGhostInline('${code}');if(event.key==='Escape')renderAdminLocations();">
    </div>
    <div style="display:flex;gap:4px;">
      <button class="btn btn-success btn-sm" onclick="saveGhostInline('${code}')"><i class="ti ti-check"></i></button>
      <button class="btn btn-ghost btn-sm" onclick="renderAdminLocations()"><i class="ti ti-x"></i></button>
    </div>`;
  document.getElementById(`ghost-inp-name-${code}`).focus();
}
async function saveGhostInline(origCode){
  const code=document.getElementById(`ghost-inp-code-${origCode}`).value.trim().toLowerCase();
  const name=document.getElementById(`ghost-inp-name-${origCode}`).value.trim();
  if(!code||!name){showToast('กรุณาระบุรหัสและชื่อสาขา','danger');return;}
  if(!/^[a-z0-9_-]+$/.test(code)){showToast('รหัสสาขาใช้ได้เฉพาะ a-z 0-9 - _','danger');return;}
  if(locations.find(l=>l.code===code)){showToast('รหัสสาขานี้มีอยู่แล้ว','danger');return;}
  const {data,error}=await _sb.from('locations').insert({code,name}).select().single();
  if(error){showToast('บันทึกไม่สำเร็จ','danger');return;}
  locations.push(data);
  renderAdminLocations();showToast(`เพิ่มสาขา "${name}" สำเร็จ`,'success');
}
function editLocInline(id){
  const loc=locations.find(l=>l.id===id);if(!loc)return;
  const el=document.getElementById(`loc-row-${id}`);if(!el)return;
  el.style.flexDirection='row';
  el.style.alignItems='center';
  el.innerHTML=`
    <div style="display:flex;gap:6px;flex:1;align-items:center;flex-wrap:wrap;">
      <input class="form-control" id="loc-inp-code-${id}" value="${loc.code}" placeholder="รหัสสาขา" style="width:140px;height:32px;font-size:13px;">
      <input class="form-control" id="loc-inp-name-${id}" value="${loc.name}" placeholder="ชื่อสาขา" style="flex:1;min-width:120px;height:32px;font-size:13px;"
        onkeydown="if(event.key==='Enter')saveLocInline(${id});if(event.key==='Escape')renderAdminLocations();">
    </div>
    <div style="display:flex;gap:4px;">
      <button class="btn btn-success btn-sm" onclick="saveLocInline(${id})"><i class="ti ti-check"></i></button>
      <button class="btn btn-ghost btn-sm" onclick="renderAdminLocations()"><i class="ti ti-x"></i></button>
    </div>`;
  document.getElementById(`loc-inp-name-${id}`).focus();
}
async function saveLocInline(id){
  const code=document.getElementById(`loc-inp-code-${id}`).value.trim().toLowerCase();
  const name=document.getElementById(`loc-inp-name-${id}`).value.trim();
  if(!code||!name){showToast('กรุณาระบุรหัสและชื่อสาขา','danger');return;}
  if(!/^[a-z0-9_-]+$/.test(code)){showToast('รหัสสาขาใช้ได้เฉพาะ a-z 0-9 - _','danger');return;}
  if(locations.find(l=>l.code===code&&l.id!==id)){showToast('รหัสสาขานี้มีอยู่แล้ว','danger');return;}
  const {error}=await _sb.from('locations').update({code,name}).eq('id',id);
  if(error){showToast('บันทึกไม่สำเร็จ','danger');return;}
  const loc=locations.find(l=>l.id===id);
  if(loc){loc.code=code;loc.name=name;}
  renderAdminLocations();showToast('แก้ไขสาขาสำเร็จ','success');
}
async function addLocation(){
  const codeEl=document.getElementById('new-loc-code');
  const nameEl=document.getElementById('new-loc-name');
  const code=codeEl.value.trim().toLowerCase();
  const name=nameEl.value.trim();
  if(!code||!name){showToast('กรุณาระบุรหัสและชื่อสาขา','danger');return;}
  if(!/^[a-z0-9_-]+$/.test(code)){showToast('รหัสสาขาใช้ได้เฉพาะ a-z 0-9 - _','danger');return;}
  if(locations.find(l=>l.code===code)){showToast('รหัสสาขานี้มีอยู่แล้ว','danger');return;}
  const {data,error}=await _sb.from('locations').insert({code,name}).select().single();
  if(error){showToast('บันทึกไม่สำเร็จ','danger');return;}
  locations.push(data);
  codeEl.value='';nameEl.value='';
  renderAdminLocations();showToast(`เพิ่มสาขา "${name}" สำเร็จ`,'success');
}
async function deleteLoc(id){
  const loc=locations.find(l=>l.id===id);if(!loc)return;
  if(loc.code===currentSite){showToast('ไม่สามารถลบสาขาที่กำลังใช้งาน','danger');return;}
  if(!await showConfirm(`ลบสาขา "${loc.name}"?`,'ข้อมูลหลักสูตร/รอบของสาขานี้จะไม่ถูกลบ',{okLabel:'ลบ'}))return;
  const {error}=await _sb.from('locations').delete().eq('id',id);
  if(error){showToast('ลบไม่สำเร็จ','danger');return;}
  locations=locations.filter(l=>l.id!==id);
  renderAdminLocations();showToast(`ลบสาขา "${loc.name}" สำเร็จ`,'success');
}

/* ══ ADMIN USERS ══ */
function renderAdminUsers(){
  const el=document.getElementById('admin-users-list');
  if(!el)return;
  if(!adminUsers.length){
    el.innerHTML='<div style="text-align:center;padding:20px;color:var(--text-muted);">ยังไม่มีผู้ใช้งาน</div>';
    return;
  }
  el.innerHTML=adminUsers.map(u=>`
    <div class="master-item" id="au-row-${u.id}">
      <div style="display:flex;gap:8px;align-items:center;flex:1;flex-wrap:wrap;">
        <i class="ti ti-user-shield" style="color:var(--primary);font-size:16px;"></i>
        <span style="font-weight:500;">${u.username}</span>
        ${u.id===currentAdminUser?.id?'<span style="font-size:11px;background:var(--success-light);color:var(--success);padding:1px 7px;border-radius:20px;font-weight:600;">กำลังใช้งาน</span>':''}
      </div>
      <div style="display:flex;gap:4px;">
        <button class="btn btn-ghost btn-sm" onclick="editAdminUserInline(${u.id})"><i class="ti ti-edit"></i></button>
        <button class="btn btn-danger btn-sm" onclick="deleteAdminUser(${u.id})"
          ${u.id===currentAdminUser?.id||adminUsers.length<=1?' disabled title="ไม่สามารถลบได้"':''}><i class="ti ti-trash"></i></button>
      </div>
    </div>`).join('');
}
function editAdminUserInline(id){
  const user=adminUsers.find(u=>u.id===id);if(!user)return;
  const el=document.getElementById(`au-row-${id}`);if(!el)return;
  el.innerHTML=`
    <div style="display:flex;gap:6px;flex:1;align-items:center;flex-wrap:wrap;">
      <input class="form-control" id="au-inp-user-${id}" value="${user.username}" placeholder="ชื่อผู้ใช้"
        style="width:150px;height:32px;font-size:13px;">
      <input class="form-control" type="password" id="au-inp-pass-${id}" placeholder="รหัสผ่านใหม่ (เว้นว่าง=คงเดิม)"
        style="flex:1;min-width:180px;height:32px;font-size:13px;"
        onkeydown="if(event.key==='Enter')saveAdminUserInline(${id});if(event.key==='Escape')renderAdminUsers();">
    </div>
    <div style="display:flex;gap:4px;">
      <button class="btn btn-success btn-sm" onclick="saveAdminUserInline(${id})"><i class="ti ti-check"></i></button>
      <button class="btn btn-ghost btn-sm" onclick="renderAdminUsers()"><i class="ti ti-x"></i></button>
    </div>`;
  document.getElementById(`au-inp-user-${id}`).focus();
}
async function saveAdminUserInline(id){
  const username=document.getElementById(`au-inp-user-${id}`).value.trim();
  const newPass=document.getElementById(`au-inp-pass-${id}`).value;
  if(!username){showToast('กรุณาระบุชื่อผู้ใช้','danger');return;}
  if(adminUsers.find(a=>a.username===username&&a.id!==id)){showToast('ชื่อผู้ใช้นี้มีอยู่แล้ว','danger');return;}
  const payload={username};
  if(newPass)payload.password=newPass;
  const {error}=await _sb.from('admin_users').update(payload).eq('id',id);
  if(error){showToast('บันทึกไม่สำเร็จ','danger');return;}
  const user=adminUsers.find(u=>u.id===id);
  if(user)user.username=username;
  if(currentAdminUser?.id===id)currentAdminUser.username=username;
  renderAdminUsers();showToast('แก้ไขผู้ใช้งานสำเร็จ','success');
}
async function addAdminUser(){
  const uEl=document.getElementById('new-au-username');
  const pEl=document.getElementById('new-au-password');
  const username=uEl.value.trim();
  const password=pEl.value;
  if(!username||!password){showToast('กรุณาระบุชื่อผู้ใช้และรหัสผ่าน','danger');return;}
  if(adminUsers.find(a=>a.username===username)){showToast('ชื่อผู้ใช้นี้มีอยู่แล้ว','danger');return;}
  const {data,error}=await _sb.from('admin_users').insert({username,password}).select('id,username,created_at').single();
  if(error){showToast('บันทึกไม่สำเร็จ','danger');return;}
  adminUsers.push(data);
  uEl.value='';pEl.value='';
  renderAdminUsers();showToast(`เพิ่มผู้ใช้ "${username}" สำเร็จ`,'success');
}
async function deleteAdminUser(id){
  const user=adminUsers.find(u=>u.id===id);if(!user)return;
  if(user.id===currentAdminUser?.id){showToast('ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่','danger');return;}
  if(adminUsers.length<=1){showToast('ต้องมีผู้ใช้งานอย่างน้อย 1 คน','danger');return;}
  if(!await showConfirm(`ลบผู้ใช้ "${user.username}"?`,'',{okLabel:'ลบ'}))return;
  const {error}=await _sb.from('admin_users').delete().eq('id',id);
  if(error){showToast('ลบไม่สำเร็จ','danger');return;}
  adminUsers=adminUsers.filter(u=>u.id!==id);
  renderAdminUsers();showToast(`ลบผู้ใช้ "${user.username}" สำเร็จ`,'success');
}
function toggleNewPass(){
  const inp=document.getElementById('new-au-password');
  const icon=document.getElementById('new-au-eye');
  if(inp.type==='password'){inp.type='text';icon.className='ti ti-eye-off';}
  else{inp.type='password';icon.className='ti ti-eye';}
}

/* ══ LOGIN VERIFY ══ */
const _LV_STATUS=[
  {value:'has_login',label:'มี Login แล้ว',bg:'#dcfce7',c:'#166534',icon:'circle-check'},
  {value:'no_login', label:'ไม่มี Login',  bg:'#fef3c7',c:'#92400e',icon:'alert-triangle'},
  {value:'disabled', label:'ปิดการใช้งาน',bg:'#fee2e2',c:'#991b1b',icon:'ban'},
  {value:'pending',  label:'ยังไม่ระบุสถานะ',bg:'#f1f5f9',c:'#64748b',icon:'help-circle'},
];
function _lvKey(fname,lname,dept){return`${fname}|${lname}|${dept}`;}
function _lvGetVal(fname,lname,dept,field,def){
  const k=_lvKey(fname,lname,dept);
  if(_lvEdits[k]&&_lvEdits[k][field]!==undefined)return _lvEdits[k][field];
  const d=loginVerifyData.find(x=>x.fname===fname&&x.lname===lname&&x.dept===dept);
  return d?.[field]??def;
}
function _lvOnChange(key,field,value){
  if(!_lvEdits[key])_lvEdits[key]={};
  _lvEdits[key][field]=value;
  if(field==='login_status'){
    const sel=document.querySelector(`select[data-lv-key="${encodeURIComponent(key)}"]`);
    if(sel)_applyLvSelColor(sel);
    const sfVal=document.getElementById('lv-status-filter')?.value||'';
    if(sfVal&&value!==sfVal){
      const tr=document.querySelector(`tr[data-lv-row="${encodeURIComponent(key)}"]`);
      if(tr)tr.style.display='none';
    }
  }
}
function _applyLvSelColor(sel){
  const st=_LV_STATUS.find(s=>s.value===sel.value)||_LV_STATUS[3];
  sel.style.background=st.bg;sel.style.color=st.c;sel.style.fontWeight='600';sel.style.borderColor=st.c+'44';
}
function renderLoginVerify(){
  const tbody=document.getElementById('lv-tbody');if(!tbody)return;
  const q=(document.getElementById('lv-search')?.value||'').toLowerCase();
  const sf=document.getElementById('lv-status-filter')?.value||'';
  // Build unique persons map from registrations of current site only
  const seen=new Map();
  registrations.filter(r=>!!getSess(r.sessionId)).forEach(r=>{
    const k=_lvKey(r.fname,r.lname,r.dept);
    if(!seen.has(k))seen.set(k,{fname:r.fname,lname:r.lname,dept:r.dept,position:r.position||''});
  });
  let persons=Array.from(seen.values());
  if(q)persons=persons.filter(p=>`${p.fname}${p.lname}${p.dept}`.toLowerCase().includes(q));
  if(sf)persons=persons.filter(p=>_lvGetVal(p.fname,p.lname,p.dept,'login_status','pending')===sf);
  if(!persons.length){
    tbody.innerHTML='<tr><td colspan="5"><div class="empty"><i class="ti ti-users-minus"></i><p>ไม่พบรายชื่อ</p></div></td></tr>';
    return;
  }
  tbody.innerHTML=persons.map((p,i)=>{
    const k=_lvKey(p.fname,p.lname,p.dept);
    const ek=encodeURIComponent(k);
    const status=_lvGetVal(p.fname,p.lname,p.dept,'login_status','pending');
    const notes=_lvGetVal(p.fname,p.lname,p.dept,'notes','');
    const opts=_LV_STATUS.map(s=>`<option value="${s.value}"${status===s.value?' selected':''}>${s.label}</option>`).join('');
    return`<tr data-lv-row="${ek}">
      <td style="color:var(--text-muted);">${i+1}</td>
      <td style="font-weight:600;">${p.fname} ${p.lname}</td>
      <td>
        <div style="font-size:13px;">${p.position||'-'}</div>
        <div style="font-size:11px;color:var(--text-muted);">${p.dept}</div>
      </td>
      <td>
        <select class="form-control" data-lv-key="${ek}" data-lv-field="status"
          onchange="_lvOnChange(decodeURIComponent(this.dataset.lvKey),'login_status',this.value);_applyLvSelColor(this)"
          style="height:34px;font-size:13px;">
          ${opts}
        </select>
      </td>
      <td>
        <input class="form-control" data-lv-key="${ek}" data-lv-field="notes"
          value="${(notes+'').replace(/"/g,'&quot;')}"
          placeholder="ระบุหมายเหตุ..."
          oninput="_lvOnChange(decodeURIComponent(this.dataset.lvKey),'notes',this.value)"
          style="font-size:13px;height:34px;">
      </td>
    </tr>`;
  }).join('');
  tbody.querySelectorAll('select[data-lv-field="status"]').forEach(_applyLvSelColor);
}
async function saveLoginVerifyAll(){
  // Build full unique-person map from current site's registrations only
  const seen=new Map();
  registrations.filter(r=>!!getSess(r.sessionId)).forEach(r=>{
    const k=_lvKey(r.fname,r.lname,r.dept);
    if(!seen.has(k))seen.set(k,{fname:r.fname,lname:r.lname,dept:r.dept,position:r.position||''});
  });
  // Collect current DOM values (may be filtered subset)
  const domMap={};
  document.querySelectorAll('select[data-lv-field="status"]').forEach(sel=>{
    const k=decodeURIComponent(sel.dataset.lvKey);
    const notesEl=document.querySelector(`input[data-lv-key="${sel.dataset.lvKey}"][data-lv-field="notes"]`);
    domMap[k]={login_status:sel.value,notes:notesEl?notesEl.value.trim():''};
    _lvEdits[k]=domMap[k];
  });
  // Build rows for all unique persons
  const rows=[];
  seen.forEach((p,k)=>{
    const status=domMap[k]?.login_status||_lvGetVal(p.fname,p.lname,p.dept,'login_status','pending');
    const notes=domMap[k]?.notes??_lvGetVal(p.fname,p.lname,p.dept,'notes','');
    rows.push({fname:p.fname,lname:p.lname,dept:p.dept,position:p.position,login_status:status,notes:notes||'',site:currentSite});
  });
  if(!rows.length){showToast('ไม่มีข้อมูลให้บันทึก','warn');return;}
  const btn=document.getElementById('lv-save-btn');
  if(btn){btn.disabled=true;btn.innerHTML='<i class="ti ti-loader-2" style="animation:spin .8s linear infinite"></i>กำลังบันทึก...';}
  try{
    const {error}=await _sb.from('login_verify').upsert(rows,{onConflict:'fname,lname,dept,site'});
    if(error)throw error;
    const {data}=await _sb.from('login_verify').select('*').eq('site',currentSite);
    loginVerifyData=data||[];
    _lvEdits={};
    showToast(`บันทึกสถานะ ${rows.length} รายการสำเร็จ`,'success');
    renderLoginVerify();
  }catch(e){showToast('บันทึกไม่สำเร็จ: '+e.message,'danger');}
  if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-device-floppy"></i>บันทึกสถานะ';}
}
async function loadLoginVerify(){
  const {data}=await _sb.from('login_verify').select('*').eq('site',currentSite);
  loginVerifyData=data||[];
  _lvEdits={};
  renderLoginVerify();
  showToast('โหลดข้อมูลใหม่แล้ว','success');
}

/* ══ ADMIN REGS ══ */
function renderAdminRegs(){
  const q=(document.getElementById('admin-search').value||'').toLowerCase();
  const sid=document.getElementById('admin-filter-sess').value;
  let regs=registrations.filter(r=>!!getSess(r.sessionId));
  if(q)regs=regs.filter(r=>(r.fname+r.lname+(r.position||'')).toLowerCase().includes(q));
  if(sid)regs=regs.filter(r=>r.sessionId==sid);
  const tbody=document.getElementById('admin-reg-tbody');
  if(!regs.length){tbody.innerHTML='<tr><td colspan="12"><div class="empty"><i class="ti ti-users-minus"></i><p>ไม่พบรายการ</p></div></td></tr>';return;}
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
      <td><button class="btn btn-ghost btn-sm" onclick="adminOpenEditReg(${r.id})" title="แก้ไข"><i class="ti ti-edit"></i></button></td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteReg(${r.id})"><i class="ti ti-trash"></i></button></td>
    </tr>`;
  }).join('');
}
async function deleteReg(id){
  if(!await showConfirm('ลบรายการลงทะเบียนนี้?','',{okLabel:'ลบ'}))return;
  const {error}=await _sb.from('registrations').delete().eq('id',id);
  if(error){showToast('ลบไม่สำเร็จ','danger');return;}
  registrations=registrations.filter(r=>r.id!==id);renderAdminRegs();showToast('ลบสำเร็จ','success');
}
function adminAddReg(){
  populateSelect('ar-prefix',prefixes,'คำนำหน้า...');
  populateSelect('ar-dept',departments,'เลือกแผนก...');
  ['ar-fname','ar-lname','ar-pos'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('ar-sess').innerHTML=sessions.map(ss=>{
    const cnt=getCount(ss.id),cat=getCat(ss.catId);
    const full=cnt>=ss.capacity;
    return`<option value="${ss.id}"${full?' disabled':''}>${cat?cat.name+' — ':''}${ss.name} (${fmtDateShort(ss.date)})${full?' [เต็ม]':' ว่าง '+(ss.capacity-cnt)+' ที่'}</option>`;
  }).join('');
  document.getElementById('modal-admin-add-reg').classList.add('open');
}
async function adminSubmitReg(){
  const sessId=parseInt(document.getElementById('ar-sess').value);
  const prefix=document.getElementById('ar-prefix').value;
  const fname=document.getElementById('ar-fname').value.trim();
  const lname=document.getElementById('ar-lname').value.trim();
  const pos=document.getElementById('ar-pos').value.trim();
  const dept=document.getElementById('ar-dept').value;
  if(!sessId||!prefix||!fname||!lname||!pos||!dept){showToast('กรุณากรอกข้อมูลให้ครบ','danger');return;}
  const s=getSess(sessId);
  if(getCount(sessId)>=s.capacity){showToast('ที่นั่งเต็มแล้ว','danger');return;}
  const dup=findDupReg(fname,lname,s.catId);
  if(dup){
    const dupSess=getSess(dup.sessionId);
    if(dup.sessionId===sessId){showToast(`${fname} ${lname} ลงทะเบียนรอบนี้ไว้แล้ว`,'danger');return;}
    if(!await showConfirm(`${fname} ${lname} ลงทะเบียน "${dupSess?dupSess.name:'รอบอื่น'}" ในประเภทนี้อยู่แล้ว`,`ต้องการเพิ่มรายการซ้ำหรือไม่?`,{okLabel:'เพิ่มรายการ',danger:false}))return;
  }
  const {data,error}=await _sb.from('registrations').insert({
    session_id:sessId,prefix,fname,lname,position:pos,dept,
    reg_date:new Date().toISOString().split('T')[0],attended:false
  }).select().single();
  if(error){showToast('บันทึกไม่สำเร็จ','danger');return;}
  const nr=_mReg(data);
  registrations.push(nr);
  closeModal('modal-admin-add-reg');renderAdmin();
  showToast(`เพิ่ม ${prefix}${fname} ${lname} สำเร็จ`,'success');
  pushNotify(nr);
}
function adminOpenEditReg(regId){
  const reg=getReg(regId);if(!reg)return;
  window._editRegId=regId;window._editRegAdmin=true;
  populateSelect('edit-prefix',prefixes,'คำนำหน้า...');
  document.getElementById('edit-prefix').value=reg.prefix||'';
  document.getElementById('edit-fname').value=reg.fname;
  document.getElementById('edit-lname').value=reg.lname;
  document.getElementById('edit-pos').value=reg.position||'';
  populateSelect('edit-dept',departments,'เลือกแผนก...');
  document.getElementById('edit-dept').value=reg.dept;
  document.getElementById('edit-sess').innerHTML=sessions.map(ss=>{
    const cnt=getCount(ss.id),isCur=ss.id===reg.sessionId,cat=getCat(ss.catId);
    const isFull=!isCur&&cnt>=ss.capacity;
    return`<option value="${ss.id}"${isCur?' selected':''}${isFull?' disabled':''}>${cat?cat.name+' — ':''}${ss.name} — ${fmtDateShort(ss.date)}${isCur?' (ปัจจุบัน)':isFull?' [เต็ม]':' (ว่าง '+(ss.capacity-cnt)+' ที่)'}</option>`;
  }).join('');
  document.getElementById('edit-deadline-txt').textContent='Admin — แก้ไขได้ไม่จำกัดเงื่อนไข';
  document.getElementById('modal-edit-reg').classList.add('open');
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

/* ══════════════════ EDIT REGISTRATION ══════════════════ */
function openEditReg(regId){
  const reg=getReg(regId);if(!reg)return;
  if(!canEditReg(reg)){showToast('ไม่สามารถแก้ไขได้ — เลยกำหนดแก้ไขล่วงหน้า 1 วัน','danger');return;}
  window._editRegId=regId;
  const s=getSess(reg.sessionId);
  populateSelect('edit-prefix',prefixes,'คำนำหน้า...');
  document.getElementById('edit-prefix').value=reg.prefix||'';
  document.getElementById('edit-fname').value=reg.fname;
  document.getElementById('edit-lname').value=reg.lname;
  document.getElementById('edit-pos').value=reg.position||'';
  populateSelect('edit-dept',departments,'เลือกแผนก...');
  document.getElementById('edit-dept').value=reg.dept;
  const sameSess=sessions.filter(ss=>ss.catId===s.catId);
  const today=new Date();today.setHours(0,0,0,0);
  document.getElementById('edit-sess').innerHTML=sameSess.map(ss=>{
    const cnt=getCount(ss.id),isCur=ss.id===reg.sessionId;
    const isFull=!isCur&&cnt>=ss.capacity;
    const sd=new Date(ss.date);sd.setHours(0,0,0,0);
    const pastDeadline=!isCur&&today>=sd;
    const disabled=isFull||pastDeadline;
    return`<option value="${ss.id}"${isCur?' selected':''}${disabled?' disabled':''}>${ss.name} — ${fmtDateShort(ss.date)}${isCur?' (รอบปัจจุบัน)':isFull?' [เต็ม]':pastDeadline?' [เลยกำหนด]':' (ว่าง '+(ss.capacity-cnt)+' ที่)'}</option>`;
  }).join('');
  const deadline=new Date(s.date);deadline.setDate(deadline.getDate()-1);
  document.getElementById('edit-deadline-txt').textContent='แก้ไขได้ถึง: '+fmtDate(deadline.toISOString().split('T')[0]);
  document.getElementById('modal-edit-reg').classList.add('open');
}
async function submitEditReg(){
  const reg=getReg(window._editRegId);if(!reg)return;
  const isAdmin=window._editRegAdmin===true;
  if(!isAdmin&&!canEditReg(reg)){showToast('เลยกำหนดแก้ไขแล้ว','danger');closeModal('modal-edit-reg');return;}
  const prefix=document.getElementById('edit-prefix').value;
  const fname=document.getElementById('edit-fname').value.trim();
  const lname=document.getElementById('edit-lname').value.trim();
  const pos=document.getElementById('edit-pos').value.trim();
  const dept=document.getElementById('edit-dept').value;
  const newSessId=parseInt(document.getElementById('edit-sess').value);
  if(!prefix||!fname||!lname||!pos||!dept){showToast('กรุณากรอกข้อมูลให้ครบ','danger');return;}
  if(newSessId!==reg.sessionId){
    const ns=getSess(newSessId);if(!ns){showToast('ไม่พบรอบที่เลือก','danger');return;}
    if(!isAdmin){
      const today=new Date();today.setHours(0,0,0,0);
      const nd=new Date(ns.date);nd.setHours(0,0,0,0);
      if(today>=nd){showToast('รอบที่เลือกเลยกำหนดแก้ไขแล้ว','danger');return;}
    }
    if(getCount(newSessId)>=ns.capacity){showToast('รอบที่เลือกเต็มแล้ว','danger');return;}
    const dup=findDupReg(fname,lname,ns.catId,reg.id);
    if(dup){
      const dupSess=getSess(dup.sessionId);
      showToast(`${fname} ${lname} ลงทะเบียน "${dupSess?dupSess.name:'รอบอื่น'}" ในประเภทนี้ไว้แล้ว`,'danger');return;
    }
  }
  const {error}=await _sb.from('registrations').update({
    session_id:newSessId,prefix,fname,lname,position:pos,dept
  }).eq('id',reg.id);
  if(error){showToast('บันทึกไม่สำเร็จ','danger');return;}
  Object.assign(reg,{prefix,fname,lname,position:pos,dept,sessionId:newSessId});
  window._editRegAdmin=false;
  closeModal('modal-edit-reg');
  renderCategories();
  if(isAdmin)renderAdmin();else trackSearch();
  showToast('แก้ไขข้อมูลสำเร็จ','success');
}

/* ══ UTILS ══ */
function closeModal(id){document.getElementById(id).classList.remove('open');}
function showConfirm(msg,subMsg='',{okLabel='ตกลง',danger=true}={}){
  return new Promise(resolve=>{
    document.getElementById('confirm-msg').textContent=msg;
    const sub=document.getElementById('confirm-sub');
    sub.textContent=subMsg;sub.style.display=subMsg?'block':'none';
    document.getElementById('confirm-icon').innerHTML=danger
      ?'<i class="ti ti-alert-triangle" style="color:var(--danger)"></i>'
      :'<i class="ti ti-help-circle" style="color:var(--primary)"></i>';
    const okBtn=document.getElementById('confirm-ok-btn');
    okBtn.className='btn '+(danger?'btn-danger':'btn-primary');
    okBtn.innerHTML=(danger?'<i class="ti ti-trash"></i>':'<i class="ti ti-check"></i>')+okLabel;
    document.getElementById('modal-confirm').classList.add('open');
    const done=(v)=>{closeModal('modal-confirm');resolve(v);};
    const ok=()=>done(true);
    const cancel=()=>done(false);
    okBtn.onclick=ok;
    document.getElementById('confirm-cancel-btn').onclick=cancel;
  });
}
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

/* ══ PRINT FORM ══ */
function openPrintForm(){
  const sel=document.getElementById('pf-sess');
  sel.innerHTML='<option value="">-- เลือกรอบ --</option>'+sessions.map(s=>{
    const cat=getCat(s.catId);
    const cnt=getCount(s.id);
    return`<option value="${s.id}">${cat?cat.name+' — ':''}${s.name} (${fmtDateShort(s.date)}) [${cnt} คน]</option>`;
  }).join('');
  // Pre-select current filter if any
  const curFilt=document.getElementById('admin-filter-sess')?.value;
  if(curFilt)sel.value=curFilt;
  onPrintFormSessChange();
  // Sync hospital → pf-signer-org
  const hosp=document.getElementById('pf-hospital').value;
  const sigOrg=document.getElementById('pf-signer-org');
  if(sigOrg&&!sigOrg.value&&hosp)sigOrg.value=hosp;
  document.getElementById('modal-print-form').classList.add('open');
}
function onPrintFormSessChange(){
  const sid=parseInt(document.getElementById('pf-sess').value||0);
  if(!sid){
    document.getElementById('pf-system').value='';
    document.getElementById('pf-details').value='';
    return;
  }
  const s=getSess(sid);if(!s)return;
  const cat=getCat(s.catId);
  document.getElementById('pf-system').value=cat?`${cat.name} — ${s.name}`:s.name;
  if(cat&&cat.desc)document.getElementById('pf-details').value=cat.desc;
}
function executePrintForm(){
  const sid=parseInt(document.getElementById('pf-sess').value||0);
  if(!sid){showToast('กรุณาเลือกรอบอบรม','danger');return;}
  const s=getSess(sid);if(!s){showToast('ไม่พบรอบที่เลือก','danger');return;}
  const cat=getCat(s.catId);
  const hospital=(document.getElementById('pf-hospital').value||'').trim();
  if(!hospital){
    const el=document.getElementById('pf-hospital');
    el.focus();el.style.borderColor='var(--danger)';
    el.addEventListener('input',()=>el.style.borderColor='',{once:true});
    showToast('กรุณาระบุชื่อสถานพยาบาล / หน่วยงาน','danger');return;
  }
  const program=(document.getElementById('pf-program').value||'BMS-INVENTORY').trim();
  const system=(document.getElementById('pf-system').value||'').trim();
  const details=(document.getElementById('pf-details').value||'').trim();
  const bmsName=(document.getElementById('pf-bms-name').value||'').trim();
  const bmsPos=(document.getElementById('pf-bms-pos').value||'เจ้าหน้าที่ฝึกอบรม').trim();
  const bmsOrg=(document.getElementById('pf-bms-org').value||'บริษัท บางกอก เมดิคอล ซอฟต์แวร์ จำกัด').trim();
  const signerName=(document.getElementById('pf-signer-name').value||'').trim();
  const signerPos=(document.getElementById('pf-signer-pos').value||'').trim();
  const signerOrg=(document.getElementById('pf-signer-org')?.value||hospital).trim();
  const totalRows=Math.max(10,Math.min(60,parseInt(document.getElementById('pf-rows').value||25)));
  const regs=registrations.filter(r=>r.sessionId===sid);
  // Build table rows
  let rowsHtml='';
  for(let i=0;i<totalRows;i++){
    const r=regs[i];
    rowsHtml+=`<tr>
      <td style="text-align:center;padding:4px 6px;">${i+1}</td>
      <td style="padding:4px 8px;">${r?`${r.prefix||''}${r.fname} ${r.lname}`:''}</td>
      <td style="padding:4px 8px;">${r?r.position||'':''}</td>
      <td style="padding:4px 8px;">${r?r.dept||'':''}</td>
      <td style="padding:4px 8px;"></td>
    </tr>`;
  }
  const dateStr=fmtDate(s.date);
  const timeStr=`${s.timeStart||''}–${s.timeEnd||''} น.`;
  const _logoBase=window.location.href.replace(/[^/]*(\?.*)?$/, '');
  const html=`<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>ใบเซ็นต์ชื่อ — ${s.name}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'TH SarabunPSK','Sarabun','Prompt',Arial,sans-serif;font-size:15px;color:#111;padding:14mm 14mm 14mm 14mm;background:#fff;}
.header-img{display:block;height:72px;width:auto;margin-bottom:8px;}
.header-fallback{display:flex;gap:14px;align-items:flex-start;margin-bottom:10px;}
.company-info{font-size:11.5px;line-height:1.7;color:#333;}
.company-info strong{font-size:13px;color:#111;}
.form-title{font-size:16px;font-weight:bold;text-align:center;border:1.5px solid #111;padding:7px 10px;margin-bottom:0;}
.info-tbl{width:100%;border-collapse:collapse;border:1.5px solid #111;margin-bottom:10px;}
.info-tbl td{padding:5px 9px;border:1px solid #999;font-size:14px;line-height:1.5;}
.info-tbl .lbl{font-weight:700;white-space:nowrap;}
.main-tbl{width:100%;border-collapse:collapse;}
.main-tbl th{border:1.5px solid #111;padding:6px 8px;text-align:center;font-size:14px;background:#f4f4f4;font-weight:bold;}
.main-tbl td{border:1px solid #888;padding:0;height:22px;}
.main-tbl td span{display:block;padding:2px 7px;font-size:13.5px;height:100%;line-height:22px;}
.footer{display:flex;justify-content:space-between;margin-top:28px;page-break-inside:avoid;}
.footer-blk{text-align:center;width:44%;}
.footer-line{border-bottom:1px solid #333;width:260px;margin:0 auto 5px;}
.footer-lbl{font-size:13.5px;line-height:1.8;}
.no-print{display:block;}
@media print{
  body{padding:8mm 10mm;}
  .no-print{display:none!important;}
  @page{size:A4 portrait;margin:8mm 10mm;}
}
</style>
</head>
<body>
<!-- Header: full image if available, fallback to SVG + text -->
<img class="header-img" id="hdr-img"
  src="${_logoBase}bms-logo.png"
  alt="BMS Header"
  onerror="this.style.display='none';document.getElementById('hdr-fallback').style.display='flex';">
<div class="header-fallback" id="hdr-fallback" style="display:none;">
  <svg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">
    <path d="M40 74 C39 73 5 53 5 29 C5 15 16 5 28 5 C34 5 39 9 40 12 C41 9 46 5 52 5 C64 5 75 15 75 29 C75 53 41 73 40 74Z" fill="#c0392b"/>
    <path d="M10 48 C20 40 31 38 40 42 C49 46 60 49 70 44" stroke="#1a5899" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M11 57 C21 49 32 47 41 51 C50 55 61 58 71 53" stroke="#1a5899" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.6"/>
    <text x="40" y="43" text-anchor="middle" fill="white" font-family="Arial Black,sans-serif" font-weight="900" font-size="17" letter-spacing="1">BMS</text>
    <text x="59" y="32" fill="white" font-family="Arial,sans-serif" font-size="7">&#174;</text>
  </svg>
  <div class="company-info">
    <strong>บริษัท บางกอก เมดิคอล ซอฟต์แวร์ จำกัด (สำนักงานใหญ่)</strong><br>
    เลขที่ 2 ชั้น 2 จ.สุขสวัสดิ์ 33 แขวง/เขต ราษฎร์บูรณะ กรุงเทพมหานคร<br>
    โทรศัพท์ 0-2427-9991 โทรสาร 0-2873-0292<br>
    เลขที่ประจำตัวผู้เสียภาษี 0105548152334
  </div>
</div>
<div class="form-title">ใบเซ็นต์ชื่อผู้เข้าร่วมอบรมการใช้งานโปรแกรม ${_esc(program)}</div>
<table class="info-tbl">
  <tr>
    <td width="50%"><span class="lbl">สถานพยาบาล :</span> ${_esc(hospital)}</td>
    <td width="50%"><span class="lbl">วันที่ :</span> ${dateStr} เวลา ${timeStr}</td>
  </tr>
  <tr>
    <td><span class="lbl">ระบบงาน :</span> ${_esc(system)}</td>
    <td><span class="lbl">วิทยากร :</span> ${_esc(s.trainer||'-')}</td>
  </tr>
  <tr>
    <td colspan="2"><span class="lbl">รายละเอียด :</span> ${_esc(details)}</td>
  </tr>
</table>
<table class="main-tbl">
  <thead>
    <tr>
      <th style="width:50px;">ลำดับ</th>
      <th style="min-width:180px;">ชื่อ – นามสกุล</th>
      <th style="min-width:140px;">ตำแหน่ง</th>
      <th style="min-width:140px;">แผนก</th>
      <th style="width:140px;">ลายมือชื่อ</th>
    </tr>
  </thead>
  <tbody>${rowsHtml}</tbody>
</table>
<div class="footer">
  <div class="footer-blk">
    <div class="footer-line"></div>
    <div class="footer-lbl">(${_esc(bmsName)||'..........................................'})</div>
    <div class="footer-lbl">ตำแหน่ง ${_esc(bmsPos)}</div>
    <div class="footer-lbl">${_esc(bmsOrg)}</div>
  </div>
  <div class="footer-blk">
    <div class="footer-line"></div>
    <div class="footer-lbl">(${_esc(signerName)||'..........................................'})</div>
    <div class="footer-lbl">ตำแหน่ง ${_esc(signerPos)||'........................................'}</div>
    <div class="footer-lbl">${_esc(signerOrg)||'........................................'}</div>
  </div>
</div>
<div class="no-print" style="margin-top:20px;text-align:center;">
  <button onclick="window.print()" style="padding:8px 24px;font-size:14px;cursor:pointer;background:#1a56a0;color:#fff;border:none;border-radius:6px;">🖨 พิมพ์</button>
  <button onclick="window.close()" style="margin-left:10px;padding:8px 18px;font-size:14px;cursor:pointer;background:#f1f5f9;border:1px solid #ccc;border-radius:6px;">ปิด</button>
</div>
<script>window.addEventListener('load',function(){window.print();});<\/script>
</body></html>`;
  closeModal('modal-print-form');
  const w=window.open('','_blank','width=900,height=700,scrollbars=yes');
  if(!w){showToast('Popup ถูกบล็อก กรุณาอนุญาต popup แล้วลองใหม่','danger');return;}
  w.document.open();w.document.write(html);w.document.close();
}
function _esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// INIT
initApp();
