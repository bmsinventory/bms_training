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
let keyEntryData=[];
let keSearchTxt='';
let _keReasonTimers={};
let nextId=1,nextSessId=1,nextCatId=1;
let selectedCatId=null,selectedSessId=null,sessFilt='all';
let scanStream=null,scanReq=null,scanLog=[],scanInterval=null,currentFacingMode='environment',_scanLogIds=new Set();
let _charts={};
let isAdminLoggedIn=false;
let adminUsers=[];
let currentAdminUser=null;
let adminRolePermissions={};
let siteNotifyTokens={};
let pendingPage='admin';
const APP_VERSION='v1.0.0';
const currentSite=new URLSearchParams(location.search).get('site')||'theme_1';
document.getElementById('nav-version').textContent=APP_VERSION;

/* URL ระบบ Quiz (อ่านจาก settings หรือใช้ค่า default) */
let QUIZ_BASE_URL='';
let _quizCatIds=new Set(); // category_id ที่มี quiz แล้ว

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
const _mReg=r=>({id:r.id,sessionId:r.session_id,prefix:r.prefix||'',fname:r.fname,lname:r.lname,position:r.position||'',dept:r.dept||'',regDate:r.reg_date,attended:r.attended||false,attendedTime:r.attended_time||null,isWalkin:r.is_walkin||false});

