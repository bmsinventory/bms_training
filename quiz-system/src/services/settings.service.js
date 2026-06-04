import { supabase } from '../config/supabase.config';

export async function getSettings() {
  const { data, error } = await supabase.from('settings').select('*');
  if (error) throw error;
  return Object.fromEntries(data.map(r => [r.key, r.value]));
}

export async function saveSetting(key, value) {
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}
