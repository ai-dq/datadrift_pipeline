import axios from 'axios';
import { MLModelResponse, GetMLModelsResponse } from './models/ml-models';

const isDevelopment = process.env.NODE_ENV === 'development';
// 클라이언트에서 사용할 API 프록시 경로의 접두사입니다.
// 이 값은 Next.js API 라우트 경로와 일치해야 합니다 (예: /api/external/[...slug] 라면 /api/external).
const NEXT_PUBLIC_API_PROXY_PREFIX = '/api/external';

let API_BASE_URL = '';
let effectivePrefix = '';

if (isDevelopment) {
  API_BASE_URL = `http://121.126.210.2/api/v1`;
} else {
  API_BASE_URL = '/';
  effectivePrefix = NEXT_PUBLIC_API_PROXY_PREFIX;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  maxRedirects: 3,
});

// API 함수들
export const getModels = async (): Promise<GetMLModelsResponse> => {
  try {
    const response = await apiClient.get<GetMLModelsResponse>(
      `${effectivePrefix}/models`,
    );
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
    const response = await apiClient.get<MLModelResponse>(
      `${effectivePrefix}/models/${modelId}`,
    );
    return response.data;
  } catch (error) {
    console.error(`Failed for getModelById (id: ${modelId}):`, error);
    throw error;
  }
};

export default apiClient;
