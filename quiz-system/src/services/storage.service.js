import { supabase } from '../config/supabase.config';

export async function uploadCertPdf(certId, pdfBlob) {
  const path = `${certId}.pdf`;
  const { error } = await supabase.storage
    .from('certificates')
    .upload(path, pdfBlob, { contentType: 'application/pdf', upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from('certificates').getPublicUrl(path);
  return data.publicUrl;
}
