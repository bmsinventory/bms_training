import { supabase } from '../config/supabase.config';

export async function getCategory(id) {
  const { data: cat } = await supabase
    .from('categories').select('id,name,site').eq('id', Number(id)).single();
  if (!cat) return null;
  const { data: loc } = await supabase
    .from('locations').select('id,code,name').eq('code', cat.site).maybeSingle();
  return { ...cat, location: loc || null };
}

export async function getTrainingCategories() {
  const [catsR, locsR] = await Promise.all([
    supabase.from('categories').select('id,name,description,icon,color,banner_url,site').order('id'),
    supabase.from('locations').select('id,code,name').order('id'),
  ]);
  const locMap = Object.fromEntries((locsR.data || []).map(l => [l.code, l]));
  return (catsR.data || []).map(c => ({ ...c, location: locMap[c.site] || null }));
}

export async function getCategoryQuizStats(categoryId) {
  const { data: courses } = await supabase
    .from('courses')
    .select('id')
    .eq('category_id', Number(categoryId));

  if (!courses?.length) return { total: 0, pass: 0 };

  const courseIds = courses.map(c => c.id);
  const { data } = await supabase
    .from('quiz_attempts')
    .select('status')
    .in('course_id', courseIds)
    .neq('status', 'started');

  const all = data || [];
  return {
    total: all.length,
    pass:  all.filter(a => a.status === 'PASS').length,
  };
}
