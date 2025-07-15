'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getCurrentUser } from '@/lib/api/endpoints/users';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        await getCurrentUser();
        // 성공 시 대시보드로 이동
        router.replace('/dashboard');
      } catch (error) {
        // 실패 시 로그인 페이지로 이동
        console.warn('User not authenticated, redirecting to login:', error);
        router.replace('/login');
      }
    };

    checkLoginStatus();
  }, [router]);

  return null;
}
