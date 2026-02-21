// S1: 메인(랜딩) 페이지
import Link from 'next/link';

interface PlaceholderCardProps {
  index: number;
}

function PlaceholderCard({ index }: PlaceholderCardProps) {
  return (
    <div
      key={index}
      className='flex flex-col rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-white'
    >
      <div className='w-full aspect-[3/4] bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center'>
        <svg
          className='w-12 h-12 text-indigo-200'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
          aria-hidden='true'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={1.5}
            d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
          />
        </svg>
      </div>
      <div className='p-3'>
        <div className='h-4 bg-gray-100 rounded w-3/4 mb-2' />
        <div className='h-3 bg-gray-100 rounded w-1/2' />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className='flex min-h-screen flex-col'>
      {/* Hero Section */}
      <section className='flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 px-4 py-20 text-center text-white'>
        {/* Logo / Service Name */}
        <div className='mb-6 flex items-center gap-3'>
          <div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm'>
            <svg
              className='h-8 w-8 text-white'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
              aria-hidden='true'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
              />
            </svg>
          </div>
          <h1 className='text-3xl font-extrabold tracking-tight sm:text-4xl'>
            AI 릴레이 만화
          </h1>
        </div>

        {/* Sub-copy */}
        <p className='mb-10 max-w-md text-lg font-medium text-indigo-100 sm:text-xl'>
          그림 실력 없어도 만화 작가가 될 수 있어요
        </p>

        {/* CTA Button */}
        <Link
          href='/create'
          className='inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-indigo-600 shadow-lg transition-all duration-200 hover:scale-105 hover:bg-indigo-50 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-white/50 active:scale-95 sm:text-lg'
        >
          <svg
            className='h-5 w-5'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
            aria-hidden='true'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 4v16m8-8H4'
            />
          </svg>
          새 만화 시작하기
        </Link>

        {/* Decorative badge */}
        <p className='mt-6 text-sm text-indigo-200'>
          AI가 그려주고, 나는 이야기를 만들어요
        </p>
      </section>

      {/* Gallery Section */}
      <section className='bg-gray-50 px-4 py-12 sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-4xl'>
          <div className='mb-8 flex items-center justify-between'>
            <h2 className='text-xl font-bold text-gray-900 sm:text-2xl'>
              최근 완성된 만화
            </h2>
            <span className='rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-600'>
              MVP
            </span>
          </div>

          {/* Empty State */}
          <div className='flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white px-6 py-16 text-center'>
            <div className='mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50'>
              <svg
                className='h-8 w-8 text-indigo-300'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
                aria-hidden='true'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={1.5}
                  d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
                />
              </svg>
            </div>
            <p className='text-base font-medium text-gray-500'>
              아직 완성된 만화가 없어요
            </p>
            <p className='mt-1 text-sm text-gray-400'>
              첫 번째 만화를 만들어 보세요!
            </p>
            <Link
              href='/create'
              className='mt-6 inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
            >
              <svg
                className='h-4 w-4'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
                aria-hidden='true'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 4v16m8-8H4'
                />
              </svg>
              만화 만들기
            </Link>
          </div>

          {/* Placeholder Cards (hidden visually, shown as a preview hint) */}
          <div className='mt-8 hidden grid-cols-2 gap-4 sm:grid sm:grid-cols-3'>
            {[0, 1, 2].map((i) => (
              <PlaceholderCard key={i} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className='border-t border-gray-100 bg-white px-4 py-6 text-center'>
        <p className='text-sm text-gray-400'>
          &copy; 2026 AI 릴레이 만화. AI가 함께하는 만화 창작 서비스.
        </p>
      </footer>
    </main>
  );
}
