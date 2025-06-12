import { useCallback, useState } from 'react';
import { GetMLModelsResponse, MLModelResponse } from './models/ml-models';

// API configuration
const isDevelopment = process.env.NODE_ENV === 'development';

let API_BASE_URL;
if (isDevelopment) {
  API_BASE_URL = `http://121.126.210.2/api/v1`;
} else {
  API_BASE_URL = `http://localhost:${process.env.CORE_API_PORT || '9030'}/api/v1`;
}

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  maxRedirects: 3,
});

export const getModels = async (): Promise<GetMLModelsResponse> => {
  try {
    const response = await apiClient.get<GetMLModelsResponse>('/models');
    return response.data;
  } catch (error) {
    console.error(`Failed for getModels:`, error);
    throw error;
  }
};

export const getModelById = async (
  modelId: number,
): Promise<MLModelResponse> => {
  try {
    const response = await apiClient.get<MLModelResponse>(`/models/${modelId}`);
    return response.data;
  } catch (error) {
    console.error(`Failed for getModelById (id: ${modelId}):`, error);
    throw error;
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
