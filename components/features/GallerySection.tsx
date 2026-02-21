'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Episode, EpisodeStyle } from '@/types';

const STYLE_LABELS: Record<EpisodeStyle, string> = {
  webtoon: '웹툰',
  four_cut: '4컷만화',
  shoujo: '소녀만화',
  action: '액션',
  chibi: '치비',
  noir: '누아르',
};

const STYLE_COLORS: Record<EpisodeStyle, string> = {
  webtoon: 'from-indigo-100 to-purple-100',
  four_cut: 'from-gray-100 to-slate-200',
  shoujo: 'from-pink-100 to-rose-100',
  action: 'from-orange-100 to-red-100',
  chibi: 'from-violet-100 to-fuchsia-100',
  noir: 'from-gray-700 to-gray-900',
};

const STYLE_EMOJI: Record<EpisodeStyle, string> = {
  webtoon: '🎨',
  four_cut: '📖',
  shoujo: '🌸',
  action: '⚡',
  chibi: '🐱',
  noir: '🌑',
};

interface EpisodeWithMeta extends Episode {
  panelCount: number;
  coverImageUrl: string | null;
}

const PAGE_SIZE = 12;

export default function GallerySection() {
  const [episodes, setEpisodes] = useState<EpisodeWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStyle, setFilterStyle] = useState<EpisodeStyle | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const loadEpisodes = useCallback(async () => {
    setIsLoading(true);

    const supabase = createClient();
    let query = supabase.from('episodes').select('*', { count: 'exact' });

    if (filterStyle !== 'all') query = query.eq('style', filterStyle);
    if (filterStatus !== 'all') query = query.eq('status', filterStatus);
    if (searchQuery.trim()) query = query.ilike('title', `%${searchQuery.trim()}%`);

    const { data: episodesData, count } = await query
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    setTotalCount(count ?? 0);

    if (!episodesData || episodesData.length === 0) {
      setEpisodes([]);
      setIsLoading(false);
      return;
    }

    const ids = episodesData.map((e) => e.id);

    // Fetch first panels (cover images) and panel counts in parallel
    const [firstPanelsResult, allPanelsResult] = await Promise.all([
      supabase.from('panels').select('episode_id, image_url').eq('order_index', 0).in('episode_id', ids),
      supabase.from('panels').select('episode_id').in('episode_id', ids),
    ]);

    const coverMap = new Map<string, string | null>();
    for (const p of firstPanelsResult.data ?? []) {
      coverMap.set(p.episode_id, p.image_url);
    }

    const countMap = new Map<string, number>();
    for (const p of allPanelsResult.data ?? []) {
      countMap.set(p.episode_id, (countMap.get(p.episode_id) ?? 0) + 1);
    }

    setEpisodes(
      episodesData.map((e) => ({
        ...e,
        panelCount: countMap.get(e.id) ?? 0,
        coverImageUrl: coverMap.get(e.id) ?? null,
      })),
    );
    setIsLoading(false);
  }, [filterStyle, filterStatus, searchQuery, page]);

  useEffect(() => {
    loadEpisodes();
  }, [loadEpisodes]);

  if (isLoading) {
    return (
      <section className='bg-gray-50 px-4 py-12 sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-4xl'>
          <h2 className='mb-8 text-xl font-bold text-gray-900 sm:text-2xl'>최근 만화</h2>
          <div className='grid grid-cols-2 gap-4 sm:grid-cols-3'>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className='animate-pulse overflow-hidden rounded-xl bg-white shadow-sm'>
                <div className='aspect-[3/4] bg-gray-100' />
                <div className='p-3'>
                  <div className='mb-2 h-4 w-3/4 rounded bg-gray-100' />
                  <div className='h-3 w-1/2 rounded bg-gray-100' />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (episodes.length === 0) {
    return (
      <section className='bg-gray-50 px-4 py-12 sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-4xl'>
          <h2 className='mb-8 text-xl font-bold text-gray-900 sm:text-2xl'>최근 만화</h2>
          <div className='flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white px-6 py-16 text-center'>
            <p className='text-base font-medium text-gray-500'>아직 만화가 없어요</p>
            <p className='mt-1 text-sm text-gray-400'>첫 번째 만화를 만들어 보세요!</p>
            <Link
              href='/create'
              className='mt-6 inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-600'
            >
              만화 만들기
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className='bg-gray-50 px-4 py-12 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-4xl'>
        <div className='mb-8 flex items-center justify-between'>
          <h2 className='text-xl font-bold text-gray-900 sm:text-2xl'>최근 만화</h2>
          <span className='text-xs text-gray-400'>{totalCount}개</span>
        </div>

        {/* Style filters */}
        <div className='mb-4 flex flex-wrap gap-2'>
          {(['all', 'webtoon', 'four_cut', 'shoujo', 'action', 'chibi', 'noir'] as const).map((s) => (
            <button
              key={s}
              type='button'
              onClick={() => { setFilterStyle(s); setPage(0); }}
              className={[
                'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                filterStyle === s
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200',
              ].join(' ')}
            >
              {s === 'all' ? '전체' : STYLE_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Status filters */}
        <div className='mb-4 flex gap-2'>
          {(['all', 'in_progress', 'completed'] as const).map((st) => (
            <button
              key={st}
              type='button'
              onClick={() => { setFilterStatus(st); setPage(0); }}
              className={[
                'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                filterStatus === st
                  ? 'bg-gray-700 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200',
              ].join(' ')}
            >
              {st === 'all' ? '전체' : st === 'in_progress' ? '진행 중' : '완성'}
            </button>
          ))}
        </div>

        {/* Search */}
        <form
          className='mb-6 flex gap-2'
          onSubmit={(e) => { e.preventDefault(); setSearchQuery(searchInput); setPage(0); }}
        >
          <input
            type='text'
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder='제목 검색...'
            className='flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
          />
          <button
            type='submit'
            className='rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600'
          >
            검색
          </button>
        </form>

        <div className='grid grid-cols-2 gap-4 sm:grid-cols-3'>
          {episodes.map((episode) => {
            const href = episode.status === 'completed' ? `/e/${episode.id}` : `/c/${episode.id}`;
            const isCompleted = episode.status === 'completed';

            return (
              <Link
                key={episode.id}
                href={href}
                className='group overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md'
              >
                {/* Cover */}
                <div
                  className={`relative aspect-[3/4] bg-gradient-to-br ${STYLE_COLORS[episode.style]} flex items-center justify-center overflow-hidden`}
                >
                  {episode.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={episode.coverImageUrl}
                      alt={episode.title ?? '만화 커버'}
                      className='h-full w-full object-cover transition-transform group-hover:scale-105'
                    />
                  ) : (
                    <span className='text-4xl'>{STYLE_EMOJI[episode.style]}</span>
                  )}

                  {/* Status badge */}
                  <div className='absolute right-2 top-2'>
                    {isCompleted ? (
                      <span className='rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold text-white'>
                        완성
                      </span>
                    ) : (
                      <span className='rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-white'>
                        진행 중
                      </span>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className='p-3'>
                  <p className='truncate text-sm font-semibold text-gray-800'>
                    {episode.title ?? '제목 없음'}
                  </p>
                  <div className='mt-1 flex items-center gap-2 text-xs text-gray-400'>
                    <span>{STYLE_LABELS[episode.style]}</span>
                    <span>·</span>
                    <span>{episode.panelCount}칸</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Pagination */}
        {totalCount > PAGE_SIZE && (
          <div className='mt-6 flex items-center justify-center gap-3'>
            <button
              type='button'
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className='rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40'
            >
              ← 이전
            </button>
            <span className='text-sm text-gray-500'>
              {page + 1} / {Math.ceil(totalCount / PAGE_SIZE)} 페이지
            </span>
            <button
              type='button'
              onClick={() => setPage((p) => Math.min(Math.ceil(totalCount / PAGE_SIZE) - 1, p + 1))}
              disabled={page >= Math.ceil(totalCount / PAGE_SIZE) - 1}
              className='rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40'
            >
              다음 →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
