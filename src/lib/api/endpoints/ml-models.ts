import { APIClient, ApiError } from '../client';
import {
  MLModelPageResponse,
  MLModelResponse,
  MLModelVersionPageResponse,
} from '../types';

const ML_MODELS_PREFIX = '/ml_models';

export const getModels = async (): Promise<MLModelPageResponse> => {
  try {
    const response =
      await APIClient.labelstudio.get<MLModelPageResponse>(ML_MODELS_PREFIX);
    return response;
  } catch (error) {
    console.error(`Failed for getModels:`, error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, 'Failed to get models');
  }
};

export const getModelById = async (
  modelId: number,
): Promise<MLModelResponse> => {
  try {
    const response = await APIClient.labelstudio.get<MLModelResponse>(
      `${ML_MODELS_PREFIX}/${modelId}`,
    );
    return response;
  } catch (error) {
    console.error(`Failed for getModelById (id: ${modelId}):`, error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      0,
      `Failed to get model by id: ${modelId}. Details: ${String(error)}`,
    );
  }
};

export const getModelVersions = async (
  modelId: number,
): Promise<MLModelVersionPageResponse> => {
  try {
    const response =
      await APIClient.labelstudio.get<MLModelVersionPageResponse>(
        `${ML_MODELS_PREFIX}/${modelId}/versions`,
      );
    return response;
  } catch (error) {
    console.error(`Failed for getModelById (id: ${modelId}):`, error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      0,
      `Failed to get model by id: ${modelId}. Details: ${String(error)}`,
    );
  }
};

export const selectModelVersion = async (
  modelId: number,
  version: string,
): Promise<MLModelResponse> => {
  try {
    const response = await APIClient.labelstudio.post<MLModelResponse>(
      `${ML_MODELS_PREFIX}/${modelId}/select?version=${version}`,
    );
    return response;
  } catch (error) {
    console.error(
      `Failed for selectModelVersion (id: ${modelId}, version: ${version}):`,
      error,
    );
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      0,
      `Failed to select model version ${version} by id: ${modelId}. Details: ${String(error)}`,
    );
  }
};
