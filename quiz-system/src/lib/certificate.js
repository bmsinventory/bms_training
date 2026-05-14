import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { fmtDate } from './utils';

export async function generateCertPDF(cert, settings, verifyUrl) {
  const cfg = getCertConfig(settings);
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 120, margin: 1,
    color: { dark: cfg.primary, light: '#ffffff' },
  });

  const el = document.createElement('div');
  el.style.cssText = `
    position: fixed; left: -9999px; top: -9999px;
    width: 1123px; height: 794px;
    font-family: 'Sarabun', sans-serif;
    background: white;
  `;
  el.innerHTML = buildCertHTML(cert, settings, qrDataUrl);
  document.body.appendChild(el);
  await new Promise(r => setTimeout(r, 400));

  const canvas = await html2canvas(el, {
    scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff',
  });
  document.body.removeChild(el);

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [794, 1123] });
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 1123, 794);
  return pdf.output('blob');
}

export function getCertConfig(settings) {
  const template = settings.cert_template || 'classic';
  const override = settings.cert_primary_color || null;

  const presets = {
    classic: { primary: '#1e3a8a', accent: '#2563eb', bg: 'linear-gradient(135deg,#f0f9ff 0%,#ffffff 50%,#f0f9ff 100%)', scoreColor: '#059669' },
    modern:  { primary: '#0369a1', accent: '#0ea5e9', bg: '#ffffff', scoreColor: '#059669' },
    elegant: { primary: '#78350f', accent: '#b45309', bg: 'linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%)', scoreColor: '#78350f' },
    minimal: { primary: '#1f2937', accent: '#374151', bg: '#ffffff', scoreColor: '#059669' },
  };

  const base = { ...presets[template] || presets.classic, template };
  if (override) return { ...base, primary: override, accent: override };
  return base;
}

export function buildCertHTML(cert, settings, qrDataUrl) {
  // Background image mode overrides template
  if (settings.cert_design_mode === 'image' && settings.cert_bg_image_url) {
    return buildBgImageTemplate(cert, settings, qrDataUrl);
  }

  const template = settings.cert_template || 'classic';
  const cfg = getCertConfig(settings);
  const data = {
    cert,
    siteName:  settings.site_name  || 'BMS Training',
    orgName:   settings.org_name   || '',
    certTitle: settings.cert_title || 'ใบรับรองการผ่านการทดสอบ',
    logoUrl:   settings.cert_logo_url      || '',
    logoText:  settings.cert_logo_text     || (settings.site_name || 'B')[0] || 'B',
    sigName:   settings.cert_signature_name || 'ผู้อำนวยการฝึกอบรม',
    sigUrl:    settings.cert_signature_url  || '',
    qrDataUrl,
  };
  if (template === 'modern')  return buildModern(cfg, data);
  if (template === 'elegant') return buildElegant(cfg, data);
  if (template === 'minimal') return buildMinimal(cfg, data);
  return buildClassic(cfg, data);
}

// ---------- Background image template ----------

const BG_DEFAULT_POS = {
  name:    { x: 50, y: 43 },
  course:  { x: 50, y: 55 },
  score:   { x: 33, y: 67 },
  percent: { x: 50, y: 67 },
  date:    { x: 67, y: 67 },
  certid:  { x: 12, y: 92 },
  qr:      { x: 88, y: 88 },
  org:     { x: 12, y: 87 },
  sig:     { x: 50, y: 87 },
};

const BG_DEFAULT_STYLE = {
  name:    { size: 38, color: '#111827', bold: true },
  course:  { size: 20, color: '#2563eb', bold: true },
  score:   { size: 28, color: '#059669', bold: true },
  percent: { size: 28, color: '#059669', bold: true },
  date:    { size: 13, color: '#374151', bold: false },
  certid:  { size: 11, color: '#6b7280', bold: false },
  qr:      { size: 72 },
  org:     { size: 13, color: '#374151', bold: false },
  sig:     { size: 13, color: '#374151', bold: false },
};

