'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { EpisodeStyle } from '@/types';

function getOrCreateAnonId(): string {
  const key = 'anon_creator_id';
  const stored = localStorage.getItem(key);
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

const STYLE_OPTIONS: { value: EpisodeStyle; label: string; emoji: string; desc: string }[] = [
  { value: 'webtoon', label: '웹툰', emoji: '🎨', desc: '선명한 컬러, 세로 스크롤' },
  { value: 'four_cut', label: '4컷만화', emoji: '📖', desc: '흑백톤, 표정 위주' },
  { value: 'shoujo', label: '소녀만화', emoji: '🌸', desc: '꽃·반짝이, 감성적' },
  { value: 'action', label: '액션', emoji: '⚡', desc: '속도선, 강렬한 대비' },
  { value: 'chibi', label: '치비', emoji: '🐱', desc: '슈퍼 데포르메, 파스텔' },
  { value: 'noir', label: '누아르', emoji: '🌑', desc: '흑백, 강한 그림자' },
];

export default function CreatePage() {
  const router = useRouter();
  const [style, setStyle] = useState<EpisodeStyle | null>(null);
  const [characterPrompt, setCharacterPrompt] = useState('');
  const [nickname, setNickname] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = style !== null && characterPrompt.trim().length > 0 && nickname.trim().length > 0;

  async function handleSubmit() {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    const creatorId = getOrCreateAnonId();

    const res = await fetch('/api/create-episode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        style: style!,
        characterPrompt: characterPrompt.trim(),
        title: title.trim() || null,
        summary: summary.trim() || null,
        nickname: nickname.trim(),
        creatorId,
      }),
    });

    const data: unknown = await res.json();

    if (!res.ok) {
      const errData = data as { error?: string; code?: string };
      setError(errData.error ?? '에피소드 생성에 실패했어요. 다시 시도해주세요.');
      setIsSubmitting(false);
      return;
    }

    const { episodeId, participantId } = data as { episodeId: string; participantId: string };
    localStorage.setItem(`participant_${episodeId}`, participantId);
    router.push(`/c/${episodeId}`);
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <header className='sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3'>
        <Link href='/' className='flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800'>
          <span>←</span>
          <span>뒤로</span>
        </Link>
        <span className='text-sm font-medium text-gray-500'>1/2 단계</span>
      </header>

      <main className='mx-auto max-w-lg px-4 py-8'>
        {/* Style selection */}
        <section className='mb-8'>
          <h2 className='mb-1 text-lg font-bold text-gray-900'>스타일을 골라주세요 *</h2>
          <p className='mb-4 text-sm text-gray-500'>선택 후 변경할 수 없어요</p>
          <div className='grid grid-cols-3 gap-3'>
            {STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type='button'
                onClick={() => setStyle(opt.value)}
                className={[
                  'flex flex-col items-center rounded-xl border-2 p-4 text-center transition-all',
                  style === opt.value
                    ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30',
                ].join(' ')}
              >
                <span className='text-3xl'>{opt.emoji}</span>
                <span className='mt-2 text-sm font-semibold text-gray-800'>{opt.label}</span>
                <span className='mt-0.5 text-xs text-gray-400'>{opt.desc}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Character description */}
        <section className='mb-6'>
          <label className='mb-1 block text-sm font-semibold text-gray-700'>
            캐릭터를 설명해주세요 *
          </label>
          <textarea
            value={characterPrompt}
            onChange={(e) => setCharacterPrompt(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder='예) 갈색 단발머리, 교복 입은 17살 여고생. 밝고 엉뚱한 성격'
            className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
          />
          <p className='mt-1 text-right text-xs text-gray-400'>{characterPrompt.length}/300</p>
        </section>

        {/* Nickname */}
        <section className='mb-6'>
          <label className='mb-1 block text-sm font-semibold text-gray-700'>
            내 닉네임 *
          </label>
          <input
            type='text'
            value={nickname}
            onChange={(e) => setNickname(e.target.value.slice(0, 10))}
            maxLength={10}
            placeholder='예) 민지'
            className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
          />
          <p className='mt-1 text-xs text-gray-400'>최대 10자</p>
        </section>

        {/* Title (optional) */}
        <section className='mb-6'>
          <label className='mb-1 block text-sm font-semibold text-gray-700'>
            제목 <span className='font-normal text-gray-400'>(선택)</span>
          </label>
          <input
            type='text'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={50}
            placeholder='예) 교실의 비밀'
            className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
          />
        </section>

        {/* Summary (optional) */}
        <section className='mb-8'>
          <label className='mb-1 block text-sm font-semibold text-gray-700'>
            한 줄 소개 <span className='font-normal text-gray-400'>(선택)</span>
          </label>
          <input
            type='text'
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={100}
            placeholder='예) 방과 후 교실에서 펼쳐지는 비밀스러운 이야기'
            className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
          />
        </section>

        {/* Error */}
        {error && (
          <div className='mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700'>{error}</div>
        )}

        {/* Submit */}
        <button
          type='button'
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          className='w-full rounded-xl bg-indigo-500 py-4 text-base font-bold text-white transition-all hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40'
        >
          {isSubmitting ? '생성 중...' : '다음 → 첫 칸 그리기'}
        </button>
      </main>
    </div>
  );
}
