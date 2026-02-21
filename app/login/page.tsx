'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/';
  const errorParam = searchParams.get('error');

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    errorParam === 'auth_callback' ? { type: 'error', text: '인증 처리에 실패했어요. 다시 시도해주세요.' } : null,
  );

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setMessage(null);

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) {
        setMessage({ type: 'error', text: error.message });
        setLoading(false);
        return;
      }
      setMessage({ type: 'success', text: '가입 이메일로 확인 링크를 보냈어요. 메일을 확인해주세요.' });
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setMessage({ type: 'error', text: error.message });
      setLoading(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className='min-h-screen bg-gray-50 flex flex-col'>
      <header className='border-b border-gray-200 bg-white px-4 py-3'>
        <Link href='/' className='text-sm text-gray-500 hover:text-gray-800'>
          ← 홈
        </Link>
      </header>

      <main className='mx-auto w-full max-w-sm flex-1 px-4 py-12'>
        <h1 className='text-xl font-bold text-gray-900'>
          {mode === 'signin' ? '로그인' : '회원가입'}
        </h1>
        <p className='mt-1 text-sm text-gray-500'>
          {mode === 'signin'
            ? '이메일과 비밀번호를 입력해주세요.'
            : '이메일로 확인 링크가 전송돼요.'}
        </p>

        <form onSubmit={handleSubmit} className='mt-8 space-y-4'>
          <div>
            <label htmlFor='email' className='block text-sm font-medium text-gray-700'>
              이메일
            </label>
            <input
              id='email'
              type='email'
              autoComplete='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className='mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
              placeholder='you@example.com'
            />
          </div>
          <div>
            <label htmlFor='password' className='block text-sm font-medium text-gray-700'>
              비밀번호
            </label>
            <input
              id='password'
              type='password'
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className='mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'
              placeholder='6자 이상'
            />
          </div>

          {message && (
            <p
              className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}
            >
              {message.text}
            </p>
          )}

          <button
            type='submit'
            disabled={loading}
            className='w-full rounded-xl bg-indigo-500 py-3 text-base font-bold text-white hover:bg-indigo-600 disabled:opacity-50'
          >
            {loading ? '처리 중...' : mode === 'signin' ? '로그인' : '가입하기'}
          </button>
        </form>

        <p className='mt-6 text-center text-sm text-gray-500'>
          {mode === 'signin' ? (
            <>
              계정이 없으신가요?{' '}
              <button
                type='button'
                onClick={() => { setMode('signup'); setMessage(null); }}
                className='font-medium text-indigo-600 hover:underline'
              >
                회원가입
              </button>
            </>
          ) : (
            <>
              이미 계정이 있으신가요?{' '}
              <button
                type='button'
                onClick={() => { setMode('signin'); setMessage(null); }}
                className='font-medium text-indigo-600 hover:underline'
              >
                로그인
              </button>
            </>
          )}
        </p>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-500' />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
