'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import PanelCard from '@/components/features/PanelCard';
import type { Episode, Panel, Participant, EpisodeStyle } from '@/types';

interface EpisodeViewerProps {
  episodeId: string;
}

type ViewState = 'loading' | 'error' | 'ready';

const STYLE_LABELS: Record<EpisodeStyle, string> = {
  webtoon: '웹툰',
  four_cut: '4컷만화',
  shoujo: '소녀만화',
  action: '액션',
  chibi: '치비',
  noir: '누아르',
};

export default function EpisodeViewer({ episodeId }: EpisodeViewerProps) {
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      const [episodeResult, panelsResult, participantsResult] = await Promise.all([
        supabase.from('episodes').select('*').eq('id', episodeId).single(),
        supabase.from('panels').select('*').eq('episode_id', episodeId).order('order_index'),
        supabase.from('participants').select('*').eq('episode_id', episodeId).order('turn_order'),
      ]);

      if (episodeResult.error || !episodeResult.data) {
        setViewState('error');
        return;
      }

      setEpisode(episodeResult.data);
      setPanels(panelsResult.data ?? []);
      setParticipants(participantsResult.data ?? []);
      setViewState('ready');
    }

    loadData();
  }, [episodeId]);

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).catch(() => null);
    setToastMsg('링크 복사됨');
    setTimeout(() => setToastMsg(null), 2000);
  }

  // Loading
  if (viewState === 'loading') {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-50'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-500' />
      </div>
    );
  }

  // Error
  if (viewState === 'error') {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4'>
        <p className='text-center text-gray-500'>에피소드를 찾을 수 없어요</p>
        <Link href='/' className='text-sm text-indigo-500 hover:underline'>
          홈으로
        </Link>
      </div>
    );
  }

  const createdAt = episode?.created_at ? new Date(episode.created_at).toLocaleDateString('ko-KR') : '';

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Toast */}
      {toastMsg && (
        <div className='fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-800 px-4 py-2 text-sm text-white shadow-lg'>
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <header className='sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3'>
        <Link href='/' className='text-sm text-gray-500 hover:text-gray-800'>
          ← 홈
        </Link>
        <span className='max-w-[160px] truncate text-sm font-medium text-gray-700'>
          {episode?.title ?? '에피소드 보기'}
        </span>
        <button type='button' onClick={handleShare} className='text-sm text-indigo-500 hover:text-indigo-700'>
          공유
        </button>
      </header>

      <main className='mx-auto max-w-lg px-4 py-4'>
        {/* Episode info bar */}
        <div className='mb-4 flex flex-wrap items-center gap-2'>
          {episode && (
            <span className='rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-medium text-indigo-700'>
              {STYLE_LABELS[episode.style]}
            </span>
          )}
          <span className='text-xs text-gray-400'>
            {participants.length}명 참여 · {panels.length}칸
          </span>
          {createdAt && <span className='text-xs text-gray-400'>{createdAt}</span>}
        </div>

        {/* Panels */}
        {panels.length === 0 ? (
          <div className='flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16'>
            <p className='text-gray-400'>아직 패널이 없어요</p>
          </div>
        ) : (
          <div className='flex flex-col gap-4'>
            {panels.map((panel) => {
              const creator = participants.find((p) => p.id === panel.created_by);
              return <PanelCard key={panel.id} panel={panel} creatorNickname={creator?.nickname ?? null} />;
            })}
          </div>
        )}

        {/* Footer */}
        <div className='mt-8 border-t border-gray-200 pt-6 text-center'>
          <p className='text-xs text-gray-400'>이 만화는 AI 릴레이 만화로 제작되었습니다</p>
          <Link href='/create' className='mt-2 inline-block text-xs text-indigo-500 hover:underline'>
            나도 만들어보기 →
          </Link>
        </div>
      </main>
    </div>
  );
}
