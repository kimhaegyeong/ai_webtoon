import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { genAI } from '@/lib/gemini/client';
import { buildImagePrompt } from '@/lib/gemini/prompts';

const requestSchema = z.object({
  style: z.enum(['webtoon', 'four_cut', 'shoujo', 'action', 'chibi', 'noir']),
  characterPrompt: z.string().min(1).max(500),
  sceneDescription: z.string().min(1).max(500),
  dialogue: z.string().max(200).nullable().optional(),
  soundEffect: z.string().max(100).nullable().optional(),
  bubblePosition: z.enum(['left', 'right', 'center']).default('center'),
  referenceImageBase64: z.string().nullable().optional(),
});

export type GeneratePanelRequest = z.infer<typeof requestSchema>;
export type GeneratePanelResponse =
  | { imageBase64: string; mimeType: string }
  | { error: string; code: 'TIMEOUT' | 'CONTENT_FILTER' | 'API_ERROR' };

export async function POST(request: NextRequest): Promise<NextResponse<GeneratePanelResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.', code: 'API_ERROR' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.', code: 'API_ERROR' },
      { status: 422 },
    );
  }

  const { style, characterPrompt, sceneDescription, dialogue, soundEffect, bubblePosition, referenceImageBase64 } =
    parsed.data;

  const prompt = buildImagePrompt(
    style,
    characterPrompt,
    sceneDescription,
    dialogue ?? null,
    soundEffect ?? null,
    bubblePosition,
  );

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: prompt }];

    if (referenceImageBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: referenceImageBase64,
        },
      });
    }

    const timeoutMs = 60_000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AbortError')), timeoutMs),
    );

    let result: Awaited<ReturnType<typeof model.generateContent>>;
    result = await Promise.race([
      model.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          // @ts-expect-error: responseModalities is not yet in the SDK type definitions
          responseModalities: ['IMAGE', 'TEXT'],
        },
      }),
      timeoutPromise,
    ]);

    const candidate = result.response.candidates?.[0];
    if (!candidate) {
      return NextResponse.json(
        { error: '이미지를 생성하지 못했어요. 다시 시도해주세요.', code: 'API_ERROR' },
        { status: 502 },
      );
    }

    if (candidate.finishReason === 'SAFETY') {
      return NextResponse.json({ error: '내용을 조금 수정해 주세요.', code: 'CONTENT_FILTER' }, { status: 400 });
    }

    const imagePart = candidate.content.parts.find(
      (p) => 'inlineData' in p && p.inlineData?.mimeType.startsWith('image/'),
    );
    if (!imagePart || !('inlineData' in imagePart) || !imagePart.inlineData) {
      return NextResponse.json({ error: '이미지 데이터를 받지 못했어요.', code: 'API_ERROR' }, { status: 502 });
    }

    return NextResponse.json({
      imageBase64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType,
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.name === 'AbortError' || error.message === 'AbortError')) {
      return NextResponse.json({ error: '이미지 생성 시간이 초과되었어요.', code: 'TIMEOUT' }, { status: 504 });
    }
    console.error('[generate-panel] Gemini API error:', error);
    return NextResponse.json({ error: '잠시 후 다시 시도해주세요.', code: 'API_ERROR' }, { status: 502 });
  }
}