function buildBgImageTemplate(cert, settings, qrDataUrl) {
  let fp = {}, fs = {};
  try { fp = JSON.parse(settings.cert_field_positions || '{}'); } catch {}
  try { fs = JSON.parse(settings.cert_field_styles   || '{}'); } catch {}

  function gp(k) { return { ...BG_DEFAULT_POS[k],   ...(fp[k] || {}) }; }
  function gs(k) { return { ...BG_DEFAULT_STYLE[k],  ...(fs[k] || {}) }; }

  // Convert % to px (cert is 1123×794)
  function ax(pct) { return Math.round(pct * 11.23); }
  function ay(pct) { return Math.round(pct * 7.94);  }

  function textEl(key, content) {
    const p = gp(key);
    const s = gs(key);
    return `<div style="position:absolute;left:${ax(p.x)}px;top:${ay(p.y)}px;
      transform:translate(-50%,-50%);
      font-size:${s.size}px;color:${s.color};font-weight:${s.bold ? 800 : 500};
      white-space:nowrap;">${content}</div>`;
  }

  const orgName = settings.org_name || '';
  const sigName = settings.cert_signature_name || 'ผู้อำนวยการฝึกอบรม';
  const sigUrl  = settings.cert_signature_url  || '';
  const qPos = gp('qr'); const qSty = gs('qr');
  const sPos = gp('sig'); const sSty = gs('sig');

  return `<div style="width:1123px;height:794px;position:relative;overflow:hidden;
    font-family:'Sarabun',sans-serif;">
    <img src="${settings.cert_bg_image_url}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" crossorigin="anonymous" />
    ${textEl('name',    cert.full_name)}
    ${textEl('course',  cert.course_name)}
    ${textEl('score',   `${cert.score}/${cert.total}`)}
    ${textEl('percent', `${Math.round(cert.percent)}%`)}
    ${textEl('date',    fmtDate(cert.issued_at))}
    ${textEl('certid',  `Cert ID: ${cert.cert_id}`)}
    ${orgName ? textEl('org', orgName) : ''}
    <div style="position:absolute;left:${ax(qPos.x)}px;top:${ay(qPos.y)}px;transform:translate(-50%,-50%);">
      <img src="${qrDataUrl}" style="width:${qSty.size}px;height:${qSty.size}px;display:block;" />
    </div>
    <div style="position:absolute;left:${ax(sPos.x)}px;top:${ay(sPos.y)}px;transform:translate(-50%,-50%);text-align:center;">
      ${sigUrl ? `<img src="${sigUrl}" style="height:48px;max-width:130px;object-fit:contain;display:block;margin:0 auto 4px;" crossorigin="anonymous" />` : ''}
      <div style="width:160px;border-top:1px solid ${sSty.color || '#374151'};padding-top:4px;
        font-size:${sSty.size}px;color:${sSty.color || '#374151'};margin:0 auto;">${sigName}</div>
    </div>
  </div>`;
}

function logoHTML(logoUrl, logoText, primary, accent, size = 48, radius = '12px') {
  if (logoUrl) {
    return `<img src="${logoUrl}" style="height:${size}px;max-width:${size * 2.5}px;object-fit:contain;" crossorigin="anonymous" />`;
  }
  return `<div style="width:${size}px;height:${size}px;border-radius:${radius};
    background:linear-gradient(135deg,${primary},${accent});
    display:flex;align-items:center;justify-content:center;
    font-size:${Math.round(size * 0.5)}px;color:white;font-weight:bold;flex-shrink:0;">${logoText}</div>`;
}

function sigHTML(sigUrl, sigName) {
  return `<div style="text-align:center;">
    ${sigUrl ? `<img src="${sigUrl}" style="height:48px;max-width:130px;object-fit:contain;display:block;margin:0 auto 4px;" crossorigin="anonymous" />` : ''}
    <div style="width:160px;border-top:1px solid #374151;padding-top:4px;font-size:13px;color:#374151;">${sigName}</div>
  </div>`;
}

function qrEl(qrDataUrl, size = 80, label = 'สแกนเพื่อตรวจสอบ') {
  return `<div style="text-align:center;">
    <img src="${qrDataUrl}" style="width:${size}px;height:${size}px;display:block;margin:0 auto;" />
    <div style="font-size:10px;color:#9ca3af;margin-top:4px;">${label}</div>
  </div>`;
}

