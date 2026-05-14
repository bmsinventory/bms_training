import emailjs from '@emailjs/browser';

/**
 * ส่งอีเมลใบรับรองผ่าน EmailJS (เรียกจาก browser ได้โดยตรง ไม่ต้อง server)
 * ตั้งค่าได้ที่ Admin → Settings: emailjs_service_id, emailjs_template_id, emailjs_public_key
 */
export async function sendCertEmail({ toEmail, toName, certId, courseName, score, total, percent, issuedAt, pdfUrl, settings }) {
  const serviceId  = settings.emailjs_service_id;
  const templateId = settings.emailjs_template_id;
  const publicKey  = settings.emailjs_public_key;

  if (!serviceId || !templateId || !publicKey) {
    throw new Error('ยังไม่ได้ตั้งค่า EmailJS ใน Admin → Settings');
  }

  const verifyBase = settings.verify_base_url || (window.location.origin + '/quiz/#/verify');
  const verifyUrl  = `${verifyBase}/${certId}`;
  const siteName   = settings.site_name || 'BMS Training';
  const orgName    = settings.org_name  || '';

  const issuedDate = issuedAt
    ? new Date(issuedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

  await emailjs.send(serviceId, templateId, {
    to_name:     toName,
    to_email:    toEmail,
    cert_id:     certId,
    course_name: courseName,
    score:       String(score),
    total:       String(total),
    percent:     String(Math.round(percent)),
    issued_date: issuedDate,
    pdf_url:     pdfUrl || '',
    verify_url:  verifyUrl,
    site_name:   siteName,
    org_name:    orgName,
  }, publicKey);
}