async function pushNotify(reg){
  const token=siteNotifyTokens[currentSite];
  if(!token)return;
  const s=getSess(reg.sessionId);
  const loc=locations.find(l=>l.code===currentSite);
  const dateStr=s?fmtDate(s.date):'-';
  const timeStr=s?`${s.timeStart} - ${s.timeEnd} น.`:'-';
  const lines=[
    '📢 มีผู้ลงทะเบียนใหม่',
    `🏢 สาขา: ${currentSite}${loc?' : '+loc.name:''}`,
    `👤 ชื่อ-สกุล: ${reg.prefix}${reg.fname} ${reg.lname}`,
    `💼 ตำแหน่ง: ${reg.position||'-'}`,
    `🏢 หน่วยงาน: ${reg.dept||'-'}`,
    `📚 หัวข้อ: ${s?`${getCat(s.catId)?.name||'-'} : ${s.name}`:'-'}`,
    `📅 เวลา: ${dateStr} เวลา ${timeStr}`,
  ];
  try{
    await fetch('https://api-notify.bmscloud.in.th/api/v1/push-notify',{
      method:'POST',
      headers:{'Token':token,'Content-Type':'application/json'},
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

const ADMIN_TABS=[
  {id:'sessions',     label:'รอบอบรม'},
  {id:'categories',   label:'ประเภท'},
  {id:'masters',      label:'ข้อมูลพื้นฐาน'},
  {id:'registrations',label:'ผู้ลงทะเบียน'},
  {id:'locations',    label:'สาขา'},
  {id:'users',        label:'ผู้ใช้งาน'},
  {id:'loginverify',  label:'ตรวจสอบสิทธิ์'},
  {id:'keyentry',     label:'ตรวจสอบคีย์ยอด'},
  {id:'survey',       label:'ผลประเมิน'},
  {id:'quiz',         label:'แบบทดสอบ'},
  {id:'print',        label:'พิมพ์เอกสาร'},
  {id:'settings',     label:'การตั้งค่า'},
  {id:'permissions',  label:'สิทธิ์การเข้าถึง'},
];
const ADMIN_ACTIONS=[
  {id:'action:import',       label:'นำเข้าข้อมูล\n(Import CSV)',   btnId:'btn-import'},
  {id:'action:clear_regs',   label:'เคียร์ผู้ลงทะเบียน\nตามสาขา', btnId:'btn-clear-regs'},
  {id:'action:clear_survey', label:'เคียร์ผลประเมิน\nตามสาขา',   btnId:'btn-clear-survey'},
];

/* ══════════════════ HELPERS ══════════════════ */
const getCount=sid=>registrations.filter(r=>r.sessionId===sid).length;
const getAttCount=sid=>registrations.filter(r=>r.sessionId===sid&&r.attended).length;
const getCat=id=>categories.find(c=>c.id===id);
const getSess=id=>sessions.find(s=>s.id===id);
const getReg=id=>registrations.find(r=>r.id===id);
// ถ้าปีใน date string เป็น พ.ศ. (>2500) ให้ลบ 543 ก่อน เพื่อให้ toLocaleDateString('th-TH') แสดง พ.ศ. ถูกต้อง
const _parseDate=d=>{if(!d)return new Date(NaN);const[y,...rest]=String(d).split('-');const yr=parseInt(y);return new Date([yr>2500?yr-543:yr,...rest].join('-'));};
const fmtDate=d=>{if(!d)return'-';return _parseDate(d).toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric'})};
const fmtDateShort=d=>{if(!d)return'-';return _parseDate(d).toLocaleDateString('th-TH',{year:'2-digit',month:'short',day:'numeric'})};
const getDay=d=>_parseDate(d).getDate();
const getMon=d=>_parseDate(d).toLocaleDateString('th-TH',{month:'short'});
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
  const [cR,sR,rR,mR,lR,auR,lvR,asR,qcR,quR,qjR,arR,snR]=await Promise.all([
    _sb.from('categories').select('*').eq('site',currentSite).order('id'),
    _sb.from('sessions').select('*').eq('site',currentSite).order('id'),
    _sb.from('registrations').select('*').order('id'),
    _sb.from('master_items').select('*').eq('site',currentSite).order('type,sort_order,id'),
    _sb.from('locations').select('*').order('id'),
    _sb.from('admin_users').select('id,username,name,role,created_at').order('id'),
    _sb.from('login_verify').select('*').eq('site',currentSite),
    _sb.from('sessions').select('id,site,capacity').order('id'),
    _sb.from('courses').select('id,category_id').eq('is_active',true).not('category_id','is',null),
    _sb.from('settings').select('value').eq('key','quiz_base_url').maybeSingle(),
    _sb.from('course_categories').select('category_id'),
    _sb.from('settings').select('value').eq('key','admin_role_permissions').maybeSingle(),
    _sb.from('settings').select('value').eq('key','site_notify_tokens').maybeSingle(),
  ]);
  if(cR.error||sR.error||rR.error||mR.error||lR.error||auR.error)throw new Error('โหลดข้อมูลล้มเหลว');
  categories=(cR.data||[]).map(_mCat);
  sessions=(sR.data||[]).map(_mSess);
  registrations=(rR.data||[]).map(_mReg);
  locations=(lR.data||[]);
  allSessionsFull=(asR.data||[]);
  adminUsers=(auR.data||[]);
  loginVerifyData=(lvR.data||[]);
  try{adminRolePermissions=JSON.parse(arR.data?.value||'{}');}catch(e){adminRolePermissions={};}
  // superadmin always has full access (tabs + actions)
  adminRolePermissions.superadmin=[...ADMIN_TABS.map(t=>t.id),...ADMIN_ACTIONS.map(a=>a.id)];
  try{siteNotifyTokens=JSON.parse(snR.data?.value||'{}');}catch(e){siteNotifyTokens={};}
  const ms=mR.data||[];
  trainers=ms.filter(m=>m.type==='trainer').map(m=>m.value);
  venues=ms.filter(m=>m.type==='venue').map(m=>m.value);
  departments=ms.filter(m=>m.type==='dept').map(m=>m.value);
  prefixes=ms.filter(m=>m.type==='prefix').map(m=>m.value);
  masterIds.trainer=ms.filter(m=>m.type==='trainer').map(m=>m.id);
  masterIds.venue=ms.filter(m=>m.type==='venue').map(m=>m.id);
  masterIds.dept=ms.filter(m=>m.type==='dept').map(m=>m.id);
  masterIds.prefix=ms.filter(m=>m.type==='prefix').map(m=>m.id);
  // รวม category_id จากทั้งคอลัมน์เก่า (courses.category_id) และ junction table (course_categories)
  _quizCatIds=new Set([
    ...(qcR.data||[]).map(q=>q.category_id),
    ...(qjR.data||[]).map(q=>q.category_id),
  ].filter(Boolean));
  // คำนวณ URL ของ quiz จากตำแหน่ง index.html จริง (รองรับ GitHub Pages subdirectory)
  const _computedQuizUrl=(window.location.origin+window.location.pathname).replace(/\/[^\/]*$/,'')+'/quiz';
  const _storedQuizUrl=quR.data?.value||'';
  const _isLocalhost=/localhost|127\.0\.0\.1/.test(window.location.hostname);
  if(_storedQuizUrl&&/localhost|127\.0\.0\.1/.test(_storedQuizUrl)&&!_isLocalhost){
    // ค่าใน DB เป็น localhost แต่เราอยู่บน production → update ให้อัตโนมัติ
    _sb.from('settings').upsert({key:'quiz_base_url',value:_computedQuizUrl,updated_at:new Date().toISOString()}).then(()=>{});
  }
  QUIZ_BASE_URL=(_storedQuizUrl&&!/localhost|127\.0\.0\.1/.test(_storedQuizUrl))?_storedQuizUrl:_computedQuizUrl;
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
let _rtChannel=null;
let _rtDebounceTimer=null;
let _rtReconnectTimer=null;

function _setRtStatus(s){
  const dot=document.getElementById('rt-dot');
  if(!dot)return;
  dot.className='rt-dot '+s;
  dot.title={live:'Realtime: เชื่อมต่อแล้ว — ข้อมูลอัพเดทอัตโนมัติ',error:'Realtime: ขาดการเชื่อมต่อ กำลังลองใหม่...',connecting:'Realtime: กำลังเชื่อมต่อ...'}[s]||'';
}

function _scheduleRtRefresh(){
  if(_rtDebounceTimer)clearTimeout(_rtDebounceTimer);
  _rtDebounceTimer=setTimeout(async()=>{
    try{await loadAllData();refreshCurrentView();}
    catch(e){console.error('RT refresh:',e);}
  },400);
}

function initRealtime(){
  if(_rtChannel)return;
  if(_rtReconnectTimer){clearTimeout(_rtReconnectTimer);_rtReconnectTimer=null;}
  _setRtStatus('connecting');
  _rtChannel=_sb.channel('bms-rt-v3')
    // registrations: อัพเดทข้อมูลใน local array ทันที ไม่รอ debounce
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'registrations'},(p)=>{
      if(p.new&&!getReg(p.new.id))registrations.push(_mReg(p.new));
      _scheduleRtRefresh();
    })
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'registrations'},(p)=>{
      if(!p.new)return;
      const reg=getReg(p.new.id);
      if(reg)Object.assign(reg,_mReg(p.new));
      else registrations.push(_mReg(p.new));
      updateCheckinHeroStats();
      _mergeRealtimeScanLog();
      const sub=document.querySelector('.checkin-sub.active');
      if(sub&&sub.id==='csub-list')loadAttendance();
      _scheduleRtRefresh();
    })
    .on('postgres_changes',{event:'DELETE',schema:'public',table:'registrations'},(p)=>{
      if(!p.old)return;
      const idx=registrations.findIndex(r=>r.id===p.old.id);
      if(idx!==-1)registrations.splice(idx,1);
      _scheduleRtRefresh();
    })
    // ตาราง sessions / categories / master_items / locations: debounce full reload
    .on('postgres_changes',{event:'*',schema:'public',table:'sessions'},()=>_scheduleRtRefresh())
    .on('postgres_changes',{event:'*',schema:'public',table:'categories'},()=>_scheduleRtRefresh())
    .on('postgres_changes',{event:'*',schema:'public',table:'master_items'},()=>_scheduleRtRefresh())
    .on('postgres_changes',{event:'*',schema:'public',table:'locations'},()=>_scheduleRtRefresh())
    .subscribe((status)=>{
      if(status==='SUBSCRIBED'){
        _setRtStatus('live');
        if(_rtReconnectTimer){clearTimeout(_rtReconnectTimer);_rtReconnectTimer=null;}
      } else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)){
        _setRtStatus('error');
        _rtChannel=null;
        _rtReconnectTimer=setTimeout(initRealtime,5000);
      }
    });
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
  } else if (pid === 'page-analytics') {
    renderAnalytics();
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
  if(p==='checkin')initCheckinPage();
  if(p==='track'){populateTrackFilters();trackSearch();}
  if(p==='admin')renderAdmin();
  if(p==='analytics')renderAnalytics();
}
/* ══════════════════ ADMIN LOGIN ══════════════════ */
function openAdminLogin(){
  let remembered=null;
  try{remembered=JSON.parse(localStorage.getItem('bms_admin_remember')||'null');}catch(e){}
  document.getElementById('login-user').value=remembered?.u||'';
  document.getElementById('login-pass').value=remembered?.p||'';
  document.getElementById('login-remember').checked=!!remembered;
  document.getElementById('login-pass').style.webkitTextSecurity='disc';
  document.getElementById('login-eye-icon').className='ti ti-eye';
  document.getElementById('login-error').style.display='none';
  document.getElementById('modal-admin-login').classList.add('open');
  setTimeout(()=>document.getElementById(remembered?'login-pass':'login-user').focus(),100);
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
  const {data,error}=await _sb.from('admin_users').select('id,username,name,role').eq('username',u).eq('password',p).maybeSingle();
  if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-login"></i>เข้าสู่ระบบ';}
  if(data&&!error){
    isAdminLoggedIn=true;
    currentAdminUser=data;
    if(document.getElementById('login-remember').checked){
      localStorage.setItem('bms_admin_remember',JSON.stringify({u,p}));
    }else{
      localStorage.removeItem('bms_admin_remember');
    }
    closeModal('modal-admin-login');
    document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(x=>x.classList.remove('active'));
    document.getElementById('page-'+pendingPage).classList.add('active');
    document.getElementById('tab-'+pendingPage).classList.add('active');
    if(pendingPage==='admin')renderAdmin();
    if(pendingPage==='checkin')initCheckinPage();
    showToast(`ยินดีต้อนรับ ${data.name||data.username}`,'success');
    window._pwaRefreshInstallUI?.();
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
  _quizCurrentTab=null;
  localStorage.removeItem('bms_quiz_admin');
  localStorage.removeItem('bms_quiz_site');
  pendingPage='admin';
  showPage('register');
  showToast('ออกจากระบบแล้ว','info');
  window._pwaRefreshInstallUI?.();
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
  quiz_course:{label:'แบบทดสอบ – หลักสูตร',
    cols:['ชื่อหลักสูตร *','คำอธิบาย','จำนวนข้อสุ่ม','เกณฑ์ผ่าน (%)','จำกัดครั้ง (0=ไม่จำกัด)','จำกัดเวลา นาที (0=ไม่จำกัด)'],
    sample:[
      ['ความปลอดภัยในการทำงาน','ทดสอบความรู้ด้านความปลอดภัยในการปฏิบัติงาน','10','80','0','0'],
      ['มาตรฐาน ISO 9001','','15','75','3','30'],
    ]},
  quiz_question:{label:'แบบทดสอบ – ข้อสอบ',
    cols:['หลักสูตร (ชื่อ) *','คำถาม *','ตัวเลือก A *','ตัวเลือก B *','ตัวเลือก C','ตัวเลือก D','ตัวเลือก E','คำตอบที่ถูก (A-E) *','คำอธิบายเฉลย'],
    sample:[
      ['ความปลอดภัยในการทำงาน','อุปกรณ์ใดใช้ป้องกันการตกจากที่สูง?','หมวกนิรภัย','เข็มขัดนิรภัย','รองเท้านิรภัย','แว่นตา','','B','เข็มขัดนิรภัยใช้รัดกับโครงสร้างเพื่อป้องกันการตกจากที่สูง'],
      ['ความปลอดภัยในการทำงาน','ข้อใดคือสัญลักษณ์ไฟฉุกเฉิน?','วงกลมสีเขียว','สามเหลี่ยมสีแดง','ลูกศรสีเขียว','กากบาทสีแดง','','C',''],
    ]},
};
let _importRows=[];
let _quizCourses=[];
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
async function onImportTypeChange(){
  document.getElementById('import-preview-area').style.display='none';
  document.getElementById('import-submit-btn').style.display='none';
  _importRows=[];
  _resetDropzone();
  const type=document.getElementById('import-type').value;
  if(type==='quiz_course'||type==='quiz_question'){
    const {data}=await _sb.from('courses').select('id,name').order('name');
    _quizCourses=data||[];
  }
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
    } else if(type==='quiz_course'){
      const name=(row[0]||'').trim();
      if(!name){r.status='error';r.note='ชื่อว่าง';return r;}
      if(_quizCourses.find(c=>c.name.toLowerCase()===name.toLowerCase())){r.status='dup';r.note='ชื่อซ้ำ';}
      r.value={name,description:(row[1]||'').trim(),
        questions_count:parseInt(row[2])||10,pass_percent:parseInt(row[3])||80,
        max_attempts:parseInt(row[4])||0,time_limit_min:parseInt(row[5])||0};
    } else if(type==='quiz_question'){
      const courseName=(row[0]||'').trim(),question=(row[1]||'').trim();
      const choiceA=(row[2]||'').trim(),choiceB=(row[3]||'').trim();
      const choiceC=(row[4]||'').trim(),choiceD=(row[5]||'').trim(),choiceE=(row[6]||'').trim();
      const answer=(row[7]||'').trim().toUpperCase(),explanation=(row[8]||'').trim();
      if(!courseName||!question||!choiceA||!choiceB||!answer){r.status='error';r.note='ข้อมูลจำเป็นไม่ครบ';return r;}
      const course=_quizCourses.find(c=>c.name===courseName);
      if(!course){r.status='error';r.note=`ไม่พบหลักสูตร "${courseName}"`;return r;}
      const choices=[choiceA,choiceB,choiceC,choiceD,choiceE].filter(c=>c);
      const ansIdx=['A','B','C','D','E'].indexOf(answer);
      if(ansIdx<0||ansIdx>=choices.length){r.status='error';r.note=`คำตอบ "${answer}" ไม่ถูกต้อง`;return r;}
      r.value={courseName,courseId:course.id,question,choices,correctIdx:ansIdx,explanation};
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
    if(clear)await _clearImportType(type,toImport);
    await _insertImportRows(type,toImport);
    if(!type.startsWith('quiz')){await loadAllData();renderAdmin();}
    closeModal('modal-import');
    showToast(`นำเข้า ${toImport.length} รายการสำเร็จ`,'success');
  }catch(e){
    showToast('นำเข้าไม่สำเร็จ: '+e.message,'danger');
    btn.disabled=false;refreshImportStats();
  }
}
async function _clearImportType(type,rows=[]){
  const MASTER=['trainer','venue','dept','prefix'];
  let err;
  if(MASTER.includes(type)){
    ({error:err}=await _sb.from('master_items').delete().eq('type',type).eq('site',currentSite));
  } else if(type==='category'){
    ({error:err}=await _sb.from('categories').delete().eq('site',currentSite));
  } else if(type==='session'){
    ({error:err}=await _sb.from('sessions').delete().eq('site',currentSite));
  } else if(type==='quiz_question'){
    const ids=[...new Set(rows.map(r=>r.value.courseId))];
    for(const cid of ids){
      // Get question IDs first to cascade-delete answers and choices
      const {data:qRows,error:qFetchErr}=await _sb.from('questions').select('id').eq('course_id',cid);
      if(qFetchErr)throw new Error(qFetchErr.message);
      const qIds=(qRows||[]).map(q=>q.id);
      if(qIds.length){
        // Get choice IDs before deleting (needed for choice_id FK in quiz_answers)
        const {data:choiceRows}=await _sb.from('choices').select('id').in('question_id',qIds);
        const choiceIds=(choiceRows||[]).map(c=>c.id);
        // Delete quiz_answers by question_id (FK1)
        const {error:aErr}=await _sb.from('quiz_answers').delete().in('question_id',qIds);
        if(aErr)throw new Error(aErr.message);
        // Delete quiz_answers by choice_id (FK2) for any remaining rows
        if(choiceIds.length){
          const {error:a2Err}=await _sb.from('quiz_answers').delete().in('choice_id',choiceIds);
          if(a2Err)throw new Error(a2Err.message);
        }
        const {error:cErr}=await _sb.from('choices').delete().in('question_id',qIds);
        if(cErr)throw new Error(cErr.message);
      }
      ({error:err}=await _sb.from('questions').delete().eq('course_id',cid));
      if(err)throw new Error(err.message);
    }
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
  } else if(type==='quiz_course'){
    const newRows=rows.filter(r=>r.status==='ok');
    const dupRows=rows.filter(r=>r.status==='dup');
    if(newRows.length){
      ({error}=await _sb.from('courses').insert(newRows.map(r=>({
        name:r.value.name,description:r.value.description,
        questions_count:r.value.questions_count,pass_percent:r.value.pass_percent,
        max_attempts:r.value.max_attempts,time_limit_min:r.value.time_limit_min,is_active:true,
      }))));
      if(error)throw new Error(error.message);
    }
    for(const r of dupRows){
      const existing=_quizCourses.find(c=>c.name.toLowerCase()===r.value.name.toLowerCase());
      if(!existing)continue;
      const {error:uErr}=await _sb.from('courses').update({
        description:r.value.description,
        questions_count:r.value.questions_count,pass_percent:r.value.pass_percent,
        max_attempts:r.value.max_attempts,time_limit_min:r.value.time_limit_min,
        updated_at:new Date().toISOString(),
      }).eq('id',existing.id);
      if(uErr)throw new Error(uErr.message);
    }
    {const {data}=await _sb.from('courses').select('id,name').order('name');_quizCourses=data||[];}
  } else if(type==='quiz_question'){
    for(const r of rows){
      const {data:q,error:qErr}=await _sb.from('questions').insert({
        course_id:r.value.courseId,question:r.value.question,
        explanation:r.value.explanation,is_active:true,
      }).select('id').single();
      if(qErr)throw new Error(qErr.message);
      const {error:cErr}=await _sb.from('choices').insert(
        r.value.choices.map((text,i)=>({
          question_id:q.id,choice_text:text,
          is_correct:i===r.value.correctIdx,sort_order:i,
        }))
      );
      if(cErr)throw new Error(cErr.message);
    }
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
  const siteRegs=registrations.filter(r=>!!getSess(r.sessionId));
  const total=siteRegs.length;
  const present=siteRegs.filter(r=>r.attended).length;
  const walkin=siteRegs.filter(r=>r.isWalkin).length;
  const absent=total-present;
  const pct=total?Math.round(present/total*100):0;
  const el=document.getElementById('checkin-live-stats');
  if(!el)return;
  el.innerHTML=`
    <div class="hero-stat"><div class="hero-stat-num">${total}</div><div class="hero-stat-lbl">ลงทะเบียน</div></div>
    <div class="hero-stat" style="background:rgba(16,185,129,.2);border-color:rgba(16,185,129,.3);"><div class="hero-stat-num" style="color:#6ee7b7;">${present}</div><div class="hero-stat-lbl">เข้าอบรม</div></div>
    <div class="hero-stat" style="background:rgba(239,68,68,.15);border-color:rgba(239,68,68,.25);"><div class="hero-stat-num" style="color:#fca5a5;">${absent}</div><div class="hero-stat-lbl">ขาด</div></div>
    <div class="hero-stat" style="background:rgba(245,158,11,.15);border-color:rgba(245,158,11,.25);"><div class="hero-stat-num" style="color:var(--accent);">${pct}%</div><div class="hero-stat-lbl">เข้าร่วม</div></div>
    ${walkin?`<div class="hero-stat" style="background:rgba(139,92,246,.15);border-color:rgba(139,92,246,.25);"><div class="hero-stat-num" style="color:#c4b5fd;">${walkin}</div><div class="hero-stat-lbl">Walk-in</div></div>`:''}`;
}

/* ══════════════════ ADMIN TABS ══════════════════ */
function toggleAdminTabsMenu(){
  const tabs=document.getElementById('admin-tabs');
  const toggle=document.getElementById('admin-tabs-toggle');
  if(!tabs||!toggle)return;
  const willOpen=!tabs.classList.contains('open');
  tabs.classList.toggle('open',willOpen);
  toggle.classList.toggle('open',willOpen);
}
function closeAdminTabsMenu(){
  document.getElementById('admin-tabs')?.classList.remove('open');
  document.getElementById('admin-tabs-toggle')?.classList.remove('open');
}
document.addEventListener('click',(e)=>{
  const tabs=document.getElementById('admin-tabs');
  const toggle=document.getElementById('admin-tabs-toggle');
  if(!tabs||!toggle||!tabs.classList.contains('open'))return;
  if(tabs.contains(e.target)||toggle.contains(e.target))return;
  closeAdminTabsMenu();
});
function switchAdminTab(name){
  if(isAdminLoggedIn&&!new Set(getMyAllowedTabs()).has(name))return;
  document.querySelectorAll('.admin-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.admin-section').forEach(s=>s.classList.remove('active'));
  const btn=document.querySelector(`.admin-tab[data-tab="${name}"]`);
  if(btn)btn.classList.add('active');
  document.getElementById('asec-'+name).classList.add('active');
  const toggleLbl=document.getElementById('admin-tabs-toggle-label');
  if(toggleLbl){const t=ADMIN_TABS.find(t=>t.id===name);if(t)toggleLbl.textContent=t.label;}
  closeAdminTabsMenu();
  if(name==='keyentry'){loadKeyEntryStatus();}
  if(name==='survey'){_initSvdSiteSelect();loadSurveyDashboard();}
  if(name==='quiz'){_initQuizAdmin();}
  if(name==='print'){initPrintSection();}
  if(name==='settings')renderAdminSettings();
  if(name==='permissions')renderAdminPermissions();
}

/* ══════════════════ QUIZ ADMIN EMBED ══════════════════ */
let _quizCurrentTab = null;
function _initQuizAdmin(){
  // sync BMS admin session → quiz admin localStorage so iframe skips login
  if(isAdminLoggedIn && currentAdminUser){
    localStorage.setItem('bms_quiz_admin', JSON.stringify({
      id: currentAdminUser.id,
      username: currentAdminUser.username,
    }));
    localStorage.setItem('bms_quiz_site', currentSite);
  }
  if(!_quizCurrentTab) switchQuizTab('courses');
}
function switchQuizTab(tab){
  if(_quizCurrentTab === tab) return;
  _quizCurrentTab = tab;
  const frame = document.getElementById('quiz-admin-frame');
  const hash = '/admin/' + tab;
  if(!frame.src || frame.src === window.location.href){
    frame.src = 'quiz/#' + hash;
  } else {
    try {
      frame.contentWindow.location.hash = hash;
    } catch(e){
      frame.src = 'quiz/#' + hash;
    }
  }
  document.getElementById('quiz-open-link').href = 'quiz/#' + hash;
  ['courses','results','settings'].forEach(t => {
    const btn = document.getElementById('quiz-subtab-'+t);
    if(t === tab){
      btn.className = 'btn btn-primary btn-sm';
      btn.style.gap = '6px';
    } else {
      btn.className = 'btn btn-ghost btn-sm';
      btn.style.gap = '6px';
    }
  });
}

/* ══════════════════════════════════════════════════════════
   SURVEY DASHBOARD
══════════════════════════════════════════════════════════ */
const SVD_SECTIONS=[
  {num:1,title:'พฤติกรรมบริการ',icon:'ti-heart-handshake',color:'#2563eb',
   qs:['วิทยากรและทีมงานมีความพร้อมให้บริการ','ให้บริการสุภาพและเป็นกันเอง','มนุษยสัมพันธ์ดี','ประสานงาน/อำนวยความสะดวกเหมาะสม','ตอบสนองปัญหา/ข้อซักถามรวดเร็ว','ทีมงานเอาใจใส่ผู้เข้าอบรม'],
   keys:['q1_1','q1_2','q1_3','q1_4','q1_5','q1_6']},
  {num:2,title:'การเตรียมความพร้อม',icon:'ti-clipboard-check',color:'#0891b2',
   qs:['จัดเตรียมเอกสารครบถ้วน','คู่มือ/เอกสารเข้าใจง่าย','ลำดับเนื้อหา/Flow ชัดเจน','สื่อ/PowerPoint เหมาะสม','ระบบ/อุปกรณ์พร้อมใช้','Workshop สอดคล้องงานจริง','ระยะเวลาเหมาะสม'],
   keys:['q2_1','q2_2','q2_3','q2_4','q2_5','q2_6','q2_7']},
  {num:3,title:'ทักษะการสอน',icon:'ti-presentation',color:'#7c3aed',
   qs:['ความรู้/ความเข้าใจในระบบดี','อธิบายชัดเจน เข้าใจง่าย','ลำดับเนื้อหาต่อเนื่อง','ยกตัวอย่างเหมาะสม','เปิดโอกาสซักถาม/มีส่วนร่วม','ตอบคำถามตรงประเด็น','วิเคราะห์/เสนอแนวทางแก้ไขได้','สรุปประเด็นสำคัญก่อนจบ','มี Workshop ปฏิบัติจริง','ทีมงานสนับสนุนเพียงพอ'],
   keys:['q3_1','q3_2','q3_3','q3_4','q3_5','q3_6','q3_7','q3_8','q3_9','q3_10']},
  {num:4,title:'การมีส่วนร่วม',icon:'ti-users',color:'#059669',
   qs:['ผู้เรียนพร้อมรับการอบรม','ผู้เรียนให้ความร่วมมือดี','มีส่วนร่วมซักถาม/แลกเปลี่ยน','ตั้งใจ/สนใจเนื้อหา','บรรยากาศเอื้อต่อการเรียนรู้'],
   keys:['q4_1','q4_2','q4_3','q4_4','q4_5']},
  {num:5,title:'ผลลัพธ์หลังอบรม',icon:'ti-award',color:'#d97706',
   qs:['เข้าใจการใช้งานระบบมากขึ้น','ใช้งานระบบถูกต้องมากขึ้น','นำไปประยุกต์ใช้งานได้','ช่วยลดปัญหาในการใช้งาน','มั่นใจหลังอบรม','ตอบโจทย์การปฏิบัติงาน','พร้อม Go-Live'],
   keys:['q5_1','q5_2','q5_3','q5_4','q5_5','q5_6','q5_7']},
  {num:6,title:'ความพึงพอใจโดยรวม',icon:'ti-star',color:'#e11d48',
   qs:['ความพึงพอใจโดยรวม','ความเหมาะสมของเนื้อหา','ความเหมาะสมของเวลา','ความพึงพอใจต่อวิทยากร','ความพึงพอใจต่อระบบ/Workshop'],
   keys:['q6_1','q6_2','q6_3','q6_4','q6_5']},
];

let _svData=[],_svSessions=[],_svCats=[],_svCharts={};

function _initSvdSiteSelect(){
  const el=document.getElementById('svd-site');
  if(!el||el.options.length>0)return;
  locations.forEach(l=>{
    const o=document.createElement('option');
    o.value=l.code;o.textContent=`${l.code} : ${l.name}`;
    if(l.code===currentSite)o.selected=true;
    el.appendChild(o);
  });
}

async function onSvdSiteChange(){await loadSurveyDashboard();}

async function loadSurveyDashboard(){
  const siteEl=document.getElementById('svd-site');
  if(!siteEl)return;
  const site=siteEl.value||currentSite;

  document.getElementById('svd-loading').style.display='block';
  document.getElementById('svd-content').style.display='none';
  document.getElementById('svd-empty').style.display='none';

  try{
    const[sR,cR,svR]=await Promise.all([
      _sb.from('sessions').select('id,name,cat_id,date,trainer').eq('site',site).order('date'),
      _sb.from('categories').select('id,name,color').eq('site',site),
      _sb.from('survey_responses').select('*').eq('site',site).order('submitted_at',{ascending:false}),
    ]);
    _svSessions=sR.data||[];_svCats=cR.data||[];_svData=svR.data||[];

    const sessEl=document.getElementById('svd-sess');
    sessEl.innerHTML='<option value="">ทุกรอบ</option>';
    const sessWithData=_svSessions.filter(s=>_svData.some(r=>+r.session_id===+s.id));
    sessWithData.forEach(s=>{
      const cat=_svCats.find(c=>c.id===s.cat_id);
      const cnt=_svData.filter(r=>r.session_id===s.id).length;
      const o=document.createElement('option');
      o.value=s.id;
      o.textContent=`[${cat?.name||'—'}] ${s.name}${s.trainer?' · '+s.trainer:''} (${fmtDateShort(s.date)}) · ${cnt} ราย`;
      sessEl.appendChild(o);
    });
    renderSurveyCharts();
  }catch(e){
    console.error(e);
    document.getElementById('svd-loading').style.display='none';
    showToast('โหลดข้อมูลการประเมินไม่สำเร็จ','danger');
  }
}

function _svFiltered(){
  let d=[..._svData];
  const sessId=parseInt(document.getElementById('svd-sess')?.value);
  if(sessId)d=d.filter(r=>r.session_id===sessId);
  const period=document.getElementById('svd-period')?.value;
  if(period&&period!=='all'){
    const cut=new Date();cut.setDate(cut.getDate()-parseInt(period));
    d=d.filter(r=>new Date(r.submitted_at)>=cut);
  }
  return d;
}

const _avg=arr=>{const v=arr.filter(x=>x!=null&&x>=1);return v.length?v.reduce((a,b)=>a+b,0)/v.length:0;};
const _avgKey=(data,k)=>_avg(data.map(r=>r[k]));
const _scoreColor=v=>v>=4.5?'#16a34a':v>=4.0?'#65a30d':v>=3.0?'#ca8a04':v>=2.0?'#ea580c':'#dc2626';
const _scoreBg=v=>v>=4.5?'#dcfce7':v>=4.0?'#ecfccb':v>=3.0?'#fef9c3':v>=2.0?'#ffedd5':'#fee2e2';
const _scoreLabel=v=>v>=4.5?'ดีมาก':v>=4.0?'ดี':v>=3.0?'พอใช้':v>=2.0?'ต้องปรับปรุง':'ต่ำมาก';

function renderSurveyCharts(){
  document.getElementById('svd-loading').style.display='none';
  const data=_svFiltered();

  if(!data.length){
    document.getElementById('svd-content').style.display='none';
    document.getElementById('svd-empty').style.display='block';
    return;
  }
  document.getElementById('svd-empty').style.display='none';
  document.getElementById('svd-content').style.display='block';

  // destroy old charts
  Object.values(_svCharts).forEach(c=>{try{c.destroy();}catch(e){}});
  _svCharts={};

  // ── compute section averages ──
  const secAvgs=SVD_SECTIONS.map(sec=>{
    const qAvgs=sec.keys.map((k,i)=>({key:k,label:sec.qs[i],secNum:sec.num,secTitle:sec.title,secColor:sec.color,avg:_avgKey(data,k)}));
    const avg=_avg(qAvgs.map(q=>q.avg).filter(v=>v>0));
    return{...sec,avg,qAvgs};
  });
  const overallAvg=_avg(secAvgs.map(s=>s.avg).filter(v=>v>0));

  // ── KPI ──
  const bestSec=[...secAvgs].sort((a,b)=>b.avg-a.avg)[0];
  const worstSec=[...secAvgs].sort((a,b)=>a.avg-b.avg)[0];
  const ynRows=data.filter(r=>r.q6_6!=null);
  const ynYes=ynRows.filter(r=>r.q6_6===true).length;
  const ynPct=ynRows.length?Math.round(ynYes/ynRows.length*100):0;
  const allQAvgs=secAvgs.flatMap(s=>s.qAvgs).filter(q=>q.avg>0);
  const topQ=allQAvgs.reduce((a,b)=>a.avg>b.avg?a:b,{avg:0});
  const botQ=allQAvgs.reduce((a,b)=>a.avg<b.avg?a:b,{avg:999});

  document.getElementById('svd-kpi').innerHTML=`
    <div class="stat-card blue" style="min-width:0;">
      <div class="stat-label"><i class="ti ti-clipboard-check" style="margin-right:3px;"></i>ผู้ประเมิน</div>
      <div class="stat-value">${data.length}<span style="font-size:13px;font-weight:400;color:var(--text-muted);"> ราย</span></div>
    </div>
    <div class="stat-card" style="background:${_scoreBg(overallAvg)};border:1px solid var(--border);min-width:0;">
      <div class="stat-label">คะแนนเฉลี่ยรวม</div>
      <div style="font-size:28px;font-weight:700;color:${_scoreColor(overallAvg)};line-height:1.1;margin-top:4px;">${overallAvg.toFixed(2)}<span style="font-size:13px;font-weight:400;color:var(--text-muted);"> /5</span></div>
      <div style="font-size:11px;font-weight:600;color:${_scoreColor(overallAvg)};margin-top:3px;">${_scoreLabel(overallAvg)}</div>
    </div>
    <div class="stat-card green" style="min-width:0;">
      <div class="stat-label"><i class="ti ti-award"></i> ด้านดีที่สุด</div>
      <div style="font-size:12px;font-weight:600;color:var(--success);margin-top:4px;line-height:1.3;">${bestSec.title}</div>
      <div style="font-size:20px;font-weight:700;color:var(--success);">${bestSec.avg.toFixed(2)}</div>
    </div>
    <div class="stat-card amber" style="min-width:0;">
      <div class="stat-label"><i class="ti ti-tool"></i> ควรพัฒนา</div>
      <div style="font-size:12px;font-weight:600;color:var(--warn);margin-top:4px;line-height:1.3;">${worstSec.title}</div>
      <div style="font-size:20px;font-weight:700;color:var(--warn);">${worstSec.avg.toFixed(2)}</div>
    </div>
    <div class="stat-card" style="background:var(--card);border:1px solid var(--border);min-width:0;">
      <div class="stat-label"><i class="ti ti-repeat" style="color:#7c3aed;"></i> ต้องการอบรมเพิ่ม</div>
      <div style="font-size:28px;font-weight:700;color:#7c3aed;line-height:1.1;margin-top:4px;">${ynPct}%</div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${ynYes} / ${ynRows.length} ราย</div>
    </div>`;

  // ── Section progress bars ──
  document.getElementById('svd-section-bars').innerHTML=secAvgs.map(sec=>`
    <div style="margin-bottom:13px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
        <div style="display:flex;align-items:center;gap:7px;">
          <span style="width:10px;height:10px;border-radius:50%;background:${sec.color};flex-shrink:0;display:inline-block;"></span>
          <span style="font-size:13px;font-weight:600;">${sec.num}. ${sec.title}</span>
          <span style="font-size:10px;color:var(--text-muted);">(${sec.keys.length} ข้อ)</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:10px;font-weight:600;padding:1px 7px;border-radius:20px;background:${_scoreBg(sec.avg)};color:${_scoreColor(sec.avg)};">${_scoreLabel(sec.avg)}</span>
          <span style="font-size:17px;font-weight:700;color:${_scoreColor(sec.avg)};min-width:36px;text-align:right;">${sec.avg.toFixed(2)}</span>
        </div>
      </div>
      <div style="height:10px;background:#f1f5f9;border-radius:5px;overflow:hidden;">
        <div style="width:${(sec.avg/5)*100}%;height:100%;background:linear-gradient(90deg,${sec.color},${sec.color}cc);border-radius:5px;transition:width .6s ease;"></div>
      </div>
    </div>`).join('');

  // ── Chart.js shared config ──
  if(typeof Chart==='undefined')return;
  Chart.defaults.font.family='Sarabun,sans-serif';
  const fnt=(sz=11,w='normal')=>({family:'Sarabun,sans-serif',size:sz,weight:w});
  const tip={backgroundColor:'#0f172a',padding:11,cornerRadius:9,titleFont:fnt(12,'600'),bodyFont:fnt(11),titleColor:'#f1f5f9',bodyColor:'#cbd5e1',displayColors:true,boxWidth:8,boxHeight:8,boxPadding:3};
  const leg=(pos='bottom')=>({position:pos,labels:{font:fnt(10),boxWidth:10,boxHeight:10,padding:10,usePointStyle:true,pointStyleWidth:10}});

  // ── Radar ──
  const ctxR=document.getElementById('svd-chart-radar');
  if(ctxR) _svCharts.radar=new Chart(ctxR,{
    type:'radar',
    data:{
      labels:secAvgs.map(s=>`${s.num}. ${s.title.length>8?s.title.slice(0,8)+'…':s.title}`),
      datasets:[{
        label:'คะแนน',data:secAvgs.map(s=>+s.avg.toFixed(2)),
        backgroundColor:'rgba(124,58,237,.12)',borderColor:'#7c3aed',pointBackgroundColor:secAvgs.map(s=>s.color),
        pointBorderColor:'#fff',pointBorderWidth:2,pointRadius:5,borderWidth:2,
      }]
    },
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{...tip,callbacks:{label:ctx=>`${ctx.dataset.label}: ${ctx.raw} / 5`}}},
      scales:{r:{min:0,max:5,ticks:{stepSize:1,font:fnt(9),color:'#94a3b8',backdropColor:'transparent'},
        grid:{color:'rgba(226,232,240,.6)'},pointLabels:{font:fnt(10,'600'),color:'#475569'}}}}
  });

  // ── Distribution stacked bar (%) ──
  const DIST_COLORS={5:'#22c55e',4:'#84cc16',3:'#eab308',2:'#f97316',1:'#ef4444'};
  const DIST_LABELS={5:'5 – มากที่สุด',4:'4 – มาก',3:'3 – ปานกลาง',2:'2 – น้อย',1:'1 – น้อยที่สุด'};
  const distDs=[5,4,3,2,1].map(v=>({
    label:DIST_LABELS[v],backgroundColor:DIST_COLORS[v],borderRadius:3,borderSkipped:false,stack:'d',
    data:secAvgs.map(sec=>{
      const tot=data.length*sec.keys.length;
      const cnt=sec.keys.reduce((s,k)=>s+data.filter(r=>r[k]===v).length,0);
      return tot?+(cnt/tot*100).toFixed(1):0;
    })
  }));
  const ctxD=document.getElementById('svd-chart-dist');
  if(ctxD) _svCharts.dist=new Chart(ctxD,{
    type:'bar',data:{labels:secAvgs.map(s=>`ด้าน ${s.num}`),datasets:distDs},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:leg(),tooltip:{...tip,callbacks:{label:ctx=>`${ctx.dataset.label}: ${ctx.raw}%`}}},
      scales:{x:{grid:{display:false},ticks:{font:fnt(10),color:'#64748b'},border:{display:false},stacked:true},
        y:{grid:{color:'rgba(226,232,240,.5)'},ticks:{font:fnt(10),color:'#64748b',callback:v=>v+'%'},border:{display:false},stacked:true,max:100}}}
  });

  // ── Q6.6 Donut ──
  const ynNo=ynRows.length-ynYes;
  const ctxY=document.getElementById('svd-chart-yn');
  if(ctxY) _svCharts.yn=new Chart(ctxY,{
    type:'doughnut',
    data:{labels:[`ต้องการ (${ynYes} ราย)`,`ไม่ต้องการ (${ynNo} ราย)`],
      datasets:[{data:[ynYes||0,ynNo||0],backgroundColor:['#22c55e','#ef4444'],borderWidth:0,hoverOffset:6}]},
    options:{responsive:true,maintainAspectRatio:false,
      cutout:'65%',
      plugins:{legend:leg(),tooltip:{...tip}}}
  });
  document.getElementById('svd-yn-stats').innerHTML=`<span style="font-size:26px;font-weight:700;color:${ynPct>=50?'#16a34a':'#dc2626'};">${ynPct}%</span><br><span style="font-size:11px;">ต้องการอบรมเพิ่มเติม</span>`;

  // ── Best / Worst 5 questions ──
  const renderQL=(qs,type)=>qs.map((q,i)=>`
    <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
      <span style="min-width:22px;height:22px;border-radius:50%;background:${type==='best'?'#dcfce7':'#fef2f2'};color:${type==='best'?'#15803d':'#991b1b'};font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${i+1}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:12px;line-height:1.45;color:var(--text);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${q.label}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">${q.secTitle}</div>
      </div>
      <div style="flex-shrink:0;text-align:right;">
        <div style="font-size:16px;font-weight:700;color:${_scoreColor(q.avg)};">${q.avg.toFixed(2)}</div>
      </div>
    </div>`).join('');

  const sortedQs=[...allQAvgs].sort((a,b)=>b.avg-a.avg);
  document.getElementById('svd-best-qs').innerHTML=renderQL(sortedQs.slice(0,5),'best');
  document.getElementById('svd-worst-qs').innerHTML=renderQL([...allQAvgs].sort((a,b)=>a.avg-b.avg).slice(0,5),'worst');

  // ── Heatmap table (all questions) ──
  let hmHtml='';
  SVD_SECTIONS.forEach(sec=>{
    hmHtml+=`<div style="margin-bottom:12px;">
      <div style="font-size:12px;font-weight:700;color:${sec.color};margin-bottom:6px;display:flex;align-items:center;gap:6px;"><i class="ti ${sec.icon}"></i>${sec.num}. ${sec.title}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:5px;">`;
    const sAvg=secAvgs.find(s=>s.num===sec.num);
    (sAvg?.qAvgs||[]).forEach((q,i)=>{
      hmHtml+=`<div style="display:flex;align-items:center;gap:7px;padding:6px 10px;border-radius:8px;background:${_scoreBg(q.avg)};border:1px solid ${q.avg>=4?'transparent':'rgba(0,0,0,.05)'};">
        <span style="font-size:10px;font-weight:700;color:${_scoreColor(q.avg)};min-width:18px;">${sec.num}.${i+1}</span>
        <span style="font-size:11px;color:var(--text);flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;" title="${q.label}">${q.label}</span>
        <span style="font-size:14px;font-weight:700;color:${_scoreColor(q.avg)};min-width:30px;text-align:right;">${q.avg>0?q.avg.toFixed(2):'—'}</span>
      </div>`;
    });
    hmHtml+='</div></div>';
  });
  document.getElementById('svd-heatmap').innerHTML=hmHtml;

  // ── Session comparison bar ──
  const sessComp=_svSessions.map(s=>{
    const sd=data.filter(r=>r.session_id===s.id);
    if(!sd.length)return null;
    const avg=_avg(SVD_SECTIONS.flatMap(sec=>sec.keys).map(k=>_avgKey(sd,k)).filter(v=>v>0));
    const cat=_svCats.find(c=>c.id===s.cat_id);
    return{label:`${cat?.name||''}`,sublabel:`${s.name}${s.trainer?' · '+s.trainer:''}`,date:fmtDateShort(s.date),avg,cnt:sd.length};
  }).filter(Boolean);

  const ctxS=document.getElementById('svd-chart-sess');
  if(ctxS) _svCharts.sess=new Chart(ctxS,{
    type:'bar',
    data:{
      labels:sessComp.map(s=>`${s.sublabel} (${s.date})`),
      datasets:[{label:'คะแนนเฉลี่ย',data:sessComp.map(s=>+s.avg.toFixed(2)),
        backgroundColor:sessComp.map(s=>_scoreColor(s.avg)+'cc'),borderRadius:7,borderSkipped:false}]
    },
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{...tip,callbacks:{
        title:([ctx])=>sessComp[ctx.dataIndex]?.sublabel||'',
        label:ctx=>[` คะแนน: ${ctx.raw} / 5.00`,` ผู้ประเมิน: ${sessComp[ctx.dataIndex]?.cnt} ราย`]
      }}},
      scales:{
        x:{grid:{display:false},ticks:{font:fnt(10),color:'#64748b',maxRotation:30},border:{display:false}},
        y:{grid:{color:'rgba(226,232,240,.5)'},ticks:{font:fnt(10),color:'#64748b'},border:{display:false},min:0,max:5,
          afterDataLimits:s=>{s.max=5;}}
      }}
  });

  // ── Trend line chart (per section) ──
  const trendSessions=_svSessions.filter(s=>data.some(r=>r.session_id===s.id));
  const trendDs=SVD_SECTIONS.map(sec=>({
    label:`ด้าน ${sec.num}`,borderColor:sec.color,backgroundColor:sec.color+'22',
    data:trendSessions.map(s=>{
      const sd=data.filter(r=>r.session_id===s.id);
      const avg=_avg(sec.keys.map(k=>_avgKey(sd,k)).filter(v=>v>0));
      return avg>0?+avg.toFixed(2):null;
    }),
    tension:.35,borderWidth:2,pointRadius:4,pointHoverRadius:6,fill:false,spanGaps:true,
  }));
  const ctxT=document.getElementById('svd-chart-trend');
  if(ctxT) _svCharts.trend=new Chart(ctxT,{
    type:'line',
    data:{labels:trendSessions.map(s=>`${s.name} (${fmtDateShort(s.date)})`),datasets:trendDs},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:leg('right'),tooltip:{...tip,mode:'index',intersect:false}},
      scales:{
        x:{grid:{display:false},ticks:{font:fnt(10),color:'#64748b',maxRotation:25},border:{display:false}},
        y:{grid:{color:'rgba(226,232,240,.5)'},ticks:{font:fnt(10),color:'#64748b'},border:{display:false},min:0,max:5}
      }}
  });

  // ── Comments ──
  const comments=data.filter(r=>r.comments?.trim());
  document.getElementById('svd-comment-count').textContent=comments.length?`(${comments.length} รายการ)`:'';
  if(!comments.length){
    document.getElementById('svd-comments-list').innerHTML=`<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;"><i class="ti ti-message-off" style="font-size:28px;display:block;margin-bottom:8px;opacity:.3;"></i>ไม่มีข้อเสนอแนะ</div>`;
  } else {
    document.getElementById('svd-comments-list').innerHTML=comments.slice(0,30).map(r=>{
      const s=_svSessions.find(x=>x.id===r.session_id);
      const cat=_svCats.find(c=>c.id===s?.cat_id);
      const rAllKeys=SVD_SECTIONS.flatMap(sec=>sec.keys);
      const rAvg=_avg(rAllKeys.map(k=>r[k]||0).filter(v=>v>0));
      const d=r.submitted_at?new Date(r.submitted_at).toLocaleString('th-TH',{year:'2-digit',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'';
      return`<div style="padding:12px;background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:7px;flex-wrap:wrap;">
          ${cat?`<span style="font-size:11px;background:var(--primary-light);color:var(--primary);padding:2px 8px;border-radius:12px;font-weight:600;">${cat.name}</span>`:''}
          ${s?`<span style="font-size:11px;color:var(--text-muted);">${s.name}${s.trainer?' · '+s.trainer:''}</span>`:''}
          <span style="margin-left:auto;font-size:10px;color:var(--text-muted);">${d}</span>
          ${rAvg>0?`<span style="font-size:13px;font-weight:700;color:${_scoreColor(rAvg)};padding:1px 7px;border-radius:12px;background:${_scoreBg(rAvg)};">${rAvg.toFixed(2)}</span>`:''}
        </div>
        <p style="font-size:13px;color:var(--text);line-height:1.6;margin:0;">"${r.comments}"</p>
      </div>`;
    }).join('')+(comments.length>30?`<div style="text-align:center;font-size:12px;color:var(--text-muted);padding:8px;">แสดง 30 รายการล่าสุด จากทั้งหมด ${comments.length} รายการ</div>`:'');
  }
}

async function exportSurveyExcel(){
  if(typeof XLSX==='undefined'){showToast('ไม่พบ XLSX library','danger');return;}
  const data=_svFiltered();
  if(!data.length){showToast('ไม่มีข้อมูลสำหรับ Export','danger');return;}
  const allQs=SVD_SECTIONS.flatMap(sec=>sec.keys.map((k,i)=>({key:k,label:`${sec.num}.${i+1} ${sec.qs[i]}`})));
  const headers=['ลำดับ','สาขา','ประเภทอบรม','รอบอบรม','วิทยากร','วันที่ประเมิน',...allQs.map(q=>q.label),'6.6 ต้องการอบรมเพิ่ม','ข้อเสนอแนะ','คะแนนเฉลี่ย'];
  const rows=data.map((r,i)=>{
    const s=_svSessions.find(x=>x.id===r.session_id);
    const cat=_svCats.find(c=>c.id===s?.cat_id);
    const avgR=_avg(allQs.map(q=>r[q.key]||0).filter(v=>v>0));
    return[i+1,r.site,cat?.name||'',s?.name||'',s?.trainer||'',
      r.submitted_at?new Date(r.submitted_at).toLocaleDateString('th-TH'):'',
      ...allQs.map(q=>r[q.key]||''),
      r.q6_6==null?'':r.q6_6?'ต้องการ':'ไม่ต้องการ',
      r.comments||'',avgR.toFixed(2)];
  });
  const ws=XLSX.utils.aoa_to_sheet([headers,...rows]);
  // set col widths
  ws['!cols']=[{wch:6},{wch:12},{wch:18},{wch:20},{wch:16},{wch:14},...allQs.map(()=>({wch:12})),{wch:14},{wch:30},{wch:10}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'ผลประเมิน');
  const site=document.getElementById('svd-site')?.value||currentSite;
  XLSX.writeFile(wb,`survey_${site}_${new Date().toISOString().slice(0,10)}.xlsx`);
  showToast('Export สำเร็จ','success');
}

async function saveSurveyImage(){
  if(typeof html2canvas==='undefined'){showToast('ไม่พบ html2canvas library','danger');return;}
  const data=_svFiltered();
  if(!data.length){showToast('ไม่มีข้อมูลสำหรับบันทึก','danger');return;}

  const site=document.getElementById('svd-site')?.value||currentSite;
  const sessId=parseInt(document.getElementById('svd-sess')?.value)||0;
  const period=document.getElementById('svd-period')?.value||'all';
  const selSess=_svSessions.find(s=>+s.id===sessId);
  const selCat=selSess?_svCats.find(c=>c.id===selSess.cat_id):null;
  const loc=locations.find(l=>l.code===site);

  const _pLabel=v=>v>=4.5?'มากที่สุด':v>=3.5?'มาก':v>=2.5?'ปานกลาง':v>=1.5?'น้อย':'น้อยที่สุด';
  const _pColor=v=>v>=4.5?'#16a34a':v>=3.5?'#65a30d':v>=2.5?'#ca8a04':v>=1.5?'#ea580c':'#dc2626';
  const _pBg  =v=>v>=4.5?'#dcfce7':v>=3.5?'#ecfccb':v>=2.5?'#fef9c3':v>=1.5?'#ffedd5':'#fee2e2';
  const _pStd =arr=>{const v=arr.filter(x=>x!=null&&x>=1&&x<=5);if(v.length<2)return 0;const m=v.reduce((a,b)=>a+b,0)/v.length;return Math.sqrt(v.reduce((s,x)=>s+(x-m)**2,0)/(v.length-1));};

  // header chips
  const chips=[];
  if(selSess){
    if(selCat?.name)chips.push(`หลักสูตร: ${selCat.name}`);
    chips.push(`รอบ: ${selSess.name}`);
    chips.push(`วันที่: ${fmtDateShort(selSess.date)}`);
    if(selSess.trainer)chips.push(`วิทยากร: ${selSess.trainer}`);
  }else{
    chips.push(`สาขา: ${loc?.name||site}`);
    chips.push('ทุกรอบ');
    chips.push(`ช่วงเวลา: ${period==='all'?'ทั้งหมด':period+' วันล่าสุด'}`);
  }

  const secData=SVD_SECTIONS.map(sec=>({...sec,qData:sec.keys.map((k,i)=>{
    const vals=data.map(r=>r[k]).filter(x=>x!=null&&x>=1&&x<=5);
    const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
    return{label:sec.qs[i],avg,std:_pStd(vals),counts:[5,4,3,2,1].map(v=>vals.filter(x=>x===v).length)};
  })}));

  const overallAvg=_avg(secData.flatMap(s=>s.qData).map(q=>q.avg).filter(v=>v>0));
  const ynRows=data.filter(r=>r.q6_6!=null);
  const ynYes=ynRows.filter(r=>r.q6_6===true).length;
  const ynPct=ynRows.length?Math.round(ynYes/ynRows.length*100):0;
  const comments=data.filter(r=>r.comments?.trim());

  // Attendance stats — scope depends on active filter
  const svSessIdSet=new Set(_svSessions.map(s=>s.id));
  let attSessIds;
  if(sessId){
    // Specific session selected
    attSessIds=[sessId];
  }else if(period&&period!=='all'){
    // Period filter active: use sessions that appear in filtered survey data AND belong to this site
    attSessIds=[...new Set(data.map(r=>r.session_id).filter(id=>id&&svSessIdSet.has(id)))];
  }else{
    // No filter: all sessions for the site
    attSessIds=_svSessions.map(s=>s.id);
  }
  let attRegs=[];
  if(attSessIds.length>0){
    const{data:regData}=await _sb.from('registrations').select('attended,is_walkin').in('session_id',attSessIds);
    attRegs=regData||[];
  }
  const walkinRegs=attRegs.filter(r=>r.is_walkin);
  const preRegRegs=attRegs.filter(r=>!r.is_walkin);
  const totalReg=attRegs.length;
  const attendedReg=attRegs.filter(r=>r.attended).length;
  const absentReg=preRegRegs.filter(r=>!r.attended).length;
  const walkinCount=walkinRegs.length;
  const attPct=totalReg?Math.round(attendedReg/totalReg*100):0;

  const F="font-family:'Sarabun','Anuphan',Arial,sans-serif;";
  const Tb=`border:1px solid #e2e8f0;padding:7px 8px;vertical-align:middle;${F}`;
  const Th=`border:1px solid #1e293b;padding:9px 7px;vertical-align:middle;${F}`;

  // build table rows
  let rows='';
  secData.forEach(sec=>{
    sec.qData.forEach((q,qi)=>{
      const rowBg=qi%2===0?'#ffffff':'#f8fafc';
      const lbl=q.avg>0?_pLabel(q.avg):'—';
      const clr=q.avg>0?_pColor(q.avg):'#94a3b8';
      const bg =q.avg>0?_pBg(q.avg) :'#f1f5f9';
      rows+=`<tr>
        ${qi===0?`<td rowspan="${sec.qData.length}" style="${Tb}background:${sec.color}18;text-align:center;font-weight:700;font-size:12px;color:${sec.color};line-height:1.7;white-space:nowrap;width:90px;">${sec.num}.<br>${sec.title}</td>`:''}
        <td style="${Tb}font-size:13px;color:#1e293b;background:${rowBg};">${q.label}</td>
        ${q.counts.map(c=>`<td style="${Tb}text-align:center;font-size:13px;background:${rowBg};">${c||0}</td>`).join('')}
        <td style="${Tb}text-align:center;font-weight:800;color:#1d4ed8;font-size:15px;background:${rowBg};">${q.avg>0?q.avg.toFixed(2):'—'}</td>
        <td style="${Tb}text-align:center;font-size:12px;color:#64748b;background:${rowBg};">${q.std>0?q.std.toFixed(2):'0.00'}</td>
        <td style="${Tb}text-align:center;background:${rowBg};"><span style="background:${bg};color:${clr};padding:4px 11px;border-radius:20px;font-size:11.5px;font-weight:700;white-space:nowrap;border:1.5px solid ${clr}44;${F}">${lbl}</span></td>
      </tr>`;
    });
  });

  const legRows=[
    {lbl:'มากที่สุด',lo:'4.5',hi:'5.00',bg:'#16a34a',tc:'#fff'},
    {lbl:'มาก',      lo:'3.5',hi:'4.49',bg:'#84cc16',tc:'#14532d'},
    {lbl:'ปานกลาง', lo:'2.5',hi:'3.49',bg:'#f59e0b',tc:'#451a03'},
    {lbl:'น้อย',     lo:'1.5',hi:'2.49',bg:'#ea580c',tc:'#fff'},
    {lbl:'น้อยที่สุด',lo:'1.0',hi:'1.49',bg:'#dc2626',tc:'#fff'},
  ].map(l=>`<tr>
    <td style="${Tb}background:${l.bg};color:${l.tc};font-weight:700;text-align:center;font-size:12px;">${l.lbl}</td>
    <td style="${Tb}text-align:center;font-size:12px;">${l.lo}</td>
    <td style="${Tb}text-align:center;font-size:12px;">${l.hi}</td>
  </tr>`).join('');

  const wrap=document.createElement('div');
  wrap.style.cssText=`position:fixed;left:-9999px;top:0;width:990px;background:#f1f5f9;padding:22px;${F}z-index:-999;`;
  wrap.innerHTML=`
  <!-- HEADER -->
  <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a6e 55%,#1d4ed8 100%);border-radius:16px;padding:24px 30px;margin-bottom:16px;">
    <div style="${F}color:#fff;font-size:22px;font-weight:700;letter-spacing:.5px;margin-bottom:12px;">สรุปผลการประเมินของผู้เข้าร่วมรับการอบรม</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      ${chips.map(c=>`<span style="${F}background:rgba(255,255,255,.15);color:#e0f2fe;font-size:12.5px;padding:5px 14px;border-radius:20px;border:1px solid rgba(255,255,255,.22);">${c}</span>`).join('')}
    </div>
  </div>

  <!-- TABLE + SIDE -->
  <div style="display:flex;gap:14px;margin-bottom:14px;align-items:flex-start;">

    <!-- EVAL TABLE -->
    <div style="flex:1;min-width:0;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.07);">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#0f172a;">
            <th style="${Th}background:#0f172a;color:#ffffff;font-size:11px;font-weight:700;text-align:center;width:90px;">หัวข้อ<br>การประเมิน</th>
            <th style="${Th}background:#0f172a;color:#ffffff;font-size:11px;font-weight:700;text-align:left;">หัวข้อคำถาม</th>
            <th style="${Th}background:#16a34a;color:#ffffff;font-size:14px;font-weight:800;text-align:center;width:32px;">5</th>
            <th style="${Th}background:#4d7c0f;color:#ffffff;font-size:14px;font-weight:800;text-align:center;width:32px;">4</th>
            <th style="${Th}background:#a16207;color:#ffffff;font-size:14px;font-weight:800;text-align:center;width:32px;">3</th>
            <th style="${Th}background:#c2410c;color:#ffffff;font-size:14px;font-weight:800;text-align:center;width:32px;">2</th>
            <th style="${Th}background:#b91c1c;color:#ffffff;font-size:14px;font-weight:800;text-align:center;width:32px;">1</th>
            <th style="${Th}background:#0f172a;color:#bfdbfe;font-size:11px;font-weight:700;text-align:center;width:52px;">AVG</th>
            <th style="${Th}background:#0f172a;color:#cbd5e1;font-size:11px;font-weight:700;text-align:center;width:48px;">STD</th>
            <th style="${Th}background:#0f172a;color:#ffffff;font-size:11px;font-weight:700;text-align:center;width:84px;">แปลผล</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <!-- SIDE PANEL -->
    <div style="min-width:208px;flex-shrink:0;display:flex;flex-direction:column;gap:12px;">

      <!-- Attendance card -->
      <div style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.07);">
        <div style="${F}background:linear-gradient(90deg,#0369a1,#0ea5e9);color:#fff;padding:11px 15px;font-size:13px;font-weight:700;">สถิติการเข้าร่วมอบรม</div>
        <div style="padding:14px 16px;display:flex;flex-direction:column;gap:10px;">

          <!-- ลงทะเบียนทั้งหมด -->
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;">
              <span style="${F}font-size:12px;font-weight:700;color:#0f172a;">ลงทะเบียนทั้งหมด</span>
              <span style="${F}font-size:20px;font-weight:800;color:#0369a1;">${totalReg}<span style="font-size:11px;font-weight:500;color:#94a3b8;"> คน</span></span>
            </div>
            <div style="display:flex;flex-direction:column;gap:3px;padding-left:10px;border-left:3px solid #e0f2fe;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="${F}font-size:11px;color:#475569;">📋 ลงทะเบียนล่วงหน้า</span>
                <span style="${F}font-size:13px;font-weight:700;color:#0369a1;">${preRegRegs.length} คน</span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="${F}font-size:11px;color:#6d28d9;">🚶 Walk-in</span>
                <span style="${F}font-size:13px;font-weight:700;color:#6d28d9;">${walkinCount} คน</span>
              </div>
            </div>
          </div>

          <div style="height:1px;background:#e2e8f0;"></div>

          <!-- เข้าอบรมทั้งหมด -->
          <div style="background:#dcfce7;border-radius:9px;padding:9px 12px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;">
              <span style="${F}font-size:12px;font-weight:700;color:#15803d;">✅ เข้าอบรมทั้งหมด</span>
              <span style="${F}font-size:20px;font-weight:800;color:#15803d;">${attendedReg}<span style="font-size:11px;font-weight:500;"> คน</span></span>
            </div>
            <div style="${F}font-size:10px;color:#16a34a;opacity:.8;">(Walk-in + ลงทะเบียนล่วงหน้าที่เช็คชื่อแล้ว)</div>
          </div>

          <!-- ไม่เข้าอบรม -->
          <div style="background:#fee2e2;border-radius:9px;padding:9px 12px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span style="${F}font-size:12px;font-weight:700;color:#b91c1c;">❌ ไม่เข้าอบรม</span>
              <span style="${F}font-size:20px;font-weight:800;color:#b91c1c;">${absentReg}<span style="font-size:11px;font-weight:500;"> คน</span></span>
            </div>
          </div>

          <!-- Progress bar -->
          ${totalReg>0?`<div>
            <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:4px;font-family:'Sarabun','Anuphan',Arial,sans-serif;"><span>อัตราเข้าร่วม</span><span style="font-weight:700;color:#0369a1;">${attPct}%</span></div>
            <div style="height:7px;background:#e2e8f0;border-radius:4px;overflow:hidden;"><div style="height:100%;width:${attPct}%;background:linear-gradient(90deg,#0369a1,#0ea5e9);border-radius:4px;"></div></div>
          </div>`:''}

        </div>
      </div>

      <!-- Legend card -->
      <div style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.07);">
        <div style="${F}background:#0f172a;color:#e2e8f0;padding:11px 15px;font-size:13px;font-weight:700;">ตารางแปรผลคะแนน</div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="${Tb}background:#f8fafc;text-align:center;color:#475569;font-size:11px;">ระดับ</th>
              <th style="${Tb}background:#f8fafc;text-align:center;color:#475569;font-size:11px;">ต่ำสุด</th>
              <th style="${Tb}background:#f8fafc;text-align:center;color:#475569;font-size:11px;">สูงสุด</th>
            </tr>
          </thead>
          <tbody>${legRows}</tbody>
        </table>
      </div>

      ${ynRows.length?`
      <!-- YN card -->
      <div style="background:#fff;border-radius:14px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,.07);">
        <div style="${F}font-size:12px;font-weight:700;color:#374151;margin-bottom:10px;letter-spacing:.3px;">ต้องการอบรมเพิ่มเติม</div>
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:56px;height:56px;border-radius:50%;background:${ynPct>=50?'#dcfce7':'#fee2e2'};border:3px solid ${ynPct>=50?'#16a34a':'#dc2626'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <span style="${F}font-size:14px;font-weight:800;color:${ynPct>=50?'#16a34a':'#dc2626'};">${ynPct}%</span>
          </div>
          <div>
            <div style="${F}font-size:22px;font-weight:800;color:${ynPct>=50?'#16a34a':'#dc2626'};line-height:1.1;">${ynYes}<span style="font-size:13px;font-weight:500;color:#94a3b8;"> ราย</span></div>
            <div style="${F}font-size:11px;color:#94a3b8;margin-top:2px;">จากทั้งหมด ${ynRows.length} ราย</div>
          </div>
        </div>
      </div>`:''}

      ${overallAvg>0?`
      <!-- KPI card (ใต้ตารางแปรผล) -->
      <div style="background:linear-gradient(160deg,#1e3a5f,#2563eb);border-radius:14px;padding:18px 16px;box-shadow:0 4px 16px rgba(37,99,235,.28);">
        <div style="${F}font-size:11px;color:#93c5fd;letter-spacing:.4px;margin-bottom:4px;">คะแนนเฉลี่ยรวม</div>
        <div style="${F}font-size:46px;font-weight:800;color:#fff;line-height:1;letter-spacing:-1px;">${overallAvg.toFixed(2)}</div>
        <div style="${F}font-size:11px;color:#93c5fd;margin-top:2px;">/ 5.00 คะแนน</div>
        <div style="margin:12px 0;height:1px;background:rgba(255,255,255,.2);"></div>
        <div style="${F}font-size:11px;color:#93c5fd;margin-bottom:4px;">ระดับความพึงพอใจ</div>
        <div style="${F}font-size:20px;font-weight:700;color:#fff;">${_pLabel(overallAvg)}</div>
        <div style="margin:12px 0;height:1px;background:rgba(255,255,255,.2);"></div>
        <div style="${F}font-size:11px;color:#93c5fd;margin-bottom:4px;">ผู้ทำแบบประเมิน</div>
        <div style="${F}font-size:36px;font-weight:800;color:#fff;line-height:1;">${data.length}<span style="font-size:14px;font-weight:400;"> ราย</span></div>
      </div>`:''}
    </div>
  </div>

  <!-- COMMENTS -->
  <div style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.07);">
    <div style="${F}background:linear-gradient(90deg,#d97706,#fbbf24);padding:12px 18px;font-weight:700;font-size:13px;color:#fff;letter-spacing:.3px;">💬 ข้อเสนอแนะเพิ่มเติม (Comments)</div>
    <div style="padding:14px 20px;">
      ${comments.length
        ?`<ul style="padding-left:20px;margin:0;">${comments.map(r=>`<li style="${F}font-size:13px;padding:5px 0;color:#334155;line-height:1.7;border-bottom:1px solid #f1f5f9;">${r.comments}</li>`).join('')}</ul>`
        :`<p style="${F}color:#94a3b8;font-size:13px;text-align:center;padding:10px 0;">ไม่มีข้อเสนอแนะ</p>`}
    </div>
  </div>`;

  document.body.appendChild(wrap);
  showToast('กำลังสร้างภาพ กรุณารอสักครู่...','info');
  try{
    await new Promise(r=>setTimeout(r,400));
    const canvas=await html2canvas(wrap,{scale:3,useCORS:true,backgroundColor:'#f1f5f9',width:990,windowWidth:1200,logging:false,letterRendering:true,imageTimeout:0});
    const link=document.createElement('a');
    link.download=`survey_${site}_${new Date().toISOString().slice(0,10)}.png`;
    link.href=canvas.toDataURL('image/png');
    link.click();
    showToast('บันทึกภาพสำเร็จ','success');
  }catch(e){
    console.error(e);
    showToast('บันทึกภาพไม่สำเร็จ','danger');
  }finally{
    document.body.removeChild(wrap);
  }
}

function printSurveyReport(){
  const data=_svFiltered();
  if(!data.length){showToast('ไม่มีข้อมูลสำหรับพิมพ์','danger');return;}

  const site=document.getElementById('svd-site')?.value||currentSite;
  const sessId=parseInt(document.getElementById('svd-sess')?.value)||0;
  const period=document.getElementById('svd-period')?.value||'all';
  const selSess=_svSessions.find(s=>+s.id===sessId);
  const selCat=selSess?_svCats.find(c=>c.id===selSess.cat_id):null;
  const loc=locations.find(l=>l.code===site);

  // label/color ตามช่วงคะแนนในตารางแปรผล
  const _pLabel=v=>v>=4.5?'มากที่สุด':v>=3.5?'มาก':v>=2.5?'ปานกลาง':v>=1.5?'น้อย':'น้อยที่สุด';
  const _pColor=v=>v>=4.5?'#16a34a':v>=3.5?'#65a30d':v>=2.5?'#ca8a04':v>=1.5?'#ea580c':'#dc2626';
  // sample standard deviation (n-1)
  const _pStd=arr=>{
    const v=arr.filter(x=>x!=null&&x>=1&&x<=5);
    if(v.length<2)return 0;
    const m=v.reduce((a,b)=>a+b,0)/v.length;
    return Math.sqrt(v.reduce((s,x)=>s+(x-m)**2,0)/(v.length-1));
  };

  // header info
  let hdr='';
  if(selSess){
    hdr=`หลักสูตร/ระบบงาน: ${selCat?.name||''} : ${selSess.name}&nbsp;&nbsp;|&nbsp;&nbsp;วันที่อบรม: ${fmtDateShort(selSess.date)}&nbsp;&nbsp;|&nbsp;&nbsp;วิทยากร: ${selSess.trainer||'—'}`;
  }else{
    const pTxt=period==='all'?'ทั้งหมด':`${period} วันล่าสุด`;
    hdr=`สาขา: ${loc?.name||site}&nbsp;&nbsp;|&nbsp;&nbsp;ทุกรอบ (${data.length} ราย)&nbsp;&nbsp;|&nbsp;&nbsp;ช่วงเวลา: ${pTxt}`;
  }

  // compute per-question stats
  const secData=SVD_SECTIONS.map(sec=>({
    ...sec,
    qData:sec.keys.map((k,i)=>{
      const vals=data.map(r=>r[k]).filter(x=>x!=null&&x>=1&&x<=5);
      const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
      return{label:sec.qs[i],avg,std:_pStd(vals),counts:[5,4,3,2,1].map(v=>vals.filter(x=>x===v).length)};
    })
  }));

  const overallAvg=_avg(secData.flatMap(s=>s.qData).map(q=>q.avg).filter(v=>v>0));
  const ynRows=data.filter(r=>r.q6_6!=null);
  const ynYes=ynRows.filter(r=>r.q6_6===true).length;
  const ynPct=ynRows.length?Math.round(ynYes/ynRows.length*100):0;
  const comments=data.filter(r=>r.comments?.trim());

  // build table rows (rowspan for section header)
  let rows='';
  secData.forEach(sec=>{
    sec.qData.forEach((q,qi)=>{
      const lbl=q.avg>0?_pLabel(q.avg):'—';
      const clr=q.avg>0?_pColor(q.avg):'#94a3b8';
      rows+=`<tr>
        ${qi===0?`<td rowspan="${sec.qData.length}" class="sc">${sec.num}.<br>${sec.title}</td>`:''}
        <td class="qc">${q.label}</td>
        ${q.counts.map(c=>`<td class="nc">${c}</td>`).join('')}
        <td class="ac">${q.avg>0?q.avg.toFixed(2):'—'}</td>
        <td class="dc">${q.std>0?q.std.toFixed(2):'0.00'}</td>
        <td class="lc"><span style="background:${clr};color:#fff;padding:2px 9px;border-radius:12px;font-size:11px;font-weight:700;white-space:nowrap;">${lbl}</span></td>
      </tr>`;
    });
  });

  const html=`<!DOCTYPE html>
<html lang="th"><head><meta charset="UTF-8">
<title>สรุปผลการประเมิน — BMS Training</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Sarabun',sans-serif;font-size:13px;color:#111;background:#fff;padding:16px}
.wrap{max-width:1060px;margin:0 auto}
.title-box{background:#ffff00;border:2px solid #111;text-align:center;padding:10px 16px;margin-bottom:10px;border-radius:2px}
.title-box h1{font-size:17px;font-weight:700}
.title-box .sub{font-size:12px;margin-top:5px;color:#1a3a6e;font-weight:600}
.layout{display:flex;gap:12px;margin-bottom:12px;align-items:flex-start}
.tbl-wrap{flex:1;min-width:0}
.side{min-width:205px;flex-shrink:0;display:flex;flex-direction:column;gap:10px}
table{width:100%;border-collapse:collapse;font-size:12px}
th,td{border:1px solid #555;padding:5px 6px;vertical-align:middle}
thead th{background:#00b050;color:#fff;text-align:center;font-weight:700}
thead th.th-l{text-align:left}
.sc{background:#eff6ff;font-weight:700;font-size:11px;text-align:center;color:#1e40af;line-height:1.5;white-space:nowrap}
.qc{font-size:11.5px;color:#1a3a6e}
.nc{text-align:center}
.ac{text-align:center;font-weight:700;color:#1a56a0;font-size:13px}
.dc{text-align:center;color:#475569}
.lc{text-align:center}
.leg th{background:#ffff00;color:#111;text-align:center;font-size:12px;font-weight:700}
.l1{background:#dc2626;color:#fff;font-weight:700;text-align:center}
.l2{background:#ea580c;color:#fff;font-weight:700;text-align:center}
.l3{background:#f59e0b;color:#111;font-weight:700;text-align:center}
.l4{background:#84cc16;color:#111;font-weight:700;text-align:center}
.l5{background:#16a34a;color:#fff;font-weight:700;text-align:center}
.ynbox{border:1px solid #e2e8f0;border-radius:4px;padding:10px}
.ynbox .yt{font-size:12px;font-weight:700;margin-bottom:7px;color:#374151}
.hl{border:2px solid #fbbf24;background:#fffde7;padding:8px 16px;margin-bottom:10px;font-size:13px;text-align:center;border-radius:4px;line-height:1.7}
.cmtbox{border:2px solid #fbbf24;border-radius:4px;overflow:hidden}
.cmtt{background:#fbbf24;padding:7px 12px;font-weight:700;font-size:13px}
.cmtb{padding:10px 16px}
.cmtb ul{padding-left:16px}
.cmtb li{font-size:12px;padding:3px 0;color:#374151;line-height:1.5}
@media print{body{padding:6px}@page{margin:.7cm;size:A4 landscape}}
</style></head><body>
<div class="wrap">
  <div class="title-box">
    <h1>สรุปผลการประเมินของผู้เข้าร่วมรับการอบรม</h1>
    <div class="sub">${hdr}</div>
  </div>
  <div class="layout">
    <div class="tbl-wrap">
      <table>
        <thead><tr>
          <th style="width:88px;">หัวข้อการประเมิน</th>
          <th class="th-l">หัวข้อคำถาม</th>
          <th style="width:30px;background:#16a34a;">5</th>
          <th style="width:30px;background:#65a30d;">4</th>
          <th style="width:30px;background:#ca8a04;">3</th>
          <th style="width:30px;background:#ea580c;">2</th>
          <th style="width:30px;background:#dc2626;">1</th>
          <th style="width:46px;">AVG</th>
          <th style="width:42px;">STD</th>
          <th style="width:78px;">แปลผล</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="side">
      <table class="leg">
        <thead>
          <tr><th colspan="3">ตารางแปรผลคะแนน</th></tr>
          <tr><th>ระดับ<br>ความคิดเห็น</th><th>ต่ำสุด</th><th>สูงสุด</th></tr>
        </thead>
        <tbody>
          <tr><td class="l1">น้อยที่สุด</td><td style="text-align:center">1</td><td style="text-align:center">1.49</td></tr>
          <tr><td class="l2">น้อย</td><td style="text-align:center">1.5</td><td style="text-align:center">2.49</td></tr>
          <tr><td class="l3">ปานกลาง</td><td style="text-align:center">2.5</td><td style="text-align:center">3.49</td></tr>
          <tr><td class="l4">มาก</td><td style="text-align:center">3.5</td><td style="text-align:center">4.49</td></tr>
          <tr><td class="l5">มากที่สุด</td><td style="text-align:center">4.5</td><td style="text-align:center">5</td></tr>
        </tbody>
      </table>
      ${ynRows.length?`<div class="ynbox">
        <div class="yt">ต้องการอบรมเพิ่มเติม</div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="background:${ynPct>=50?'#16a34a':'#dc2626'};color:#fff;padding:4px 14px;border-radius:20px;font-weight:700;font-size:16px;">${ynPct}%</span>
          <span style="font-size:12px;color:#64748b;">${ynYes} / ${ynRows.length} ราย</span>
        </div>
      </div>`:''}
    </div>
  </div>
  ${overallAvg>0?`<div class="hl">คะแนนเฉลี่ยรวมทุกด้าน <strong>${overallAvg.toFixed(2)} / 5.00</strong> — ระดับ <strong>"${_pLabel(overallAvg)}"</strong> &nbsp;|&nbsp; ผู้ทำแบบประเมิน <strong>${data.length} ราย</strong></div>`:''}
  <div class="cmtbox">
    <div class="cmtt">💬 ข้อเสนอแนะเพิ่มเติม (Comments)</div>
    <div class="cmtb">${comments.length?`<ul>${comments.map(r=>`<li>${r.comments}</li>`).join('')}</ul>`:'<p style="color:#64748b;font-size:12px;">ไม่มี</p>'}</div>
  </div>
</div>
<script>window.onload=()=>setTimeout(()=>{window.print();},400);</script>
</body></html>`;

  const w=window.open('','_blank','width=1150,height=860');
  if(!w){showToast('กรุณาอนุญาต Pop-up ในเบราว์เซอร์ก่อนพิมพ์','danger');return;}
  w.document.write(html);
  w.document.close();
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
        ${_quizCatIds.has(c.id)
          ?`<a href="${QUIZ_BASE_URL}/#/category/${c.id}" target="_blank" class="cat-quiz-btn" onclick="event.stopPropagation()"><i class="ti ti-pencil-check"></i> ทำแบบทดสอบ</a>`
          :''
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
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
    const needHttps=location.protocol!=='https:'&&location.hostname!=='localhost';
    showToast(needHttps?'iPhone/iOS ต้องเปิดผ่าน HTTPS เท่านั้น':'Browser ไม่รองรับกล้อง','danger');
    showDemoScan();return;
  }
  try{
    let stream;
    try{
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:currentFacingMode},width:{ideal:1280},height:{ideal:720}}});
    }catch(e){
      // fallback สำหรับ iOS ที่ resolution constraint ทำให้ fail
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:currentFacingMode}}});
    }
    scanStream=stream;
    const v=document.getElementById('scanner-video');
    v.srcObject=stream;
    try{await v.play();}catch(pe){console.warn('video.play:',pe);}
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
  }catch(e){
    const msg=e.name==='NotAllowedError'?'กรุณาอนุญาตการใช้กล้องในการตั้งค่า Browser':
               e.name==='NotFoundError'?'ไม่พบกล้องในอุปกรณ์นี้':
               'ไม่สามารถเข้าถึงกล้อง — ลองโหมดสาธิต';
    showToast(msg,'warn');showDemoScan();
  }
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
  const regs=registrations.filter(r=>!!getSess(r.sessionId)&&(r.fname+r.lname).toLowerCase().includes(q));
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
  const present=regs.filter(r=>r.attended).length;
  const walkinCount=regs.filter(r=>r.isWalkin).length;
  const preReg=regs.filter(r=>!r.isWalkin).length;
  const absent=preReg-regs.filter(r=>r.attended&&!r.isWalkin).length;
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
        <div class="att-sum-card total"><div class="att-sum-num">${preReg}</div><div class="att-sum-lbl">ลงทะเบียน</div></div>
        <div class="att-sum-card present"><div class="att-sum-num">${present}</div><div class="att-sum-lbl">เข้าอบรม</div></div>
        <div class="att-sum-card absent"><div class="att-sum-num">${absent}</div><div class="att-sum-lbl">ขาด</div></div>
        <div class="att-sum-card pct"><div class="att-sum-num">${pct}%</div><div class="att-sum-lbl">อัตราเข้าร่วม</div></div>
        ${walkinCount?`<div class="att-sum-card" style="border-color:#8b5cf6;background:rgba(139,92,246,.07);"><div class="att-sum-num" style="color:#7c3aed;">${walkinCount}</div><div class="att-sum-lbl">Walk-in</div></div>`:''}
      </div>
      <div class="att-progress-bar"><div class="att-progress-fill" style="width:${pct}%;"></div></div>
      <div style="font-size:11px;color:var(--text-muted);text-align:right;">${present}/${regs.length} คน${walkinCount?` (รวม Walk-in ${walkinCount} คน)`:''}</div>
    </div>
    <div class="card" style="padding:0;overflow:hidden;">
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
        <div style="font-family:var(--heading);font-size:14px;font-weight:600;color:var(--primary);display:flex;align-items:center;gap:8px;"><i class="ti ti-users"></i>รายชื่อ</div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-sm" style="background:#7c3aed;color:#fff;border:none;gap:5px;" onclick="openWalkinModal(${sid})"><i class="ti ti-walk"></i>Walk-in</button>
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
              <div class="att-name">${r.prefix||''}${r.fname} ${r.lname}${r.isWalkin?'<span style="margin-left:6px;font-size:10px;font-weight:700;background:#ede9fe;color:#7c3aed;padding:1px 6px;border-radius:10px;vertical-align:middle;">🚶 Walk-in</span>':''}</div>
              <div class="att-sub">${r.position||'-'} | ${r.dept}</div>
            </div>
            <div style="font-size:11px;color:var(--text-muted);text-align:right;min-width:80px;">
              ${r.attended?`<span class="badge badge-success"><i class="ti ti-clock"></i>${r.attendedTime}</span>`:'<span style="color:var(--text-muted);">ยังไม่เช็ค</span>'}
            </div>
            ${r.isWalkin
              ?`<button class="check-btn checked" style="background:#dc2626;" onclick="deleteWalkin(${r.id})" title="ลบ Walk-in"><i class="ti ti-trash"></i></button>`
              :`<button class="check-btn ${r.attended?'checked':''}" onclick="toggleAtt(${r.id})" title="${r.attended?'ยกเลิก':'เช็คชื่อ'}"><i class="ti ti-${r.attended?'check':''}"></i></button>`
            }
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
/* ══════════════════ WALK-IN ══════════════════ */
function openWalkinModal(sid){
  if(!sid){showToast('กรุณาเลือกรอบอบรมก่อน (ไปที่แท็บ "รายชื่อ" แล้วเลือกรอบ)','danger');return;}
  const s=getSess(sid);
  if(!s){showToast('ไม่พบข้อมูลรอบอบรม','danger');return;}
  const cnt=getCount(sid);
  if(cnt>=s.capacity){
    showAlert(
      `ที่นั่งเต็มแล้ว — ไม่สามารถเพิ่ม Walk-in ได้`,
      `รอบ "${s.name}" รับได้ ${s.capacity} คน มีผู้ลงทะเบียนแล้ว ${cnt} คน\nกรุณาไปที่ Admin → จัดการรอบอบรม แล้วเพิ่มจำนวนที่นั่งก่อน`
    );
    return;
  }
  const cat=getCat(s.catId);
  document.getElementById('walkin-sess-id').value=sid;
  document.getElementById('walkin-sess-title').textContent=`${cat?.name||''} — ${s.name}`;
  document.getElementById('walkin-sess-meta').textContent=`${fmtDate(s.date)} · ${sessTxt(s)}`;
  ['walkin-fname','walkin-lname','walkin-pos'].forEach(id=>document.getElementById(id).value='');
  populateSelect('walkin-prefix',prefixes,'คำนำหน้า...');
  populateSelect('walkin-dept',departments,'เลือกแผนก...');
  document.getElementById('modal-walkin').classList.add('open');
  setTimeout(()=>document.getElementById('walkin-fname').focus(),200);
}
async function submitWalkin(){
  const sid=parseInt(document.getElementById('walkin-sess-id').value);
  const prefix=document.getElementById('walkin-prefix').value;
  const fname=document.getElementById('walkin-fname').value.trim();
  const lname=document.getElementById('walkin-lname').value.trim();
  const pos=document.getElementById('walkin-pos').value.trim();
  const dept=document.getElementById('walkin-dept').value;
  if(!fname||!lname||!pos||!dept){showToast('กรอกข้อมูลให้ครบทุกช่อง','danger');return;}
  const s=getSess(sid);
  if(s&&getCount(sid)>=s.capacity){
    closeModal('modal-walkin');
    showAlert(
      `ที่นั่งเต็มแล้ว — ไม่สามารถเพิ่ม Walk-in ได้`,
      `รอบ "${s.name}" รับได้ ${s.capacity} คน มีผู้ลงทะเบียนแล้ว ${getCount(sid)} คน\nกรุณาเพิ่มจำนวนที่นั่งใน Admin ก่อน`
    );
    return;
  }
  const time=nowTime();
  const {data,error}=await _sb.from('registrations').insert({
    session_id:sid,prefix,fname,lname,position:pos,dept,
    reg_date:new Date().toISOString().split('T')[0],
    attended:true,attended_time:time,is_walkin:true,
  }).select().single();
  if(error){showToast('บันทึกไม่สำเร็จ: '+error.message,'danger');return;}
  registrations.push(_mReg(data));
  closeModal('modal-walkin');
  loadAttendance();updateCheckinHeroStats();
  showToast(`✓ Walk-in: ${prefix||''}${fname} ${lname}`,'success');
}
async function deleteWalkin(regId){
  const reg=getReg(regId);if(!reg||!reg.isWalkin)return;
  if(!await showConfirm(`ลบ Walk-in "${reg.prefix||''}${reg.fname} ${reg.lname}" ออก?`,'',{okLabel:'ลบ',danger:true}))return;
  const {error}=await _sb.from('registrations').delete().eq('id',regId);
  if(error){showToast('ลบไม่สำเร็จ','danger');return;}
  const idx=registrations.findIndex(r=>r.id===regId);
  if(idx!==-1)registrations.splice(idx,1);
  loadAttendance();updateCheckinHeroStats();
  showToast('ลบ Walk-in แล้ว','warn');
}

