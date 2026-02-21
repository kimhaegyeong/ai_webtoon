'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import PanelCard from '@/components/features/PanelCard';
import type { Episode, Panel, Participant, EpisodeStyle, EpisodeReview } from '@/types';

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

function getAnonymousId(): string {
  const key = 'anon_id';
  const stored = localStorage.getItem(key);
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

export default function EpisodeViewer({ episodeId }: EpisodeViewerProps) {
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Episode like state
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<EpisodeReview[]>([]);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

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

  const loadEpisodeLikes = useCallback(async () => {
    const supabase = createClient();
    const { count } = await supabase
      .from('episode_likes')
      .select('*', { count: 'exact', head: true })
      .eq('episode_id', episodeId);
    setLikeCount(count ?? 0);

    const anonId = getAnonymousId();
    const { data } = await supabase
      .from('episode_likes')
      .select('id')
      .eq('episode_id', episodeId)
      .eq('anonymous_id', anonId)
      .single();
    setLiked(!!data);
  }, [episodeId]);

  const loadReviews = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('episode_reviews')
      .select('*')
      .eq('episode_id', episodeId)
      .order('created_at', { ascending: false });
    setReviews(data ?? []);
  }, [episodeId]);

  useEffect(() => {
    if (viewState === 'ready') {
      loadEpisodeLikes();
      loadReviews();
    }
  }, [viewState, loadEpisodeLikes, loadReviews]);

  async function handleEpisodeLike() {
    if (likeLoading) return;
    setLikeLoading(true);
    const supabase = createClient();
    const anonId = getAnonymousId();

    if (liked) {
      await supabase
        .from('episode_likes')
        .delete()
        .eq('episode_id', episodeId)
        .eq('anonymous_id', anonId);
      setLiked(false);
      setLikeCount((prev) => Math.max(0, prev - 1));
    } else {
      const { error } = await supabase
        .from('episode_likes')
        .insert({ episode_id: episodeId, anonymous_id: anonId });
      if (!error) {
        setLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    }
    setLikeLoading(false);
  }

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = reviewContent.trim();
    if (!trimmed || reviewSubmitting) return;
    setReviewSubmitting(true);

    const supabase = createClient();
    const anonId = getAnonymousId();
    const { error } = await supabase
      .from('episode_reviews')
      .insert({ episode_id: episodeId, anonymous_id: anonId, content: trimmed });

    if (!error) {
      setReviewContent('');
      await loadReviews();
    }
    setReviewSubmitting(false);
  }

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

          {/* Episode like button */}
          <button
            type='button'
            onClick={handleEpisodeLike}
            disabled={likeLoading}
            className={[
              'ml-auto flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold transition-all',
              liked
                ? 'bg-rose-100 text-rose-500'
                : 'bg-gray-100 text-gray-400 hover:bg-rose-50 hover:text-rose-400',
            ].join(' ')}
            aria-label={liked ? '좋아요 취소' : '이 에피소드 좋아요'}
          >
            <span>{liked ? '❤️' : '🤍'}</span>
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>
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

        {/* Reviews section */}
        <section className='mt-10'>
          <h2 className='mb-4 text-base font-bold text-gray-900'>리뷰 {reviews.length > 0 && `(${reviews.length})`}</h2>

          {/* Review form */}
          <form onSubmit={handleReviewSubmit} className='mb-6'>
            <textarea
              value={reviewContent}
              onChange={(e) => setReviewContent(e.target.value.slice(0, 200))}
              maxLength={200}
              rows={3}
              placeholder='이 만화에 대한 감상을 남겨주세요'
              className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
            />
            <div className='mt-1 flex items-center justify-between'>
              <span className='text-xs text-gray-400'>{reviewContent.length}/200</span>
              <button
                type='submit'
                disabled={reviewContent.trim().length === 0 || reviewSubmitting}
                className='rounded-lg bg-indigo-500 px-4 py-1.5 text-sm font-semibold text-white transition-all hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40'
              >
                {reviewSubmitting ? '등록 중...' : '등록'}
              </button>
            </div>
          </form>

          {/* Review list */}
          {reviews.length === 0 ? (
            <p className='text-center text-sm text-gray-400'>아직 리뷰가 없어요. 첫 번째 리뷰를 남겨보세요!</p>
          ) : (
            <div className='flex flex-col gap-3'>
              {reviews.map((review) => (
                <div key={review.id} className='rounded-xl bg-white px-4 py-3 shadow-sm'>
                  <div className='mb-1 flex items-center justify-between'>
                    <span className='text-xs font-semibold text-gray-500'>
                      익명 {review.anonymous_id.slice(0, 6)}
                    </span>
                    <span className='text-xs text-gray-300'>
                      {new Date(review.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <p className='text-sm text-gray-800'>{review.content}</p>
                </div>
              ))}
            </div>
          )}
        </section>

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
