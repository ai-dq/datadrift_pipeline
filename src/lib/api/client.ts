import axios from 'axios';
import { MLModelResponse, GetMLModelsResponse } from './models/ml-models';

// API configuration
const API_BASE_URL = `http://localhost:${process.env.CORE_API_PORT || '9030'}/v1`;

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API functions
export const getModels = async (): Promise<GetMLModelsResponse> => {
  const response = await apiClient.get<GetMLModelsResponse>('/models');
  return response.data;
};

export const getModelById = async (
  modelId: number,
): Promise<MLModelResponse> => {
  const response = await apiClient.get<MLModelResponse>(`/models/${modelId}`);
  return response.data;
};

export default apiClient;
