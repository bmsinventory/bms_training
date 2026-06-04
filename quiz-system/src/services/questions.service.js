import { supabase } from '../config/supabase.config';

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

export async function loadCourseWithQuestions(courseId) {
  const [cR, qR] = await Promise.all([
    supabase.from('courses').select('*').eq('id', courseId).single(),
    supabase.from('questions').select('*, choices(*)').eq('course_id', courseId).order('sort_order,created_at'),
  ]);
  return { course: cR.data, questions: qR.data || [] };
}

export async function addQuestion(courseId, { question, explanation, is_active }, validChoices) {
  const { data: q, error } = await supabase.from('questions').insert({
    course_id:   courseId,
    question:    question.trim(),
    explanation: explanation.trim(),
    is_active,
  }).select().single();
  if (error) throw error;

  const { error: cErr } = await supabase.from('choices').insert(
    validChoices.map((c, i) => ({
      question_id: q.id,
      choice_text: c.choice_text.trim(),
      is_correct:  c.is_correct,
      sort_order:  i,
    }))
  );
  if (cErr) throw cErr;
  return q;
}

export async function updateQuestion(questionId, { question, explanation, is_active }, validChoices) {
  const { error: qErr } = await supabase.from('questions').update({
    question:    question.trim(),
    explanation: explanation.trim(),
    is_active,
    updated_at:  new Date().toISOString(),
  }).eq('id', questionId);
  if (qErr) throw qErr;

  await supabase.from('choices').delete().eq('question_id', questionId);
  const { error: cErr } = await supabase.from('choices').insert(
    validChoices.map((c, i) => ({
      question_id: questionId,
      choice_text: c.choice_text.trim(),
      is_correct:  c.is_correct,
      sort_order:  i,
    }))
  );
  if (cErr) throw cErr;
}

export async function deleteQuestion(questionId) {
  await supabase.from('quiz_answers').delete().in('question_id', [questionId]);
  await supabase.from('choices').delete().eq('question_id', questionId);
  const { error } = await supabase.from('questions').delete().eq('id', questionId);
  if (error) throw error;
}

export async function toggleQuestionActive(questionId, currentActive) {
  const { error } = await supabase
    .from('questions')
    .update({ is_active: !currentActive })
    .eq('id', questionId);
  if (error) throw error;
}

export async function getAttemptHistory(courseId, { statusFilter, locationId } = {}) {
  let q = supabase.from('quiz_attempts')
    .select('*, certificates(cert_id), location:location_id(id, name, code)')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });
  if (statusFilter) q = q.eq('status', statusFilter);
  if (locationId !== null && locationId !== undefined) q = q.eq('location_id', locationId);
  const { data, error } = await q.limit(500);
  if (error) throw error;
  return data || [];
}

export async function clearAllCourseAttempts(courseId) {
  const { data: all } = await supabase.from('quiz_attempts')
    .select('id').eq('course_id', courseId);
  const ids = (all || []).map(a => a.id);
  if (ids.length) {
    await supabase.from('quiz_answers').delete().in('attempt_id', ids);
    await supabase.from('certificates').delete().in('attempt_id', ids);
    await supabase.from('quiz_attempts').delete().eq('course_id', courseId);
  }
  return ids.length;
}

export async function clearCourseAttemptsByLocation(courseId, locationId) {
  const { data: all } = await supabase.from('quiz_attempts')
    .select('id').eq('course_id', courseId).eq('location_id', locationId);
  const ids = (all || []).map(a => a.id);
  if (ids.length) {
    await supabase.from('quiz_answers').delete().in('attempt_id', ids);
    await supabase.from('certificates').delete().in('attempt_id', ids);
    await supabase.from('quiz_attempts').delete().in('id', ids);
  }
  return ids.length;
}

export async function deleteOneAttempt(attemptId) {
  await supabase.from('quiz_answers').delete().eq('attempt_id', attemptId);
  await supabase.from('certificates').delete().eq('attempt_id', attemptId);
  const { error } = await supabase.from('quiz_attempts').delete().eq('id', attemptId);
  if (error) throw error;
}
