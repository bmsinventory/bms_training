import { supabase } from '../config/supabase.config';
import { HISTORY_MAX_RESULTS } from '../config/app.config';

export async function searchAttempts(query) {
  const q = query.trim();
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('*, courses(name), certificates(cert_id, pdf_url, issued_at), location:location_id(id, name, code)')
    .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
    .in('status', ['PASS', 'FAIL'])
    .order('created_at', { ascending: false })
    .limit(HISTORY_MAX_RESULTS);
  if (error) throw error;
  return data;
}
