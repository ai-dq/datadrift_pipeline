'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getCurrentUser } from '@/lib/api/endpoints/users';
import { getCookie } from '@/lib/utils/cookie.util';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const checkLoginStatus = async () => {
      const csrfToken = getCookie('csrftoken');

      if (!csrfToken) {
        console.warn('User not authenticated, redirecting to login');
        router.replace('/login');
      }

      // 성공 시 대시보드로 이동
      router.replace('/dashboard');
    };

    checkLoginStatus();
  }, [router]);

  return null;
}
