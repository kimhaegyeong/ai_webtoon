'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export default function AuthNav() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  if (loading) {
    return <span className='text-sm text-gray-400'>...</span>;
  }

  if (user) {
    return (
      <div className='flex items-center gap-3'>
        <span className='max-w-[120px] truncate text-sm text-gray-600' title={user.email ?? undefined}>
          {user.email}
        </span>
        <button
          type='button'
          onClick={handleSignOut}
          className='rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700'
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <Link
      href='/login'
      className='rounded-lg px-3 py-1.5 text-sm font-medium text-white/90 hover:bg-white/10'
    >
      로그인
    </Link>
  );
}
