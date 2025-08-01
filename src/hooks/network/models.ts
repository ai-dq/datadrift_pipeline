import { getModelById, getModelVersions, getModels } from '@/api/endpoints';
import { APIError, MLModelResponse, MLModelVersionResponse } from '@/api/types';
import { Model, ModelVersion } from '@/entities/ml-model';
import { useCallback } from 'react';
import { useApiData } from './shared/useApiData';

/**
 * Custom hook for managing models data
 */
export function useModels(): {
  data: Model[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  return useApiData<MLModelResponse, Model>({
    fetchFn: getModels,
    transformFn: MLModelResponse.toEntity,
    errorMessage: 'Failed to fetch models',
  });
}

/**
 * Hook for fetching a single model by ID
 */
export function useModel(modelID: number): {
  data: ModelVersion[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const fetchFn = useCallback(() => getModelById(modelID), [modelID]);

  return useApiItem<MLModelResponse, Model>({
    fetchFn,
    transformFn: MLModelResponse.toEntity,
    errorMessage: `Failed to fetch model with ID: ${modelID}`,
  });
}

/**
 * Custom hook for fetching versions of model by ID
 */
export function useModelVersions(modelID: number | undefined): {
  data: ModelVersion[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const shouldFetch = modelID !== undefined;

  const fetchFn = useCallback(() => {
    if (!shouldFetch) {
      return Promise.reject(new APIError(404, 'Model ID is required'));
    }
    return getModelVersions(modelID);
  }, [shouldFetch, modelID]);

  const { data, loading, error, refetch } = useApiData<
    MLModelVersionResponse,
    ModelVersion
  >({
    fetchFn,
    transformFn: MLModelVersionResponse.toEntity,
    errorMessage: `Failed to fetch model with ID: ${modelID}`,
    deps: [modelID],
  });

  return {
    data,
    loading,
    error: shouldFetch ? error : '',
    refetch: shouldFetch ? refetch : async () => {},
  };
}
