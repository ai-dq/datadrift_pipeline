import { useCallback, useState } from 'react';
import { getAccessTokenByRefresh } from './endpoints/jwt';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  signal?: AbortSignal;
};

// --- JWT Token Helpers ---
function getToken(key: string): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
}

function setToken(key: string, value: string) {
  if (typeof window !== 'undefined') localStorage.setItem(key, value);
}

function removeToken(key: string) {
  if (typeof window !== 'undefined') localStorage.removeItem(key);
}

function parseJwt(token: string): any {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getToken('refresh_token');
  if (!refresh) return null;
  try {
    const access = await getAccessTokenByRefresh(refresh);
    setToken('access_token', access);
    return access;
  } catch {
    removeToken('access_token');
    removeToken('refresh_token');
    return null;
  }
}

export class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async getValidAccessToken(): Promise<string | null> {
    let access = getToken('access_token');
    if (!access || isTokenExpired(access)) {
      access = await refreshAccessToken();
    }
    return access;
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const { method = 'GET', headers = {}, body, signal } = options;
    let authHeaders = { ...headers };
    const access = await this.getValidAccessToken();
    if (access) {
      authHeaders['Authorization'] = `Bearer ${access}`;
    }
    const config: RequestInit = {
      method,
      headers: {
        ...(body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...authHeaders,
      },
      signal,
      credentials: 'include', // Crucial for sending cookies cross-origin
    };

    if (body && method !== 'GET') {
      config.body = body instanceof FormData ? body : JSON.stringify(body);
    }

    const finalEndpoint = `${endpoint}`;
    const requestUrl = `${this.baseURL.replace(/\/$/, '')}${finalEndpoint.startsWith('/') ? '' : '/'}${finalEndpoint}`;

    try {
      const response = await fetch(requestUrl, config);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: 'Unknown error', details: response.statusText };
        }
        throw new ApiError(
          response.status,
          errorData.error || response.statusText,
          errorData.details,
        );
      }

      if (response.status === 204) {
        return {} as T;
      }

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      }
      return (await response.text()) as unknown as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        0,
        'Network error or request failed',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async get<T = any>(
    endpoint: string,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = any>(
    endpoint: string,
    data?: any,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data,
    });
  }

  async put<T = any>(
    endpoint: string,
    data?: any,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body: data });
  }

  async patch<T = any>(
    endpoint: string,
    data?: any,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data,
    });
  }

  async delete<T = any>(
    endpoint: string,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// 환경 변수에서 API URL 가져오기, 없으면 기본값 사용
const CREATE_API_BASE_URL = (path: string) => {
  if (typeof window !== 'undefined') {
    // 클라이언트 사이드에서는 개발 환경일 때 프록시 사용
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      // 개발 환경에서는 /next-api/external 프록시 경로 사용
      return `/next-api/external${path}`;
    }
    
    // 프로덕션 환경에서는 직접 외부 서버 호출
    const baseUrl = process.env.NEXT_PUBLIC_LABELSTUDIO_URL || 'http://121.126.210.2/labelstudio';
    return `${baseUrl}${path}`;
  }
  // 서버 사이드에서는 일반 환경 변수 사용
  const baseUrl = process.env.NEXT_PUBLIC_LABELSTUDIO_URL || 'http://121.126.210.2/labelstudio';
  return `${baseUrl}${path}`;
};

export const APIClient = {
  labelstudio: new ApiClient('http://121.126.210.2/labelstudio/api'),
};

// React Hook for API calls with loading state
type UseApiOptions<T> = {
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
};

export function useApi<T = any>(
  apiCall: () => Promise<T>,
  options: UseApiOptions<T> = {},
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCall();
      setData(result);
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      const apiError =
        err instanceof ApiError
          ? err
          : new ApiError(0, 'Unknown error during API call', String(err));
      setError(apiError);
      options.onError?.(apiError);
      throw apiError;
    } finally {
      setLoading(false);
    }
  }, [apiCall, options]);

  return { data, error, loading, execute };
}

export default APIClient;
