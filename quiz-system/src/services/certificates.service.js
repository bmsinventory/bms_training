import { supabase } from '../config/supabase.config';

export async function createCertificate(payload) {
  const { data, error } = await supabase
    .from('certificates')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getCertificate(certId) {
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('cert_id', certId)
    .eq('is_revoked', false)
    .single();
  if (error) throw error;
  return data;
}

export async function getCertificateByAttempt(attemptId) {
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('attempt_id', attemptId)
    .single();
  if (error) return null;
  return data;
}

export async function updateCertificatePdf(certId, pdfUrl) {
  const { error } = await supabase
    .from('certificates')
    .update({ pdf_url: pdfUrl })
    .eq('cert_id', certId);
  if (error) throw error;
}

export async function updateCertificateEmail(certId, newEmail) {
  const { error } = await supabase
    .from('certificates')
    .update({ email: newEmail.toLowerCase() })
    .eq('cert_id', certId);
  if (error) throw error;
}

export async function revokeCertificate(certId) {
  const { error } = await supabase
    .from('certificates')
    .update({ is_revoked: true })
    .eq('cert_id', certId);
  if (error) throw error;
}
