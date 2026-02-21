'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import PanelForm from '@/components/features/PanelForm';
import PanelCard from '@/components/features/PanelCard';
import type { Episode, Panel, Participant, EpisodeStyle } from '@/types';

interface CollabRoomProps {
  episodeId: string;
}

type ViewState = 'loading' | 'error' | 'join' | 'strip';

const STYLE_LABELS: Record<EpisodeStyle, string> = {
  webtoon: '웹툰',
  four_cut: '4컷만화',
  shoujo: '소녀만화',
  action: '액션',
  chibi: '치비',
  noir: '누아르',
};

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1] ?? null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export default function CollabRoom({ episodeId }: CollabRoomProps) {
  const supabase = useMemo(() => createClient(), []);

  const [viewState, setViewState] = useState<ViewState>('loading');
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null);
  const [showPanelForm, setShowPanelForm] = useState(false);
  const [previousBase64, setPreviousBase64] = useState<string | null>(null);
  const [isFetchingRef, setIsFetchingRef] = useState(false);

  // Ref for closure-safe access in Realtime callbacks
  const myParticipantIdRef = useRef<string | null>(null);
  useEffect(() => {
    myParticipantIdRef.current = myParticipantId;
  }, [myParticipantId]);

  // S6 join form state
  const [joinNickname, setJoinNickname] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const loadData = useCallback(
    async (participantId: string | null) => {
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

      if (participantId) {
        setMyParticipantId(participantId);
        setViewState('strip');
      } else {
        setViewState('join');
      }
    },
    [episodeId, supabase],
  );

  // Initial data load
  useEffect(() => {
    const stored = localStorage.getItem(`participant_${episodeId}`);
    loadData(stored);
  }, [episodeId, loadData]);

  // Realtime subscriptions (M3)
  useEffect(() => {
    const channel = supabase
      .channel('episode-' + episodeId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'panels', filter: `episode_id=eq.${episodeId}` },
        (payload) => {
          const newPanel = payload.new as Panel;
          // Skip own panels — already added optimistically in handlePanelSuccess
          if (newPanel.created_by === myParticipantIdRef.current) return;
          setPanels((prev) => [...prev, newPanel]);
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'episodes', filter: `id=eq.${episodeId}` },
        (payload) => {
          setEpisode(payload.new as Episode);
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'participants', filter: `episode_id=eq.${episodeId}` },
        (payload) => {
          const newParticipant = payload.new as Participant;
          setParticipants((prev) => {
            if (prev.some((p) => p.id === newParticipant.id)) return prev;
            return [...prev, newParticipant];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [episodeId, supabase]);

  async function handleJoin() {
    if (!joinNickname.trim() || isJoining) return;
    setIsJoining(true);
    setJoinError(null);

    const nextTurnOrder = participants.length;

    const { data: participant, error } = await supabase
      .from('participants')
      .insert({ episode_id: episodeId, nickname: joinNickname.trim(), turn_order: nextTurnOrder })
      .select()
      .single();

    if (error || !participant) {
      setJoinError('참여에 실패했어요. 다시 시도해주세요.');
      setIsJoining(false);
      return;
    }

    localStorage.setItem(`participant_${episodeId}`, participant.id);
    setMyParticipantId(participant.id);
    setParticipants((prev) => [...prev, participant]);
    setViewState('strip');
    setIsJoining(false);
  }

  async function handleAddPanel() {
    const lastPanel = panels.length > 0 ? panels[panels.length - 1] : null;
    if (lastPanel?.image_url) {
      setIsFetchingRef(true);
      const base64 = await fetchImageAsBase64(lastPanel.image_url);
      setPreviousBase64(base64);
      setIsFetchingRef(false);
    } else {
      setPreviousBase64(null);
    }
    setShowPanelForm(true);
  }

  async function handlePanelSuccess(panel: Panel) {
    // Optimistic update — Realtime callback will skip this panel (same creator)
    setPanels((prev) => [...prev, panel]);
    setShowPanelForm(false);
    setPreviousBase64(null);

    // Advance turn for multi-user collab (no-op for single user: (0+1)%1 = 0)
    if (episode) {
      const nextTurnIndex = (episode.current_turn_index + 1) % Math.max(participants.length, 1);
      await supabase.from('episodes').update({ current_turn_index: nextTurnIndex }).eq('id', episodeId);
    }
  }

  const myParticipant = participants.find((p) => p.id === myParticipantId);

  function isMyTurn(): boolean {
    if (!episode || !myParticipant) return false;
    if (episode.status === 'completed') return false;
    return episode.current_turn_index === myParticipant.turn_order;
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
        <p className='text-center text-gray-500'>에피소드를 불러올 수 없어요</p>
        <Link href='/' className='text-sm text-indigo-500 hover:underline'>
          홈으로
        </Link>
      </div>
    );
  }

  // S6: Join form
  if (viewState === 'join') {
    return (
      <div className='min-h-screen bg-gray-50'>
        <header className='sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3'>
          <Link href='/' className='text-sm text-gray-500 hover:text-gray-800'>
            ← 홈
          </Link>
          <span className='text-sm font-medium text-gray-700'>만화 참여하기</span>
          <div className='w-10' />
        </header>

        <main className='mx-auto max-w-sm px-4 py-8'>
          {episode && (
            <div className='mb-6 rounded-xl bg-white p-4 shadow-sm'>
              <span className='rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700'>
                {STYLE_LABELS[episode.style]}
              </span>
              <h2 className='mt-2 text-lg font-bold text-gray-900'>{episode.title ?? '제목 없음'}</h2>
              {episode.summary && <p className='mt-1 text-sm text-gray-500'>{episode.summary}</p>}
              <p className='mt-2 text-xs text-gray-400'>
                참여자 {participants.length}명 · 패널 {panels.length}칸
              </p>
            </div>
          )}

          <h3 className='mb-4 text-base font-bold text-gray-900'>닉네임을 입력해주세요</h3>
          <input
            type='text'
            value={joinNickname}
            onChange={(e) => setJoinNickname(e.target.value.slice(0, 10))}
            maxLength={10}
            placeholder='예) 민지'
            className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleJoin();
            }}
          />
          <p className='mt-1 text-xs text-gray-400'>최대 10자</p>

          {joinError && (
            <div className='mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700'>{joinError}</div>
          )}

          <button
            type='button'
            onClick={handleJoin}
            disabled={!joinNickname.trim() || isJoining}
            className='mt-6 w-full rounded-xl bg-indigo-500 py-4 text-base font-bold text-white transition-all hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40'
          >
            {isJoining ? '참여 중...' : '참여하기'}
          </button>
        </main>
      </div>
    );
  }

  // S5: Strip view
  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <header className='sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3'>
        <Link href='/' className='text-sm text-gray-500 hover:text-gray-800'>
          ← 홈
        </Link>
        <span className='max-w-[160px] truncate text-sm font-medium text-gray-700'>
          {episode?.title ?? '만화 감상 중'}
        </span>
        <button
          type='button'
          onClick={() => {
            navigator.clipboard.writeText(window.location.href).catch(() => null);
          }}
          className='text-sm text-indigo-500 hover:text-indigo-700'
        >
          공유
        </button>
      </header>

      <main className='mx-auto max-w-lg px-4 py-4'>
        {/* Episode meta */}
        <div className='mb-4 flex items-center gap-2'>
          {episode && (
            <span className='rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-medium text-indigo-700'>
              {STYLE_LABELS[episode.style]}
            </span>
          )}
          <span className='text-xs text-gray-400'>
            {participants.length}명 참여 · {panels.length}칸
          </span>
        </div>

        {/* Strip */}
        {panels.length === 0 ? (
          <div className='flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16'>
            <p className='text-gray-400'>아직 칸이 없어요</p>
            <p className='mt-1 text-sm text-gray-400'>첫 칸을 그려보세요!</p>
          </div>
        ) : (
          <div className='flex flex-col gap-4'>
            {panels.map((panel) => {
              const creator = participants.find((p) => p.id === panel.created_by);
              return <PanelCard key={panel.id} panel={panel} creatorNickname={creator?.nickname ?? null} />;
            })}
          </div>
        )}

        {/* CTA */}
        <div className='mt-6'>
          {episode?.status === 'in_progress' && isMyTurn() && (
            <button
              type='button'
              onClick={handleAddPanel}
              disabled={isFetchingRef}
              className='w-full rounded-xl bg-indigo-500 py-4 text-base font-bold text-white transition-all hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {isFetchingRef ? '준비 중...' : panels.length === 0 ? '✏️ 첫 칸 그리기' : '✏️ 다음 칸 그리기'}
            </button>
          )}
          {episode?.status === 'in_progress' && !isMyTurn() && (
            <div className='rounded-xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-700'>
              다른 참여자의 차례예요
            </div>
          )}
          {episode?.status === 'completed' && (
            <div className='rounded-xl bg-gray-100 px-4 py-3 text-center text-sm text-gray-500'>
              완성된 만화예요
            </div>
          )}
        </div>
      </main>

      {/* S3/S4 PanelForm overlay */}
      {showPanelForm && episode && myParticipantId && (
        <PanelForm
          episodeId={episodeId}
          participantId={myParticipantId}
          orderIndex={panels.length}
          style={episode.style}
          characterPrompt={episode.character_prompt}
          previousPanelImageBase64={previousBase64}
          onSuccess={handlePanelSuccess}
          onCancel={() => {
            setShowPanelForm(false);
            setPreviousBase64(null);
          }}
        />
      )}
    </div>
  );
}
