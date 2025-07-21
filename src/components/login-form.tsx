'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils/tailwind.util';
import React, { useCallback, useEffect, useState } from 'react';

import {
  directLogin,
  getAuthPrerequisits,
} from '@/lib/api/endpoints/labelstudio/direct';
import { getTokensByCredentials } from '@/lib/api/endpoints/jwt';
import Link from 'next/link';

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const [csrfMiddlewareToken, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    async function fetchMiddlewareToken(): Promise<void> {
      const token = await getAuthPrerequisits();
      setToken(token);
    }
    fetchMiddlewareToken();
  }, [csrfMiddlewareToken]);

  const handleLogin = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!csrfMiddlewareToken) {
        console.warn('CSRF middleware token is missing');
        return;
      }

      try {
        await directLogin(email, password, csrfMiddlewareToken);
        await getTokensByCredentials(email, password);
        window.location.href = '/'; // 예: 메인 페이지로 리디렉션
      } catch (err) {
        console.error(err);
      }
    },
    [csrfMiddlewareToken, email, password],
  );

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Login</CardTitle>
          <CardDescription>Login with your email and password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="grid gap-6">
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">
                Login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {/* <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our{' '}
        <Link href="#">Terms of Service</Link> and{' '}
        <Link href="#">Privacy Policy</Link>.
      </div> */}
    </div>
  );
}
