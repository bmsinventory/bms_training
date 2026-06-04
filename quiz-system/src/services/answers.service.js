import { supabase } from '../config/supabase.config';

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
