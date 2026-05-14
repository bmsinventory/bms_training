import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge Function: grade-quiz
 * รับ: { attemptId, answers: { questionId: choiceId } }
 * คืน: { score, total, percent, status, certId? }
 *
 * หมายเหตุ: ระบบ Frontend ที่จัดการ grading เองแล้ว
 * Function นี้เป็น option สำรองสำหรับ server-side grading ที่ปลอดภัยกว่า
 */
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { attemptId, answers } = await req.json();
    // answers: { [questionId]: choiceId }

    if (!attemptId || !answers) {
      throw new Error('Missing attemptId or answers');
    }

    // ดึง attempt
    const { data: attempt, error: attErr } = await supabase
      .from('quiz_attempts')
      .select('*, courses(name, pass_percent, questions_count)')
      .eq('id', attemptId)
      .single();

    if (attErr || !attempt) throw new Error('Attempt not found');
    if (attempt.status !== 'started') throw new Error('Quiz already submitted');

    // ดึง question IDs ที่ส่งมา
    const questionIds = Object.keys(answers);

    // ดึงคำถามและตัวเลือกที่ถูกต้อง
    const { data: questions, error: qErr } = await supabase
      .from('questions')
      .select('id, choices(id, is_correct)')
      .in('id', questionIds);

    if (qErr) throw qErr;

    // ตรวจคะแนน
    let correctCount = 0;
    const answerRows: any[] = [];

    for (const q of questions) {
      const userChoiceId = answers[q.id];
      const correctChoice = (q.choices as any[]).find(c => c.is_correct);
      const isCorrect = userChoiceId === correctChoice?.id;
      if (isCorrect) correctCount++;

      answerRows.push({
        attempt_id:  attemptId,
        question_id: q.id,
        choice_id:   userChoiceId || null,
        is_correct:  isCorrect,
      });
    }

    const total   = questionIds.length;
    const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const passPercent = attempt.courses?.pass_percent || 80;
    const status  = percent >= passPercent ? 'PASS' : 'FAIL';

    // บันทึกคำตอบ
    if (answerRows.length > 0) {
      await supabase.from('quiz_answers').insert(answerRows);
    }

    // อัปเดต attempt
    await supabase.from('quiz_attempts').update({
      score:        correctCount,
      total:        total,
      percent:      percent,
      status:       status,
      question_ids: questionIds,
      completed_at: new Date().toISOString(),
    }).eq('id', attemptId);

    // ถ้าผ่าน สร้างใบรับรอง
    let certId: string | null = null;
    if (status === 'PASS') {
      // ตรวจว่ามีใบรับรองแล้วหรือไม่
      const { data: existingCert } = await supabase
        .from('certificates')
        .select('cert_id')
        .eq('attempt_id', attemptId)
        .single();

      if (!existingCert) {
        // ดึง settings
        const { data: settingsRows } = await supabase.from('settings').select('*');
        const settings = Object.fromEntries(
          (settingsRows || []).map((r: any) => [r.key, r.value])
        );
        const prefix  = settings.cert_prefix || 'BMS';

        // สร้าง cert_id แบบ sequential
        const { data: certIdRow } = await supabase.rpc('generate_cert_id', { prefix });
        certId = certIdRow as string;

        await supabase.from('certificates').insert({
          attempt_id:  attemptId,
          cert_id:     certId,
          full_name:   attempt.full_name,
          email:       attempt.email,
          course_id:   attempt.course_id,
          course_name: attempt.courses?.name || '',
          score:       correctCount,
          total:       total,
          percent:     percent,
        });
      } else {
        certId = existingCert.cert_id;
      }
    }

    return new Response(
      JSON.stringify({ success: true, score: correctCount, total, percent, status, certId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('grade-quiz error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
