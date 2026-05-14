import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(url, key);

// ─── Courses ──────────────────────────────────────────────
export async function getCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('is_active', true)
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function getCourse(id) {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// ─── Questions (สุ่มข้อสอบ) ────────────────────────────────
export async function getRandomQuestions(courseId, count) {
  const { data, error } = await supabase
    .from('questions')
    .select('id, question, explanation, choices(id, choice_text, is_correct, sort_order)')
    .eq('course_id', courseId)
    .eq('is_active', true);
  if (error) throw error;

  const shuffled = [...data].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  return selected.map(q => ({
    ...q,
    choices: [...q.choices].sort(() => Math.random() - 0.5),
  }));
}

// ─── Quiz Attempts ─────────────────────────────────────────
export async function createAttempt(payload) {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAttempt(id, payload) {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAttempt(id) {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('*, courses(name, pass_percent)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// ─── Quiz Answers ──────────────────────────────────────────
export async function saveAnswers(answers) {
  const { error } = await supabase.from('quiz_answers').insert(answers);
  if (error) throw error;
}

export async function getAnswers(attemptId) {
  const { data, error } = await supabase
    .from('quiz_answers')
    .select('*, questions(question, explanation), choices(choice_text)')
    .eq('attempt_id', attemptId);
  if (error) throw error;
  return data;
}

// ─── Certificates ──────────────────────────────────────────
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

// ─── Settings ─────────────────────────────────────────────
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

// ─── History search ────────────────────────────────────────
export async function searchAttempts(query) {
  const q = query.trim();
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('*, courses(name), certificates(cert_id, pdf_url, issued_at)')
    .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
    .in('status', ['PASS', 'FAIL'])
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

// ─── Admin: all attempts ────────────────────────────────────
export async function getAllAttempts({ courseId, status, search, from, to } = {}) {
  let q = supabase
    .from('quiz_attempts')
    .select('*, courses(name), certificates(cert_id)')
    .order('created_at', { ascending: false });

  if (courseId) q = q.eq('course_id', courseId);
  if (status)   q = q.eq('status', status);
  if (search)   q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  if (from)     q = q.gte('created_at', from);
  if (to)       q = q.lte('created_at', to);

  const { data, error } = await q.limit(500);
  if (error) throw error;
  return data;
}

// ─── Admin: Dashboard stats ────────────────────────────────
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
    certs: certR.count || 0,
    courses: courseR.count || 0,
  };
}

// ─── Storage: upload PDF ───────────────────────────────────
export async function uploadCertPdf(certId, pdfBlob) {
  const path = `${certId}.pdf`;
  const { error } = await supabase.storage
    .from('certificates')
    .upload(path, pdfBlob, { contentType: 'application/pdf', upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from('certificates').getPublicUrl(path);
  return data.publicUrl;
}

// ─── Email log ─────────────────────────────────────────────
export async function logEmail(payload) {
  await supabase.from('email_logs').insert(payload);
}

// ─── Locations (สาขา) ─────────────────────────────────────
export async function getLocations() {
  const { data } = await supabase.from('locations').select('id,code,name').order('id');
  return data || [];
}

// ─── Training categories with location info ────────────────
export async function getTrainingCategories() {
  const [catsR, locsR] = await Promise.all([
    supabase.from('categories').select('id,name,description,icon,color,banner_url,site').order('id'),
    supabase.from('locations').select('id,code,name').order('id'),
  ]);
  const locMap = Object.fromEntries((locsR.data || []).map(l => [l.code, l]));
  return (catsR.data || []).map(c => ({ ...c, location: locMap[c.site] || null }));
}

// ─── Course by category (junction table, fallback to column) ──
export async function getCourseByCategory(categoryId) {
  const { data: links } = await supabase
    .from('course_categories')
    .select('course_id')
    .eq('category_id', Number(categoryId));

  if (links?.length) {
    const { data, error } = await supabase
      .from('courses').select('*')
      .in('id', links.map(l => l.course_id))
      .eq('is_active', true)
      .limit(1).maybeSingle();
    if (error) throw error;
    return data;
  }

  // fallback: old single category_id column
  const { data, error } = await supabase
    .from('courses').select('*')
    .eq('category_id', Number(categoryId))
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ─── All quiz courses with category_ids array ──────────────
export async function getCoursesWithCategory() {
  const [coursesR, linksR] = await Promise.all([
    supabase.from('courses').select('*').eq('is_active', true).order('created_at'),
    supabase.from('course_categories').select('course_id,category_id'),
  ]);
  const courses = coursesR.data || [];
  const links   = linksR.data  || [];

  const catMap = {};
  links.forEach(l => {
    if (!catMap[l.course_id]) catMap[l.course_id] = [];
    catMap[l.course_id].push(l.category_id);
  });

  return courses.map(c => ({
    ...c,
    // use junction table; fallback to old single column
    category_ids: catMap[c.id]?.length ? catMap[c.id] : (c.category_id ? [c.category_id] : []),
  }));
}

// ─── Get category IDs linked to a course ──────────────────
export async function getCourseCategoryIds(courseId) {
  const { data } = await supabase
    .from('course_categories').select('category_id').eq('course_id', courseId);
  return (data || []).map(r => r.category_id);
}

// ─── Replace all category links for a course ──────────────
export async function setCourseCategories(courseId, categoryIds) {
  await supabase.from('course_categories').delete().eq('course_id', courseId);
  if (categoryIds.length) {
    await supabase.from('course_categories').insert(
      categoryIds.map(catId => ({ course_id: courseId, category_id: Number(catId) }))
    );
  }
}

// ─── quiz_attempts count by category (for stats) ───────────
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