function exportAttendance(){
  const sid=parseInt(document.getElementById('att-sess-sel').value);
  if(!sid){showToast('กรุณาเลือกรอบอบรมก่อน','danger');return;}
  if(!window.XLSX){showToast('กำลังโหลด library...','warn');return;}
  const s=getSess(sid),cat=s?getCat(s.catId):null;
  const regs=registrations.filter(r=>r.sessionId===sid);
  const wb=XLSX.utils.book_new();

  // Info sheet
  const info=[
    ['ประเภทอบรม',cat?cat.name:'-'],
    ['รอบอบรม',s.name],
    ['วันที่',fmtDate(s.date)],
    ['สถานที่',s.venue||'-'],
    ['วิทยากร',s.trainer||'-'],
    ['ลงทะเบียน',regs.length],
    ['เข้าอบรม',regs.filter(r=>r.attended).length],
    ['ขาด',regs.filter(r=>!r.attended).length],
  ];
  const wsInfo=XLSX.utils.aoa_to_sheet(info);
  wsInfo['!cols']=[{wch:18},{wch:35}];
  XLSX.utils.book_append_sheet(wb,wsInfo,'ข้อมูลรอบอบรม');

  // Attendance sheet
  const rows=regs.map((r,i)=>({
    'ลำดับ':i+1,
    'คำนำหน้า':r.prefix||'',
    'ชื่อ':r.fname,
    'นามสกุล':r.lname,
    'ตำแหน่ง':r.position||'',
    'แผนก':r.dept,
    'ประเภท':r.isWalkin?'Walk-in':'ลงทะเบียน',
    'สถานะ':r.attended?'เข้าอบรม':'ขาด',
    'เวลาเข้า':r.attendedTime||'-',
  }));
  const wsAtt=XLSX.utils.json_to_sheet(rows);
  wsAtt['!cols']=[{wch:6},{wch:10},{wch:16},{wch:16},{wch:18},{wch:22},{wch:12},{wch:10},{wch:10}];
  XLSX.utils.book_append_sheet(wb,wsAtt,'รายชื่อเช็คชื่อ');

  XLSX.writeFile(wb,`เช็คชื่อ_${s.name}_${s.date}.xlsx`);
  showToast('Export Excel สำเร็จ','success');
}
function exportAllRegsExcel(){
  if(!window.XLSX){showToast('กำลังโหลด library...','warn');return;}
  const wb=XLSX.utils.book_new();
  const siteRegs=registrations.filter(r=>!!getSess(r.sessionId));

  // Sheet 1: All registrations
  const allRows=siteRegs.map((r,i)=>{
    const s=getSess(r.sessionId),cat=s?getCat(s.catId):null;
    return{
      'ลำดับ':i+1,
      'คำนำหน้า':r.prefix||'',
      'ชื่อ':r.fname,
      'นามสกุล':r.lname,
      'ตำแหน่ง':r.position||'',
      'แผนก':r.dept,
      'ประเภทอบรม':cat?cat.name:'-',
      'รอบอบรม':s?s.name:'-',
      'วันที่อบรม':s?s.date:'-',
      'สถานที่':s?s.venue:'-',
      'วิทยากร':s?s.trainer:'-',
      'วันที่ลงทะเบียน':r.regDate||'-',
      'สถานะ':r.attended?'เข้าอบรม':'ขาด',
      'เวลาเข้า':r.attendedTime||'-',
    };
  });
  const ws1=XLSX.utils.json_to_sheet(allRows);
  ws1['!cols']=[{wch:5},{wch:10},{wch:16},{wch:16},{wch:18},{wch:22},{wch:20},{wch:22},{wch:12},{wch:18},{wch:16},{wch:14},{wch:10},{wch:10}];
  XLSX.utils.book_append_sheet(wb,ws1,'ผู้ลงทะเบียนทั้งหมด');

  // Sheet 2: Summary by department
  const deptMap={};
  siteRegs.forEach(r=>{
    if(!deptMap[r.dept])deptMap[r.dept]={cnt:0,att:0};
    deptMap[r.dept].cnt++;
    if(r.attended)deptMap[r.dept].att++;
  });
  const deptRows=Object.entries(deptMap).map(([dept,v])=>({
    'แผนก':dept,
    'ลงทะเบียน':v.cnt,
    'เข้าอบรม':v.att,
    'ขาด':v.cnt-v.att,
    'อัตราเข้าร่วม (%)':v.cnt?Math.round(v.att/v.cnt*100):0,
  })).sort((a,b)=>b['ลงทะเบียน']-a['ลงทะเบียน']);
  const ws2=XLSX.utils.json_to_sheet(deptRows);
  ws2['!cols']=[{wch:28},{wch:12},{wch:12},{wch:8},{wch:18}];
  XLSX.utils.book_append_sheet(wb,ws2,'สรุปตามแผนก');

  // Sheet 3: Summary by session
  const sessRows=sessions.map(s=>{
    const regs=registrations.filter(r=>r.sessionId===s.id);
    const att=regs.filter(r=>r.attended).length;
    const cat=getCat(s.catId);
    return{
      'ประเภทอบรม':cat?cat.name:'-',
      'รอบอบรม':s.name,
      'วันที่':s.date,
      'สถานที่':s.venue||'-',
      'วิทยากร':s.trainer||'-',
      'ลงทะเบียน':regs.length,
      'เข้าอบรม':att,
      'ขาด':regs.length-att,
      'อัตราเข้าร่วม (%)':regs.length?Math.round(att/regs.length*100):0,
    };
  }).filter(r=>r['ลงทะเบียน']>0);
  const ws3=XLSX.utils.json_to_sheet(sessRows);
  ws3['!cols']=[{wch:20},{wch:24},{wch:12},{wch:18},{wch:16},{wch:10},{wch:10},{wch:8},{wch:18}];
  XLSX.utils.book_append_sheet(wb,ws3,'สรุปตามรอบ');

  const today=new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb,`BMS_Training_${today}.xlsx`);
  showToast(`Export Excel สำเร็จ — ${siteRegs.length} รายการ`,'success');
}
function exportAllRegsCSV(){
  const siteRegs=registrations.filter(r=>!!getSess(r.sessionId));
  let csv='ลำดับ,คำนำหน้า,ชื่อ,นามสกุล,ตำแหน่ง,แผนก,ประเภทอบรม,รอบอบรม,วันที่อบรม,สถานะ,เวลาเข้า\n';
  siteRegs.forEach((r,i)=>{
    const s=getSess(r.sessionId),cat=s?getCat(s.catId):null;
    csv+=`${i+1},${r.prefix||''},${r.fname},${r.lname},${r.position||''},${r.dept},${cat?cat.name:'-'},${s?s.name:'-'},${s?s.date:'-'},${r.attended?'เข้าอบรม':'ขาด'},${r.attendedTime||'-'}\n`;
  });
  const blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`BMS_Training_${new Date().toISOString().split('T')[0]}.csv`;a.click();
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
  const siteRegs=registrations.filter(r=>!!getSess(r.sessionId));
  document.getElementById('admin-stats').innerHTML=`
    <div class="stat-card blue"><div class="stat-label">ประเภทอบรม</div><div class="stat-value">${categories.length}</div></div>
    <div class="stat-card amber"><div class="stat-label">รอบอบรม</div><div class="stat-value">${sessions.length}</div></div>
    <div class="stat-card green"><div class="stat-label">ผู้ลงทะเบียน</div><div class="stat-value" id="stat-reg-count">${siteRegs.length}</div></div>
    <div class="stat-card green"><div class="stat-label">เข้าอบรมแล้ว</div><div class="stat-value" id="stat-att-count">${siteRegs.filter(r=>r.attended).length}</div></div>`;
  renderAdminCats();
  const catOpts='<option value="">ทุกประเภท</option>'+categories.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  ['admin-filter-cat','admin-reg-filter-cat'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=catOpts;});
  document.getElementById('admin-filter-sess').innerHTML='<option value="">ทุกรอบ</option>'+sessions.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
  renderAdminSessions();renderMasters();renderAdminRegs();renderAdminLocations();renderAdminUsers();renderLoginVerify();
  // populate role select in add-user form
  const rEl=document.getElementById('new-au-role');
  if(rEl)rEl.innerHTML=Object.keys(adminRolePermissions).map(r=>`<option value="${r}">${r}</option>`).join('');
  _applyAdminTabVisibility();
}

