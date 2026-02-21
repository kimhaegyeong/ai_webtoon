import type { Panel } from '@/types';

interface PanelCardProps {
  panel: Panel;
  creatorNickname: string | null;
}

export default function PanelCard({ panel, creatorNickname }: PanelCardProps) {
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

      {/* Footer */}
      <div className='flex items-center justify-between px-4 py-2 text-xs text-gray-400'>
        <span className='font-medium text-gray-500'>#{panel.order_index + 1}</span>
        {creatorNickname && <span>by {creatorNickname}</span>}
      </div>
    </div>
  );
}