function buildClassic(cfg, { cert, siteName, orgName, certTitle, logoUrl, logoText, sigName, sigUrl, qrDataUrl }) {
  const { primary, accent, bg, scoreColor } = cfg;
  const faint = primary + '18';
  return `<div style="width:1123px;height:794px;position:relative;overflow:hidden;
    background:${bg};
    border:3px solid ${primary};
    box-shadow:inset 0 0 0 8px ${faint},inset 0 0 0 10px ${primary};">
    <div style="position:absolute;top:-80px;right:-80px;width:320px;height:320px;border-radius:50%;
      background:radial-gradient(circle,${faint} 0%,transparent 70%);"></div>
    <div style="position:absolute;bottom:-80px;left:-80px;width:320px;height:320px;border-radius:50%;
      background:radial-gradient(circle,${faint} 0%,transparent 70%);"></div>
    <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;
      padding:40px 80px;height:100%;box-sizing:border-box;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        ${logoHTML(logoUrl, logoText, primary, accent, 48, '12px')}
        <span style="font-size:22px;font-weight:700;color:${primary};letter-spacing:1px;">${siteName}</span>
      </div>
      <div style="width:200px;height:3px;margin:8px 0;
        background:linear-gradient(to right,transparent,${accent},transparent);"></div>
      <div style="font-size:13px;color:#6b7280;letter-spacing:4px;text-transform:uppercase;margin-bottom:16px;">
        CERTIFICATE OF ACHIEVEMENT</div>
      <div style="font-size:30px;font-weight:800;color:${primary};margin-bottom:6px;">${certTitle}</div>
      <div style="font-size:15px;color:#6b7280;margin:16px 0 6px;">ขอมอบใบรับรองนี้ให้แก่</div>
      <div style="font-size:38px;font-weight:800;color:#111827;border-bottom:2px solid ${accent};
        padding:4px 24px 8px;letter-spacing:1px;margin-bottom:12px;">${cert.full_name}</div>
      <div style="font-size:15px;color:#6b7280;margin-bottom:4px;">ได้ผ่านการทดสอบหลักสูตร</div>
      <div style="font-size:22px;font-weight:700;color:${accent};background:${faint};
        padding:8px 28px;border-radius:999px;margin-bottom:20px;">${cert.course_name}</div>
      <div style="display:flex;gap:40px;align-items:center;margin-bottom:24px;">
        <div style="text-align:center;">
          <div style="font-size:36px;font-weight:800;color:${scoreColor};">${cert.score}/${cert.total}</div>
          <div style="font-size:12px;color:#6b7280;">คะแนน</div>
        </div>
        <div style="width:1px;height:48px;background:#e5e7eb;"></div>
        <div style="text-align:center;">
          <div style="font-size:36px;font-weight:800;color:${scoreColor};">${Math.round(cert.percent)}%</div>
          <div style="font-size:12px;color:#6b7280;">เปอร์เซ็นต์</div>
        </div>
        <div style="width:1px;height:48px;background:#e5e7eb;"></div>
        <div style="text-align:center;">
          <div style="font-size:15px;font-weight:600;color:#374151;">${fmtDate(cert.issued_at)}</div>
          <div style="font-size:12px;color:#6b7280;">วันที่ออกใบรับรอง</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;
        width:100%;margin-top:auto;border-top:1px solid #e5e7eb;padding-top:16px;">
        <div>
          <div style="font-size:13px;color:#9ca3af;margin-bottom:4px;">ออกโดย</div>
          <div style="font-size:16px;font-weight:700;color:#374151;">${orgName}</div>
          <div style="display:inline-block;margin-top:8px;font-size:11px;color:#6b7280;
            background:#f3f4f6;padding:4px 10px;border-radius:4px;">Cert ID: ${cert.cert_id}</div>
        </div>
        ${sigHTML(sigUrl, sigName)}
        ${qrEl(qrDataUrl)}
      </div>
    </div>
  </div>`;
}