/* ══════════════════ ANALYTICS ══════════════════ */
let _analyticsNoRegStats={noRegDepts:[],regCount:0,total:0,regPct:0};
function renderAnalytics(){
  // กรองเฉพาะ registrations ของสาขาปัจจุบัน (sessions filter by currentSite แล้ว)
  const siteRegs=registrations.filter(r=>!!getSess(r.sessionId));
  const loc=locations.find(l=>l.code===currentSite);
  const siteName=loc?loc.name:currentSite;

  const total=siteRegs.length;
  const attended=siteRegs.filter(r=>r.attended).length;
  const absent=total-attended;
  const pct=total?Math.round(attended/total*100):0;
  const fullSess=sessions.filter(s=>{
    const r=siteRegs.filter(x=>x.sessionId===s.id);
    return r.length>0&&r.every(x=>x.attended);
  }).length;

  document.getElementById('analytics-summary').innerHTML=`
    <div class="stat-card blue"><div class="stat-label">ผู้ลงทะเบียน (${siteName})</div><div class="stat-value">${total}</div></div>
    <div class="stat-card green"><div class="stat-label">เข้าอบรมแล้ว</div><div class="stat-value">${attended}</div></div>
    <div class="stat-card red"><div class="stat-label">ขาดอบรม</div><div class="stat-value">${absent}</div></div>
    <div class="stat-card amber"><div class="stat-label">อัตราเข้าร่วม</div><div class="stat-value">${pct}%</div></div>
    <div class="stat-card teal"><div class="stat-label">รอบที่เช็คครบ</div><div class="stat-value">${fullSess}</div></div>`;

  Object.values(_charts).forEach(c=>{try{c.destroy();}catch(e){}});
  _charts={};

  // ── Design tokens ──
  const P={
    ok:'rgba(16,185,129,0.88)',   okS:'#10b981',
    fail:'rgba(244,63,94,0.80)',  failS:'#f43f5e',
    grid:'rgba(226,232,240,0.55)',
    txt:'#64748b', dark:'#0f172a',
  };
  if(typeof Chart!=='undefined'){Chart.defaults.font.family='Sarabun, sans-serif';}
  const fnt=(sz=12,w='normal')=>({family:'Sarabun,sans-serif',size:sz,weight:w});
  const leg={position:'bottom',labels:{font:fnt(11),boxWidth:10,boxHeight:10,padding:14,usePointStyle:true,pointStyleWidth:10}};
  const tip={
    backgroundColor:'#0f172a',padding:12,cornerRadius:10,
    titleFont:fnt(12,'600'),bodyFont:fnt(12),
    titleColor:'#f1f5f9',bodyColor:'#cbd5e1',
    displayColors:true,boxWidth:8,boxHeight:8,boxPadding:4,
  };
  const scX={grid:{display:false},ticks:{font:fnt(11),color:P.txt},border:{display:false}};
  const scY={grid:{color:P.grid},ticks:{font:fnt(11),color:P.txt},border:{display:false}};

  // ── Plugin: % ตรงกลาง donut ──
  const centerText={
    id:'ctr',
    beforeDatasetsDraw(chart){
      if(chart.config.type!=='doughnut')return;
      const{ctx,chartArea:a}=chart;
      const cx=a.left+(a.right-a.left)/2, cy=a.top+(a.bottom-a.top)/2;
      ctx.save();
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.font=`700 30px Sarabun,sans-serif`;
      ctx.fillStyle=P.dark;
      ctx.fillText(`${pct}%`,cx,cy-10);
      ctx.font=`11px Sarabun,sans-serif`;
      ctx.fillStyle=P.txt;
      ctx.fillText('อัตราเข้าร่วม',cx,cy+13);
      ctx.restore();
    }
  };

  // ── Chart 1: Donut ──
  const ctxO=document.getElementById('chart-overall');
  if(ctxO) _charts.overall=new Chart(ctxO,{
    type:'doughnut',
    plugins:[centerText],
    data:{
      labels:[`เข้าอบรม (${attended} คน)`,`ขาด (${absent} คน)`],
      datasets:[{
        data:[attended||0,absent||0],
        backgroundColor:[P.ok,P.fail],
        borderWidth:0,hoverOffset:8,
        hoverBorderWidth:2,hoverBorderColor:'#fff',
      }]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      cutout:'74%',
      animation:{animateRotate:true,duration:700,easing:'easeOutQuart'},
      onClick:(e,els)=>{if(!els.length)return;const idx=els[0].index;showAnalyticsDetail(idx===0?'เข้าอบรม':'ขาดอบรม',siteRegs.filter(r=>idx===0?r.attended:!r.attended));},
      onHover:(e,els)=>{e.native.target.style.cursor=els.length?'pointer':'default';},
      plugins:{
        legend:leg,
        tooltip:{...tip,callbacks:{label:ctx=>` ${ctx.label}: ${total?Math.round(ctx.raw/total*100):0}%`}}
      }
    }
  });

  // ── Chart 2: By Category ──
  const catData=categories.map(c=>{
    const sids=sessions.filter(s=>s.catId===c.id).map(s=>s.id);
    const cnt=siteRegs.filter(r=>sids.includes(r.sessionId)).length;
    const att=siteRegs.filter(r=>sids.includes(r.sessionId)&&r.attended).length;
    return{name:c.name,sids,cnt,att,absent:cnt-att,pct:cnt?Math.round(att/cnt*100):0};
  }).filter(d=>d.cnt>0);

  const ctxC=document.getElementById('chart-by-cat');
  if(ctxC) _charts.byCat=new Chart(ctxC,{
    type:'bar',
    data:{
      labels:catData.map(d=>d.name),
      datasets:[
        {label:'เข้าอบรม',data:catData.map(d=>d.att),backgroundColor:P.ok,borderRadius:5,borderSkipped:false,stack:'s'},
        {label:'ขาด',data:catData.map(d=>d.absent),backgroundColor:P.fail,borderRadius:5,borderSkipped:false,stack:'s'},
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      animation:{duration:600,easing:'easeOutQuart'},
      onClick:(e,els)=>{if(!els.length)return;const d=catData[els[0].index];if(!d)return;showAnalyticsDetail(d.name,siteRegs.filter(r=>d.sids.includes(r.sessionId)),`เข้าอบรม ${d.att}/${d.cnt} คน (${d.pct}%)`);},
      onHover:(e,els)=>{e.native.target.style.cursor=els.length?'pointer':'default';},
      plugins:{
        legend:leg,
        tooltip:{...tip,callbacks:{
          title:([ctx])=>catData[ctx.dataIndex]?.name||'',
          label:ctx=>{
            const d=catData[ctx.dataIndex];
            return ctx.datasetIndex===0?` เข้าอบรม ${d.att} คน — ${d.pct}%`:` ขาด ${d.absent} คน`;
          }
        }}
      },
      scales:{
        x:{...scX,stacked:true},
        y:{...scY,stacked:true,beginAtZero:true,ticks:{...scY.ticks,stepSize:1}}
      }
    }
  });

  // ── Chart 3: By Department — เรียงตาม % สูง→ต่ำ, สีไล่ตาม rate ──
  const deptMap={};
  siteRegs.forEach(r=>{
    if(!deptMap[r.dept])deptMap[r.dept]={cnt:0,att:0};
    deptMap[r.dept].cnt++;
    if(r.attended)deptMap[r.dept].att++;
  });
  const deptData=Object.entries(deptMap)
    .map(([dept,v])=>({dept,cnt:v.cnt,att:v.att,absent:v.cnt-v.att,pct:Math.round(v.att/v.cnt*100)}))
    .sort((a,b)=>b.pct-a.pct||b.cnt-a.cnt).slice(0,10);

  const totalDepts=Object.keys(deptMap).length;
  const elD=document.getElementById('analytics-dept-total');
  if(elD)elD.textContent=`แสดง ${deptData.length} จาก ${totalDepts} แผนก`;

  // สีแต่ละ bar ไล่จากเขียว (100%) → แดง (0%)
  const deptColors=deptData.map(d=>{
    const t=d.pct/100;
    return`rgba(${Math.round(244-(244-16)*t)},${Math.round(63+(185-63)*t)},${Math.round(94+(129-94)*t)},0.85)`;
  });

  const ctxD=document.getElementById('chart-by-dept');
  if(ctxD) _charts.byDept=new Chart(ctxD,{
    type:'bar',
    data:{
      labels:deptData.map(d=>d.dept),
      datasets:[
        {label:'เข้าอบรม',data:deptData.map(d=>d.att),backgroundColor:deptColors,borderRadius:5,borderSkipped:false,stack:'s'},
        {label:'ขาด',data:deptData.map(d=>d.absent),backgroundColor:'rgba(226,232,240,0.55)',borderRadius:5,borderSkipped:false,stack:'s'},
      ]
    },
    options:{
      indexAxis:'y',
      responsive:true,maintainAspectRatio:false,
      animation:{duration:600,easing:'easeOutQuart'},
      onClick:(e,els)=>{if(!els.length)return;const d=deptData[els[0].index];if(!d)return;showAnalyticsDetail(d.dept,siteRegs.filter(r=>r.dept===d.dept),`เข้าอบรม ${d.att}/${d.cnt} คน (${d.pct}%)`);},
      onHover:(e,els)=>{e.native.target.style.cursor=els.length?'pointer':'default';},
      plugins:{
        legend:{display:false},
        tooltip:{...tip,callbacks:{
          title:([ctx])=>deptData[ctx.dataIndex]?.dept||'',
          label:ctx=>{
            const d=deptData[ctx.dataIndex];
            return ctx.datasetIndex===0?` เข้าอบรม ${d.att}/${d.cnt} คน (${d.pct}%)`:` ขาด ${d.absent} คน`;
          }
        }}
      },
      scales:{
        x:{...scY,stacked:true,beginAtZero:true,ticks:{...scY.ticks,stepSize:1}},
        y:{...scX,stacked:true,ticks:{font:fnt(11),color:P.txt}}
      }
    }
  });

  // ── Chart 4: By Session ──
  const sessData=sessions.map(s=>{
    const cnt=siteRegs.filter(r=>r.sessionId===s.id).length;
    const att=siteRegs.filter(r=>r.sessionId===s.id&&r.attended).length;
    return{id:s.id,name:s.name,date:fmtDateShort(s.date),cnt,att,absent:cnt-att,pct:cnt?Math.round(att/cnt*100):0};
  }).filter(d=>d.cnt>0);

  const ctxS=document.getElementById('chart-by-sess');
  if(ctxS) _charts.bySess=new Chart(ctxS,{
    type:'bar',
    data:{
      labels:sessData.map(d=>d.name),
      datasets:[
        {label:'เข้าอบรม',data:sessData.map(d=>d.att),backgroundColor:P.ok,borderRadius:5,borderSkipped:false,stack:'s'},
        {label:'ขาด',data:sessData.map(d=>d.absent),backgroundColor:P.fail,borderRadius:5,borderSkipped:false,stack:'s'},
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      animation:{duration:600,easing:'easeOutQuart'},
      onClick:(e,els)=>{if(!els.length)return;const d=sessData[els[0].index];if(!d)return;showAnalyticsDetail(d.name,siteRegs.filter(r=>r.sessionId===d.id),`${d.date} · เข้าอบรม ${d.att}/${d.cnt} คน`);},
      onHover:(e,els)=>{e.native.target.style.cursor=els.length?'pointer':'default';},
      plugins:{
        legend:leg,
        tooltip:{...tip,callbacks:{
          title:([ctx])=>`${sessData[ctx.dataIndex]?.name||''} · ${sessData[ctx.dataIndex]?.date||''}`,
          label:ctx=>{
            const d=sessData[ctx.dataIndex];
            return ctx.datasetIndex===0?` เข้าอบรม ${d.att}/${d.cnt} คน (${d.pct}%)`:` ขาด ${d.absent} คน`;
          }
        }}
      },
      scales:{
        x:{...scX,stacked:true,ticks:{font:fnt(10),color:P.txt,maxRotation:30,minRotation:10}},
        y:{...scY,stacked:true,beginAtZero:true,ticks:{...scY.ticks,stepSize:1}}
      }
    }
  });

  // Section: Departments not registered
  const registeredDepts=new Set(siteRegs.map(r=>r.dept));
  const noRegDepts=departments.filter(d=>!registeredDepts.has(d)).sort();
  const noRegEl=document.getElementById('analytics-noreg-list');
  const noRegCount=document.getElementById('analytics-noreg-count');
  const regCount=departments.length-noRegDepts.length;
  const regPct=departments.length?Math.round(regCount/departments.length*100):0;
  _analyticsNoRegStats={noRegDepts,regCount,total:departments.length,regPct};
  if(noRegCount)noRegCount.textContent='';
  if(noRegEl){
    if(!departments.length){
      noRegEl.innerHTML=`<div style="color:var(--text-muted);font-size:13px;padding:12px 0;text-align:center;">ยังไม่มีข้อมูลหน่วยงาน — กรุณาเพิ่มใน <b>ข้อมูลพื้นฐาน</b></div>`;
    } else {
      // Progress bar
      const barColor=regPct===100?'#34d399':regPct>=60?'#60a5fa':'#fb923c';
      let html=`
        <div style="margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;">
            <span style="font-size:12px;color:var(--text-muted);">มีผู้ลงทะเบียนแล้ว</span>
            <span style="font-size:13px;font-weight:700;color:var(--text);">${regCount}<span style="font-weight:400;color:var(--text-muted);"> / ${departments.length} หน่วยงาน</span></span>
          </div>
          <div style="height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden;">
            <div style="width:${regPct}%;height:100%;background:${barColor};border-radius:99px;transition:width .5s ease;"></div>
          </div>
        </div>`;
      if(!noRegDepts.length){
        html+=`<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;">
          <i class="ti ti-circle-check-filled" style="font-size:22px;color:#16a34a;flex-shrink:0;"></i>
          <div><div style="font-weight:700;font-size:13px;color:#15803d;">ครบทุกหน่วยงาน</div><div style="font-size:11px;color:#4ade80;margin-top:1px;">ทุกหน่วยงานมีผู้ลงทะเบียนเข้าอบรมแล้ว</div></div>
        </div>`;
      } else {
        html+=`<div style="font-size:11px;font-weight:600;color:var(--text-muted);letter-spacing:.4px;text-transform:uppercase;margin-bottom:8px;">${noRegDepts.length} หน่วยงานที่ยังไม่มีผู้ลงทะเบียน</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px;">
          ${noRegDepts.map((d,i)=>`
            <div style="display:flex;align-items:center;gap:8px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:7px 12px;">
              <span style="font-size:11px;font-weight:700;color:#d97706;min-width:20px;text-align:right;">${i+1}</span>
              <span style="width:1px;height:14px;background:#fde68a;flex-shrink:0;"></span>
              <span style="font-size:12px;color:#92400e;line-height:1.3;">${d}</span>
            </div>`).join('')}
          </div>`;
      }
      noRegEl.innerHTML=html;
    }
  }
}

async function copyNoRegLineMessage(){
  const {noRegDepts,regCount,total,regPct}=_analyticsNoRegStats;
  if(!total){showToast('ยังไม่มีข้อมูลหน่วยงาน','warn');return;}
  const loc=locations.find(l=>l.code===currentSite);
  const siteLabel=loc?loc.name:currentSite;
  const today=new Date().toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric'});
  const regUrl=`${location.origin}${location.pathname}?site=${currentSite}`;

  let msg=`📢 แจ้งเตือนหน่วยงานที่ยังไม่ลงทะเบียนอบรม\n`;
  msg+=`🏥 ${siteLabel}\n`;
  msg+=`📅 ข้อมูล ณ วันที่ ${today}\n\n`;
  msg+=`✅ ลงทะเบียนแล้ว ${regCount}/${total} หน่วยงาน (${regPct}%)\n`;

  if(!noRegDepts.length){
    msg+=`🎉 ครบทุกหน่วยงานแล้ว ขอบคุณทุกหน่วยงานค่ะ 🙏`;
  }else{
    msg+=`⚠️ ยังไม่ลงทะเบียน ${noRegDepts.length} หน่วยงาน ดังนี้\n\n`;
    msg+=noRegDepts.map(d=>`🔸 ${d}`).join('\n');
    msg+=`\n\n🙏 รบกวนหน่วยงานดังกล่าวลงทะเบียนเข้าร่วมอบรมด้วยนะคะ/ครับ ขอบคุณค่ะ\n`;
    msg+=`🔗 ลงทะเบียนที่นี่: ${regUrl}`;
  }

  try{
    if(navigator.clipboard&&window.isSecureContext){
      await navigator.clipboard.writeText(msg);
    }else{
      const ta=document.createElement('textarea');
      ta.value=msg;ta.style.cssText='position:fixed;left:-9999px;top:0;';
      document.body.appendChild(ta);ta.focus();ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    showToast('คัดลอกข้อความสำหรับส่งไลน์แล้ว','success');
  }catch(e){
    console.error(e);
    showToast('คัดลอกไม่สำเร็จ','danger');
  }
}

/* ── Analytics Detail Modal ── */
let _aDetailRegs=[];
function showAnalyticsDetail(title,regs,sub=''){
  _aDetailRegs=regs;
  document.getElementById('adetail-title').textContent=title;
  document.getElementById('adetail-sub').textContent=sub||(regs.length+' คน');
  document.querySelectorAll('.adetail-tab').forEach(t=>t.classList.remove('active'));
  document.querySelector('#adetail-tabs .adetail-tab').classList.add('active');
  _renderADetailTable(regs);
  document.getElementById('modal-analytics-detail').classList.add('open');
}
function filterAnalyticsDetail(f,el){
  document.querySelectorAll('.adetail-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  const rows=f==='all'?_aDetailRegs:f==='ok'?_aDetailRegs.filter(r=>r.attended):_aDetailRegs.filter(r=>!r.attended);
  document.getElementById('adetail-sub').textContent=rows.length+' คน';
  _renderADetailTable(rows);
}
function _renderADetailTable(regs){
  const el=document.getElementById('adetail-body');
  if(!regs.length){el.innerHTML='<div class="empty" style="padding:40px;"><i class="ti ti-mood-empty" style="font-size:36px;display:block;margin-bottom:8px;opacity:.3;"></i><p>ไม่มีข้อมูล</p></div>';return;}
  el.innerHTML=`<table class="adetail-table"><thead><tr><th>#</th><th>ชื่อ-นามสกุล</th><th>ตำแหน่ง / หน่วยงาน</th><th>รอบอบรม</th><th>วันที่</th><th>เวลาเช็คชื่อ</th><th>สถานะ</th></tr></thead><tbody>`+
    regs.map((r,i)=>{
      const s=getSess(r.sessionId);
      const badge=r.attended
        ?`<span class="badge badge-success" style="gap:3px;"><i class="ti ti-check" style="font-size:11px;"></i>เข้าอบรม</span>`
        :`<span class="badge badge-danger" style="gap:3px;"><i class="ti ti-x" style="font-size:11px;"></i>ขาด</span>`;
      return`<tr>
        <td style="color:var(--text-muted);font-size:12px;">${i+1}</td>
        <td><div style="font-weight:600;font-size:13px;">${r.prefix||''}${r.fname} ${r.lname}</div></td>
        <td><div style="font-size:12px;">${r.position||'-'}</div><div style="font-size:11px;color:var(--text-muted);">${r.dept||'-'}</div></td>
        <td style="font-size:12px;max-width:160px;">${s?s.name:'-'}</td>
        <td style="font-size:12px;white-space:nowrap;">${s?fmtDateShort(s.date):'-'}</td>
        <td style="font-size:12px;color:${r.attended?'var(--success)':'var(--text-muted)'};">${r.attendedTime||'—'}</td>
        <td>${badge}</td>
      </tr>`;
    }).join('')+`</tbody></table>`;
}
function closeAnalyticsDetail(){closeModal('modal-analytics-detail');}

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
      <td>
        ${_quizCatIds.has(c.id)
          ?`<a href="${QUIZ_BASE_URL}/#/category/${c.id}" target="_blank" class="btn btn-sm" style="background:#ecfdf5;color:#065f46;border:1px solid #10b981;text-decoration:none;display:inline-flex;align-items:center;gap:4px;" title="เปิดแบบทดสอบ"><i class="ti ti-pencil-check"></i>แบบทดสอบ</a>`
          :`<a href="${QUIZ_BASE_URL}/#/admin/courses" target="_blank" class="btn btn-ghost btn-sm" style="color:var(--text-muted);text-decoration:none;display:inline-flex;align-items:center;gap:4px;" title="ยังไม่มีแบบทดสอบ — คลิกเพื่อสร้าง"><i class="ti ti-circle-plus"></i>สร้างแบบทดสอบ</a>`
        }
      </td>
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
  if(el.tagName==='SELECT'){
    if(isObj){
      el.innerHTML=`<option value="">${placeholder}</option>`+arr.map(a=>`<option value="${a.v}">${a.l}</option>`).join('');
    }else{
      while(el.options.length)el.options.remove(0);
      el.options.add(new Option(placeholder,''));
      arr.forEach(v=>el.options.add(new Option(v,v)));
    }
  }else{
    // custom dropdown (hidden input + .csel-list div)
    const list=document.getElementById('csell-'+id);
    const btn=document.getElementById('cselb-'+id);
    if(!list||!btn)return;
    el.value='';
    const btnSpan=btn.querySelector('.csel-btn-txt');
    if(btnSpan)btnSpan.textContent=placeholder;else btn.firstChild.textContent=placeholder;
    btn.dataset.empty='1';
    btn.dataset.placeholder=placeholder;
    list.innerHTML='';
    // Use div container + button items — buttons reliably fire click in all WebViews
    const opts=document.createElement('div');
    opts.className='csel-options';
    // Search box for large lists
    if(arr.length>5){
      const sw=document.createElement('div');
      sw.className='csel-search-wrap';
      const si=document.createElement('input');
      si.type='text';si.className='csel-search';si.placeholder='ค้นหา...';si.autocomplete='off';
      sw.appendChild(si);
      sw.addEventListener('click',e=>e.stopPropagation());
      si.addEventListener('click',e=>e.stopPropagation());
      si.addEventListener('input',()=>{
        const q=si.value.toLowerCase().trim();
        let found=0;
        opts.querySelectorAll('.csel-option').forEach(btn=>{
          const match=!q||btn.dataset.label.toLowerCase().includes(q);
          btn.style.display=match?'':'none';
          if(match)found++;
        });
        let nr=opts.querySelector('.csel-no-result');
        if(!found){
          if(!nr){nr=document.createElement('div');nr.className='csel-no-result';nr.textContent='ไม่พบผลลัพธ์';opts.appendChild(nr);}
          nr.style.display='';
        }else if(nr){nr.style.display='none';}
      });
      list.appendChild(sw);
    }
    list.appendChild(opts);
    const addLi=(val,label)=>{
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='csel-option';
      btn.dataset.val=String(val);
      btn.dataset.label=label;
      btn.textContent=label;
      btn.addEventListener('click',()=>cselPick(id,val,label));
      opts.appendChild(btn);
    };
    if(isObj)arr.forEach(a=>addLi(a.v,a.l));
    else arr.forEach(v=>addLi(v,v));
    // Also populate native select overlay (used on touch devices)
    const nat=document.getElementById('cselm-'+id);
    if(nat){
      nat.innerHTML=`<option value="">${placeholder}</option>`;
      if(isObj)arr.forEach(a=>{const o=document.createElement('option');o.value=String(a.v);o.textContent=a.l;nat.appendChild(o);});
      else arr.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;nat.appendChild(o);});
    }
  }
}
function cselResetSearch(list){
  const si=list.querySelector('.csel-search');if(!si)return;
  si.value='';
  list.querySelectorAll('.csel-option').forEach(btn=>btn.style.display='');
  const nr=list.querySelector('.csel-no-result');if(nr)nr.style.display='none';
}
function cselCloseList(x){
  cselResetSearch(x);
  x.classList.remove('open','csel-desktop');
  x.style.cssText='';
  if(x._onOutside){document.removeEventListener('touchstart',x._onOutside);x._onOutside=null;}
}
function cselNativePick(id,sel){
  const val=sel.value;
  const lbl=val?sel.options[sel.selectedIndex].textContent:'';
  const input=document.getElementById(id);
  const btn=document.getElementById('cselb-'+id);
  if(input)input.value=val;
  if(btn){
    const span=btn.querySelector('.csel-btn-txt');
    if(val&&lbl){if(span)span.textContent=lbl;btn.dataset.empty='';}
    else{btn.dataset.empty='1';}
  }
}
function cselToggle(id){
  const isTouch='ontouchstart' in window;
  const isLine=/Line\//.test(navigator.userAgent);
  if(isTouch&&!isLine)return; // regular touch: native select overlay handles it
  const list=document.getElementById('csell-'+id);
  const btn=document.getElementById('cselb-'+id);
  if(!list||!btn)return;
  const wasOpen=list.classList.contains('open');
  document.querySelectorAll('.csel-list.open').forEach(x=>cselCloseList(x));
  if(!wasOpen){
    if(isTouch){
      // Line WebView: inline expansion inside modal (no fixed — avoids WebView stacking bugs)
      list.style.maxHeight='none'; // let modal scroll handle overflow
      list.classList.add('open');
      const onOutside=(e)=>{
        if(!list.contains(e.target)&&!btn.contains(e.target))
          document.querySelectorAll('.csel-list.open').forEach(x=>cselCloseList(x));
      };
      setTimeout(()=>document.addEventListener('touchstart',onOutside,{passive:true}),200);
      list._onOutside=onOutside;
    }else{
      // Desktop: floating near button (position:fixed set via JS only, never CSS)
      const r=btn.getBoundingClientRect();
      const below=window.innerHeight-r.bottom;
      const above=r.top;
      list.style.position='fixed';
      list.style.zIndex='9999';
      list.style.left=r.left+'px';
      list.style.width=r.width+'px';
      list.style.maxHeight=Math.min(260,Math.max(below,above)-8)+'px';
      if(below>=120||below>=above){list.style.top=(r.bottom+2)+'px';list.style.bottom='auto';}
      else{list.style.top='auto';list.style.bottom=(window.innerHeight-r.top+2)+'px';}
      list.classList.add('open','csel-desktop');
    }
  }
}
function cselPick(id,val,label){
  const input=document.getElementById(id);
  const btn=document.getElementById('cselb-'+id);
  const list=document.getElementById('csell-'+id);
  if(input)input.value=val;
  if(btn){
    const span=btn.querySelector('.csel-btn-txt');
    if(span)span.textContent=label;else btn.firstChild.textContent=label;
    btn.dataset.empty='';
  }
  if(list){
    list.querySelectorAll('.csel-selected').forEach(el=>el.classList.remove('csel-selected'));
    list.querySelectorAll('.csel-option').forEach(li=>{
      if(li.dataset.val===String(val))li.classList.add('csel-selected');
    });
    cselCloseList(list);
  }
}
function cselSetVal(id,val,placeholder){
  const input=document.getElementById(id);
  const btn=document.getElementById('cselb-'+id);
  if(!input)return;
  if(input.tagName==='SELECT'){input.value=val;return;}
  input.value=val;
  if(btn){
    const span=btn.querySelector('.csel-btn-txt');
    const txt=val||placeholder||'เลือก...';
    if(span)span.textContent=txt;else btn.firstChild.textContent=txt;
    btn.dataset.empty=val?'':'1';
  }
  // Sync native select value
  const nat=document.getElementById('cselm-'+id);
  if(nat)nat.value=val||'';
}
document.addEventListener('click',e=>{
  if(!e.target.closest('.csel-wrap')&&!e.target.closest('.csel-list')&&!e.target.closest('.csel-backdrop'))
    document.querySelectorAll('.csel-list.open').forEach(x=>cselCloseList(x));
});
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
  const surveyUrl=`${location.origin}${location.pathname.replace(/[^\/]*$/,'survey.html')}?site=${code}`;
  const rowId=ghost?`ghost-${code}`:`loc-row-${id}`;
  return `
  <div class="master-item" id="${rowId}" style="flex-direction:column;align-items:stretch;gap:8px;padding:12px 14px;${ghost?'border-style:dashed;opacity:.85;':''}">
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <code style="background:var(--bg);padding:2px 8px;border-radius:6px;font-size:12px;color:var(--primary);border:1px solid var(--border);white-space:nowrap;">${code}</code>
      <span style="font-weight:600;font-size:14px;">${name}</span>
      ${code===currentSite?'<span style="font-size:11px;background:var(--success-light);color:var(--success);padding:1px 7px;border-radius:20px;font-weight:600;">สาขาปัจจุบัน</span>':''}
      ${ghost?'<span style="font-size:11px;background:#fef3c7;color:#92400e;padding:1px 7px;border-radius:20px;font-weight:600;">ยังไม่ได้ลงทะเบียน</span>':''}
      <div style="margin-left:auto;display:flex;gap:4px;flex-wrap:wrap;">
        <a href="${surveyUrl}" target="_blank" class="btn btn-sm" title="เปิดแบบประเมินสาขานี้" style="background:#ede9fe;color:#5b21b6;border:1px solid #c4b5fd;gap:5px;white-space:nowrap;"><i class="ti ti-clipboard-check"></i>แบบประเมิน</a>
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
function _roleChip(role){
  const r=role||'admin';
  if(r==='superadmin')return`<span style="font-size:11px;background:#e8f0fb;color:#1a56a0;padding:1px 8px;border-radius:20px;font-weight:600;">${r}</span>`;
  if(r==='admin')return`<span style="font-size:11px;background:#ede9fe;color:#5b21b6;padding:1px 8px;border-radius:20px;font-weight:600;">${r}</span>`;
  return`<span style="font-size:11px;background:#f1f5f9;color:#475569;padding:1px 8px;border-radius:20px;font-weight:600;">${r}</span>`;
}
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
        <div>
          <div style="font-weight:600;font-size:14px;">${u.name||u.username}</div>
          ${u.name?`<div style="font-size:12px;color:var(--text-muted);">@${u.username}</div>`:''}
        </div>
        ${_roleChip(u.role)}
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
  const roleOpts=Object.keys(adminRolePermissions).map(r=>`<option value="${r}"${(user.role||'admin')===r?' selected':''}>${r}</option>`).join('');
  el.innerHTML=`
    <div style="display:flex;gap:6px;flex:1;align-items:center;flex-wrap:wrap;">
      <input class="form-control" id="au-inp-name-${id}" value="${(user.name||'').replace(/"/g,'&quot;')}" placeholder="ชื่อ-นามสกุล"
        style="width:160px;height:32px;font-size:13px;">
      <input class="form-control" id="au-inp-user-${id}" value="${user.username}" placeholder="username"
        style="width:120px;height:32px;font-size:13px;">
      <input class="form-control" type="password" id="au-inp-pass-${id}" placeholder="รหัสผ่านใหม่ (เว้นว่าง=คงเดิม)"
        style="flex:1;min-width:130px;height:32px;font-size:13px;"
        onkeydown="if(event.key==='Enter')saveAdminUserInline(${id});if(event.key==='Escape')renderAdminUsers();">
      <select class="form-control" id="au-inp-role-${id}" style="width:120px;height:32px;font-size:13px;">${roleOpts}</select>
    </div>
    <div style="display:flex;gap:4px;">
      <button class="btn btn-success btn-sm" onclick="saveAdminUserInline(${id})"><i class="ti ti-check"></i></button>
      <button class="btn btn-ghost btn-sm" onclick="renderAdminUsers()"><i class="ti ti-x"></i></button>
    </div>`;
  document.getElementById(`au-inp-name-${id}`).focus();
}
async function saveAdminUserInline(id){
  const name=document.getElementById(`au-inp-name-${id}`)?.value.trim()||'';
  const username=document.getElementById(`au-inp-user-${id}`).value.trim();
  const newPass=document.getElementById(`au-inp-pass-${id}`).value;
  const newRole=document.getElementById(`au-inp-role-${id}`)?.value||'admin';
  if(!username){showToast('กรุณาระบุชื่อผู้ใช้ (Login)','danger');return;}
  if(adminUsers.find(a=>a.username===username&&a.id!==id)){showToast('ชื่อผู้ใช้นี้มีอยู่แล้ว','danger');return;}
  const user=adminUsers.find(u=>u.id===id);
  if(user?.role==='superadmin'&&newRole!=='superadmin'){
    if(adminUsers.filter(u=>u.role==='superadmin').length<=1){
      showToast('ต้องมี Superadmin อย่างน้อย 1 คน','danger');return;
    }
  }
  const payload={name,username,role:newRole};
  if(newPass)payload.password=newPass;
  const {error}=await _sb.from('admin_users').update(payload).eq('id',id);
  if(error){showToast('บันทึกไม่สำเร็จ','danger');return;}
  if(user){user.name=name;user.username=username;user.role=newRole;}
  if(currentAdminUser?.id===id){currentAdminUser.name=name;currentAdminUser.username=username;currentAdminUser.role=newRole;}
  renderAdminUsers();showToast('แก้ไขผู้ใช้งานสำเร็จ','success');
}
async function addAdminUser(){
  const nEl=document.getElementById('new-au-name');
  const uEl=document.getElementById('new-au-username');
  const pEl=document.getElementById('new-au-password');
  const rEl=document.getElementById('new-au-role');
  const name=nEl?.value.trim()||'';
  const username=uEl.value.trim();
  const password=pEl.value;
  const role=rEl?.value||'admin';
  if(!username||!password){showToast('กรุณาระบุชื่อผู้ใช้และรหัสผ่าน','danger');return;}
  if(adminUsers.find(a=>a.username===username)){showToast('ชื่อผู้ใช้นี้มีอยู่แล้ว','danger');return;}
  const {data,error}=await _sb.from('admin_users').insert({name,username,password,role}).select('id,username,name,role,created_at').single();
  if(error){showToast('บันทึกไม่สำเร็จ','danger');return;}
  adminUsers.push(data);
  if(nEl)nEl.value='';uEl.value='';pEl.value='';
  renderAdminUsers();showToast(`เพิ่มผู้ใช้ "${name||username}" (${role}) สำเร็จ`,'success');
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

/* ══════════════════ ROLE PERMISSIONS ══════════════════ */
function getMyAllowedTabs(){
  if(!currentAdminUser)return ADMIN_TABS.map(t=>t.id);
  if(currentAdminUser.role==='superadmin')return ADMIN_TABS.map(t=>t.id);
  return (adminRolePermissions[currentAdminUser.role]||[]).filter(p=>!p.startsWith('action:'));
}
function hasAdminAction(actionId){
  if(!currentAdminUser)return true;
  if(currentAdminUser.role==='superadmin')return true;
  return (adminRolePermissions[currentAdminUser.role]||[]).includes(actionId);
}

function _applyAdminTabVisibility(){
  const allowed=new Set(getMyAllowedTabs());
  let firstAllowed=null;
  let activeIsHidden=false;
  document.querySelectorAll('.admin-tab[data-tab]').forEach(btn=>{
    const tab=btn.dataset.tab;
    const show=allowed.has(tab);
    btn.style.display=show?'':'none';
    if(show&&!firstAllowed)firstAllowed=tab;
    if(btn.classList.contains('active')&&!show)activeIsHidden=true;
  });
  // apply action button visibility
  ADMIN_ACTIONS.forEach(a=>{
    const el=document.getElementById(a.btnId);
    if(el)el.style.display=hasAdminAction(a.id)?'':'none';
  });
  if(activeIsHidden&&firstAllowed)switchAdminTab(firstAllowed);
}

function renderAdminPermissions(){
  const el=document.getElementById('admin-permissions-content');
  if(!el)return;
  if(currentAdminUser?.role!=='superadmin'){
    el.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-muted);">เฉพาะ superadmin เท่านั้น</div>';
    return;
  }
  const roles=Object.keys(adminRolePermissions);
  const nTabs=ADMIN_TABS.length;
  const nActs=ADMIN_ACTIONS.length;

  // header row 1: group labels
  const grpHeader=`<tr>
    <th rowspan="2" style="white-space:nowrap;vertical-align:middle;">Role</th>
    <th colspan="${nTabs}" style="text-align:center;background:#e8f0fb;color:#1a56a0;font-size:12px;border-bottom:none;">แถบเมนู</th>
    <th colspan="${nActs}" style="text-align:center;background:#fee2e2;color:#991b1b;font-size:12px;border-bottom:none;">การกระทำพิเศษ</th>
    <th rowspan="2"></th>
  </tr>`;

  // header row 2: individual column labels
  const tabCols=ADMIN_TABS.map(t=>`<th style="white-space:pre;font-size:11px;padding:5px 7px;background:#f0f4ff;">${t.label}</th>`).join('');
  const actCols=ADMIN_ACTIONS.map(a=>`<th style="white-space:pre;font-size:11px;padding:5px 7px;background:#fff0f0;">${a.label}</th>`).join('');

  const rows=roles.map(role=>{
    const isSup=role==='superadmin';
    const perms=new Set(isSup?[...ADMIN_TABS.map(t=>t.id),...ADMIN_ACTIONS.map(a=>a.id)]:(adminRolePermissions[role]||[]));
    const tabCells=ADMIN_TABS.map(t=>{
      const chk=perms.has(t.id)?'checked':'';
      const dis=isSup?'disabled':'';
      return`<td style="text-align:center;background:#f8faff;"><input type="checkbox" data-role="${role}" data-tab="${t.id}" ${chk} ${dis} onchange="_onPermChange(this)" style="width:16px;height:16px;cursor:${isSup?'default':'pointer'};"></td>`;
    }).join('');
    const actCells=ADMIN_ACTIONS.map(a=>{
      const chk=perms.has(a.id)?'checked':'';
      const dis=isSup?'disabled':'';
      return`<td style="text-align:center;background:#fff8f8;"><input type="checkbox" data-role="${role}" data-tab="${a.id}" ${chk} ${dis} onchange="_onPermChange(this)" style="width:16px;height:16px;cursor:${isSup?'default':'pointer'};"></td>`;
    }).join('');
    const badge=isSup?'<span style="font-size:10px;background:#e8f0fb;color:#1a56a0;padding:1px 6px;border-radius:10px;margin-left:6px;font-weight:600;">ระบบ</span>':'';
    const del=isSup?'':`<button class="btn btn-danger btn-sm" onclick="deletePermissionRole('${role}')"><i class="ti ti-trash"></i></button>`;
    return`<tr><td style="font-weight:600;white-space:nowrap;padding:8px 12px;">${role}${badge}</td>${tabCells}${actCells}<td>${del}</td></tr>`;
  }).join('');

  el.innerHTML=`
    <div class="table-wrap" style="margin-bottom:16px;overflow-x:auto;">
      <table><thead>${grpHeader}<tr>${tabCols}${actCols}</tr></thead><tbody>${rows}</tbody></table>
    </div>
    <div style="background:var(--bg-subtle);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:16px;">
      <div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:10px;">เพิ่ม Role ใหม่</div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <input class="form-control" id="new-role-name" placeholder="ชื่อ role เช่น manager, staff..." style="flex:1;max-width:260px;" onkeydown="if(event.key==='Enter')addPermissionRole()">
        <button class="btn btn-primary btn-sm" onclick="addPermissionRole()"><i class="ti ti-plus"></i>เพิ่ม Role</button>
      </div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      <button class="btn btn-success" onclick="saveAdminRolePermissions()"><i class="ti ti-device-floppy"></i>บันทึกสิทธิ์</button>
      <span style="font-size:12px;color:var(--text-muted);">กด "บันทึกสิทธิ์" หลังแก้ไขเช็คบ็อกซ์</span>
    </div>`;
  // re-populate role select in user add form
  const rEl=document.getElementById('new-au-role');
  if(rEl)rEl.innerHTML=roles.map(r=>`<option value="${r}">${r}</option>`).join('');
}

function _onPermChange(cb){
  const role=cb.dataset.role;
  const tab=cb.dataset.tab;
  if(!adminRolePermissions[role])adminRolePermissions[role]=[];
  if(cb.checked){if(!adminRolePermissions[role].includes(tab))adminRolePermissions[role].push(tab);}
  else{adminRolePermissions[role]=adminRolePermissions[role].filter(t=>t!==tab);}
}

async function saveAdminRolePermissions(){
  // superadmin always gets all tabs + all actions
  adminRolePermissions.superadmin=[...ADMIN_TABS.map(t=>t.id),...ADMIN_ACTIONS.map(a=>a.id)];
  const {error}=await _sb.from('settings').upsert({key:'admin_role_permissions',value:JSON.stringify(adminRolePermissions),updated_at:new Date().toISOString()});
  if(error){showToast('บันทึกไม่สำเร็จ: '+error.message,'danger');return;}
  showToast('บันทึกสิทธิ์สำเร็จ','success');
  _applyAdminTabVisibility();
  renderAdminPermissions();
}

function addPermissionRole(){
  const inp=document.getElementById('new-role-name');
  const name=(inp?.value||'').trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
  if(!name){showToast('กรุณาระบุชื่อ role (a-z, 0-9, _)','danger');return;}
  if(adminRolePermissions[name]){showToast('Role นี้มีอยู่แล้ว','danger');return;}
  adminRolePermissions[name]=[];
  if(inp)inp.value='';
  renderAdminPermissions();
}

async function deletePermissionRole(role){
  if(role==='superadmin')return;
  if(!await showConfirm(`ลบ Role "${role}"?`,'ผู้ใช้งานที่มี Role นี้จะถูกเปลี่ยนเป็น admin อัตโนมัติ',{okLabel:'ลบ'}))return;
  delete adminRolePermissions[role];
  const affected=adminUsers.filter(u=>u.role===role);
  if(affected.length){
    await Promise.all(affected.map(u=>_sb.from('admin_users').update({role:'admin'}).eq('id',u.id)));
    affected.forEach(u=>u.role='admin');
  }
  await saveAdminRolePermissions();
  renderAdminUsers();
}

/* ══════════════════ ADMIN SETTINGS ══════════════════ */
function renderAdminSettings(){
  const el=document.getElementById('admin-settings-content');
  if(!el)return;
  const rows=locations.map(loc=>{
    const isCurrent=loc.code===currentSite;
    const token=siteNotifyTokens[loc.code]||'';
    return`<tr${isCurrent?' style="background:var(--bg-subtle);"':''}>
      <td style="font-weight:600;white-space:nowrap;">
        ${loc.name}
        <div style="font-size:11px;color:var(--text-muted);">@${loc.code}</div>
        ${isCurrent?'<span style="font-size:10px;background:#dcfce7;color:#166534;padding:1px 7px;border-radius:10px;font-weight:600;">สาขาปัจจุบัน</span>':''}
      </td>
      <td>
        <div style="display:flex;gap:6px;align-items:center;">
          <input class="form-control" id="notify-token-${loc.code}"
            value="${token.replace(/"/g,'&quot;')}"
            placeholder="วาง Token ที่นี่..."
            style="flex:1;font-size:13px;font-family:monospace;"
            oninput="siteNotifyTokens['${loc.code}']=this.value.trim()">
          <button class="btn btn-ghost btn-sm" onclick="testNotifyToken('${loc.code}')" title="ทดสอบการแจ้งเตือน" style="white-space:nowrap;">
            <i class="ti ti-send"></i> ทดสอบ
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');

  el.innerHTML=`
    <div style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
      กำหนด Token สำหรับระบบแจ้งเตือนการลงทะเบียนแต่ละสาขา
      (<a href="https://api-notify.bmscloud.in.th" target="_blank" style="color:var(--primary);">api-notify.bmscloud.in.th</a>)
    </div>
    <div class="table-wrap" style="margin-bottom:16px;">
      <table>
        <thead><tr><th style="white-space:nowrap;">สาขา</th><th>Token แจ้งเตือน</th></tr></thead>
        <tbody>${rows||'<tr><td colspan="2" style="text-align:center;color:var(--text-muted);">ยังไม่มีสาขา</td></tr>'}</tbody>
      </table>
    </div>
    <div style="display:flex;gap:8px;align-items:center;">
      <button class="btn btn-success" onclick="saveAdminSettings()"><i class="ti ti-device-floppy"></i>บันทึกการตั้งค่า</button>
      <span style="font-size:12px;color:var(--text-muted);">บันทึกแล้วมีผลทันทีสำหรับทุกสาขา</span>
    </div>`;
}

