import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { genAI } from '@/lib/gemini/client';

const existingPanelSchema = z.object({
  sceneDescription: z.string().min(1).max(500),
  dialogue: z.string().max(200).nullable().optional(),
  soundEffect: z.string().max(100).nullable().optional(),
});

const requestSchema = z.object({
  style: z.enum(['webtoon', 'four_cut', 'shoujo', 'action', 'chibi', 'noir']),
  characterPrompt: z.string().min(1).max(500),
  existingPanels: z.array(existingPanelSchema).min(1).max(20),
  panelCount: z.number().int().min(1).max(6),
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
  webtoon: 'full-color Korean webtoon',
  four_cut: '4-panel black-and-white manga',
  shoujo: 'shoujo manga with flowery romantic atmosphere',
  action: 'action manga with speed lines and dynamic composition',
  chibi: 'super-deformed chibi style with pastel colors',
  noir: 'black-and-white noir with heavy shadows',
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

  const { style, characterPrompt, existingPanels, panelCount } = parsed.data;

  const existingPanelsText = existingPanels
    .map((p, i) => {
      const parts = [`Panel ${i + 1}: ${p.sceneDescription}`];
      if (p.dialogue) parts.push(`대사: "${p.dialogue}"`);
      if (p.soundEffect) parts.push(`효과음: ${p.soundEffect}`);
      return parts.join(' | ');
    })
    .join('\n');

  const prompt = `You are a webtoon story writer. Generate ${panelCount} continuation panel(s) for the following story.

Style: ${STYLE_CONTEXT[style] ?? style}
Character: ${characterPrompt}

Existing panels:
${existingPanelsText}

Generate exactly ${panelCount} continuation panel(s) that naturally continue the story. Write descriptions in Korean.

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "panels": [
    {
      "sceneDescription": "장면 설명 (Korean, 10-100 chars)",
      "dialogue": "대사 (Korean) or null",
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
