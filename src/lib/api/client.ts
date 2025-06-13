import { useCallback, useState } from 'react';
import { GetMLModelsResponse, MLModelResponse } from './models/ml-models';

// API configuration
const isDevelopment = process.env.NODE_ENV === 'development';

const NEXT_PUBLIC_API_PROXY_PREFIX = '/next-api/external';
const API_BASE_URL = isDevelopment ? 'http://121.126.210.2/api/v1' : '/';
const effectivePrefix = isDevelopment ? '' : NEXT_PUBLIC_API_PROXY_PREFIX;

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  signal?: AbortSignal;
};

export class ApiClient {
  private baseURL: string;
  private prefix: string;

  constructor(baseURL: string, prefix: string) {
    this.baseURL = baseURL;
    this.prefix = prefix;
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const { method = 'GET', headers = {}, body, signal } = options;

    const config: RequestInit = {
      method,
      headers: {
        ...(body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      signal,
    };

    if (body && method !== 'GET') {
      config.body = body instanceof FormData ? body : JSON.stringify(body);
    }

    const finalEndpoint = `${this.prefix}${endpoint}`;
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

console.log(
  `API client will send requests to ${API_BASE_URL} with prefix ${effectivePrefix}`,
);
export const apiClientInstance = new ApiClient(API_BASE_URL, effectivePrefix);

export const getModels = async (): Promise<GetMLModelsResponse> => {
  try {
    const response =
      await apiClientInstance.get<GetMLModelsResponse>('/models');
    return response;
  } catch (error) {
    console.error(`Failed for getModels:`, error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, 'Failed to get models', String(error));
  }
};

export const getModelById = async (
  modelId: number,
): Promise<MLModelResponse> => {
  try {
    const response = await apiClientInstance.get<MLModelResponse>(
      `/models/${modelId}`,
    );
    return response;
  } catch (error) {
    console.error(`Failed for getModelById (id: ${modelId}):`, error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      0,
      `Failed to get model by id: ${modelId}. Details: ${String(error)}`,
      String(error),
    );
  }
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

export default apiClientInstance;
