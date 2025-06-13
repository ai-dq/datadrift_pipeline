import axios from 'axios';
import { MLModelResponse, GetMLModelsResponse } from './models/ml-models';

// API configuration
const isDevelopment = process.env.NODE_ENV === 'development';

let API_BASE_URL;
if (isDevelopment) {
  API_BASE_URL = `http://121.126.210.2/api/v1`;
} else {
  const coreApiPort = process.env.CORE_API_PORT || '9030';
  API_BASE_URL = `http://api:${coreApiPort}/api/v1`;
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

// API functions
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
