'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Panel, EpisodeStyle } from '@/types';

interface PanelCardProps {
  panel: Panel;
  creatorNickname: string | null;
  style: EpisodeStyle;
  characterPrompt: string;
}

function getAnonymousId(): string {
  const key = 'anon_id';
  const stored = localStorage.getItem(key);
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export default function PanelCard({ panel, creatorNickname, style, characterPrompt }: PanelCardProps) {
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(panel.image_url);

  const loadLikes = useCallback(async () => {
    const supabase = createClient();
    const { count } = await supabase
      .from('panel_likes')
      .select('*', { count: 'exact', head: true })
      .eq('panel_id', panel.id);

    setLikeCount(count ?? 0);

    const anonId = getAnonymousId();
    const { data } = await supabase
      .from('panel_likes')
      .select('id')
      .eq('panel_id', panel.id)
      .eq('anonymous_id', anonId)
      .single();

    setLiked(!!data);
  }, [panel.id]);

  useEffect(() => {
    loadLikes();
  }, [loadLikes]);

  async function handleRetry() {
    if (isRetrying) return;
    setIsRetrying(true);
    setRetryError(null);

    try {
      const res = await fetch('/api/generate-panel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style,
          characterPrompt,
          sceneDescription: panel.scene_description,
          dialogue: panel.dialogue,
          soundEffect: panel.sound_effect,
          bubblePosition: panel.bubble_position,
        }),
      });

      const data: unknown = await res.json();

      if (!res.ok) {
        const errData = data as { error?: string };
        setRetryError(errData.error ?? '이미지 생성에 실패했어요.');
        return;
      }

      const { imageBase64, mimeType } = data as { imageBase64: string; mimeType: string };

      const supabase = createClient();
      const ext = mimeType.includes('png') ? 'png' : 'jpg';
      const fileName = `${panel.episode_id}/${Date.now()}-retry-${panel.order_index}.${ext}`;
      const fileBytes = base64ToUint8Array(imageBase64);

      const { error: uploadError } = await supabase.storage
        .from('panels')
        .upload(fileName, fileBytes, { contentType: mimeType, upsert: false });

      if (uploadError) {
        setRetryError('이미지 업로드에 실패했어요.');
        return;
      }

      const { data: urlData } = supabase.storage.from('panels').getPublicUrl(fileName);
      const newImageUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('panels')
        .update({ image_url: newImageUrl })
        .eq('id', panel.id);

      if (updateError) {
        setRetryError('이미지 저장에 실패했어요.');
        return;
      }

      setImageUrl(newImageUrl);
    } catch {
      setRetryError('네트워크 오류가 발생했어요.');
    } finally {
      setIsRetrying(false);
    }
  }

  async function handleLike() {
    if (isLoading) return;
    setIsLoading(true);

    const supabase = createClient();
    const anonId = getAnonymousId();

    if (liked) {
      await supabase
        .from('panel_likes')
        .delete()
        .eq('panel_id', panel.id)
        .eq('anonymous_id', anonId);
      setLiked(false);
      setLikeCount((prev) => Math.max(0, prev - 1));
    } else {
      const { error } = await supabase
        .from('panel_likes')
        .insert({ panel_id: panel.id, anonymous_id: anonId });
      if (!error) {
        setLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    }

    setIsLoading(false);
  }

  return (
    <div className='overflow-hidden rounded-2xl bg-white shadow-sm'>
      {/* Image */}
      {imageUrl ? (
        <div className='relative aspect-square w-full bg-gray-100'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`패널 ${panel.order_index + 1}`}
            className='h-full w-full object-cover'
          />
          {panel.sound_effect && (
            <div className='absolute right-2 top-2 rounded-lg bg-black/60 px-2 py-0.5 text-xs font-bold text-yellow-300'>
              {panel.sound_effect}
            </div>
          )}
        </div>
      ) : (
        <div className='flex aspect-square flex-col items-center justify-center gap-3 bg-gray-100'>
          {isRetrying ? (
            <>
              <div className='h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-400' />
              <p className='text-xs text-gray-400'>이미지 생성 중...</p>
            </>
          ) : (
            <>
              <div className='h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-400' />
              <p className='text-xs text-gray-400'>이미지 준비 중</p>
              {retryError && (
                <p className='max-w-[200px] text-center text-xs text-red-500'>{retryError}</p>
              )}
              <button
                type='button'
                onClick={handleRetry}
                className='rounded-full bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white transition-all hover:bg-indigo-600 active:scale-95'
              >
                다시 생성
              </button>
            </>
          )}
        </div>
      )}

      {/* Dialogue */}
      {panel.dialogue && (
        <div className='border-t border-gray-100 px-4 py-3'>
          <p className='text-sm italic text-gray-800'>"{panel.dialogue}"</p>
        </div>
      )}

      {/* Footer: panel number + creator + like */}
      <div className='flex items-center justify-between px-4 py-2'>
        <div className='flex items-center gap-2 text-xs text-gray-400'>
          <span className='font-medium text-gray-500'>#{panel.order_index + 1}</span>
          {creatorNickname && <span>by {creatorNickname}</span>}
        </div>
        <button
          type='button'
          onClick={handleLike}
          disabled={isLoading}
          className={[
            'flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-all',
            liked
              ? 'bg-rose-50 text-rose-500'
              : 'bg-gray-100 text-gray-400 hover:bg-rose-50 hover:text-rose-400',
          ].join(' ')}
          aria-label={liked ? '좋아요 취소' : '좋아요'}
        >
          <span>{liked ? '♥' : '♡'}</span>
          {likeCount > 0 && <span>{likeCount}</span>}
        </button>
      </div>
    </div>
  );
}
