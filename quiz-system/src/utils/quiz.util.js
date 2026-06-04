import { CERT_ID_PREFIX } from '../config/app.config';

export function makeCertId(prefix = CERT_ID_PREFIX) {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 900000) + 100000;
  return `${prefix}-${year}-${rand}`;
}

export function gradeQuiz(questions, answers) {
  let correct = 0;
  const details = questions.map(q => {
    const userChoiceId  = answers[q.id];
    const correctChoice = q.choices.find(c => c.is_correct);
    const userChoice    = q.choices.find(c => c.id === userChoiceId);
    const isCorrect     = userChoiceId === correctChoice?.id;
    if (isCorrect) correct++;
    return {
      question:      q.question,
      explanation:   q.explanation,
      userChoice:    userChoice?.choice_text || '(ไม่ได้ตอบ)',
      correctChoice: correctChoice?.choice_text || '',
      isCorrect,
    };
  });

  const total   = questions.length;
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

  return { correct, total, percent, details };
}
