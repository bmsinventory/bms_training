import { supabase } from '../config/supabase.config';

export async function logEmail(payload) {
  await supabase.from('email_logs').insert(payload);
}
