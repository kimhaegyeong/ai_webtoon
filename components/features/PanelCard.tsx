'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Panel } from '@/types';

interface PanelCardProps {
  panel: Panel;
  creatorNickname: string | null;
}

function getAnonymousId(): string {
  const key = 'anon_id';
  const stored = localStorage.getItem(key);
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

export default function PanelCard({ panel, creatorNickname }: PanelCardProps) {
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
      {panel.image_url ? (
        <div className='relative aspect-square w-full bg-gray-100'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={panel.image_url}
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
        <div className='flex aspect-square items-center justify-center bg-gray-100'>
          <p className='text-xs text-gray-400'>이미지 없음</p>
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
