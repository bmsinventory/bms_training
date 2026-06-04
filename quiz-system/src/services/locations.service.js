import { supabase } from '../config/supabase.config';

export async function getLocations() {
  const { data } = await supabase.from('locations').select('id,code,name').order('id');
  return data || [];
}
