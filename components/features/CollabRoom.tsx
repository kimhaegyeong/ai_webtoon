'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import PanelForm from '@/components/features/PanelForm';
import PanelCard from '@/components/features/PanelCard';
import type { Episode, Panel, Participant, EpisodeStyle, BubblePosition } from '@/types';

interface CollabRoomProps {
  episodeId: string;
}

type ViewState = 'loading' | 'error' | 'join' | 'strip';
type AiState = 'idle' | 'story' | 'images' | 'error';

interface StoryPanel {
  sceneDescription: string;
  dialogue: string | null;
  soundEffect: string | null;
  bubblePosition: BubblePosition;
}

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

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
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

  // S7 AI 이어쓰기 state
  const [showAiSheet, setShowAiSheet] = useState(false);

  // 에피소드 완료 state
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [aiPanelCount, setAiPanelCount] = useState(3);
  const [aiState, setAiState] = useState<AiState>('idle');
  const [aiProgress, setAiProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [aiError, setAiError] = useState<string | null>(null);

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
    setPanels((prev) => [...prev, panel]);
    setShowPanelForm(false);
    setPreviousBase64(null);

    if (episode) {
      const nextTurnIndex = (episode.current_turn_index + 1) % Math.max(participants.length, 1);
      await supabase.from('episodes').update({ current_turn_index: nextTurnIndex }).eq('id', episodeId);
    }
  }

  // S7: AI 이어쓰기 — generate story then images sequentially
  async function handleAiStory() {
    if (!episode || !myParticipantId) return;
    setAiState('story');
    setAiError(null);
    setAiProgress({ current: 0, total: aiPanelCount });

    // Step 1: Generate story panel descriptions
    const storyRes = await fetch('/api/generate-story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        style: episode.style,
        characterPrompt: episode.character_prompt,
        existingPanels: panels.map((p) => ({
          sceneDescription: p.scene_description,
          dialogue: p.dialogue,
          soundEffect: p.sound_effect,
        })),
        panelCount: aiPanelCount,
      }),
    });

    const storyData: unknown = await storyRes.json();
    if (!storyRes.ok) {
      setAiState('error');
      setAiError('스토리 생성에 실패했어요. 다시 시도해주세요.');
      return;
    }

    const { panels: storyPanels } = storyData as { panels: StoryPanel[] };

    // Step 2: Generate image for each story panel
    setAiState('images');
    let currentPanels = [...panels];

    for (let i = 0; i < storyPanels.length; i++) {
      setAiProgress({ current: i + 1, total: storyPanels.length });
      const storyPanel = storyPanels[i];

      // Get reference image from last panel
      const lastPanel = currentPanels[currentPanels.length - 1] ?? null;
      let refBase64: string | null = null;
      if (lastPanel?.image_url) {
        refBase64 = await fetchImageAsBase64(lastPanel.image_url);
      }

      // Generate image
      const imgRes = await fetch('/api/generate-panel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: episode.style,
          characterPrompt: episode.character_prompt,
          sceneDescription: storyPanel.sceneDescription,
          dialogue: storyPanel.dialogue,
          soundEffect: storyPanel.soundEffect,
          bubblePosition: storyPanel.bubblePosition,
          referenceImageBase64: refBase64,
        }),
      });

      const imgData: unknown = await imgRes.json();
      if (!imgRes.ok) {
        // Skip this panel on error, continue
        continue;
      }

      const { imageBase64, mimeType } = imgData as { imageBase64: string; mimeType: string };

      // Upload to storage
      const ext = mimeType.includes('png') ? 'png' : 'jpg';
      const fileName = `${episodeId}/${Date.now()}-ai-${i}.${ext}`;
      const fileBytes = base64ToUint8Array(imageBase64);

      const { error: uploadError } = await supabase.storage
        .from('panels')
        .upload(fileName, fileBytes, { contentType: mimeType, upsert: false });

      if (uploadError) continue;

      const { data: urlData } = supabase.storage.from('panels').getPublicUrl(fileName);

      // Insert panel row
      const orderIndex = currentPanels.length;
      const { data: newPanel, error: panelError } = await supabase
        .from('panels')
        .insert({
          episode_id: episodeId,
          order_index: orderIndex,
          scene_description: storyPanel.sceneDescription,
          dialogue: storyPanel.dialogue,
          sound_effect: storyPanel.soundEffect,
          bubble_position: storyPanel.bubblePosition,
          image_url: urlData.publicUrl,
          created_by: myParticipantId,
        })
        .select()
        .single();

      if (!panelError && newPanel) {
        currentPanels = [...currentPanels, newPanel];
        setPanels(currentPanels);
      }
    }

    setAiState('idle');
    setShowAiSheet(false);
  }

  async function handleCompleteEpisode() {
    if (isCompleting) return;
    setIsCompleting(true);
    await supabase.from('episodes').update({ status: 'completed' }).eq('id', episodeId);
    setShowCompleteConfirm(false);
    setIsCompleting(false);
  }

  const myParticipant = participants.find((p) => p.id === myParticipantId);

  function isMyTurn(): boolean {
    if (!episode || !myParticipant) return false;
    if (episode.status === 'completed') return false;
    return episode.current_turn_index === myParticipant.turn_order;
  }

  const MAX_PANELS = 20;
  const isMaxPanels = panels.length >= MAX_PANELS;

  const myConsecutiveCount = useMemo(() => {
    if (!myParticipantId || participants.length <= 1) return 0;
    let count = 0;
    for (let i = panels.length - 1; i >= 0; i--) {
      if (panels[i].created_by === myParticipantId) count++;
      else break;
    }
    return count;
  }, [panels, myParticipantId, participants.length]);

  const isConsecutiveLimit = myConsecutiveCount >= 3;

  const canUseAi = panels.length >= 3 && !isMaxPanels && !isConsecutiveLimit && isMyTurn() && episode?.status === 'in_progress';
  const isAiRunning = aiState === 'story' || aiState === 'images';

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
              return <PanelCard key={panel.id} panel={panel} creatorNickname={creator?.nickname ?? null} style={episode?.style ?? 'webtoon'} characterPrompt={episode?.character_prompt ?? ''} />;
            })}
          </div>
        )}

        {/* CTA area */}
        <div className='mt-6 flex flex-col gap-3'>
          {isMaxPanels ? (
            <div className='rounded-xl bg-indigo-50 px-4 py-3 text-center text-sm font-medium text-indigo-600'>
              최대 20칸에 도달했어요. 만화를 완성해보세요!
            </div>
          ) : isConsecutiveLimit ? (
            <div className='rounded-xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-700'>
              연속 3칸을 등록했어요. 다른 참여자가 그릴 차례예요.
            </div>
          ) : episode?.status === 'in_progress' && isMyTurn() ? (
            <>
              <button
                type='button'
                onClick={handleAddPanel}
                disabled={isFetchingRef}
                className='w-full rounded-xl bg-indigo-500 py-4 text-base font-bold text-white transition-all hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60'
              >
                {isFetchingRef ? '준비 중...' : panels.length === 0 ? '✏️ 첫 칸 그리기' : '✏️ 다음 칸 그리기'}
              </button>
              {canUseAi && (
                <button
                  type='button'
                  onClick={() => setShowAiSheet(true)}
                  className='w-full rounded-xl border-2 border-indigo-200 bg-white py-3 text-sm font-semibold text-indigo-500 transition-all hover:border-indigo-400 hover:bg-indigo-50'
                >
                  ✨ AI에게 맡기기
                </button>
              )}
            </>
          ) : episode?.status === 'in_progress' && !isMyTurn() ? (
            <div className='rounded-xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-700'>
              다른 참여자의 차례예요
            </div>
          ) : episode?.status === 'completed' ? (
            <div className='rounded-xl bg-green-50 px-4 py-3 text-center text-sm font-medium text-green-700'>
              완성된 만화예요 🎉
            </div>
          ) : null}

          {/* 방장 완성 버튼 */}
          {!isMaxPanels && myParticipant?.turn_order === 0 && episode?.status === 'in_progress' && panels.length > 0 && (
            <button
              type='button'
              onClick={() => setShowCompleteConfirm(true)}
              className='w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-400 transition-all hover:border-green-200 hover:bg-green-50 hover:text-green-600'
            >
              이 만화 완성하기
            </button>
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

      {/* S7: AI 이어쓰기 바텀시트 */}
      {showAiSheet && (
        <div className='fixed inset-0 z-50 flex flex-col justify-end'>
          {/* Backdrop */}
          <button
            type='button'
            className='absolute inset-0 bg-black/40'
            onClick={() => { if (!isAiRunning) setShowAiSheet(false); }}
            aria-label='닫기'
          />

          {/* Sheet */}
          <div className='relative rounded-t-3xl bg-white px-6 pb-8 pt-6 shadow-2xl'>
            {/* Handle */}
            <div className='mx-auto mb-6 h-1 w-10 rounded-full bg-gray-200' />

            {!isAiRunning ? (
              <>
                <h3 className='mb-1 text-lg font-bold text-gray-900'>AI에게 맡기기</h3>
                <p className='mb-5 text-sm text-gray-500'>
                  지금까지의 스토리를 바탕으로 AI가 칸을 이어 그려요
                </p>

                {/* Panel count selector */}
                <div className='mb-6'>
                  <label className='mb-2 block text-sm font-semibold text-gray-700'>
                    몇 칸을 생성할까요?
                  </label>
                  <div className='flex gap-2'>
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <button
                        key={n}
                        type='button'
                        onClick={() => setAiPanelCount(n)}
                        className={[
                          'flex-1 rounded-lg border-2 py-2 text-sm font-semibold transition-all',
                          aiPanelCount === n
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                            : 'border-gray-200 text-gray-500 hover:border-indigo-200',
                        ].join(' ')}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {aiError && (
                  <div className='mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700'>{aiError}</div>
                )}

                <div className='flex gap-3'>
                  <button
                    type='button'
                    onClick={() => { setShowAiSheet(false); setAiError(null); }}
                    className='flex-1 rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50'
                  >
                    취소
                  </button>
                  <button
                    type='button'
                    onClick={handleAiStory}
                    className='flex-1 rounded-xl bg-indigo-500 py-3 text-sm font-bold text-white hover:bg-indigo-600'
                  >
                    ✨ 생성 시작
                  </button>
                </div>
              </>
            ) : (
              /* Generation progress */
              <div className='flex flex-col items-center py-4'>
                <div className='mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-500' />
                {aiState === 'story' && (
                  <p className='text-base font-semibold text-gray-700'>스토리 구성 중...</p>
                )}
                {aiState === 'images' && (
                  <>
                    <p className='text-base font-semibold text-gray-700'>
                      이미지 생성 중... ({aiProgress.current}/{aiProgress.total})
                    </p>
                    <div className='mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-gray-100'>
                      <div
                        className='h-full rounded-full bg-indigo-500 transition-all'
                        style={{ width: `${(aiProgress.current / aiProgress.total) * 100}%` }}
                      />
                    </div>
                  </>
                )}
                <p className='mt-2 text-xs text-gray-400'>잠시만 기다려 주세요</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 에피소드 완성 확인 모달 */}
      {showCompleteConfirm && (
        <div className='fixed inset-0 z-50 flex items-center justify-center px-4'>
          <button
            type='button'
            className='absolute inset-0 bg-black/40'
            onClick={() => setShowCompleteConfirm(false)}
            aria-label='닫기'
          />
          <div className='relative w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl'>
            <p className='text-lg font-bold text-gray-900'>만화를 완성할까요?</p>
            <p className='mt-2 text-sm text-gray-500'>더 이상 칸을 추가할 수 없어요</p>
            <div className='mt-6 flex gap-3'>
              <button
                type='button'
                onClick={() => setShowCompleteConfirm(false)}
                className='flex-1 rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50'
              >
                취소
              </button>
              <button
                type='button'
                onClick={handleCompleteEpisode}
                disabled={isCompleting}
                className='flex-1 rounded-xl bg-green-500 py-3 text-sm font-bold text-white hover:bg-green-600 disabled:opacity-60'
              >
                {isCompleting ? '처리 중...' : '완성하기 🎉'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
