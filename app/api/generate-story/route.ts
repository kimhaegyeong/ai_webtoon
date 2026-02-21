import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { genAI } from '@/lib/gemini/client';

const existingPanelSchema = z.object({
  sceneDescription: z.string().min(1).max(500),
  dialogue: z.string().max(200).nullable().optional(),
  soundEffect: z.string().max(100).nullable().optional(),
  orderIndex: z.number().int().min(0).optional(),
});

const requestSchema = z.object({
  style: z.enum(['webtoon', 'four_cut', 'shoujo', 'action', 'chibi', 'noir']),
  characterPrompt: z.string().min(1).max(500),
  existingPanels: z.array(existingPanelSchema).min(1).max(20),
  panelCount: z.number().int().min(1).max(6),
  totalPanelCount: z.number().int().min(0).optional(),
});

const storyPanelSchema = z.object({
  sceneDescription: z.string(),
  dialogue: z.string().nullable(),
  soundEffect: z.string().nullable(),
  bubblePosition: z.enum(['left', 'right', 'center']),
});

export type GenerateStoryRequest = z.infer<typeof requestSchema>;
export type StoryPanel = z.infer<typeof storyPanelSchema>;
export type GenerateStoryResponse =
  | { panels: StoryPanel[] }
  | { error: string; code: 'VALIDATION_ERROR' | 'API_ERROR' | 'TIMEOUT' };

const STYLE_CONTEXT: Record<string, string> = {
  webtoon: 'full-color Korean webtoon — use natural conversational Korean dialogue',
  four_cut: '4-panel black-and-white manga — keep dialogue short and punchy, comedic timing',
  shoujo: 'shoujo manga with flowery romantic atmosphere — emotional, lyrical, soft expressions',
  action: 'action manga with speed lines and dynamic composition — short intense dialogue, powerful sound effects',
  chibi: 'super-deformed chibi style with pastel colors — cute, playful, exaggerated emotions',
  noir: 'black-and-white noir with heavy shadows — dry, terse, moody narration',
};

export async function POST(request: NextRequest): Promise<NextResponse<GenerateStoryResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.', code: 'API_ERROR' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.', code: 'VALIDATION_ERROR' },
      { status: 422 },
    );
  }

  const { style, characterPrompt, existingPanels, panelCount, totalPanelCount } = parsed.data;

  const currentPanelNumber = existingPanels.length + 1;
  const estimatedTotal = (totalPanelCount ?? existingPanels.length) + panelCount;
  const narrativePhase =
    currentPanelNumber <= Math.ceil(estimatedTotal * 0.25)
      ? '도입부 (세계관·캐릭터 소개, 분위기 설정)'
      : currentPanelNumber <= Math.ceil(estimatedTotal * 0.65)
        ? '전개/위기 (갈등 심화, 감정 고조)'
        : currentPanelNumber <= Math.ceil(estimatedTotal * 0.85)
          ? '절정 (클라이맥스, 가장 강렬한 장면)'
          : '결말 (해소, 여운)';

  const existingPanelsText = existingPanels
    .map((p, i) => {
      const parts = [`[${i + 1}컷] 장면: ${p.sceneDescription}`];
      if (p.dialogue) parts.push(`대사: "${p.dialogue}"`);
      if (p.soundEffect) parts.push(`효과음: ${p.soundEffect}`);
      return parts.join(' | ');
    })
    .join('\n');

  const prompt = `You are a webtoon story writer. Generate ${panelCount} continuation panel(s) for the following story.

Style: ${STYLE_CONTEXT[style] ?? style}
Character: ${characterPrompt}

Story position: Currently at panel ${currentPanelNumber}, estimated total ${estimatedTotal} panels.
Narrative phase: ${narrativePhase}

Existing panels (read carefully to maintain character emotional continuity):
${existingPanelsText}

Rules:
- Write scene descriptions and dialogue in Korean.
- Dialogue must be 40 characters or fewer (Korean). If no dialogue needed, use null.
- Sound effects should be brief Korean onomatopoeia (e.g. 쾅, 스르르, 두근두근) or null.
- Match the tone of the style: ${STYLE_CONTEXT[style] ?? style}
- Continue naturally from the last panel's emotional state and character situation.
- Each panel must advance the story according to the current narrative phase: ${narrativePhase}

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "panels": [
    {
      "sceneDescription": "장면 설명 (Korean, 10-100 chars)",
      "dialogue": "대사 (Korean, max 40 chars) or null",
      "soundEffect": "효과음 (Korean) or null",
      "bubblePosition": "left" or "right" or "center"
    }
  ]
}`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const timeoutMs = 30_000;
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
    }, timeoutMs);

    let responseText: string;
    try {
      const result = await model.generateContent(prompt);
      responseText = result.response.text();
    } finally {
      clearTimeout(timeoutId);
    }

    if (timedOut) {
      return NextResponse.json({ error: '스토리 생성 시간이 초과되었어요.', code: 'TIMEOUT' }, { status: 504 });
    }

    // Extract JSON from response (strip markdown code fences if present)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[generate-story] No JSON in response:', responseText);
      return NextResponse.json({ error: '스토리 생성 결과를 파싱할 수 없어요.', code: 'API_ERROR' }, { status: 502 });
    }

    let parsedData: unknown;
    try {
      parsedData = JSON.parse(jsonMatch[0]);
    } catch {
      console.error('[generate-story] JSON parse error:', jsonMatch[0]);
      return NextResponse.json({ error: '스토리 생성 결과를 파싱할 수 없어요.', code: 'API_ERROR' }, { status: 502 });
    }

    const validation = z.object({ panels: z.array(storyPanelSchema) }).safeParse(parsedData);
    if (!validation.success) {
      console.error('[generate-story] Schema validation failed:', validation.error.issues);
      return NextResponse.json({ error: '스토리 형식이 올바르지 않아요.', code: 'API_ERROR' }, { status: 502 });
    }

    return NextResponse.json({ panels: validation.data.panels });
  } catch (error: unknown) {
    console.error('[generate-story] Gemini API error:', error);
    return NextResponse.json({ error: '잠시 후 다시 시도해주세요.', code: 'API_ERROR' }, { status: 502 });
  }
}
