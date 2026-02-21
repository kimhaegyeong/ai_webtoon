'use client';

import { useState, useCallback } from 'react';

export interface ShareButtonProps {
  episodeId: string;
  title?: string | null;
}

export default function ShareButton({ episodeId, title }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/e/${episodeId}`
    : '';

  const handleShare = useCallback(async () => {
    if (!shareUrl) return;
    const shareTitle = title?.trim() || 'AI 릴레이 만화';

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          url: shareUrl,
          text: `${shareTitle} - 함께 만든 만화를 감상해보세요`,
        });
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: copy failed, do nothing
    }
  }, [shareUrl, title]);

  return (
    <button
      type='button'
      onClick={handleShare}
      className='rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50'
      aria-label='공유하기'
    >
      {copied ? '복사됨!' : '공유'}
    </button>
  );
}
