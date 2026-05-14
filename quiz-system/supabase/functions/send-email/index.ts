import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      toEmail,
      toName,
      certId,
      courseName,
      score,
      total,
      percent,
      issuedAt,
      pdfUrl,
      attemptId,
      settings,
    } = body;

    // ดึง settings จาก Supabase ถ้าไม่ส่งมา
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let stg = settings;
    if (!stg) {
      const { data } = await supabase.from('settings').select('*');
      stg = Object.fromEntries((data || []).map((r: any) => [r.key, r.value]));
    }

    const resendApiKey = stg.resend_api_key || Deno.env.get('RESEND_API_KEY') || '';
    if (!resendApiKey) {
      throw new Error('Resend API Key not configured');
    }

    const fromEmail = stg.email_from      || 'noreply@bms-training.com';
    const fromName  = stg.email_from_name || 'BMS Training';
    const subject   = stg.email_subject   || 'ใบรับรองผ่านการทดสอบ';
    const siteName  = stg.site_name       || 'BMS Training';
    const orgName   = stg.org_name        || '';
    const verifyUrl = stg.verify_base_url
      ? `${stg.verify_base_url}/${certId}`
      : `https://bms-training.vercel.app/verify/${certId}`;

    const issuedDate = issuedAt
      ? new Date(issuedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

    const percentRounded = Math.round(percent);

    const htmlBody = `
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ใบรับรองการผ่านการทดสอบ</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:32px;text-align:center;">
          <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:8px;">
            <div style="width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:10px;display:inline-flex;align-items:center;justify-content:center;">
              <span style="color:white;font-size:20px;font-weight:900;">B</span>
            </div>
            <span style="color:white;font-size:18px;font-weight:700;">${siteName}</span>
          </div>
          <div style="color:rgba(255,255,255,0.8);font-size:13px;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">
            Certificate of Achievement
          </div>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:32px;">
          <p style="color:#374151;font-size:15px;margin:0 0 8px;">สวัสดีคุณ <strong>${toName}</strong>,</p>
          <p style="color:#6b7280;font-size:14px;margin:0 0 24px;line-height:1.6;">
            ขอแสดงความยินดีที่ผ่านการทดสอบหลักสูตร <strong style="color:#1d4ed8;">${courseName}</strong> เรียบร้อยแล้ว
          </p>

          <!-- Score box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:24px;">
            <tr>
              <td style="padding:20px;text-align:center;">
                <div style="font-size:12px;color:#16a34a;font-weight:600;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">ผลการทดสอบ</div>
                <div style="font-size:48px;font-weight:900;color:#15803d;line-height:1;">${percentRounded}%</div>
                <div style="font-size:14px;color:#16a34a;margin-top:4px;">${score} จาก ${total} ข้อ</div>
                <div style="display:inline-block;background:#22c55e;color:white;font-size:13px;font-weight:700;padding:4px 16px;border-radius:999px;margin-top:10px;">✅ PASS</div>
              </td>
            </tr>
          </table>

          <!-- Cert info -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;margin-bottom:24px;">
            <tr>
              <td style="padding:16px;">
                <div style="font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase;margin-bottom:12px;">ข้อมูลใบรับรอง</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:4px 0;font-size:13px;color:#6b7280;width:120px;">Cert ID</td>
                    <td style="padding:4px 0;font-size:13px;font-weight:700;color:#1d4ed8;font-family:monospace;">${certId}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-size:13px;color:#6b7280;">หลักสูตร</td>
                    <td style="padding:4px 0;font-size:13px;font-weight:600;color:#111827;">${courseName}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-size:13px;color:#6b7280;">วันที่ออก</td>
                    <td style="padding:4px 0;font-size:13px;color:#374151;">${issuedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;font-size:13px;color:#6b7280;">ออกโดย</td>
                    <td style="padding:4px 0;font-size:13px;color:#374151;">${orgName}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Buttons -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-bottom:8px;">
                ${pdfUrl ? `
                <a href="${pdfUrl}" style="display:block;background:#2563eb;color:white;text-decoration:none;text-align:center;padding:12px;border-radius:10px;font-size:14px;font-weight:600;">
                  ⬇️ ดาวน์โหลดใบรับรอง PDF
                </a>` : ''}
              </td>
            </tr>
            <tr>
              <td>
                <a href="${verifyUrl}" style="display:block;background:#f0f9ff;color:#2563eb;text-decoration:none;text-align:center;padding:12px;border-radius:10px;font-size:14px;font-weight:600;border:1px solid #bfdbfe;">
                  🛡️ ตรวจสอบใบรับรองออนไลน์
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">
            อีเมลนี้ส่งโดย ${siteName} · ${orgName}<br/>
            หากมีข้อสงสัย กรุณาติดต่อผู้ดูแลระบบ
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

    // ส่งอีเมลผ่าน Resend API
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    `${fromName} <${fromEmail}>`,
        to:      [toEmail],
        subject: `${subject} – ${courseName}`,
        html:    htmlBody,
      }),
    });

    const resendData = await resendRes.json();

    // บันทึก email log
    const logStatus = resendRes.ok ? 'sent' : 'failed';
    await supabase.from('email_logs').insert({
      attempt_id: attemptId || null,
      cert_id:    certId,
      to_email:   toEmail,
      subject:    `${subject} – ${courseName}`,
      status:     logStatus,
      error:      resendRes.ok ? null : JSON.stringify(resendData),
    });

    if (!resendRes.ok) {
      throw new Error(`Resend error: ${JSON.stringify(resendData)}`);
    }

    return new Response(
      JSON.stringify({ success: true, messageId: resendData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('send-email error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
