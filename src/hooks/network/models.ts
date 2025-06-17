import { getModelById, getModels } from '@/api/endpoints';
import { MLModelResponse, MLModelVersionResponse } from '@/api/types';
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
  const fetchFn = useCallback(() => getModels(), []);

  return useApiData<MLModelResponse, Model>({
    fetchFn,
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

  return useApiData<MLModelVersionResponse, ModelVersion>({
    fetchFn,
    transformFn: MLModelVersionResponse.toEntity,
    errorMessage: `Failed to fetch model with ID: ${modelID}`,
  });
}
