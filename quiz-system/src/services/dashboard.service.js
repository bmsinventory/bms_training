import { supabase } from '../config/supabase.config';

export async function getDashboardStats() {
  const [attR, certR, courseR] = await Promise.all([
    supabase.from('quiz_attempts').select('status, percent').not('status', 'eq', 'started'),
    supabase.from('certificates').select('id', { count: 'exact', head: true }),
    supabase.from('courses').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ]);

  const attempts = attR.data || [];
  const pass = attempts.filter(a => a.status === 'PASS').length;
  const fail = attempts.filter(a => a.status === 'FAIL').length;
  const avgPercent = attempts.length
    ? (attempts.reduce((s, a) => s + (a.percent || 0), 0) / attempts.length).toFixed(1)
    : 0;

  return {
    total: attempts.length,
    pass,
    fail,
    avgPercent,
    certs:   certR.count   || 0,
    courses: courseR.count || 0,
  };
}
