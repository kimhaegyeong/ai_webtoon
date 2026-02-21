import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient as createServerClient } from '@/lib/supabase/server';

const DAILY_LIMIT = 10;

const requestSchema = z.object({
  style: z.enum(['webtoon', 'four_cut', 'shoujo', 'action', 'chibi', 'noir']),
  characterPrompt: z.string().min(1).max(300),
  title: z.string().max(50).nullable().optional(),
  summary: z.string().max(100).nullable().optional(),
  nickname: z.string().min(1).max(10),
  creatorId: z.string().min(1).max(100), // 클라이언트 식별자 (localStorage UUID 또는 향후 user_id)
});

export type CreateEpisodeRequest = z.infer<typeof requestSchema>;
export type CreateEpisodeResponse =
  | { episodeId: string; participantId: string }
  | { error: string; code: 'DAILY_LIMIT' | 'VALIDATION_ERROR' | 'DB_ERROR' };

export async function POST(request: NextRequest): Promise<NextResponse<CreateEpisodeResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.', code: 'DB_ERROR' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.', code: 'VALIDATION_ERROR' },
      { status: 422 },
    );
  }

  const { style, characterPrompt, title, summary, nickname, creatorId } = parsed.data;

  const supabase = await createServerClient();

  // 오늘 생성한 에피소드 수 확인 (KST 기준 당일 00:00~23:59)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('episodes')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', creatorId)
    .gte('created_at', todayStart.toISOString());

  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: '오늘 생성 가능한 만화를 모두 사용했어요. 내일 다시 시도해주세요.', code: 'DAILY_LIMIT' },
      { status: 429 },
    );
  }

  // 에피소드 생성
  const { data: episode, error: episodeError } = await supabase
    .from('episodes')
    .insert({
      style,
      character_prompt: characterPrompt,
      title: title ?? null,
      summary: summary ?? null,
      creator_id: creatorId,
    })
    .select()
    .single();

  if (episodeError || !episode) {
    console.error('[create-episode] episode insert error:', episodeError);
    return NextResponse.json({ error: '에피소드 생성에 실패했어요.', code: 'DB_ERROR' }, { status: 500 });
  }

  // 방장 참여자 등록
  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .insert({
      episode_id: episode.id,
      nickname: nickname.trim(),
      turn_order: 0,
    })
    .select()
    .single();

  if (participantError || !participant) {
    console.error('[create-episode] participant insert error:', participantError);
    return NextResponse.json({ error: '참여자 등록에 실패했어요.', code: 'DB_ERROR' }, { status: 500 });
  }

  return NextResponse.json({ episodeId: episode.id, participantId: participant.id });
}