async function saveAdminSettings(){
  // sync tokens from inputs before save
  locations.forEach(loc=>{
    const el=document.getElementById(`notify-token-${loc.code}`);
    if(el)siteNotifyTokens[loc.code]=el.value.trim();
  });
  // remove empty tokens
  Object.keys(siteNotifyTokens).forEach(k=>{if(!siteNotifyTokens[k])delete siteNotifyTokens[k];});
  const {error}=await _sb.from('settings').upsert({key:'site_notify_tokens',value:JSON.stringify(siteNotifyTokens),updated_at:new Date().toISOString()});
  if(error){showToast('บันทึกไม่สำเร็จ: '+error.message,'danger');return;}
  showToast('บันทึกการตั้งค่าสำเร็จ','success');
}

async function testNotifyToken(siteCode){
  const el=document.getElementById(`notify-token-${siteCode}`);
  const token=(el?.value.trim())||siteNotifyTokens[siteCode]||'';
  if(!token){showToast('กรุณาระบุ Token ก่อน','warn');return;}
  const loc=locations.find(l=>l.code===siteCode);
  try{
    const res=await fetch('https://api-notify.bmscloud.in.th/api/v1/push-notify',{
      method:'POST',
      headers:{'Token':token,'Content-Type':'application/json'},
      body:JSON.stringify({content:`🔔 ทดสอบการแจ้งเตือน\n🏢 สาขา: ${loc?.name||siteCode}`,receiver:null})
    });
    if(res.ok)showToast('ส่งทดสอบสำเร็จ — ตรวจสอบ Line ของคุณ','success');
    else showToast('ส่งไม่สำเร็จ (status '+res.status+')','danger');
  }catch(e){showToast('เชื่อมต่อไม่ได้: '+e.message,'danger');}
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

/* ══ KEY ENTRY STATUS (ตรวจสอบคีย์ยอด) — รายแผนกของสาขาที่ล็อกอินอยู่ ══ */
async function loadKeyEntryStatus(){
  const {data,error}=await _sb.from('key_entry_status').select('*').eq('site',currentSite);
  if(error){showToast('โหลดข้อมูลคีย์ยอดไม่สำเร็จ: '+error.message,'danger');return;}
  keyEntryData=data||[];
  renderKeyEntry();
}
function filterKeyEntry(){
  keSearchTxt=(document.getElementById('ke-search')?.value||'').toLowerCase();
  renderKeyEntry();
}
function renderKeyEntry(){
  const tbody=document.getElementById('ke-tbody');if(!tbody)return;
  let rows=departments.map(dept=>{
    const k=keyEntryData.find(x=>x.dept===dept);
    return{dept,status:k?.status||'not_keyed',keyed_at:k?.keyed_at||null,reason:k?.reason||''};
  });
  const total=rows.length;
  const keyed=rows.filter(r=>r.status==='keyed').length;
  const notKeyed=total-keyed;
  const pct=total?Math.round(keyed/total*100):0;
  const setTxt=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  setTxt('ke-stat-total',total);
  setTxt('ke-stat-keyed',keyed);
  setTxt('ke-stat-notkeyed',notKeyed);
  setTxt('ke-stat-pct',pct+'%');
  const bar=document.getElementById('ke-progress-bar');if(bar)bar.style.width=pct+'%';

  if(keSearchTxt)rows=rows.filter(r=>r.dept.toLowerCase().includes(keSearchTxt));
  if(!rows.length){
    tbody.innerHTML='<tr><td colspan="4"><div class="empty"><i class="ti ti-building-off"></i><p>ไม่พบแผนก กรุณาเพิ่มในเมนู "ข้อมูลพื้นฐาน"</p></div></td></tr>';
    return;
  }
  tbody.innerHTML=rows.map(r=>{
    const ek=encodeURIComponent(r.dept);
    const isKeyed=r.status==='keyed';
    const dt=r.keyed_at?new Date(r.keyed_at).toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'}):'-';
    return`<tr>
      <td data-label="แผนก" style="font-weight:600;">${r.dept}</td>
      <td data-label="สถานะ">
        <select class="form-control ke-select" data-ke-dept="${ek}"
          onchange="_keOnStatusChange(decodeURIComponent(this.dataset.keDept),this.value)"
          style="font-weight:600;${isKeyed?'background:var(--success-light);color:#065f46;':'background:var(--warn-light);color:#9a3412;'}">
          <option value="not_keyed"${!isKeyed?' selected':''}>ยังไม่คีย์</option>
          <option value="keyed"${isKeyed?' selected':''}>คีย์ยอดแล้ว</option>
        </select>
      </td>
      <td data-label="วันที่/เวลาคีย์ยอด" style="font-size:13px;color:${isKeyed?'var(--text)':'var(--text-muted)'};">${dt}</td>
      <td data-label="สาเหตุที่ยังไม่คีย์">
        <input class="form-control ke-input" data-ke-dept="${ek}" value="${(r.reason+'').replace(/"/g,'&quot;')}"
          placeholder="${isKeyed?'-':'ระบุสาเหตุ...'}" ${isKeyed?'disabled':''}
          oninput="_keOnReasonInput(decodeURIComponent(this.dataset.keDept),this.value)">
      </td>
    </tr>`;
  }).join('');
}
async function _keUpsert(payload){
  const {data,error}=await _sb.from('key_entry_status').upsert(payload,{onConflict:'dept,site'}).select().single();
  if(error){showToast('บันทึกไม่สำเร็จ: '+error.message,'danger');return null;}
  const idx=keyEntryData.findIndex(k=>k.dept===data.dept&&k.site===data.site);
  if(idx>=0)keyEntryData[idx]=data;else keyEntryData.push(data);
  return data;
}
async function _keOnStatusChange(dept,status){
  const existing=keyEntryData.find(k=>k.dept===dept);
  const payload={
    dept,
    site:currentSite,
    status,
    keyed_at: status==='keyed' ? new Date().toISOString() : null,
    reason: status==='keyed' ? '' : (existing?.reason||''),
    updated_at: new Date().toISOString(),
  };
  const saved=await _keUpsert(payload);
  renderKeyEntry();
  if(saved)showToast(status==='keyed'?'บันทึกสถานะคีย์ยอดแล้ว':'อัปเดตสถานะแล้ว','success');
}
function _keOnReasonInput(dept,value){
  clearTimeout(_keReasonTimers[dept]);
  _keReasonTimers[dept]=setTimeout(async()=>{
    const existing=keyEntryData.find(k=>k.dept===dept);
    await _keUpsert({
      dept,
      site:currentSite,
      status:existing?.status||'not_keyed',
      keyed_at:existing?.keyed_at||null,
      reason:value,
      updated_at:new Date().toISOString(),
    });
  },600);
}
async function saveKeyEntryImage(){
  if(typeof html2canvas==='undefined'){showToast('ไม่พบ html2canvas library','danger');return;}
  const total=departments.length;
  const keyedDepts=departments.filter(d=>keyEntryData.find(k=>k.dept===d)?.status==='keyed');
  const notKeyedDepts=departments.filter(d=>keyEntryData.find(k=>k.dept===d)?.status!=='keyed');
  const keyed=keyedDepts.length;
  const notKeyed=notKeyedDepts.length;
  const pct=total?Math.round(keyed/total*100):0;
  const today=new Date().toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric'});
  const loc=locations.find(l=>l.code===currentSite);
  const siteLabel=loc?loc.name:currentSite;

  // สรุปรายวัน: จำนวนแผนกที่คีย์ยอดในแต่ละวัน (เรียงตามวันที่)
  const _localKey=dt=>`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  const dailyMap={};
  keyedDepts.forEach(d=>{
    const k=keyEntryData.find(x=>x.dept===d);
    if(!k?.keyed_at)return;
    const dt=new Date(k.keyed_at);
    const key=_localKey(dt);
    if(!dailyMap[key])dailyMap[key]={label:dt.toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'}),count:0};
    dailyMap[key].count++;
  });
  const dailyRows=Object.keys(dailyMap).sort().map(k=>dailyMap[k]);

  // แผนกที่ยังไม่คีย์ยอด แยกเป็น "ไม่มีสาเหตุ" กับ "มีสาเหตุ"
  const noReasonDepts=[];
  const hasReasonDepts=[];
  notKeyedDepts.forEach(d=>{
    const reason=(keyEntryData.find(x=>x.dept===d)?.reason||'').trim();
    if(reason)hasReasonDepts.push({dept:d,reason});
    else noReasonDepts.push(d);
  });

  const wrap=document.createElement('div');
  wrap.style.cssText='position:fixed;left:-9999px;top:0;width:720px;font-family:Anuphan,Sarabun,sans-serif;';
  wrap.innerHTML=`
  <div style="background:linear-gradient(135deg,#0f2d5c 0%,#1a56a0 55%,#0e7490 100%);padding:36px 32px;color:#fff;">
    <div style="font-size:13px;letter-spacing:1px;opacity:.75;text-transform:uppercase;">BMS Training System — ${siteLabel}</div>
    <div style="font-size:24px;font-weight:700;margin-top:6px;">สรุปความคืบหน้าคีย์ยอดตั้งต้น</div>
    <div style="font-size:13px;opacity:.8;margin-top:4px;">ข้อมูล ณ วันที่ ${today}</div>
  </div>
  <div style="background:#fff;padding:28px 32px;">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:22px;">
      <div style="background:#EFF6FF;border-radius:14px;padding:18px;text-align:center;">
        <div style="font-size:32px;font-weight:700;color:#2563EB;">${total}</div>
        <div style="font-size:12px;color:#475569;margin-top:4px;">แผนกทั้งหมด</div>
      </div>
      <div style="background:#ECFDF5;border-radius:14px;padding:18px;text-align:center;">
        <div style="font-size:32px;font-weight:700;color:#059669;">${keyed}</div>
        <div style="font-size:12px;color:#475569;margin-top:4px;">คีย์ยอดแล้ว</div>
      </div>
      <div style="background:#FEF2F2;border-radius:14px;padding:18px;text-align:center;">
        <div style="font-size:32px;font-weight:700;color:#DC2626;">${notKeyed}</div>
        <div style="font-size:12px;color:#475569;margin-top:4px;">ยังไม่คีย์</div>
      </div>
    </div>
    <div style="font-size:13px;font-weight:600;color:#0F172A;margin-bottom:8px;display:flex;justify-content:space-between;">
      <span>ความคืบหน้ารวม</span><span style="color:#059669;">${pct}%</span>
    </div>
    <div style="background:#F1F5F9;border-radius:20px;height:18px;overflow:hidden;">
      <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#10B981,#059669);border-radius:20px;"></div>
    </div>

    <div style="margin-top:26px;">
      <div style="font-size:14px;font-weight:700;color:#0F172A;margin-bottom:10px;">📅 สรุปรายวัน (แผนกที่คีย์ยอดแล้ว)</div>
      ${dailyRows.length?`
      <div style="border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
        ${dailyRows.map((r,i)=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;${i%2?'background:#F8FAFC;':''}${i<dailyRows.length-1?'border-bottom:1px solid #F1F5F9;':''}">
          <span style="font-size:13px;color:#334155;">${r.label}</span>
          <span style="font-size:13px;font-weight:700;color:#059669;">${r.count} แผนก</span>
        </div>`).join('')}
      </div>`:`<div style="font-size:13px;color:#94A3B8;text-align:center;padding:14px;border:1px dashed #E2E8F0;border-radius:12px;">ยังไม่มีแผนกคีย์ยอด</div>`}
    </div>

    <div style="margin-top:22px;">
      <div style="font-size:14px;font-weight:700;color:#0F172A;margin-bottom:10px;">⚠️ แผนกที่ยังไม่คีย์ยอด (${notKeyed} แผนก)</div>
      ${!notKeyedDepts.length?`<div style="font-size:13px;color:#94A3B8;text-align:center;padding:14px;border:1px dashed #E2E8F0;border-radius:12px;">คีย์ยอดครบทุกแผนกแล้ว 🎉</div>`:`
      <div style="font-size:12px;font-weight:700;color:#9A3412;margin:4px 0 8px;">🔸 ยังไม่มีสาเหตุ (${noReasonDepts.length} แผนก)</div>
      ${noReasonDepts.length?`
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${noReasonDepts.map(d=>`<span style="background:#FEF2F2;color:#991B1B;font-size:12px;font-weight:600;padding:6px 12px;border-radius:20px;border:1px solid #FEE2E2;">${d}</span>`).join('')}
      </div>`:`<div style="font-size:12px;color:#94A3B8;padding:2px 0 4px;">- ไม่มี -</div>`}

      <div style="font-size:12px;font-weight:700;color:#9A3412;margin:18px 0 8px;">🔸 มีสาเหตุแล้ว (${hasReasonDepts.length} แผนก)</div>
      ${hasReasonDepts.length?`
      <div style="border:1px solid #FDE68A;border-radius:12px;overflow:hidden;">
        ${hasReasonDepts.map((x,i)=>`
        <div style="padding:10px 14px;${i%2?'background:#FFFBEB;':''}${i<hasReasonDepts.length-1?'border-bottom:1px solid #FEF3C7;':''}">
          <div style="font-size:13px;font-weight:700;color:#0F172A;">${x.dept}</div>
          <div style="font-size:12px;color:#92400E;margin-top:2px;">💬 ${x.reason}</div>
        </div>`).join('')}
      </div>`:`<div style="font-size:12px;color:#94A3B8;padding:2px 0;">- ไม่มี -</div>`}
      `}
    </div>
  </div>
  <div style="background:#0F172A;padding:12px 32px;text-align:center;color:rgba(255,255,255,.5);font-size:11px;">สร้างโดยระบบ BMS Training</div>`;

  document.body.appendChild(wrap);
  showToast('กำลังสร้างภาพ กรุณารอสักครู่...','info');
  try{
    await new Promise(r=>setTimeout(r,300));
    const canvas=await html2canvas(wrap,{scale:3,useCORS:true,backgroundColor:'#ffffff',width:720,logging:false});
    const link=document.createElement('a');
    link.download=`key_entry_summary_${new Date().toISOString().slice(0,10)}.png`;
    link.href=canvas.toDataURL('image/png');
    link.click();
    showToast('บันทึกภาพสำเร็จ','success');
  }catch(e){
    console.error(e);
    showToast('สร้างภาพไม่สำเร็จ','danger');
  }finally{
    document.body.removeChild(wrap);
  }
}