function buildModern(cfg, { cert, siteName, orgName, certTitle, logoUrl, logoText, sigName, sigUrl, qrDataUrl }) {
  const { primary, accent, scoreColor } = cfg;
  return `<div style="width:1123px;height:794px;position:relative;overflow:hidden;
    background:#ffffff;border:2px solid ${primary};">
    <div style="background:${primary};padding:18px 60px;display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:12px;">
        ${logoHTML(logoUrl, logoText, 'rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)', 40, '10px')}
        <div>
          <div style="color:white;font-size:18px;font-weight:700;letter-spacing:0.5px;">${siteName}</div>
          <div style="color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:3px;">CERTIFICATE OF ACHIEVEMENT</div>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="color:rgba(255,255,255,0.7);font-size:11px;margin-bottom:2px;">วันที่ออก</div>
        <div style="color:white;font-weight:600;font-size:14px;">${fmtDate(cert.issued_at)}</div>
      </div>
    </div>
    <div style="padding:22px 60px 24px;display:flex;flex-direction:column;align-items:center;
      height:calc(794px - 76px);box-sizing:border-box;">
      <div style="font-size:12px;color:#9ca3af;letter-spacing:3px;margin-bottom:8px;">ขอมอบใบรับรองนี้ให้แก่</div>
      <div style="font-size:42px;font-weight:800;color:#111827;letter-spacing:0.5px;margin-bottom:6px;">${cert.full_name}</div>
      <div style="width:70%;height:2px;background:linear-gradient(to right,transparent,${accent},transparent);margin-bottom:14px;"></div>
      <div style="font-size:16px;color:#6b7280;margin-bottom:2px;">${certTitle}</div>
      <div style="font-size:22px;font-weight:700;color:${primary};margin-bottom:18px;">${cert.course_name}</div>
      <div style="display:flex;gap:16px;margin-bottom:auto;">
        <div style="background:#f0fdf4;border:2px solid #bbf7d0;border-radius:12px;padding:14px 32px;text-align:center;">
          <div style="font-size:32px;font-weight:800;color:${scoreColor};">${cert.score}/${cert.total}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px;">คะแนนที่ได้</div>
        </div>
        <div style="background:#f0fdf4;border:2px solid #bbf7d0;border-radius:12px;padding:14px 32px;text-align:center;">
          <div style="font-size:32px;font-weight:800;color:${scoreColor};">${Math.round(cert.percent)}%</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px;">เปอร์เซ็นต์</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;
        width:100%;border-top:1px solid #e5e7eb;padding-top:14px;margin-top:16px;">
        <div>
          <div style="font-size:12px;color:#9ca3af;margin-bottom:2px;">ออกโดย</div>
          <div style="font-size:15px;font-weight:700;color:#374151;">${orgName}</div>
          <div style="font-size:11px;color:#6b7280;background:#f3f4f6;padding:3px 10px;
            border-radius:4px;display:inline-block;margin-top:5px;">Cert ID: ${cert.cert_id}</div>
        </div>
        ${sigHTML(sigUrl, sigName)}
        ${qrEl(qrDataUrl)}
      </div>
    </div>
  </div>`;
}

function buildElegant(cfg, { cert, siteName, orgName, certTitle, logoUrl, logoText, sigName, sigUrl, qrDataUrl }) {
  const { primary, accent, bg, scoreColor } = cfg;
  return `<div style="width:1123px;height:794px;position:relative;overflow:hidden;
    background:${bg};
    border:3px solid ${primary};
    box-shadow:inset 0 0 0 5px rgba(255,255,255,0.6),inset 0 0 0 8px ${primary};">
    <div style="position:absolute;top:14px;left:14px;width:32px;height:32px;
      border-top:2px solid ${accent};border-left:2px solid ${accent};"></div>
    <div style="position:absolute;top:14px;right:14px;width:32px;height:32px;
      border-top:2px solid ${accent};border-right:2px solid ${accent};"></div>
    <div style="position:absolute;bottom:14px;left:14px;width:32px;height:32px;
      border-bottom:2px solid ${accent};border-left:2px solid ${accent};"></div>
    <div style="position:absolute;bottom:14px;right:14px;width:32px;height:32px;
      border-bottom:2px solid ${accent};border-right:2px solid ${accent};"></div>
    <div style="position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;
      padding:34px 80px;height:100%;box-sizing:border-box;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
        ${logoHTML(logoUrl, logoText, primary, accent, 44, '50%')}
        <span style="font-size:20px;font-weight:700;color:${primary};letter-spacing:2px;">${siteName}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin:8px 0;">
        <div style="height:1px;width:48px;background:${accent};"></div>
        <div style="color:${accent};font-size:12px;">❖</div>
        <div style="height:1px;width:48px;background:${accent};"></div>
      </div>
      <div style="font-size:11px;color:${accent};letter-spacing:4px;text-transform:uppercase;margin-bottom:12px;">
        CERTIFICATE OF ACHIEVEMENT</div>
      <div style="font-size:26px;font-weight:800;color:${primary};margin-bottom:4px;">${certTitle}</div>
      <div style="font-size:13px;color:#78716c;margin:12px 0 5px;">ขอมอบใบรับรองนี้ให้แก่</div>
      <div style="font-size:36px;font-weight:800;color:#1c1917;
        border-bottom:2px solid ${accent};padding:2px 24px 8px;letter-spacing:1px;margin-bottom:10px;">${cert.full_name}</div>
      <div style="font-size:13px;color:#78716c;margin-bottom:3px;">ได้ผ่านการทดสอบหลักสูตร</div>
      <div style="font-size:20px;font-weight:700;color:${primary};
        border:1.5px solid ${accent};padding:5px 24px;border-radius:4px;margin-bottom:16px;">${cert.course_name}</div>
      <div style="display:flex;gap:36px;align-items:center;margin-bottom:16px;">
        <div style="text-align:center;">
          <div style="font-size:32px;font-weight:800;color:${scoreColor};">${cert.score}/${cert.total}</div>
          <div style="font-size:12px;color:#78716c;">คะแนน</div>
        </div>
        <div style="color:${accent};font-size:16px;">❖</div>
        <div style="text-align:center;">
          <div style="font-size:32px;font-weight:800;color:${scoreColor};">${Math.round(cert.percent)}%</div>
          <div style="font-size:12px;color:#78716c;">เปอร์เซ็นต์</div>
        </div>
        <div style="color:${accent};font-size:16px;">❖</div>
        <div style="text-align:center;">
          <div style="font-size:14px;font-weight:600;color:#44403c;">${fmtDate(cert.issued_at)}</div>
          <div style="font-size:12px;color:#78716c;">วันที่ออกใบรับรอง</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;
        width:100%;margin-top:auto;border-top:1px solid ${accent};padding-top:12px;">
        <div>
          <div style="font-size:12px;color:#a8a29e;margin-bottom:2px;">ออกโดย</div>
          <div style="font-size:15px;font-weight:700;color:#44403c;">${orgName}</div>
          <div style="display:inline-block;margin-top:5px;font-size:11px;color:#78716c;
            background:rgba(0,0,0,0.05);padding:3px 10px;border-radius:4px;">Cert ID: ${cert.cert_id}</div>
        </div>
        ${sigHTML(sigUrl, sigName)}
        ${qrEl(qrDataUrl)}
      </div>
    </div>
  </div>`;
}

