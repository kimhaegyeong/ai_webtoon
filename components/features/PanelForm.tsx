'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { BubblePosition, EpisodeStyle, Panel } from '@/types';

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const BUBBLE_POSITIONS: { value: BubblePosition; label: string }[] = [
  { value: 'left', label: '왼쪽' },
  { value: 'right', label: '오른쪽' },
  { value: 'center', label: '중앙' },
];

type GenerationState = 'idle' | 'generating' | 'error' | 'content_filter';

interface PanelFormProps {
  episodeId: string;
  participantId: string;
  orderIndex: number;
  style: EpisodeStyle;
  characterPrompt: string;
  previousPanelImageBase64: string | null;
  onSuccess: (panel: Panel) => void;
  onCancel: () => void;
}

export default function PanelForm({
  episodeId,
  participantId,
  orderIndex,
  style,
  characterPrompt,
  previousPanelImageBase64,
  onSuccess,
  onCancel,
}: PanelFormProps) {
  const [sceneDescription, setSceneDescription] = useState('');
  const [dialogue, setDialogue] = useState('');
  const [soundEffect, setSoundEffect] = useState('');
  const [bubblePosition, setBubblePosition] = useState<BubblePosition>('center');
  const [genState, setGenState] = useState<GenerationState>('idle');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isDiceLoading, setIsDiceLoading] = useState(false);

  const isValid = sceneDescription.trim().length > 0;
  const isGenerating = genState === 'generating';

  async function handleDice() {
    if (isDiceLoading) return;
    setIsDiceLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('episode_templates')
      .select('scene_description')
      .eq('style', style);
    if (data && data.length > 0) {
      const random = data[Math.floor(Math.random() * data.length)];
      setSceneDescription(random.scene_description as string);
    }
    setIsDiceLoading(false);
  }

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  async function handleGenerate() {
    if (!isValid || isGenerating) return;
    setGenState('generating');

    let imageBase64 = '';
    let mimeType = '';

    try {
      const res = await fetch('/api/generate-panel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style,
          characterPrompt,
          sceneDescription: sceneDescription.trim(),
          dialogue: dialogue.trim() || null,
          soundEffect: soundEffect.trim() || null,
          bubblePosition,
          referenceImageBase64: previousPanelImageBase64,
        }),
      });

      const data: unknown = await res.json();

      if (!res.ok) {
        const errData = data as { error?: string; code?: string };
        if (errData.code === 'CONTENT_FILTER') {
          showToast('내용을 조금 수정해 주세요');
          setGenState('idle');
          return;
        }
        // 이미지 생성 실패 — image_url=null 로 칸 저장 후 완료 처리
        imageBase64 = '';
        mimeType = '';
      } else {
        const okData = data as { imageBase64: string; mimeType: string };
        imageBase64 = okData.imageBase64;
        mimeType = okData.mimeType;
      }
    } catch {
      // 네트워크 오류 등 완전 실패 — image_url=null 로 저장
      imageBase64 = '';
      mimeType = '';
    }

    const supabase = createClient();
    let imageUrl: string | null = null;

    // Upload to Supabase Storage (이미지가 있을 때만)
    if (imageBase64 && mimeType) {
      const ext = mimeType.includes('png') ? 'png' : 'jpg';
      const fileName = `${episodeId}/${Date.now()}.${ext}`;
      const fileBytes = base64ToUint8Array(imageBase64);

      const { error: uploadError } = await supabase.storage
        .from('panels')
        .upload(fileName, fileBytes, { contentType: mimeType, upsert: false });

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('panels').getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }
      // 업로드 실패 시 image_url=null 로 계속 진행
    }

    // Insert panel row (image_url이 null이어도 저장)
    const { data: panel, error: panelError } = await supabase
      .from('panels')
      .insert({
        episode_id: episodeId,
        order_index: orderIndex,
        scene_description: sceneDescription.trim(),
        dialogue: dialogue.trim() || null,
        sound_effect: soundEffect.trim() || null,
        bubble_position: bubblePosition,
        image_url: imageUrl,
        created_by: participantId,
      })
      .select()
      .single();

    if (panelError || !panel) {
      showToast('패널 저장에 실패했어요. 다시 시도해주세요.');
      setGenState('error');
      return;
    }

    setGenState('idle');
    onSuccess(panel);
  }

  // S4: Generating overlay
  if (isGenerating) {
    return (
      <div className='fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 px-6'>
        <div className='mb-6 w-full max-w-xs'>
          <div className='h-2 w-full overflow-hidden rounded-full bg-white/20'>
            <div className='animate-pulse h-full w-3/4 rounded-full bg-indigo-400' />
          </div>
        </div>
        <p className='text-lg font-semibold text-white'>AI가 칸을 그리는 중이에요...</p>
        <p className='mt-2 text-sm text-white/60'>잠시만 기다려 주세요</p>
      </div>
    );
  }

  // S4: Error overlay
  if (genState === 'error') {
    return (
      <div className='fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 px-6'>
        <div className='w-full max-w-sm rounded-2xl bg-white p-6 text-center'>
          <p className='text-lg font-bold text-gray-900'>이미지 생성에 실패했어요</p>
          <p className='mt-1 text-sm text-gray-500'>입력한 내용은 그대로 유지됩니다</p>
          <div className='mt-6 flex gap-3'>
            <button
              type='button'
              onClick={onCancel}
              className='flex-1 rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50'
            >
              취소
            </button>
            <button
              type='button'
              onClick={() => { setGenState('idle'); handleGenerate(); }}
              className='flex-1 rounded-xl bg-indigo-500 py-3 text-sm font-bold text-white hover:bg-indigo-600'
            >
              다시 생성
            </button>
          </div>
        </div>
      </div>
    );
  }

  // S3: Form
  return (
    <div className='fixed inset-0 z-50 flex flex-col bg-white'>
      {/* Toast */}
      {toastMsg && (
        <div className='fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow-lg'>
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <header className='flex items-center justify-between border-b border-gray-200 px-4 py-3'>
        <button type='button' onClick={onCancel} className='text-sm text-gray-500 hover:text-gray-800'>
          ← 뒤로
        </button>
        <span className='text-sm font-medium text-gray-700'>칸 #{orderIndex + 1} 작성 중</span>
        <div className='w-12' />
      </header>

      {/* Scrollable content */}
      <div className='flex-1 overflow-y-auto px-4 py-6'>
        {/* Scene description */}
        <div className='mb-5'>
          <div className='mb-1 flex items-center justify-between'>
            <label className='text-sm font-semibold text-gray-700'>장면 설명 *</label>
            {orderIndex === 0 && (
              <button
                type='button'
                onClick={handleDice}
                disabled={isDiceLoading}
                className='flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600 transition-all hover:bg-indigo-100 disabled:opacity-50'
              >
                {isDiceLoading ? '⏳' : '🎲'} 랜덤 상황 뽑기
              </button>
            )}
          </div>
          <textarea
            value={sceneDescription}
            onChange={(e) => setSceneDescription(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder='예) 교실, 창문 옆 자리. 민지가 책상에 엎드려 잠든 모습'
            className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
          />
        </div>

        {/* Dialogue */}
        <div className='mb-5'>
          <label className='mb-1 block text-sm font-semibold text-gray-700'>
            대사 <span className='font-normal text-gray-400'>(선택)</span>
          </label>
          <input
            type='text'
            value={dialogue}
            onChange={(e) => setDialogue(e.target.value)}
            maxLength={200}
            placeholder='예) "아, 또 지각이잖아!"'
            className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
          />
        </div>

        {/* Sound effect */}
        <div className='mb-5'>
          <label className='mb-1 block text-sm font-semibold text-gray-700'>
            표음 <span className='font-normal text-gray-400'>(선택)</span>
          </label>
          <input
            type='text'
            value={soundEffect}
            onChange={(e) => setSoundEffect(e.target.value)}
            maxLength={100}
            placeholder='예) 쿵, 찌릿, 와르르'
            className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
          />
        </div>

        {/* Bubble position */}
        <div className='mb-8'>
          <label className='mb-2 block text-sm font-semibold text-gray-700'>말풍선 위치</label>
          <div className='flex gap-4'>
            {BUBBLE_POSITIONS.map((pos) => (
              <label key={pos.value} className='flex cursor-pointer items-center gap-2'>
                <input
                  type='radio'
                  name='bubblePosition'
                  value={pos.value}
                  checked={bubblePosition === pos.value}
                  onChange={() => setBubblePosition(pos.value)}
                  className='accent-indigo-500'
                />
                <span className='text-sm text-gray-700'>{pos.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className='border-t border-gray-200 bg-white px-4 py-4'>
        <button
          type='button'
          onClick={handleGenerate}
          disabled={!isValid}
          className='w-full rounded-xl bg-indigo-500 py-4 text-base font-bold text-white transition-all hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40'
        >
          ✨ 생성하기
        </button>
      </div>
    </div>
  );
}