/* ══ ADMIN REGS ══ */
function onAdminCatChange(){
  const cid=parseInt(document.getElementById('admin-reg-filter-cat').value)||0;
  const filtSess=cid?sessions.filter(s=>s.catId===cid):sessions;
  document.getElementById('admin-filter-sess').innerHTML='<option value="">ทุกรอบ</option>'+filtSess.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
  renderAdminRegs();
}
function renderAdminRegs(){
  const q=(document.getElementById('admin-search').value||'').toLowerCase();
  const cid=parseInt(document.getElementById('admin-reg-filter-cat')?.value)||0;
  const sid=document.getElementById('admin-filter-sess').value;
  let regs=registrations.filter(r=>!!getSess(r.sessionId));
  if(q)regs=regs.filter(r=>(r.fname+r.lname+(r.position||'')).toLowerCase().includes(q));
  if(cid)regs=regs.filter(r=>{const s=getSess(r.sessionId);return s&&s.catId===cid;});
  if(sid)regs=regs.filter(r=>r.sessionId==sid);
  const sc=document.getElementById('stat-reg-count'),sa=document.getElementById('stat-att-count');
  if(sc)sc.textContent=regs.length;
  if(sa)sa.textContent=regs.filter(r=>r.attended).length;
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
function openClearRegsBySite(){
  const sel=document.getElementById('clear-site-sel');
  sel.innerHTML='<option value="">— เลือกสาขา —</option>'+
    locations.map(l=>`<option value="${l.code}">${l.name} (${l.code})</option>`).join('');
  document.getElementById('clear-site-preview').style.display='none';
  document.getElementById('clear-site-ok-btn').disabled=true;
  document.getElementById('modal-clear-regs-site').classList.add('open');
}
function updateClearSiteCount(){
  const code=document.getElementById('clear-site-sel').value;
  const preview=document.getElementById('clear-site-preview');
  const btn=document.getElementById('clear-site-ok-btn');
  if(!code){preview.style.display='none';btn.disabled=true;return;}
  const siteSessIds=new Set(allSessionsFull.filter(s=>s.site===code).map(s=>s.id));
  const cnt=registrations.filter(r=>siteSessIds.has(r.sessionId)).length;
  const loc=locations.find(l=>l.code===code);
  const attended=registrations.filter(r=>siteSessIds.has(r.sessionId)&&r.attended).length;
  preview.style.display='block';
  preview.innerHTML=`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:${cnt?'8px':'0'};">
      <i class="ti ti-building" style="color:var(--primary);font-size:15px;"></i>
      <span>สาขา <strong>${loc?loc.name:code}</strong> — <strong style="color:${cnt?'var(--danger)':'var(--text-muted)'};">${cnt} รายการ</strong></span>
    </div>
    ${cnt?`<div style="display:flex;gap:12px;font-size:12px;color:var(--text-muted);padding-left:23px;">
      <span><i class="ti ti-users"></i> ทั้งหมด ${cnt} คน</span>
      <span><i class="ti ti-circle-check" style="color:var(--success);"></i> เช็คชื่อแล้ว ${attended} คน</span>
      <span><i class="ti ti-clock" style="color:var(--warn);"></i> ยังไม่เช็ค ${cnt-attended} คน</span>
    </div>`:'<div style="font-size:12px;color:var(--text-muted);padding-left:23px;">ไม่มีข้อมูลลงทะเบียนในสาขานี้</div>'}`;
  btn.disabled=cnt===0;
}
async function confirmClearRegsBySite(){
  const code=document.getElementById('clear-site-sel').value;
  if(!code)return;
  const loc=locations.find(l=>l.code===code);
  const siteSessIds=new Set(allSessionsFull.filter(s=>s.site===code).map(s=>s.id));
  const cnt=registrations.filter(r=>siteSessIds.has(r.sessionId)).length;
  if(!await showConfirm(`ลบข้อมูลลงทะเบียน ${cnt} รายการ?`,`สาขา: ${loc?loc.name:code}`,{okLabel:`ลบ ${cnt} รายการ`,danger:true}))return;
  const btn=document.getElementById('clear-site-ok-btn');
  btn.disabled=true;btn.innerHTML='<i class="ti ti-loader-2" style="animation:spin .8s linear infinite"></i>กำลังลบ...';
  const sessIds=[...siteSessIds];
  const {error}=await _sb.from('registrations').delete().in('session_id',sessIds);
  btn.disabled=false;btn.innerHTML='<i class="ti ti-trash"></i>ยืนยันลบข้อมูล';
  if(error){showToast('ลบไม่สำเร็จ: '+error.message,'danger');return;}
  registrations=registrations.filter(r=>!siteSessIds.has(r.sessionId));
  closeModal('modal-clear-regs-site');
  renderAdmin();
  showToast(`ลบข้อมูลสาขา "${loc?loc.name:code}" สำเร็จ ${cnt} รายการ`,'success');
}
function openClearSurveyBySite(){
  const sel=document.getElementById('clear-sv-site-sel');
  sel.innerHTML='<option value="">— เลือกสาขา —</option>'+
    locations.map(l=>`<option value="${l.code}">${l.name} (${l.code})</option>`).join('');
  document.getElementById('clear-sv-site-preview').style.display='none';
  document.getElementById('clear-sv-site-ok-btn').disabled=true;
  document.getElementById('modal-clear-survey-site').classList.add('open');
}
async function updateClearSurveySiteCount(){
  const code=document.getElementById('clear-sv-site-sel').value;
  const preview=document.getElementById('clear-sv-site-preview');
  const btn=document.getElementById('clear-sv-site-ok-btn');
  if(!code){preview.style.display='none';btn.disabled=true;return;}
  const loc=locations.find(l=>l.code===code);
  const{count}=await _sb.from('survey_responses').select('id',{count:'exact',head:true}).eq('site',code);
  const cnt=count||0;
  preview.style.display='block';
  preview.innerHTML=`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:${cnt?'8px':'0'};">
      <i class="ti ti-building" style="color:#7c3aed;font-size:15px;"></i>
      <span>สาขา <strong>${loc?loc.name:code}</strong> — <strong style="color:${cnt?'var(--danger)':'var(--text-muted)'};">${cnt} รายการ</strong></span>
    </div>
    ${cnt?`<div style="font-size:12px;color:var(--text-muted);padding-left:23px;">
      <i class="ti ti-clipboard-check"></i> แบบประเมินที่จะถูกลบ ${cnt} รายการ
    </div>`:'<div style="font-size:12px;color:var(--text-muted);padding-left:23px;">ไม่มีข้อมูลแบบประเมินในสาขานี้</div>'}`;
  btn.disabled=cnt===0;
}
async function confirmClearSurveyBySite(){
  const code=document.getElementById('clear-sv-site-sel').value;
  if(!code)return;
  const loc=locations.find(l=>l.code===code);
  const{count}=await _sb.from('survey_responses').select('id',{count:'exact',head:true}).eq('site',code);
  const cnt=count||0;
  if(!await showConfirm(`ลบข้อมูลแบบประเมิน ${cnt} รายการ?`,`สาขา: ${loc?loc.name:code}`,{okLabel:`ลบ ${cnt} รายการ`,danger:true}))return;
  const btn=document.getElementById('clear-sv-site-ok-btn');
  btn.disabled=true;btn.innerHTML='<i class="ti ti-loader-2" style="animation:spin .8s linear infinite"></i>กำลังลบ...';
  const{error}=await _sb.from('survey_responses').delete().eq('site',code);
  btn.disabled=false;btn.innerHTML='<i class="ti ti-trash"></i>ยืนยันลบข้อมูล';
  if(error){showToast('ลบไม่สำเร็จ: '+error.message,'danger');return;}
  closeModal('modal-clear-survey-site');
  // Refresh survey dashboard if on same site
  const svSiteEl=document.getElementById('svd-site');
  if(svSiteEl&&svSiteEl.value===code){_svData=[];renderSurveyCharts();}
  showToast(`ลบข้อมูลแบบประเมินสาขา "${loc?loc.name:code}" สำเร็จ ${cnt} รายการ`,'success');
}
function adminAddReg(){
  ['ar-fname','ar-lname','ar-pos'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('ar-sess').innerHTML=sessions.map(ss=>{
    const cnt=getCount(ss.id),cat=getCat(ss.catId);
    const full=cnt>=ss.capacity;
    return`<option value="${ss.id}"${full?' disabled':''}>${cat?cat.name+' — ':''}${ss.name} (${fmtDateShort(ss.date)})${full?' [เต็ม]':' ว่าง '+(ss.capacity-cnt)+' ที่'}</option>`;
  }).join('');
  populateSelect('ar-prefix',prefixes,'คำนำหน้า...');
  populateSelect('ar-dept',departments,'เลือกแผนก...');
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
  document.getElementById('edit-fname').value=reg.fname;
  document.getElementById('edit-lname').value=reg.lname;
  document.getElementById('edit-pos').value=reg.position||'';
  document.getElementById('edit-sess').innerHTML=sessions.map(ss=>{
    const cnt=getCount(ss.id),isCur=ss.id===reg.sessionId,cat=getCat(ss.catId);
    const isFull=!isCur&&cnt>=ss.capacity;
    return`<option value="${ss.id}"${isCur?' selected':''}${isFull?' disabled':''}>${cat?cat.name+' — ':''}${ss.name} — ${fmtDateShort(ss.date)}${isCur?' (ปัจจุบัน)':isFull?' [เต็ม]':' (ว่าง '+(ss.capacity-cnt)+' ที่)'}</option>`;
  }).join('');
  document.getElementById('edit-deadline-txt').textContent='Admin — แก้ไขได้ไม่จำกัดเงื่อนไข';
  populateSelect('edit-prefix',prefixes,'คำนำหน้า...');
  populateSelect('edit-dept',departments,'เลือกแผนก...');
  document.getElementById('modal-edit-reg').classList.add('open');
  cselSetVal('edit-prefix',reg.prefix||'','คำนำหน้า...');
  cselSetVal('edit-dept',reg.dept||'','เลือกแผนก...');
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
  document.getElementById('edit-fname').value=reg.fname;
  document.getElementById('edit-lname').value=reg.lname;
  document.getElementById('edit-pos').value=reg.position||'';
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
  populateSelect('edit-prefix',prefixes,'คำนำหน้า...');
  populateSelect('edit-dept',departments,'เลือกแผนก...');
  document.getElementById('modal-edit-reg').classList.add('open');
  cselSetVal('edit-prefix',reg.prefix||'','คำนำหน้า...');
  cselSetVal('edit-dept',reg.dept||'','เลือกแผนก...');
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
function showAlert(msg,subMsg='',icon='<i class="ti ti-alert-circle" style="color:var(--danger)"></i>'){
  return new Promise(resolve=>{
    document.getElementById('confirm-msg').textContent=msg;
    const sub=document.getElementById('confirm-sub');
    sub.textContent=subMsg;sub.style.display=subMsg?'block':'none';
    document.getElementById('confirm-icon').innerHTML=icon;
    const okBtn=document.getElementById('confirm-ok-btn');
    okBtn.className='btn btn-primary';
    okBtn.innerHTML='<i class="ti ti-check"></i>รับทราบ';
    const cancelBtn=document.getElementById('confirm-cancel-btn');
    cancelBtn.style.display='none';
    document.getElementById('modal-confirm').classList.add('open');
    okBtn.onclick=()=>{cancelBtn.style.display='';closeModal('modal-confirm');resolve();};
  });
}
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
  o.addEventListener('click',function(e){
    if('ontouchstart' in window)return; // touch: use explicit close button only
    if(e.target===this)this.classList.remove('open');
  });
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
  // Auto-fill hospital fields from current branch
  const curLoc=locations.find(l=>l.code===currentSite);
  if(curLoc){
    document.getElementById('pf-hospital').value=curLoc.name;
    const sigOrg=document.getElementById('pf-signer-org');
    if(sigOrg) sigOrg.value=curLoc.name;
  }
  _loadPrintFormSignatories();
  document.getElementById('modal-print-form').classList.add('open');
}
const PF_SIG_FIELDS=['pf-bms-name','pf-bms-pos','pf-bms-org','pf-signer-name','pf-signer-pos'];
async function _loadPrintFormSignatories(){
  try{
    const keys=PF_SIG_FIELDS.map(id=>`${id}_${currentSite}`);
    const {data}=await _sb.from('settings').select('key,value').in('key',keys);
    const map=Object.fromEntries((data||[]).map(r=>[r.key,r.value]));
    PF_SIG_FIELDS.forEach(id=>{
      const val=map[`${id}_${currentSite}`];
      if(val){const el=document.getElementById(id);if(el)el.value=val;}
    });
  }catch(e){console.error('_loadPrintFormSignatories',e);}
}
async function savePrintFormSignatories(){
  try{
    await Promise.all(PF_SIG_FIELDS.map(id=>
      _savePrintSetting(`${id}_${currentSite}`,(document.getElementById(id)?.value||'').trim())
    ));
    showToast('บันทึกค่าเริ่มต้นผู้ลงนามสำเร็จ (เฉพาะสาขานี้)','success');
  }catch(e){showToast('บันทึกไม่สำเร็จ','danger');}
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
  const totalRows=Math.max(10,Math.min(100,parseInt(document.getElementById('pf-rows').value||25)));
  const regs=registrations.filter(r=>r.sessionId===sid);
  const dateStr=_isoToThaiDate(s.date);
  const timeStr=`${s.timeStart||''}–${s.timeEnd||''} น.`;
  const _logoBase=window.location.href.replace(/[^/]*(\?.*)?$/,'');
  const PAGE_SIZE=25;
  const numPages=Math.ceil(totalRows/PAGE_SIZE);

  const COLS=`<colgroup>
    <col style="width:11mm"><col><col><col><col style="width:36mm">
  </colgroup>`;
  const THEAD=`<thead><tr>
    <th style="width:11mm;">ลำดับ</th><th>ชื่อ – นามสกุล</th><th>ตำแหน่ง</th><th>แผนก</th><th style="width:36mm;">ลายมือชื่อ</th>
  </tr></thead>`;

  // build header HTML (reused on each page)
  const pageHeaderHtml=`
  <div class="page-header">
    <img style="height:18mm;width:auto;display:block;margin-bottom:2mm;" src="${_logoBase}bms-logo.png" onerror="this.style.display='none';">
    <div class="doc-title">ใบเซ็นต์ชื่อผู้เข้าร่วมอบรมการใช้งานโปรแกรม ${_esc(program)}</div>
    <table class="info-tbl">
      <tr>
        <td style="width:55%"><span class="lbl">สถานพยาบาล :</span> ${_esc(hospital)}</td>
        <td><span class="lbl">วันที่ :</span> ${dateStr} เวลา ${timeStr}</td>
      </tr>
      <tr>
        <td><span class="lbl">ระบบงาน :</span> ${_esc(system)}</td>
        <td><span class="lbl">วิทยากร :</span> ${_esc(s.trainer||'—')}</td>
      </tr>
      ${details?`<tr><td colspan="2"><span class="lbl">รายละเอียด :</span> ${_esc(details)}</td></tr>`:''}
    </table>
  </div>
`;

  // build footer HTML per page
  function pageFooterHtml(pn){
    return`<div class="page-footer">
    <div class="sig">
      <div class="sig-blk">
        <div class="sig-line"></div>
        <div class="sig-lbl">(${_esc(bmsName)||'…………………………………………'})</div>
        <div class="sig-lbl">ตำแหน่ง ${_esc(bmsPos)}</div>
        <div class="sig-lbl">${_esc(bmsOrg)}</div>
      </div>
      <div class="sig-blk">
        <div class="sig-line"></div>
        <div class="sig-lbl">(${_esc(signerName)||'…………………………………………'})</div>
        <div class="sig-lbl">ตำแหน่ง ${_esc(signerPos)||'…………………………………'}</div>
        <div class="sig-lbl">${_esc(signerOrg)||'…………………………………………'}</div>
      </div>
    </div>
    ${numPages > 1 ? `<div class="pg-num">หน้า ${pn} / ${numPages}</div>` : ''}
  </div>`;
  }

  // build pages HTML
  let pagesHtml='';
  for(let p=0;p<numPages;p++){
    const start=p*PAGE_SIZE;
    const end=Math.min(start+PAGE_SIZE,totalRows);
    let tbody='';
    for(let i=start;i<end;i++){
      const r=regs[i];
      tbody+=`<tr>
        <td style="text-align:center;width:11mm;">${i+1}</td>
        <td>${r?_esc(`${r.prefix||''}${r.fname||''} ${r.lname||''}`.trim()):''}</td>
        <td>${r?_esc(r.position||''):''}</td>
        <td>${r?_esc(r.dept||''):''}</td>
        <td style="width:36mm;"></td>
      </tr>`;
    }
    pagesHtml+=`<div class="page">
      ${pageHeaderHtml}
      <div class="page-content">
        <table class="doc-tbl">${COLS}${THEAD}<tbody>${tbody}</tbody></table>
      </div>
      ${pageFooterHtml(p+1)}
    </div>`;
  }

  const html=`<!DOCTYPE html><html lang="th"><head>
<meta charset="UTF-8">
<title>ใบเซ็นต์ชื่อ — ${_esc(s.name)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'TH SarabunPSK';font-size:16px;color:#111;background:#555;}
.page{
  width:210mm; height:297mm; box-sizing:border-box;
  padding:15mm 15mm 12mm 15mm;
  margin:1cm auto; background:white; box-shadow:0 0 10px rgba(0,0,0,0.5);
  display:flex; flex-direction:column;
}
.page-header, .page-footer{flex-shrink:0;}
.page-content{flex-grow:1; display:flex; flex-direction:column; overflow:hidden;}
.doc-title{font-size:20px;font-weight:700;text-align:center;border:1px solid #000;border-bottom:none;padding:5px 8px;}
.info-tbl{width:100%;border-collapse:collapse;border:1px solid #000;}
.info-tbl td{padding:4px 8px;border:1px solid #000;font-size:16px;}
.info-tbl tr:last-child td{border-bottom:none;}
.info-tbl .lbl{font-weight:700;}
.doc-tbl{width:100%;border-collapse:collapse;}
.doc-tbl th{border:1px solid #000;padding:4px 6px;text-align:center;font-size:16px;background:#f0f0f0;font-weight:700;}
.doc-tbl td{border:1px solid #000;border-top:none;padding:0 5px;font-size:16px;}
.page-content .doc-tbl{height:100%; display:flex; flex-direction:column;}
.page-content .doc-tbl tbody{flex-grow:1; display:flex; flex-direction:column;}
.page-content .doc-tbl tr{display:table; width:100%; table-layout:fixed;}
.page-content .doc-tbl tbody tr{flex:1;}
.sig{display:flex;justify-content:space-between;padding:0 8mm;margin-top:20mm;break-inside:avoid;}
.sig-blk{text-align:center;width:44%;}
.sig-line{border-bottom:1px solid #333;width:51mm;margin:0 auto 3px;}
.sig-lbl{font-size:16px;line-height:1.3;}
.pg-num{text-align:center;font-size:11px;color:#555;margin-top:2mm;}
.no-print{margin-top:16px;text-align:center;}
.font-warn{display:none;align-items:center;gap:8px;background:#FEF2F2;border:1px solid #FCA5A5;color:#991B1B;font-size:13px;font-weight:600;padding:10px 14px;border-radius:8px;margin:0 auto 14px;max-width:210mm;font-family:Arial,sans-serif;}
.font-warn.show{display:flex;}
@media print{
  body{background:none;margin:0;}
  .print-container{padding:0;gap:0;}
  .page{margin:0;box-shadow:none;page-break-after:always;}
  .page:last-child{page-break-after:avoid;}
  .no-print,.font-warn{display:none!important;}
}
@page {
  size: 210mm 297mm;
  margin: 0;
}
</style></head><body>
<div class="font-warn no-print" id="font-warn">⚠️ ไม่พบฟอนต์ TH SarabunPSK บนเครื่องนี้ — เอกสารจะแสดง/พิมพ์ด้วยฟอนต์อื่นแทน ไม่ตรงตามมาตรฐานราชการ กรุณาติดตั้งฟอนต์ TH SarabunPSK ก่อนพิมพ์จริง</div>
<div class="print-container">${pagesHtml}</div>
<div class="no-print">
  <button onclick="window.print()" style="padding:8px 24px;font-size:14px;cursor:pointer;background:#1a56a0;color:#fff;border:none;border-radius:6px;">🖨 พิมพ์</button>
  <button onclick="window.close()" style="margin-left:10px;padding:8px 18px;font-size:14px;cursor:pointer;background:#f1f5f9;border:1px solid #ccc;border-radius:6px;">ปิด</button>
</div>
<script>
(function(){
  var canCheck = !!(document.fonts && document.fonts.check);
  var hasFont = true;
  (document.fonts?document.fonts.ready:Promise.resolve()).then(function(){
    try{ if(canCheck) hasFont = document.fonts.check("16pt 'TH SarabunPSK'"); }catch(e){}
    if(canCheck && !hasFont){
      document.getElementById('font-warn').classList.add('show');
    } else {
      setTimeout(window.print,300);
    }
  });
})();
<\/script>
</body></html>`;
  closeModal('modal-print-form');
  const w=window.open('','_blank','width=900,height=700,scrollbars=yes');
  if(!w){showToast('Popup ถูกบล็อก กรุณาอนุญาต popup แล้วลองใหม่','danger');return;}
  w.document.open();w.document.write(html);w.document.close();
}
function _esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

/* ══════════════════ PRINT DOCUMENTS ══════════════════ */
const _thaiMonths=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const _thaiD=['๐','๑','๒','๓','๔','๕','๖','๗','๘','๙'];
let _printDocTitles=[];
let _printDocTitlesLoaded=false;
let _docTitleEditing=null;
let _docTitleTemp=[];

function _isoToThaiDate(iso){
  if(!iso) return '';
  const [y,m,d]=iso.split('-').map(Number);
  return `${d} ${_thaiMonths[m-1]} ${y+543}`;
}
function _numToThai(n){
  return String(n).split('').map(d=>_thaiD[+d]||d).join('');
}

async function initPrintSection(){
  // Populate location dropdown
  const locSel=document.getElementById('print-loc-sel');
  locSel.innerHTML='<option value="">— เลือกสาขา —</option>';
  locations.forEach(l=>{
    const o=document.createElement('option');
    o.value=l.id;
    o.textContent=l.code?`${l.code} : ${l.name}`:l.name;
    locSel.appendChild(o);
  });
  // Set today's date
  const today=new Date().toISOString().split('T')[0];
  const dateEl=document.getElementById('print-date');
  if(!dateEl.value) dateEl.value=today;
  // Load settings once
  if(!_printDocTitlesLoaded){ await _loadPrintSettings(); _printDocTitlesLoaded=true; }
  _renderPrintTitleDropdown();
  updatePrintPreview();
}

function _renderPrintTitleDropdown(){
  const sel=document.getElementById('print-title-sel');
  sel.innerHTML='<option value="">— เลือกหัวข้อ —</option>';
  _printDocTitles.forEach((t,i)=>{
    const o=document.createElement('option');
    o.value=i;
    o.textContent=t.length>56?t.slice(0,56)+'…':t;
    sel.appendChild(o);
  });
}

async function _loadPrintSettings(){
  const DEFAULT_TITLES=[
    'ใบลงชื่อ Stand by การใช้งานระบบงาน โปรแกรม BMS-INVENTORY',
    'ใบลงชื่อเข้าร่วมประชุมสรุป Flow การใช้งานโปรแกรม BMS-INVENTORY',
    'ใบลงชื่อเข้าร่วมประชุมสรุปปัญหาการใช้งานโปรแกรม BMS-INVENTORY',
    'ใบลงชื่อเข้าร่วมการจำลองคู่ขนาน SIT (System Integration Testing)',
    'ใบเซ็นชื่อคีย์ยอดตั้งต้นคลังย่อย โปรแกรม BMS-INVENTORY',
  ];
  try{
    const siteKeys=['doc_left_name','doc_left_pos','doc_right_name','doc_right_pos','doc_right_inst']
      .map(k=>`${k}_${currentSite}`);
    const keys=['doc_titles','doc_font_family','doc_font_size',...siteKeys];
    const {data}=await _sb.from('settings').select('key,value').in('key',keys);
    const map=Object.fromEntries((data||[]).map(r=>[r.key,r.value]));
    if(map.doc_titles){try{_printDocTitles=JSON.parse(map.doc_titles);}catch{}}
    if(!_printDocTitles.length) _printDocTitles=[...DEFAULT_TITLES];
    const set=(id,val)=>{if(val){const el=document.getElementById(id);if(el)el.value=val;}};
    set('print-lname',map[`doc_left_name_${currentSite}`]);
    set('print-lpos', map[`doc_left_pos_${currentSite}`]);
    set('print-rname',map[`doc_right_name_${currentSite}`]);
    set('print-rpos', map[`doc_right_pos_${currentSite}`]);
    set('print-rinst',map[`doc_right_inst_${currentSite}`]);
    set('print-font-family', map.doc_font_family);
    set('print-font-size', map.doc_font_size);
  }catch(e){console.error('loadPrintSettings',e);}
}

async function _savePrintSetting(key,val){
  await _sb.from('settings').upsert({key,value:val,updated_at:new Date().toISOString()});
}

function onPrintTitleSel(){
  const i=parseInt(document.getElementById('print-title-sel').value);
  if(!isNaN(i)&&_printDocTitles[i]){
    document.getElementById('print-title-txt').value=_printDocTitles[i];
    updatePrintPreview();
  }
}
function onPrintLocSel(){
  const locId=parseInt(document.getElementById('print-loc-sel').value)||null;
  const loc=locations.find(l=>l.id===locId);
  const rinstEl=document.getElementById('print-rinst');
  if(rinstEl) rinstEl.value=loc?loc.name:'';
  // Refresh officer dropdown if checkbox is on
  if(document.getElementById('print-officer').checked) onPrintOfficerToggle();
  else updatePrintPreview();
}

async function onPrintOfficerToggle(){
  const checked=document.getElementById('print-officer').checked;
  const wrap=document.getElementById('print-officer-sel-wrap');
  wrap.style.display=checked?'block':'none';
  if(checked){
    const locId=parseInt(document.getElementById('print-loc-sel').value)||null;
    const loc=locations.find(l=>l.id===locId);
    if(loc?.code){
      const loadEl=document.getElementById('print-officer-loading');
      const selEl=document.getElementById('print-officer-sel');
      loadEl.style.display='block';
      selEl.style.display='none';
      const persons=await _loadOfficersForLocation(loc.code);
      loadEl.style.display='none';
      selEl.style.display='block';
      selEl.innerHTML='<option value="">— เลือกเจ้าหน้าที่ —</option>'+
        persons.map(p=>`<option value="${_esc(p.name)}">${_esc(p.name)}${p.position?' — '+_esc(p.position):''}</option>`).join('');
    } else {
      document.getElementById('print-officer-sel').innerHTML='<option value="">— กรุณาเลือกสาขาก่อน —</option>';
    }
  }
  updatePrintPreview();
}

async function _loadOfficersForLocation(locCode){
  try{
    const{data}=await _sb.from('master_items')
      .select('value')
      .eq('type','trainer')
      .eq('site',locCode)
      .order('sort_order,id');
    return(data||[]).map(r=>({name:r.value,position:''}));
  }catch{return[];}
}

function _getPrintConfig(){
  const locId=parseInt(document.getElementById('print-loc-sel').value)||null;
  const loc=locations.find(l=>l.id===locId);
  const showOfficer=document.getElementById('print-officer').checked;
  const officerSel=document.getElementById('print-officer-sel');
  return{
    title:(document.getElementById('print-title-txt').value||'').trim(),
    hospital:loc?loc.name:'',
    date:_isoToThaiDate(document.getElementById('print-date').value),
    showOfficer,
    officerName:showOfficer?(officerSel?.value||''):'',
    rowCount:Math.max(5,Math.min(100,parseInt(document.getElementById('print-rows').value)||25)),
    leftName:(document.getElementById('print-lname').value||'').trim(),
    leftPos:(document.getElementById('print-lpos').value||'').trim(),
    rightName:(document.getElementById('print-rname').value||'').trim(),
    rightPos:(document.getElementById('print-rpos').value||'').trim(),
    rightInst:(document.getElementById('print-rinst').value||'').trim(),
    fontFamily: (document.getElementById('print-font-family')?.value || 'Sarabun').trim(),
    fontSize: (document.getElementById('print-font-size')?.value || '13px').trim(),
  };
}

/* ── สร้างเอกสาร ────────────────────────────────────────────────────── */
// margins: บน 17mm, ล่าง 15mm, ซ้าย/ขวา 15mm
function _buildDocHTML(cfg,absLogoSrc,forPrint){
  const logo=absLogoSrc||'bms-logo.png';
  const PAGE=25;
  const numPages=Math.ceil(cfg.rowCount/PAGE) || 1;
  const officerLine=cfg.showOfficer
    ?`<br><span class="lbl">เจ้าหน้าที่ :</span> ${_esc(cfg.officerName||'')}`:'';

  const COLS=`<colgroup>
    <col style="width:11mm"><col><col style="width:36mm"><col style="width:36mm"><col style="width:40mm">
  </colgroup>`;
  const THEAD=`<thead><tr>
    <th style="width:11mm">ลำดับ</th><th>ชื่อ – สกุล</th><th style="width:36mm">ตำแหน่ง</th><th style="width:36mm">แผนก</th><th style="width:40mm">ลายมือชื่อ</th>
  </tr></thead>`;

  function buildRows(from,to,cls){
    let r='';
    for(let i=from;i<=to;i++){
      r+=`<tr class="${cls}"><td style="text-align:center;width:11mm;">${i}</td><td></td><td style="width:36mm;"></td><td style="width:36mm;"></td><td style="width:40mm;"></td></tr>`;
    }
    return r;
  }

  function sigFooter(pageNum,totalPages,prefixCls){
    const p=prefixCls||'';
    return`<div class="${p}pf">
  <div class="${p}sig">
    <div class="sig-blk">
      <div class="sig-line"></div>
      <div class="sig-lbl">(${_esc(cfg.leftName)||'ชื่อ-นามสกุล'})</div>
      <div class="sig-lbl">ตำแหน่ง ${_esc(cfg.leftPos)||'………………………………'}</div>
      <div class="sig-lbl">บริษัท บางกอก เมดิคอล ซอฟต์แวร์ จำกัด</div>
    </div>
    <div class="sig-blk">
      <div class="sig-line"></div>
      <div class="sig-lbl">(${_esc(cfg.rightName)||'ชื่อ-นามสกุล'})</div>
      <div class="sig-lbl">ตำแหน่ง ${_esc(cfg.rightPos)||'………………………………'}</div>
      ${cfg.rightInst?`<div class="sig-lbl">${_esc(cfg.rightInst)}</div>`:''}
    </div>
  </div>
  ${totalPages>1?`<div class="pg-num">หน้า ${pageNum} / ${totalPages}</div>`:''}
</div>`;
  }

  if(!forPrint){
    const WRAP='background:#fff;box-shadow:0 2px 16px rgba(0,0,0,.18);width:210mm;height:297mm;box-sizing:border-box;overflow:hidden;font-family:\'TH SarabunPSK\';color:#111;display:flex;flex-direction:column;padding:15mm 15mm 12mm 15mm;';
    function pvSheet(from,to,pn){
      return`<div class="page" style="${WRAP}">
  <div class="pv-ph">
    <img src="${logo}" id="pv-logo-${pn}" style="height:18mm;width:auto;display:block;margin-bottom:2mm;"
      onerror="this.style.display='none';var f=document.getElementById('pv-logofb-${pn}');if(f)f.style.display='flex';">
    <div id="pv-logofb-${pn}" style="display:none;align-items:center;gap:8px;margin-bottom:4px;">
      <svg width="44" height="44" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><path d="M40 74 C39 73 5 53 5 29 C5 15 16 5 28 5 C34 5 39 9 40 12 C41 9 46 5 52 5 C64 5 75 15 75 29 C75 53 41 73 40 74Z" fill="#c0392b"/><path d="M10 48 C20 40 31 38 40 42 C49 46 60 49 70 44" stroke="#1a5899" stroke-width="6" fill="none" stroke-linecap="round"/><text x="40" y="43" text-anchor="middle" fill="white" font-family="Arial Black,sans-serif" font-weight="900" font-size="17">BMS</text></svg>
      <span style="font-size:10px;line-height:1.5;color:#333;"><strong style="font-size:11px;">บริษัท บางกอก เมดิคอล ซอฟต์แวร์ จำกัด</strong><br>เลขที่ 2 ชั้น 2 ซ.สุขสวัสดิ์ 33 ราษฎร์บูรณะ กรุงเทพฯ</span>
    </div>
    <div class="pv-title">${_esc(cfg.title)||'(กรุณาเลือกหัวข้อเอกสาร)'}</div>
    <table class="pv-info">
      <tr>
        <td style="width:55%">สถานพยาบาล : ${_esc(cfg.hospital)||'—'}</td>
        <td>วันที่ : ${_esc(cfg.date)||'—'}${officerLine}</td>
      </tr>
    </table>
  </div>
  <table class="pv-tbl pv-phtbl">${COLS}${THEAD}</table>
  <table class="pv-tbl pv-dtbl">${COLS}<tbody>${buildRows(from,to,'pv-row')}</tbody></table>
  <div style="flex:1;"></div>
  ${sigFooter(pn,numPages,'pv-')}
</div>`;
    }
    let html='';
    for(let p=0;p<numPages;p++){
      html+=pvSheet(p*PAGE+1,Math.min((p+1)*PAGE,cfg.rowCount),p+1);
    }
    return html;
  }

  // --- FOR PRINT --- (New refactored code is kept)
  const officerLinePrint=cfg.showOfficer ? `<br><span class="lbl">เจ้าหน้าที่ :</span> ${_esc(cfg.officerName||'')}`:'';
  const pageHeaderHtml=`
  <div class="page-header">
    <img src="${logo}" style="height:18mm;width:auto;display:block;margin-bottom:2mm;" onerror="this.style.display='none'">
    <div class="doc-title">${_esc(cfg.title)||'(กรุณาเลือกหัวข้อเอกสาร)'}</div>
    <table class="info-tbl">
      <tr>
        <td style="width:55%;vertical-align:top;"><span class="lbl">สถานพยาบาล :</span> ${_esc(cfg.hospital)||'—'}</td>
        <td style="vertical-align:top;"><span class="lbl">วันที่ :</span> ${_esc(cfg.date)||'—'}${officerLinePrint}</td>
      </tr>
    </table>
  </div>
`;
  let pagesHtml='';
  for(let p=0;p<numPages;p++){
    pagesHtml+=`<div class="page">
      ${pageHeaderHtml}
      <div class="page-content">
        <table class="doc-tbl">${COLS}${THEAD}<tbody>${buildRows(p*PAGE+1,Math.min((p+1)*PAGE,cfg.rowCount),'')}</tbody></table>
      </div>
      ${sigFooter(p+1,numPages,'')}
    </div>`;
  }
  const style=`
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'TH SarabunPSK';font-size:16px;color:#111;background:#fff;}
.page{width:210mm; height:297mm; box-sizing:border-box;padding:15mm 15mm 12mm 15mm;background:white; display:flex; flex-direction:column;}
.page-header, .page-footer{flex-shrink:0;}
.page-content{flex-grow:1; display:flex; flex-direction:column; overflow:hidden;}
.doc-title{font-size:20px;font-weight:700;text-align:center;border:1px solid #000;border-bottom:none;padding:5px 8px;}
.info-tbl{width:100%;border-collapse:collapse;border:1px solid #000;}
.info-tbl td{padding:4px 8px;border:1px solid #000;font-size:16px;vertical-align:top;}
.info-tbl tr:last-child td{border-bottom:none;}
.info-tbl .lbl{font-weight:700;}
.doc-tbl{width:100%;border-collapse:collapse;}
.doc-tbl th{border:1px solid #000;padding:4px 6px;text-align:center;font-size:16px;background:#f0f0f0;font-weight:700;}
.doc-tbl td{border:1px solid #000;border-top:none;padding:0 5px;font-size:16px;}
.page-content .doc-tbl{height:100%; display:flex; flex-direction:column;}
.page-content .doc-tbl tbody{flex-grow:1; display:flex; flex-direction:column;}
.page-content .doc-tbl tr{display:table; width:100%; table-layout:fixed;}
.page-content .doc-tbl tbody tr{flex:1;}
.sig{display:flex;justify-content:space-between;padding:0 8mm;margin-top:20mm;break-inside:avoid;}
.sig-blk{text-align:center;width:44%;}
.sig-line{border-bottom:1px solid #333;width:51mm;margin:0 auto 3px;}
.sig-lbl{font-size:16px;line-height:1.3;}
.pg-num{text-align:center;font-size:11px;color:#555;margin-top:2mm;}
.no-print{margin-top:16px;text-align:center;}
.font-warn{display:none;align-items:center;gap:8px;background:#FEF2F2;border:1px solid #FCA5A5;color:#991B1B;font-size:13px;font-weight:600;padding:10px 14px;border-radius:8px;margin:0 auto 14px;max-width:210mm;font-family:Arial,sans-serif;}
.font-warn.show{display:flex;}
@media print{
  body{background:none;margin:0;}
  .page{margin:0;box-shadow:none;page-break-after:always;}
  .page:last-child{page-break-after:avoid;}
  .no-print,.font-warn{display:none!important;}
}
@page {size: 210mm 297mm;margin: 0;}
  `;
  return `<!DOCTYPE html><html lang="th"><head>
<meta charset="UTF-8">
<title>${_esc(cfg.title)||'เอกสาร'}</title>
<style>${style}</style></head><body>
<div class="font-warn no-print" id="font-warn">⚠️ ไม่พบฟอนต์ TH SarabunPSK บนเครื่องนี้ — เอกสารจะแสดง/พิมพ์ด้วยฟอนต์อื่นแทน ไม่ตรงตามมาตรฐานราชการ กรุณาติดตั้งฟอนต์ TH SarabunPSK ก่อนพิมพ์จริง</div>
<div class="print-container">${pagesHtml}</div>
<div class="no-print">
  <button onclick="window.print()" style="padding:8px 24px;font-size:14px;cursor:pointer;background:#1a56a0;color:#fff;border:none;border-radius:6px;margin-right:8px;">🖨 พิมพ์</button>
  <button onclick="window.close()" style="padding:8px 18px;font-size:14px;cursor:pointer;background:#f1f5f9;border:1px solid #ccc;border-radius:6px;">ปิด</button>
</div>
<script>
(function(){
  var canCheck = !!(document.fonts && document.fonts.check);
  var hasFont = true;
  (document.fonts?document.fonts.ready:Promise.resolve()).then(function(){
    try{ if(canCheck) hasFont = document.fonts.check("16pt 'TH SarabunPSK'"); }catch(e){}
    if(canCheck && !hasFont){
      document.getElementById('font-warn').classList.add('show');
    } else {
      setTimeout(window.print,300);
    }
  });
})();
<\/script>
</body></html>`;
}

function _checkPrintFont(){
  const el=document.getElementById('print-font-warn');
  if(!el)return;
  let available=true;
  try{
    if(document.fonts&&document.fonts.check) available=document.fonts.check("16pt 'TH SarabunPSK'");
  }catch(e){}
  el.classList.toggle('show',!available);
}
function updatePrintPreview(){
  const el=document.getElementById('print-preview');
  if(!el) return;
  const cfg=_getPrintConfig();
  const baseUrl=window.location.href.replace(/[^/]*(\?.*)?$/,'');
  const absLogo=baseUrl+'bms-logo.png';
  el.innerHTML=_buildDocHTML(cfg,absLogo,false);
  requestAnimationFrame(()=>_doPreviewFit(el));
  _checkPrintFont();
}

function _scalePrintPreview(){
  const wrap=document.getElementById('print-preview-wrap');
  const el=document.getElementById('print-preview');
  if(!wrap||!el) return;
  const pages=el.querySelectorAll('.page');
  if(!pages.length) return;
  const paperW=Math.round(210*96/25.4);
  const paperH=Math.round(297*96/25.4);
  const pad=16;
  const availW=wrap.clientWidth-pad*2;
  const availH=wrap.clientHeight-pad*2;
  const scaleW=availW/paperW;
  const scaleH=availH/paperH;
  const n=pages.length;
  const gap=12;
  // scale so ALL pages fit both width and height of panel
  const scaleByH=(availH-(n-1)*gap)/(n*paperH);
  const scale=Math.min(scaleW,scaleByH);
  wrap.style.justifyContent=scale===scaleByH ? 'center' : 'flex-start';
  pages.forEach(p=>{
    p.style.transform='';
    p.style.marginBottom='';
    p.style.zoom=scale;
  });
}

function _doPreviewFit(el){
  const CONTENT_H=Math.round(270*96/25.4); // 297mm page - 15mm(บน) - 12mm(ล่าง) = 270mm content area
  el.querySelectorAll(':scope>div').forEach(function(page){
    const ph=page.querySelector('.pv-ph');
    const phtbl=page.querySelector('.pv-phtbl');
    const pf=page.querySelector('.pv-pf');
    const rows=page.querySelectorAll('tr.pv-row');
    if(!rows.length)return;
    const phH=(ph?ph.offsetHeight:0)+(phtbl?phtbl.offsetHeight:0);
    const pfH=pf?pf.offsetHeight:0;
    const avail=CONTENT_H-phH-pfH;
    const rh=Math.max(16,Math.floor(avail/rows.length));
    rows.forEach(function(r){r.style.height=rh+'px';});
  });
  _scalePrintPreview();
}

function doPrint(){
  const cfg=_getPrintConfig();
  const baseUrl=window.location.href.replace(/[^/]*(\?.*)?$/,'');
  const absLogo=baseUrl+'bms-logo.png';
  const w=window.open('','_blank','width=900,height=750,scrollbars=yes');
  if(!w){showToast('Popup ถูกบล็อก กรุณาอนุญาต popup แล้วลองใหม่','danger');return;}
  w.document.open();
  w.document.write(_buildDocHTML(cfg,absLogo,true));
  w.document.close();
}

async function savePrintSignatories(){
  try{
    await Promise.all([
      _savePrintSetting(`doc_left_name_${currentSite}`,(document.getElementById('print-lname').value||'').trim()),
      _savePrintSetting(`doc_left_pos_${currentSite}`, (document.getElementById('print-lpos').value||'').trim()),
      _savePrintSetting(`doc_right_name_${currentSite}`,(document.getElementById('print-rname').value||'').trim()),
      _savePrintSetting(`doc_right_pos_${currentSite}`, (document.getElementById('print-rpos').value||'').trim()),
      _savePrintSetting(`doc_right_inst_${currentSite}`,(document.getElementById('print-rinst').value||'').trim()),
    ]);
    showToast('บันทึกผู้ลงนามสำเร็จ (เฉพาะสาขานี้)','success');
  }catch(e){showToast('บันทึกไม่สำเร็จ','danger');}
}

/* ─── Title modal ─────────────────────────────────────────────────────────── */
function openDocTitleModal(){
  _docTitleTemp=[..._printDocTitles];
  _docTitleEditing=null;
  document.getElementById('doc-new-title').value='';
  renderDocTitleList();
  document.getElementById('modal-doc-titles').classList.add('open');
}

function renderDocTitleList(){
  const el=document.getElementById('doc-title-list');
  if(!_docTitleTemp.length){
    el.innerHTML='<div style="text-align:center;color:var(--text-muted);padding:24px;font-size:13px;">ยังไม่มีหัวข้อ</div>';
    return;
  }
  el.innerHTML=_docTitleTemp.map((t,i)=>{
    if(_docTitleEditing?.index===i){
      return`<div style="border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px;">
        <textarea class="form-control" id="doc-edit-${i}" rows="2" style="font-size:13px;resize:none;margin-bottom:8px;">${_esc(t)}</textarea>
        <div style="display:flex;gap:6px;justify-content:flex-end;">
          <button class="btn btn-ghost btn-sm" onclick="_cancelDocTitleEdit()">ยกเลิก</button>
          <button class="btn btn-primary btn-sm" onclick="_saveDocTitleEdit(${i})">บันทึก</button>
        </div>
      </div>`;
    }
    return`<div style="border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:8px;display:flex;align-items:flex-start;gap:8px;">
      <span style="flex:1;font-size:13px;line-height:1.6;color:var(--text);">${_esc(t)}</span>
      <button class="btn btn-ghost btn-sm" onclick="_startDocTitleEdit(${i})" style="padding:4px 8px;flex-shrink:0;"><i class="ti ti-pencil"></i></button>
      <button class="btn btn-ghost btn-sm" onclick="_deleteDocTitle(${i})" style="padding:4px 8px;flex-shrink:0;color:var(--danger);"><i class="ti ti-trash"></i></button>
    </div>`;
  }).join('');
}

function _startDocTitleEdit(i){
  _docTitleEditing={index:i};
  renderDocTitleList();
  setTimeout(()=>{const el=document.getElementById(`doc-edit-${i}`);if(el)el.focus();},50);
}
function _cancelDocTitleEdit(){_docTitleEditing=null;renderDocTitleList();}
function _saveDocTitleEdit(i){
  const el=document.getElementById(`doc-edit-${i}`);
  if(!el)return;
  const v=el.value.trim();
  if(!v)return;
  _docTitleTemp[i]=v;
  _docTitleEditing=null;
  renderDocTitleList();
}
function _deleteDocTitle(i){
  _docTitleTemp.splice(i,1);
  if(_docTitleEditing?.index===i)_docTitleEditing=null;
  renderDocTitleList();
}
function addDocTitle(){
  const el=document.getElementById('doc-new-title');
  const v=el.value.trim();
  if(!v)return;
  _docTitleTemp.push(v);
  el.value='';
  renderDocTitleList();
}
async function saveDocTitles(){
  try{
    await _savePrintSetting('doc_titles',JSON.stringify(_docTitleTemp));
    _printDocTitles=[..._docTitleTemp];
    _renderPrintTitleDropdown();
    closeModal('modal-doc-titles');
    showToast('บันทึกหัวข้อสำเร็จ','success');
  }catch(e){showToast('บันทึกไม่สำเร็จ','danger');}
}

// Rescale preview when window resizes
window.addEventListener('resize',function(){
  if(document.getElementById('asec-print')?.classList.contains('active'))_scalePrintPreview();
});

// Print guard: only show preview content when user is on print-docs tab
window.addEventListener('beforeprint',function(){
  const onPrint=document.getElementById('page-admin')?.classList.contains('active')
    &&document.getElementById('asec-print')?.classList.contains('active');
  if(onPrint)document.body.classList.add('print-docs');
});
window.addEventListener('afterprint',function(){
  document.body.classList.remove('print-docs');
});

/* ══════════════════════════════════════════════
   PWA: manifest, service worker, install button, offline/update banners
══════════════════════════════════════════════ */
(function initPWA(){
  // 1) manifest แบบ dynamic — ผูก start_url เข้ากับสาขาปัจจุบัน (?site=) เพื่อให้ไอคอนที่ติดตั้งเปิดสาขาที่ถูกต้อง
  fetch('manifest.json').then(r=>r.json()).then(m=>{
    m.start_url=`./index.html?site=${encodeURIComponent(currentSite)}`;
    m.id=m.start_url;
    const blob=new Blob([JSON.stringify(m)],{type:'application/json'});
    const link=document.getElementById('pwa-manifest-link');
    if(link)link.href=URL.createObjectURL(blob);
  }).catch(()=>{});

  // 2) Service Worker (ต้องเป็น HTTPS หรือ localhost เท่านั้น)
  if('serviceWorker' in navigator && window.isSecureContext){
    navigator.serviceWorker.register('sw.js').then(reg=>{
      reg.addEventListener('updatefound',()=>{
        const nw=reg.installing;
        if(!nw)return;
        nw.addEventListener('statechange',()=>{
          if(nw.state==='installed' && navigator.serviceWorker.controller){
            document.getElementById('update-banner')?.classList.add('show');
          }
        });
      });
    }).catch(e=>console.error('SW register failed',e));

    let _reloadedForUpdate=false;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(_reloadedForUpdate)return;
      _reloadedForUpdate=true;
      location.reload();
    });
  }

  // 3) ปุ่มติดตั้งแอป — Android/Chrome ใช้ beforeinstallprompt, iOS ไม่มี event นี้จึงโชว์คำแนะนำแทน
  // แสดงเฉพาะตอน Login เข้าระบบ (isAdminLoggedIn) เท่านั้น ยังไม่ Login จะไม่แสดง
  let _deferredInstallPrompt=null;
  const isStandalone=window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true;
  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  const installBtn=document.getElementById('pwa-install-btn');
  const installBanner=document.getElementById('pwa-install-banner');

  // หมายเหตุ: ไม่มีการจำการปิด (dismiss) แบบถาวร — ต้องเตือนซ้ำทุกครั้งที่ล็อกอินถ้ายังไม่ได้ติดตั้งแอป
  function _installable(){
    return !isStandalone && (_deferredInstallPrompt||isIOS);
  }
  function _refreshInstallUI(){
    const show=isAdminLoggedIn && _installable();
    if(installBtn)installBtn.style.display=show?'flex':'none';
    installBanner?.classList.toggle('show',show);
  }
  window.pwaDismissBanner=function(){
    installBanner?.classList.remove('show'); // ปิดชั่วคราว จะเตือนใหม่อีกครั้งเมื่อล็อกอินครั้งถัดไป
  };
  window._pwaRefreshInstallUI=_refreshInstallUI;

  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();
    _deferredInstallPrompt=e;
    _refreshInstallUI();
  });
  window.addEventListener('appinstalled',()=>{
    _deferredInstallPrompt=null;
    _refreshInstallUI();
    showToast('ติดตั้งแอปสำเร็จ','success');
  });
  _refreshInstallUI();

  window.pwaInstallClick=async function(){
    if(_deferredInstallPrompt){
      _deferredInstallPrompt.prompt();
      const{outcome}=await _deferredInstallPrompt.userChoice;
      _deferredInstallPrompt=null;
      if(outcome==='accepted')_refreshInstallUI();
    } else if(isIOS){
      document.getElementById('modal-ios-install')?.classList.add('open');
    } else {
      showToast('เบราว์เซอร์นี้ยังไม่รองรับการติดตั้งแอปโดยตรง','info');
    }
  };
  window.pwaApplyUpdate=function(){
    navigator.serviceWorker.getRegistration().then(reg=>{
      reg?.waiting?.postMessage('SKIP_WAITING');
    });
    document.getElementById('update-banner')?.classList.remove('show');
  };

  // 4) แบนเนอร์ออฟไลน์/ออนไลน์ + ซิงค์ข้อมูลอัตโนมัติเมื่อกลับมาออนไลน์
  function _updateOnlineStatus(){
    document.getElementById('offline-banner')?.classList.toggle('show',!navigator.onLine);
  }
  window.addEventListener('offline',_updateOnlineStatus);
  window.addEventListener('online',()=>{
    _updateOnlineStatus();
    showToast('กลับมาออนไลน์แล้ว กำลังซิงค์ข้อมูล...','info');
    _scheduleRtRefresh();
    if(!_rtChannel)initRealtime();
  });
  _updateOnlineStatus();
})();

// INIT
initApp();
// Enable native select overlay on non-Line touch devices only
// Line WebView does not open OS picker for invisible selects; uses inline dropdown instead
if('ontouchstart' in window && !/Line\//.test(navigator.userAgent)){
  document.querySelectorAll('.csel-native-select').forEach(s=>s.style.pointerEvents='auto');
}
