import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { buildCertHTML, getCertConfig } from '../lib/certificate';

export default function CertPreviewCard({ cert, settings = {}, scale = 0.45 }) {
  const [qrDataUrl, setQrDataUrl] = useState('');

  const certId   = cert?.cert_id || 'PREVIEW-0000';
  const verifyUrl = `${settings.verify_base_url || (typeof window !== 'undefined' ? window.location.origin + '/quiz/#/verify' : '')}/${certId}`;

  useEffect(() => {
    const cfg = getCertConfig(settings);
    QRCode.toDataURL(verifyUrl, {
      width: 120, margin: 1,
      color: { dark: cfg.primary, light: '#ffffff' },
    }).then(setQrDataUrl).catch(() => setQrDataUrl(''));
  }, [verifyUrl, settings.cert_primary_color, settings.cert_template]);

  const w = Math.round(1123 * scale);
  const h = Math.round(794 * scale);

  if (!qrDataUrl) {
    return (
      <div style={{ width: w, height: h, background:'#f3f4f6', borderRadius:12,
                     display:'flex', alignItems:'center', justifyContent:'center',
                     color:'#9ca3af', fontSize:14 }}>
        กำลังสร้างตัวอย่าง...
      </div>
    );
  }

  const html = buildCertHTML(cert || {
    full_name:   'นายตัวอย่าง ใบรับรอง',
    course_name: 'หลักสูตรฝึกอบรมตัวอย่าง',
    score: 85, total: 100, percent: 85,
    issued_at: new Date().toISOString(),
    cert_id: certId,
  }, settings, qrDataUrl);

  return (
    <div style={{ width: w, height: h, overflow: 'hidden', position: 'relative', borderRadius: 8 }}>
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: 1123,
          height: 794,
          fontFamily: "'Sarabun', sans-serif",
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
