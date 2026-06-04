import { supabase } from '../config/supabase.config';

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

export async function getAllAttempts({ courseId, status, search, from, to, locationId } = {}) {
  let q = supabase
    .from('quiz_attempts')
    .select('*, courses(name), certificates(cert_id), location:location_id(id, name, code)')
    .order('created_at', { ascending: false });

  if (courseId)    q = q.eq('course_id', courseId);
  if (status)      q = q.eq('status', status);
  if (search)      q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  if (from)        q = q.gte('created_at', from);
  if (to)          q = q.lte('created_at', to);
  if (locationId)  q = q.eq('location_id', locationId);

  const { data, error } = await q.limit(500);
  if (error) throw error;
  return data;
}

export async function getAttemptCountByCourse(courseId) {
  const { count, error } = await supabase
    .from('quiz_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId);
  if (error) throw error;
  return count || 0;
}

export async function getAttemptCountByLocation(locationId) {
  const { count, error } = await supabase
    .from('quiz_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('location_id', locationId)
    .neq('status', 'started');
  if (error) throw error;
  return count || 0;
}

export async function getAttemptIdsByLocation(locationId) {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('id')
    .eq('location_id', locationId)
    .neq('status', 'started');
  if (error) throw error;
  return (data || []).map(a => a.id);
}

export async function bulkDeleteAttempts(attemptIds) {
  if (!attemptIds.length) return 0;
  const { error: e1 } = await supabase.from('quiz_answers').delete().in('attempt_id', attemptIds);
  if (e1) throw new Error('ลบ quiz_answers ไม่สำเร็จ: ' + e1.message);
  const { error: e2 } = await supabase.from('certificates').delete().in('attempt_id', attemptIds);
  if (e2) throw new Error('ลบ certificates ไม่สำเร็จ: ' + e2.message);
  const { error: e3, count } = await supabase.from('quiz_attempts').delete({ count: 'exact' }).in('id', attemptIds);
  if (e3) throw new Error('ลบ quiz_attempts ไม่สำเร็จ: ' + e3.message);
  if (count === 0) throw new Error('ไม่มีสิทธิ์ลบข้อมูล — กรุณาตรวจสอบ RLS policy ใน Supabase');
  return count;
}

export async function deleteAttemptWithCascade(attemptId) {
  const { error: e1 } = await supabase.from('quiz_answers').delete().eq('attempt_id', attemptId);
  if (e1) throw e1;
  const { error: e2 } = await supabase.from('certificates').delete().eq('attempt_id', attemptId);
  if (e2) throw e2;
  const { error: e3, count } = await supabase.from('quiz_attempts').delete({ count: 'exact' }).eq('id', attemptId);
  if (e3) throw e3;
  return count;
}
