// S1: 메인(랜딩) 페이지
import Link from 'next/link';
import GallerySection from '@/components/features/GallerySection';

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
          <h1 className='text-3xl font-extrabold tracking-tight sm:text-4xl'>AI 릴레이 만화</h1>
        </div>

        <p className='mb-10 max-w-md text-lg font-medium text-indigo-100 sm:text-xl'>
          그림 실력 없어도 만화 작가가 될 수 있어요
        </p>

        <Link
          href='/create'
          className='inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-indigo-600 shadow-lg transition-all duration-200 hover:scale-105 hover:bg-indigo-50 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-white/50 active:scale-95 sm:text-lg'
        >
          <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24' aria-hidden='true'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
          </svg>
          새 만화 시작하기
        </Link>

        <p className='mt-6 text-sm text-indigo-200'>AI가 그려주고, 나는 이야기를 만들어요</p>
      </section>

      {/* Gallery Section — client component, fetches episodes from Supabase */}
      <GallerySection />

      {/* Footer */}
      <footer className='border-t border-gray-100 bg-white px-4 py-6 text-center'>
        <p className='text-sm text-gray-400'>&copy; 2026 AI 릴레이 만화. AI가 함께하는 만화 창작 서비스.</p>
      </footer>
    </main>
  );
}
