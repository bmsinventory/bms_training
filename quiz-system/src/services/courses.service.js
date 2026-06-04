import { supabase } from '../config/supabase.config';

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
    category_ids: catMap[c.id]?.length ? catMap[c.id] : (c.category_id ? [c.category_id] : []),
  }));
}

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

  const { data, error } = await supabase
    .from('courses').select('*')
    .eq('category_id', Number(categoryId))
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCourseCategoryIds(courseId) {
  const { data } = await supabase
    .from('course_categories').select('category_id').eq('course_id', courseId);
  return (data || []).map(r => r.category_id);
}

export async function getAllCoursesAdmin() {
  const [coursesR, linksR] = await Promise.all([
    supabase.from('courses').select('*').order('created_at'),
    supabase.from('course_categories').select('course_id,category_id'),
  ]);
  const courses = coursesR.data || [];
  const links   = linksR.data  || [];
  const catMap  = {};
  links.forEach(l => {
    if (!catMap[l.course_id]) catMap[l.course_id] = [];
    catMap[l.course_id].push(l.category_id);
  });
  return courses.map(c => ({
    ...c,
    category_ids: catMap[c.id]?.length ? catMap[c.id] : (c.category_id ? [c.category_id] : []),
  }));
}

export async function createCourse(payload) {
  const { data, error } = await supabase.from('courses').insert(payload).select('id').single();
  if (error) throw error;
  return data;
}

export async function updateCourse(id, payload) {
  const { error } = await supabase
    .from('courses')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function toggleCourseActive(id, currentActive) {
  const { error } = await supabase
    .from('courses')
    .update({ is_active: !currentActive })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteCourse(courseId) {
  const { data: attempts } = await supabase
    .from('quiz_attempts').select('id').eq('course_id', courseId);
  const attemptIds = (attempts || []).map(a => a.id);
  if (attemptIds.length) {
    await supabase.from('quiz_answers').delete().in('attempt_id', attemptIds);
    await supabase.from('certificates').delete().in('attempt_id', attemptIds);
    await supabase.from('quiz_attempts').delete().eq('course_id', courseId);
  }
  await supabase.from('course_categories').delete().eq('course_id', courseId);
  const { error } = await supabase.from('courses').delete().eq('id', courseId);
  if (error) throw error;
}

export async function setCourseCategories(courseId, categoryIds) {
  const { error: delErr } = await supabase
    .from('course_categories').delete().eq('course_id', courseId);
  if (delErr) throw delErr;
  if (categoryIds.length) {
    const { error: insErr } = await supabase
      .from('course_categories')
      .insert(categoryIds.map(catId => ({ course_id: courseId, category_id: Number(catId) })));
    if (insErr) throw insErr;
  }
}