function buildMinimal(cfg, { cert, siteName, orgName, certTitle, logoUrl, logoText, sigName, sigUrl, qrDataUrl }) {
  const { primary, accent, scoreColor } = cfg;
  return `<div style="width:1123px;height:794px;position:relative;overflow:hidden;
    background:#ffffff;border:1px solid #e5e7eb;">
    <div style="position:absolute;left:0;top:0;bottom:0;width:6px;background:${primary};"></div>
    <div style="position:relative;z-index:1;display:flex;flex-direction:column;
      padding:40px 72px 40px 54px;height:100%;box-sizing:border-box;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;">
        <div style="display:flex;align-items:center;gap:12px;">
          ${logoHTML(logoUrl, logoText, primary, accent, 42, '8px')}
          <div>
            <div style="font-size:18px;font-weight:700;color:${primary};">${siteName}</div>
            <div style="font-size:10px;color:#9ca3af;letter-spacing:3px;">CERTIFICATE</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px;color:#9ca3af;">วันที่ออก</div>
          <div style="font-size:14px;font-weight:600;color:#374151;">${fmtDate(cert.issued_at)}</div>
        </div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
        <div style="font-size:12px;color:#9ca3af;letter-spacing:3px;margin-bottom:10px;">
          THIS CERTIFICATE IS AWARDED TO</div>
        <div style="font-size:46px;font-weight:800;color:#111827;line-height:1.1;margin-bottom:14px;">${cert.full_name}</div>
        <div style="height:3px;width:72px;background:${primary};margin-bottom:14px;"></div>
        <div style="font-size:15px;color:#6b7280;margin-bottom:3px;">${certTitle}</div>
        <div style="font-size:22px;font-weight:700;color:#374151;margin-bottom:22px;">${cert.course_name}</div>
        <div style="display:flex;gap:28px;align-items:center;">
          <div>
            <div style="font-size:44px;font-weight:900;color:${primary};line-height:1;">${Math.round(cert.percent)}%</div>
            <div style="font-size:12px;color:#9ca3af;margin-top:2px;">ผ่านด้วยคะแนน ${cert.score}/${cert.total}</div>
          </div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;
        border-top:1px solid #e5e7eb;padding-top:14px;">
        <div>
          <div style="font-size:12px;color:#9ca3af;margin-bottom:2px;">ออกโดย</div>
          <div style="font-size:15px;font-weight:700;color:#374151;">${orgName}</div>
          <div style="font-size:11px;color:#6b7280;font-family:monospace;margin-top:4px;">ID: ${cert.cert_id}</div>
        </div>
        ${sigHTML(sigUrl, sigName)}
        ${qrEl(qrDataUrl, 72, 'ตรวจสอบ')}
      </div>
    </div>
  </div>`;
}

export async function generateQR(url, size = 200) {
  return QRCode.toDataURL(url, {
    width: size, margin: 2,
    color: { dark: '#1e3a8a', light: '#ffffff' },
  });
}
