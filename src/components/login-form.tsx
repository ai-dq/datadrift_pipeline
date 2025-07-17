import { cn } from '@/lib/utils/tailwind.util';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCallback } from 'react';

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

      if (!sessionID) {
        console.warn('Session ID is missing');
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
    <form className={cn('flex flex-col gap-6', className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Login to your account</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Enter your email below to login to your account
        </p>
      </div>
      <div className="grid gap-6">
        <div className="grid gap-3">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="m@example.com" required />
        </div>
        <div className="grid gap-3">
          <div className="flex items-center">
            <Label htmlFor="password">Password</Label>
            <a
              href="#"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </a>
          </div>
          <Input id="password" type="password" required />
        </div>
        <Button type="submit" className="w-full" onClick={handleLogin}>
          Login
        </Button>
      </div>
      <div className="text-center text-sm">
        Don&apos;t have an account?{' '}
        <a href="#" className="underline underline-offset-4">
          Sign up
        </a>
      </div>
    </form>
  );
}
